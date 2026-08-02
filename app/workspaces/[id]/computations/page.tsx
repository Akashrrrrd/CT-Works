'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, CheckCircle, AlertTriangle, Download, Search, Clock, ShieldCheck, XCircle, Upload, MoreVertical, Calculator, Edit, Trash2 } from 'lucide-react';

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
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [verdict, setVerdict] = useState('ALL');
 const [approval, setApproval] = useState('ALL');

 useEffect(() => {
 fetch(`/api/workspaces/${workspaceId}/computations`)
 .then(r => r.json())
 .then(d => setComputations(Array.isArray(d) ? d : []))
 .finally(() => setLoading(false));
 }, [workspaceId]);

 const filtered = useMemo(() => computations.filter(c => {
 if (verdict !== 'ALL' && c.verdict !== verdict) return false;
 if (approval !== 'ALL' && c.approvalStatus !== approval) return false;
 if (search && !c.templateName.toLowerCase().includes(search.toLowerCase()) &&
 !c.createdBy?.name?.toLowerCase().includes(search.toLowerCase())) return false;
 return true;
 }), [computations, search, verdict, approval]);

 const handleDownload = async (comp: Computation) => {
 console.log('🚀 PROFESSIONAL PDF GENERATOR ACTIVATED FROM COMPUTATIONS LIST');
 
 // Use the new professional PDF generator instead of the old STANDARD one
 const { generateDevicePDFReport } = await import('@/lib/services/pdf-report');
 
 // Convert computation to DeviceResult format
 const deviceResult = {
 device_name: comp.templateName,
 device_index: 0,
 device_type: 'COMPUTATION_DEVICE' as any,
 verdict: comp.verdict as any,
 vk_available: comp.vk_available,
 vk_required: comp.vk_required,
 ealreq_max: comp.ealreq_max,
 vk_breakdown: comp.vk_breakdown.map(v => ({ ...v, formula: v.formula || v.label })),
 intermediates: comp.intermediates,
 inputs: {
 ct_ratio_primary: comp.sheet1.ct_ratio_primary,
 ct_ratio_secondary: comp.sheet1.ct_ratio_secondary,
 accuracy_class: comp.sheet1.accuracy_class,
 rct: comp.sheet1.rct,
 lead_resistance: comp.sheet2.lead_resistance,
 relay_burden_va: comp.sheet2.relay_burden_va,
 frequency: comp.sheet2.frequency,
 bus_voltage_kv: comp.sheet2.bus_voltage_kv,
 max_bus_fault_kA: comp.sheet2.max_bus_fault_mva,
 r1: comp.sheet2.r1,
 x1: comp.sheet2.x1,
 r0: comp.sheet2.r0,
 x0: comp.sheet2.x0,
 route_length_km: comp.sheet2.route_length_km
 }
 };
 
 const systemParams = {
 bus_fault_level: `${comp.sheet2.max_bus_fault_mva}MVA`,
 system_frequency: `${comp.sheet2.frequency}Hz`,
 bus_voltage_level: `${comp.sheet2.bus_voltage_kv}kV`,
 xr_ratio: 'N/A',
 route_length: `${comp.sheet2.route_length_km}km`,
 positive_seq_resistance_r1: `${comp.sheet2.r1}`,
 positive_seq_reactance_z1: `${comp.sheet2.x1}`,
 negative_seq_resistance_r0: `${comp.sheet2.r0}`,
 negative_seq_reactance_z0: `${comp.sheet2.x0}`
 };
 
 await generateDevicePDFReport(deviceResult, systemParams);
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

 {/* CT Checks Grid */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
 {/* New Check Card */}
 <Card 
 className="aspect-square flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 transition-colors"
 onClick={() => window.location.href = `/workspaces/${workspaceId}/computations/new`}
 >
 <CardContent className="flex flex-col items-center justify-center p-6 text-center">
 <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
 <Plus className="h-6 w-6 text-primary" />
 </div>
 <p className="text-sm font-medium text-muted-foreground">New Check</p>
 </CardContent>
 </Card>

 {/* Existing Checks */}
 {filtered.map(comp => {
 const ok = comp.verdict === 'SUITABLY DIMENSIONED';
 const margin = +(comp.vk_available - comp.vk_required).toFixed(1);
 
 return (
 <Card 
 key={comp.id} 
 className="aspect-square relative cursor-pointer hover:shadow-md transition-shadow group"
 onClick={() => {}} // Add click handler if needed
 >
 <CardContent className="p-4 h-full flex flex-col justify-between">
 {/* Status and menu */}
 <div className="flex justify-between items-start">
 {ok ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
 <Button 
 size="sm" 
 variant="outline" 
 className="gap-1 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
 onClick={(e) => { e.stopPropagation(); handleDownload(comp); }}
 >
 <Download className="h-3 w-3" />
 </Button>
 </div>

 {/* Check Content */}
 <div className="flex-1 flex flex-col justify-center text-center">
 <Calculator className="h-8 w-8 mx-auto mb-2 text-primary" />
 <h3 className="font-semibold text-sm leading-tight mb-1">{comp.templateName}</h3>
 {comp.sheet1 && (
 <p className="text-xs text-muted-foreground mb-1">CT {comp.sheet1.ct_ratio_primary}/{comp.sheet1.ct_ratio_secondary}</p>
 )}
 {comp.sheet2 && (
 <p className="text-xs text-muted-foreground">{comp.sheet2.bus_voltage_kv}kV</p>
 )}
 </div>

 {/* Verdict and Values */}
 <div className="text-center">
 <div className="space-y-1">
 <span className={`text-xs font-mono ${ok ? 'text-green-500' : 'text-red-500'}`}>
 {comp.vk_available}V / {comp.vk_required}V
 </span>
 <p className={`text-[10px] font-semibold ${ok ? 'text-green-500' : 'text-red-500'}`}>
 {ok ? 'ADEQUATE' : 'UNDER DIM'}
 </p>
 {margin !== 0 && (
 <p className={`text-[10px] ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
 Margin: {margin >= 0 ? '+' : ''}{margin}V
 </p>
 )}
 </div>
 
 {/* Approval Status */}
 <div className="mt-2">
 {comp.approvalStatus === 'PENDING' && (
 <Badge variant="outline" className="text-[10px] border-amber-600 text-amber-500">
 Pending
 </Badge>
 )}
 {comp.approvalStatus === 'APPROVED' && (
 <Badge variant="outline" className="text-[10px] border-green-700 text-green-400">
 Approved
 </Badge>
 )}
 {comp.approvalStatus === 'REJECTED' && (
 <Badge variant="outline" className="text-[10px] border-red-700 text-red-400">
 Rejected
 </Badge>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 );
 })}

 {/* No results message */}
 {filtered.length === 0 && computations.length > 0 && (
 <div className="col-span-full">
 <Card>
 <CardContent className="py-12 text-center">
 <p className="text-muted-foreground">No results match your filters</p>
 </CardContent>
 </Card>
 </div>
 )}
 </div>

 {/* Empty state for no computations */}
 {computations.length === 0 && (
 <Card>
 <CardContent className="py-12 text-center space-y-3">
 <p className="text-muted-foreground">No computations yet</p>
 <Link href={`/workspaces/${workspaceId}/computations/new`}>
 <Button className="gap-2"><Plus className="h-4 w-4" />Run first check</Button>
 </Link>
 </CardContent>
 </Card>
 )}
 </div>
 );
}
