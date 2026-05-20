'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle, AlertTriangle, Download, Search, Clock, ShieldCheck, XCircle, Upload } from 'lucide-react';

interface Computation {
  id: string; templateId: string; templateName: string;
  verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  ealreq_max: number; vk_required: number; vk_available: number;
  vk_breakdown: { label: string; ealreq: number; vk: number; isMax: boolean }[];
  intermediates: Record<string, number | string>;
  approvalStatus: string; createdAt: string;
  createdBy: { name: string };
  sheet1: { ct_ratio_primary: number; ct_ratio_secondary: number; accuracy_class: string; rct: number; vk_available: number; io_at_vk: number };
  sheet2: { frequency: number; bus_voltage_kv: number; max_bus_fault_mva: number; r1: number; x1: number; r0: number; x0: number; route_length_km: number; relay_burden_va: number; lead_resistance: number };
}

export default function ComputationsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [computations, setComputations] = useState<Computation[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [verdict,  setVerdict]  = useState('ALL');
  const [approval, setApproval] = useState('ALL');

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/computations`)
      .then(r => r.json())
      .then(d => setComputations(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const filtered = useMemo(() => computations.filter(c => {
    if (verdict  !== 'ALL' && c.verdict        !== verdict)  return false;
    if (approval !== 'ALL' && c.approvalStatus !== approval) return false;
    if (search && !c.templateName.toLowerCase().includes(search.toLowerCase()) &&
        !c.createdBy?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [computations, search, verdict, approval]);

  const handleDownload = async (comp: Computation) => {
    const { downloadPDF } = await import('./generate-pdf');
    await downloadPDF({
      templateName:    comp.templateName,
      createdAt:       comp.createdAt,
      createdBy:       comp.createdBy?.name ?? 'Unknown',
      companyName:     (typeof window !== 'undefined' && localStorage.getItem('pdf_company'))    || undefined,
      projectName:     (typeof window !== 'undefined' && localStorage.getItem('pdf_project'))    || undefined,
      contractNo:      (typeof window !== 'undefined' && localStorage.getItem('pdf_contract'))   || undefined,
      substationName:  (typeof window !== 'undefined' && localStorage.getItem('pdf_substation')) || undefined,
      revisionNo:      (typeof window !== 'undefined' && localStorage.getItem('pdf_revision'))   || undefined,
      sheet1: comp.sheet1,
      sheet2: comp.sheet2,
      result: {
        verdict:      comp.verdict,
        ealreq_max:   comp.ealreq_max,
        vk_required:  comp.vk_required,
        vk_available: comp.vk_available,
        vk_breakdown: comp.vk_breakdown,
        intermediates:comp.intermediates,
      },
    });
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Computations</h2>
          <p className="text-sm text-muted-foreground">{computations.length} total · {computations.filter(c => c.verdict === 'SUITABLY DIMENSIONED').length} suitable</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/workspaces/${workspaceId}/import-excel`}>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Import Excel
            </Button>
          </Link>
          <Link href={`/workspaces/${workspaceId}/computations/new`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Check
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by template or engineer..." className="pl-9" />
        </div>
        <Select value={verdict} onValueChange={setVerdict}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All verdicts</SelectItem>
            <SelectItem value="SUITABLY DIMENSIONED">Suitable</SelectItem>
            <SelectItem value="UNDER DIMENSIONED">Under Dim.</SelectItem>
          </SelectContent>
        </Select>
        <Select value={approval} onValueChange={setApproval}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">{computations.length === 0 ? 'No computations yet' : 'No results match your filters'}</p>
            {computations.length === 0 && (
              <Link href={`/workspaces/${workspaceId}/computations/new`}>
                <Button className="gap-2"><Plus className="h-4 w-4" />Run first check</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(comp => {
            const ok = comp.verdict === 'SUITABLY DIMENSIONED';
            const margin = +(comp.vk_available - comp.vk_required).toFixed(1);
            return (
              <Card key={comp.id} className={`transition-colors ${ok ? 'border-green-800/40 hover:border-green-700/60' : 'border-red-800/40 hover:border-red-700/60'}`}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ok ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                      <CardTitle className="text-sm font-semibold">{comp.templateName}</CardTitle>
                      <Badge className={`text-xs ${ok ? 'bg-green-700' : 'bg-red-700'}`}>
                        {ok ? 'Suitable' : 'Under Dim.'}
                      </Badge>
                      {comp.approvalStatus === 'PENDING'  && <Badge variant="outline" className="text-xs border-amber-600 text-amber-500 gap-1"><Clock className="h-3 w-3" />Pending</Badge>}
                      {comp.approvalStatus === 'APPROVED' && <Badge variant="outline" className="text-xs border-green-700 text-green-400 gap-1"><ShieldCheck className="h-3 w-3" />Approved</Badge>}
                      {comp.approvalStatus === 'REJECTED' && <Badge variant="outline" className="text-xs border-red-700 text-red-400 gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>}
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs shrink-0" onClick={() => handleDownload(comp)}>
                      <Download className="h-3 w-3" />PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-muted rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Ealreq max</p>
                      <p className="text-sm font-bold">{comp.ealreq_max} V</p>
                    </div>
                    <div className="bg-muted rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Vk Required</p>
                      <p className="text-sm font-bold">{comp.vk_required} V</p>
                    </div>
                    <div className={`rounded p-2 text-center border ${ok ? 'border-green-800 bg-green-950/30' : 'border-red-800 bg-red-950/30'}`}>
                      <p className="text-[10px] text-muted-foreground">Vk Available</p>
                      <p className="text-sm font-bold">{comp.vk_available} V</p>
                    </div>
                    <div className={`rounded p-2 text-center border ${margin >= 0 ? 'border-green-800 bg-green-950/20' : 'border-red-800 bg-red-950/20'}`}>
                      <p className="text-[10px] text-muted-foreground">Margin</p>
                      <p className={`text-sm font-bold ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>{margin >= 0 ? '+' : ''}{margin} V</p>
                    </div>
                  </div>

                  {comp.vk_breakdown?.length > 0 && (
                    <div className="rounded border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-muted text-muted-foreground">
                          <th className="text-left px-3 py-1.5">Fault Condition</th>
                          <th className="text-right px-3 py-1.5">Ealreq (V)</th>
                          <th className="text-right px-3 py-1.5">Vk Req (V)</th>
                        </tr></thead>
                        <tbody>
                          {comp.vk_breakdown.map((row, i) => (
                            <tr key={i} className={`border-t border-border ${row.isMax ? 'bg-primary/10 font-semibold' : ''}`}>
                              <td className="px-3 py-1.5 flex items-center gap-1.5">
                                {row.isMax && <span className="bg-primary text-primary-foreground px-1 py-0.5 rounded text-[10px]">MAX</span>}
                                {row.label}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono">{row.ealreq}</td>
                              <td className="px-3 py-1.5 text-right font-mono">{row.vk}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {comp.sheet1 && <span>CT {comp.sheet1.ct_ratio_primary}/{comp.sheet1.ct_ratio_secondary}A {comp.sheet1.accuracy_class}</span>}
                    {comp.sheet2 && <><span>·</span><span>{comp.sheet2.bus_voltage_kv}kV · {comp.sheet2.max_bus_fault_mva}MVA</span></>}
                    <span>·</span>
                    <span>{comp.createdBy?.name} · {new Date(comp.createdAt).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
