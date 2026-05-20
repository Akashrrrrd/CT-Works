'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertCircle, Loader2, Zap, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Template { id: string; name: string; description: string; relay: string; iedType: string; }

interface Sheet1 {
  ct_ratio_primary: string;
  ct_ratio_secondary: string;
  accuracy_class: string;
  rct: string;
  vk_available: string;
  io_at_vk: string;
}

interface Sheet2 {
  frequency: string;
  bus_voltage_kv: string;
  max_bus_fault_mva: string;
  r1: string;
  x1: string;
  r0: string;
  x0: string;
  route_length_km: string;
  relay_burden_va: string;
  lead_resistance: string;
}

interface Result {
  verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  vk_required: number;
  vk_available: number;
  ealreq_max: number;
  vk_breakdown: { label: string; ealreq: number; vk: number; isMax: boolean }[];
  intermediates: Record<string, number | string>;
}

const SHEET1_FIELDS: { key: keyof Sheet1; label: string; unit: string; type: string }[] = [
  { key: 'ct_ratio_primary',   label: 'CT Ratio – Primary',    unit: 'A',      type: 'number' },
  { key: 'ct_ratio_secondary', label: 'CT Ratio – Secondary',  unit: 'A',      type: 'number' },
  { key: 'accuracy_class',     label: 'Class of Accuracy',     unit: '',       type: 'text'   },
  { key: 'rct',                label: 'CT Resistance (Rct)',   unit: 'Ω',      type: 'number' },
  { key: 'vk_available',       label: 'Knee Point Voltage (Vk)', unit: 'V',    type: 'number' },
  { key: 'io_at_vk',           label: 'Magnetizing Current (Io at Vk)', unit: 'mA', type: 'number' },
];

const SHEET2_FIELDS: { key: keyof Sheet2; label: string; unit: string }[] = [
  { key: 'frequency',          label: 'System Frequency',      unit: 'Hz'      },
  { key: 'bus_voltage_kv',     label: 'Bus Voltage Level',     unit: 'kV'      },
  { key: 'max_bus_fault_mva',  label: 'Max. Bus Fault Level',  unit: 'MVA'     },
  { key: 'r1',                 label: 'R1 – Positive Seq. Resistance', unit: 'Ω/km' },
  { key: 'x1',                 label: 'X1 – Positive Seq. Reactance', unit: 'Ω/km' },
  { key: 'r0',                 label: 'R0 – Zero Seq. Resistance',    unit: 'Ω/km' },
  { key: 'x0',                 label: 'X0 – Zero Seq. Reactance',     unit: 'Ω/km' },
  { key: 'route_length_km',    label: 'Cable Route Length',    unit: 'km'      },
  { key: 'relay_burden_va',    label: 'Relay Burden (Sr)',     unit: 'VA'      },
  { key: 'lead_resistance',    label: 'Lead Resistance (Rl)',  unit: 'Ω'       },
];

const DEFAULT_SHEET1: Sheet1 = {
  ct_ratio_primary: '800', ct_ratio_secondary: '1',
  accuracy_class: 'PX', rct: '3.5', vk_available: '540', io_at_vk: '20',
};

const DEFAULT_SHEET2: Sheet2 = {
  frequency: '50', bus_voltage_kv: '33', max_bus_fault_mva: '1800',
  r1: '0.1600', x1: '0.1300', r0: '0.9600', x0: '0.3200',
  route_length_km: '0.20', relay_burden_va: '0.02', lead_resistance: '0.47',
};

export default function NewComputationPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search) : null;
  const iedId = searchParams?.get('iedId') ?? null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sheet1, setSheet1] = useState<Sheet1>(DEFAULT_SHEET1);
  const [sheet2, setSheet2] = useState<Sheet2>(DEFAULT_SHEET2);
  const [result, setResult] = useState<Result | null>(null);
  const [lastSheet1, setLastSheet1] = useState<Sheet1>(DEFAULT_SHEET1);
  const [lastSheet2, setLastSheet2] = useState<Sheet2>(DEFAULT_SHEET2);
  const [iedName, setIedName] = useState('');
  const [importedFromExcel, setImportedFromExcel] = useState(false);
  const processedImportRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('Fetching templates for workspace:', workspaceId);
    fetch(`/api/workspaces/${workspaceId}/templates`)
      .then(r => {
        console.log('Templates response status:', r.status);
        return r.json();
      })
      .then(data => {
        console.log('Templates data received:', data);
        if (!Array.isArray(data)) {
          console.error('Templates API error:', data);
          setError(`Failed to load templates: ${data?.error ?? 'Unknown error'}`);
          return;
        }
        console.log('Setting templates:', data.length, 'items');
        setTemplates(data);
        setSelectedTemplate(data[0] ?? null);
      })
      .catch(e => {
        console.error('Templates fetch error:', e);
        setError(`Network error: ${e.message}`);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // Handle Excel imported data
  useEffect(() => {
    const importedParam = searchParams?.get('imported');
    const dataParam = searchParams?.get('data');
    
    if (importedParam === 'true' && dataParam && templates.length > 0) {
      // Prevent processing the same data multiple times
      if (processedImportRef.current === dataParam) {
        return;
      }
      
      try {
        const importedData = JSON.parse(decodeURIComponent(dataParam));
        console.log('Imported Excel data:', importedData);
        
        // Mark this data as processed
        processedImportRef.current = dataParam;
        
        // Fill Sheet 1 data
        setSheet1({
          ct_ratio_primary: String(importedData.ct_ratio_primary || DEFAULT_SHEET1.ct_ratio_primary),
          ct_ratio_secondary: String(importedData.ct_ratio_secondary || DEFAULT_SHEET1.ct_ratio_secondary),
          accuracy_class: importedData.accuracy_class || DEFAULT_SHEET1.accuracy_class,
          rct: String(importedData.rct || DEFAULT_SHEET1.rct),
          vk_available: String(importedData.vk_available || DEFAULT_SHEET1.vk_available),
          io_at_vk: String(importedData.io_at_vk || DEFAULT_SHEET1.io_at_vk),
        });
        
        // Fill Sheet 2 data
        setSheet2({
          frequency: String(importedData.frequency || DEFAULT_SHEET2.frequency),
          bus_voltage_kv: String(importedData.bus_voltage_kv || DEFAULT_SHEET2.bus_voltage_kv),
          max_bus_fault_mva: String(importedData.max_bus_fault_mva || DEFAULT_SHEET2.max_bus_fault_mva),
          r1: String(importedData.r1 || DEFAULT_SHEET2.r1),
          x1: String(importedData.x1 || DEFAULT_SHEET2.x1),
          r0: String(importedData.r0 || DEFAULT_SHEET2.r0),
          x0: String(importedData.x0 || DEFAULT_SHEET2.x0),
          route_length_km: String(importedData.route_length_km || DEFAULT_SHEET2.route_length_km),
          relay_burden_va: String(importedData.relay_burden_va || DEFAULT_SHEET2.relay_burden_va),
          lead_resistance: String(importedData.lead_resistance || DEFAULT_SHEET2.lead_resistance),
        });
        
        setImportedFromExcel(true);
        setIedName(`${importedData.relay_type || 'Imported'} (from Excel)`);
        
        // Auto-select matching template based on relay type
        const relayTypeMapping: Record<string, string> = {
          'RED670': 'tpl-red670',
          'REB670': 'tpl-reb670',
          'REF615': 'tpl-ref615',
          'REL670': 'tpl-rel670',
          'REQ650': 'tpl-req650'
        };
        
        const targetTemplate = relayTypeMapping[importedData.relay_type];
        if (targetTemplate) {
          const matchingTemplate = templates.find(t => t.iedType === targetTemplate);
          if (matchingTemplate) {
            setSelectedTemplate(matchingTemplate);
          }
        }
        
      } catch (error) {
        console.error('Failed to parse imported data:', error);
        setError('Failed to load imported Excel data');
      }
    }
  }, [searchParams, templates.length]); // Use templates.length instead of templates object

  // Pre-fill CT data from IED if iedId is provided
  useEffect(() => {
    if (!iedId) return;
    fetch(`/api/workspaces/${workspaceId}/hierarchy`)
      .then(r => r.json())
      .then(d => {
        for (const sub of d.tree ?? []) {
          for (const bay of sub.bays ?? []) {
            const ied = (bay.ieds ?? []).find((i: any) => i.id === iedId);
            if (ied) {
              setIedName(`${ied.name} (${ied.model})`);
              const [primary, secondary] = (ied.ct.ratio ?? '').split('/');
              setSheet1(prev => ({
                ...prev,
                ct_ratio_primary:   primary   ?? prev.ct_ratio_primary,
                ct_ratio_secondary: secondary ?? prev.ct_ratio_secondary,
                accuracy_class:     ied.ct.class ?? prev.accuracy_class,
                rct:                ied.ct.rct   ? String(ied.ct.rct) : prev.rct,
                vk_available:       ied.ct.vk    ? String(ied.ct.vk)  : prev.vk_available,
                io_at_vk:           ied.ct.io    ? String(ied.ct.io)  : prev.io_at_vk,
              }));
              // Auto-select first matching function
              if (ied.functions?.length > 0 && templates.length > 0) {
                const match = templates.find(t => ied.functions.includes(t.iedType));
                if (match) setSelectedTemplate(match);
              }
              return;
            }
          }
        }
      });
  }, [iedId, workspaceId, templates.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const parse = (v: string) => { const n = parseFloat(v); if (isNaN(n)) throw new Error(`Invalid value: "${v}"`); return n; };

      const s1 = {
        ct_ratio_primary:   parse(sheet1.ct_ratio_primary),
        ct_ratio_secondary: parse(sheet1.ct_ratio_secondary),
        accuracy_class:     sheet1.accuracy_class,
        rct:                parse(sheet1.rct),
        vk_available:       parse(sheet1.vk_available),
        io_at_vk:           parse(sheet1.io_at_vk),
      };
      const s2 = {
        frequency:          parse(sheet2.frequency),
        bus_voltage_kv:     parse(sheet2.bus_voltage_kv),
        max_bus_fault_mva:  parse(sheet2.max_bus_fault_mva),
        r1:                 parse(sheet2.r1),
        x1:                 parse(sheet2.x1),
        r0:                 parse(sheet2.r0),
        x0:                 parse(sheet2.x0),
        route_length_km:    parse(sheet2.route_length_km),
        relay_burden_va:    parse(sheet2.relay_burden_va),
        lead_resistance:    parse(sheet2.lead_resistance),
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/computations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate.id, sheet1: s1, sheet2: s2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Computation failed');
      setLastSheet1({ ...sheet1 });
      setLastSheet2({ ...sheet2 });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" /><Skeleton className="h-64" />
    </div>
  );

  const handleDownloadPDF = async () => {
    if (!result || !selectedTemplate) return;
    const { downloadPDF } = await import('../generate-pdf');
    await downloadPDF({
      templateName: selectedTemplate.name,
      createdAt: new Date().toISOString(),
      createdBy: 'Admin',
      sheet1: {
        ct_ratio_primary:   parseFloat(lastSheet1.ct_ratio_primary),
        ct_ratio_secondary: parseFloat(lastSheet1.ct_ratio_secondary),
        accuracy_class:     lastSheet1.accuracy_class,
        rct:                parseFloat(lastSheet1.rct),
        vk_available:       parseFloat(lastSheet1.vk_available),
        io_at_vk:           parseFloat(lastSheet1.io_at_vk),
      },
      sheet2: {
        frequency:         parseFloat(lastSheet2.frequency),
        bus_voltage_kv:    parseFloat(lastSheet2.bus_voltage_kv),
        max_bus_fault_mva: parseFloat(lastSheet2.max_bus_fault_mva),
        r1:                parseFloat(lastSheet2.r1),
        x1:                parseFloat(lastSheet2.x1),
        r0:                parseFloat(lastSheet2.r0),
        x0:                parseFloat(lastSheet2.x0),
        route_length_km:   parseFloat(lastSheet2.route_length_km),
        relay_burden_va:   parseFloat(lastSheet2.relay_burden_va),
        lead_resistance:   parseFloat(lastSheet2.lead_resistance),
      },
      result,
    });
  };

  const isSuitable = result?.verdict === 'SUITABLY DIMENSIONED';

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href={`/workspaces/${workspaceId}/computations`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" />Back to Computations
      </Link>

      <div>
        <h2 className="text-2xl font-bold">CT Adequacy Check</h2>
        <p className="text-muted-foreground text-sm">Fill in CT datasheet and system parameters to compute adequacy</p>
      </div>

      {(iedName || importedFromExcel) && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <Zap className="h-4 w-4 text-primary shrink-0" />
          <span>
            {importedFromExcel 
              ? `CT data imported from Excel: ${iedName}`
              : `CT data pre-filled from IED: ${iedName}`
            }
          </span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Protection Function */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Protection Function</CardTitle>
          <CardDescription>Select the relay function to check CT adequacy for</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTemplate?.id ?? ''}
            onValueChange={val => { setSelectedTemplate(templates.find(t => t.id === val) ?? null); setResult(null); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select function" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <p className="text-xs text-muted-foreground mt-2">{selectedTemplate.description}</p>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sheet 1 — CT Datasheet */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">CT Equipment Data</Badge>
              <CardTitle className="text-base">CT Datasheet Parameters</CardTitle>
            </div>
            <CardDescription>From the CT manufacturer datasheet</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SHEET1_FIELDS.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-sm font-medium">{f.label}</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type={f.type}
                    step="any"
                    value={sheet1[f.key]}
                    onChange={e => { setSheet1(prev => ({ ...prev, [f.key]: e.target.value })); setResult(null); }}                    disabled={submitting}
                    className="font-mono"
                  />
                  {f.unit && <span className="text-xs text-muted-foreground w-10 shrink-0">{f.unit}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sheet 2 — System Parameters */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Network & System Data</Badge>
              <CardTitle className="text-base">System / Network Parameters</CardTitle>
            </div>
            <CardDescription>From the system study / network data</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SHEET2_FIELDS.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-sm font-medium">{f.label}</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="any"
                    value={sheet2[f.key]}
                    onChange={e => { setSheet2(prev => ({ ...prev, [f.key]: e.target.value })); setResult(null); }}                    disabled={submitting}
                    className="font-mono"
                  />
                  <span className="text-xs text-muted-foreground w-10 shrink-0">{f.unit}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card className={isSuitable ? 'border-green-700 bg-green-950/20' : 'border-red-700 bg-red-950/20'}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {isSuitable
                  ? <CheckCircle className="h-6 w-6 text-green-500" />
                  : <AlertTriangle className="h-6 w-6 text-red-500" />}
                <CardTitle className={isSuitable ? 'text-green-400' : 'text-red-400'}>
                  {result.verdict}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Vk breakdown — all conditions, MAX highlighted */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Vk required per fault condition — max value used for verdict</p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted text-xs text-muted-foreground">
                        <th className="text-left px-3 py-2">Fault Condition</th>
                        <th className="text-right px-3 py-2">Ealreq (V)</th>
                        <th className="text-right px-3 py-2">Vk Required (V)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.vk_breakdown.map((row, i) => (
                        <tr key={i} className={`border-t border-border ${row.isMax ? 'bg-primary/10' : ''}`}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {row.isMax && <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-semibold">MAX</span>}
                              <span className={row.isMax ? 'font-semibold' : ''}>{row.label}</span>
                            </div>
                          </td>
                          <td className={`px-3 py-2 text-right font-mono ${row.isMax ? 'font-semibold' : ''}`}>{row.ealreq}</td>
                          <td className={`px-3 py-2 text-right font-mono ${row.isMax ? 'font-semibold' : ''}`}>{row.vk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Final summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Ealreq (max)</p>
                  <p className="text-2xl font-bold">{result.ealreq_max}</p>
                  <p className="text-xs text-muted-foreground">V</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Vk Required</p>
                  <p className="text-2xl font-bold">{result.vk_required}</p>
                  <p className="text-xs text-muted-foreground">V = Ealreq × 0.8</p>
                </div>
                <div className={`rounded-lg p-3 text-center border ${isSuitable ? 'border-green-700 bg-green-950/40' : 'border-red-700 bg-red-950/40'}`}>
                  <p className="text-xs text-muted-foreground mb-1">Vk Available</p>
                  <p className="text-2xl font-bold">{result.vk_available}</p>
                  <p className="text-xs text-muted-foreground">V (datasheet)</p>
                </div>
              </div>

              <Badge className={`w-full justify-center py-2 text-sm ${isSuitable ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {isSuitable
                  ? `✓ SUITABLY DIMENSIONED — Vk available (${result.vk_available}V) ≥ Vk required (${result.vk_required}V)`
                  : `✗ UNDER DIMENSIONED — Vk available (${result.vk_available}V) < Vk required (${result.vk_required}V)`}
              </Badge>

              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show intermediate values</summary>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {Object.entries(result.intermediates).map(([k, v]) => (
                    <div key={k} className="flex justify-between bg-muted rounded px-3 py-1.5">
                      <span className="text-muted-foreground text-xs">{k}</span>
                      <span className="font-mono text-xs font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </details>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setResult(null)}>Modify Inputs</Button>
                <Button type="button" onClick={() => router.push(`/workspaces/${workspaceId}/computations`)}>View All Results</Button>
                <Button type="button" variant="outline" className="gap-2 ml-auto" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4" />Download PDF Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!result && (
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting || !selectedTemplate} className="gap-2">
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Computing...</>
                : <><Zap className="h-4 w-4" />Compute</>}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(`/workspaces/${workspaceId}/computations`)}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
