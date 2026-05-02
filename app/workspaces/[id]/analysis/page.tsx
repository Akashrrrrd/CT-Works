'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Upload, Zap, CheckCircle, AlertTriangle,
  AlertCircle, Loader2, Plus, Trash2, FileSpreadsheet,
} from 'lucide-react';
import type { FullAnalysisInput, AnalysisResult } from '@/lib/services/calculation-engine';

type FormCT = { ratio_primary: string; ratio_secondary: string; accuracy_class: string; rct: string; rated_burden_va: string; alf: string; vk_available: string; io_at_vk: string };
type FormWiring = { conductor_mm2: string; r20: string; alpha: string; temperature: string; cable_length_m: string; cores: string };
type FormSystem = { frequency: string; bus_voltage_kv: string; fault_current_ka: string; xr_ratio: string };
type FormLine = { r1: string; x1: string; r0: string; x0: string; length_km: string };
type IEDRow = { name: string; burden_va: string; type: string };

const DEFAULT_CT: FormCT     = { ratio_primary: '600', ratio_secondary: '1', accuracy_class: '5P20', rct: '3.5', rated_burden_va: '15', alf: '20', vk_available: '400', io_at_vk: '30' };
const DEFAULT_W: FormWiring  = { conductor_mm2: '2.5', r20: '7.41', alpha: '0.00393', temperature: '75', cable_length_m: '50', cores: '2' };
const DEFAULT_S: FormSystem  = { frequency: '50', bus_voltage_kv: '33', fault_current_ka: '12.5', xr_ratio: '15' };
const DEFAULT_L: FormLine    = { r1: '0.125', x1: '0.112', r0: '0.375', x0: '0.336', length_km: '5' };

export default function FullAnalysisPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const fileRef = useRef<HTMLInputElement>(null);

  const [ct,      setCT]      = useState<FormCT>(DEFAULT_CT);
  const [wiring,  setWiring]  = useState<FormWiring>(DEFAULT_W);
  const [system,  setSystem]  = useState<FormSystem>(DEFAULT_S);
  const [line,    setLine]    = useState<FormLine>(DEFAULT_L);
  const [ieds,    setIEDs]    = useState<IEDRow[]>([{ name: 'ABB RED670', burden_va: '0.02', type: 'differential' }]);
  const [relay,   setRelay]   = useState('');
  const [project, setProject] = useState('');

  const [result,   setResult]   = useState<AnalysisResult | null>(null);
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [importing,setImporting]= useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const p = (v: string) => parseFloat(v) || 0;

  const handleCompute = async () => {
    setBusy(true); setError(''); setResult(null);
    try {
      const body: FullAnalysisInput & { projectName: string; relayName: string } = {
        projectName: project,
        relayName:   relay,
        ct: {
          ratio_primary:   p(ct.ratio_primary),
          ratio_secondary: p(ct.ratio_secondary),
          accuracy_class:  ct.accuracy_class,
          rct:             p(ct.rct),
          rated_burden_va: p(ct.rated_burden_va),
          alf:             p(ct.alf),
          vk_available:    p(ct.vk_available),
          io_at_vk:        p(ct.io_at_vk),
        },
        wiring: {
          conductor_mm2:  p(wiring.conductor_mm2),
          r20:            p(wiring.r20),
          alpha:          p(wiring.alpha),
          temperature:    p(wiring.temperature),
          cable_length_m: p(wiring.cable_length_m),
          cores:          parseInt(wiring.cores) as 1 | 2,
        },
        ieds: ieds.map(d => ({ name: d.name, burden_va: p(d.burden_va), type: d.type })),
        system: {
          frequency:        p(system.frequency),
          bus_voltage_kv:   p(system.bus_voltage_kv),
          fault_current_ka: p(system.fault_current_ka),
          xr_ratio:         p(system.xr_ratio),
        },
        line: {
          r1: p(line.r1), x1: p(line.x1),
          r0: p(line.r0), x0: p(line.x0),
          length_km: p(line.length_km),
        },
      };

      const res  = await fetch(`/api/workspaces/${workspaceId}/analysis`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calculation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setWarnings([]); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch(`/api/workspaces/${workspaceId}/import-excel`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const parsed = data.parsed;

      // Auto-populate CT fields
      if (parsed.ct) {
        const c = parsed.ct as Record<string, unknown>;
        setCT(prev => ({
          ...prev,
          ...(c.ratio_primary   !== undefined && { ratio_primary:   String(c.ratio_primary)   }),
          ...(c.ratio_secondary !== undefined && { ratio_secondary: String(c.ratio_secondary) }),
          ...(c.accuracy_class  !== undefined && { accuracy_class:  String(c.accuracy_class)  }),
          ...(c.rct             !== undefined && { rct:             String(c.rct)             }),
          ...(c.rated_burden_va !== undefined && { rated_burden_va: String(c.rated_burden_va) }),
          ...(c.alf             !== undefined && { alf:             String(c.alf)             }),
          ...(c.vk_available    !== undefined && { vk_available:    String(c.vk_available)    }),
          ...(c.io_at_vk        !== undefined && { io_at_vk:        String(c.io_at_vk)        }),
        }));
      }

      // Auto-populate Wiring fields
      if (parsed.wiring) {
        const w = parsed.wiring as Record<string, unknown>;
        setWiring(prev => ({
          ...prev,
          ...(w.conductor_mm2  !== undefined && { conductor_mm2:  String(w.conductor_mm2)  }),
          ...(w.r20            !== undefined && { r20:            String(w.r20)            }),
          ...(w.alpha          !== undefined && { alpha:          String(w.alpha)          }),
          ...(w.temperature    !== undefined && { temperature:    String(w.temperature)    }),
          ...(w.cable_length_m !== undefined && { cable_length_m: String(w.cable_length_m) }),
          ...(w.cores          !== undefined && { cores:          String(w.cores)          }),
        }));
      }

      // Auto-populate System fields
      if (parsed.system) {
        const s = parsed.system as Record<string, unknown>;
        setSystem(prev => ({
          ...prev,
          ...(s.frequency        !== undefined && { frequency:        String(s.frequency)        }),
          ...(s.bus_voltage_kv   !== undefined && { bus_voltage_kv:   String(s.bus_voltage_kv)   }),
          ...(s.fault_current_ka !== undefined && { fault_current_ka: String(s.fault_current_ka) }),
          ...(s.xr_ratio         !== undefined && { xr_ratio:         String(s.xr_ratio)         }),
        }));
      }

      // Auto-populate Line fields
      if (parsed.line) {
        const l = parsed.line as Record<string, unknown>;
        setLine(prev => ({
          ...prev,
          ...(l.r1        !== undefined && { r1:        String(l.r1)        }),
          ...(l.x1        !== undefined && { x1:        String(l.x1)        }),
          ...(l.r0        !== undefined && { r0:        String(l.r0)        }),
          ...(l.x0        !== undefined && { x0:        String(l.x0)        }),
          ...(l.length_km !== undefined && { length_km: String(l.length_km) }),
        }));
      }

      // Auto-populate IEDs
      if (Array.isArray(parsed.ieds) && parsed.ieds.length > 0) {
        setIEDs(parsed.ieds.map((d: { name: string; burden_va: number; type: string }) => ({
          name:       d.name       ?? '',
          burden_va:  String(d.burden_va ?? 0),
          type:       d.type       ?? 'protection',
        })));
      }

      if (data.warnings?.length) setWarnings(data.warnings);

      // Show success count
      const filled = [parsed.ct, parsed.wiring, parsed.system, parsed.line].filter(Boolean).length;
      setWarnings(prev => [`✓ Imported ${data.rowCount} rows — ${filled} sections populated${parsed.ieds?.length ? `, ${parsed.ieds.length} IEDs` : ''}`, ...prev]);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const Field = ({ label, value, onChange, unit, type = 'number' }: { label: string; value: string; onChange: (v: string) => void; unit?: string; type?: string }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-1.5 items-center">
        <Input type={type} step="any" value={value} onChange={e => onChange(e.target.value)} className="font-mono text-sm h-8" />
        {unit && <span className="text-xs text-muted-foreground w-10 shrink-0">{unit}</span>}
      </div>
    </div>
  );

  const ok = result?.verdict === 'ADEQUATE';

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}`}>
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold">Full CT Adequacy Analysis</h2>
            <p className="text-xs text-muted-foreground">IEC 61869 · Kssc method · Dynamic relay formulas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" className="gap-2" disabled={importing} onClick={() => fileRef.current?.click()}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Import Excel
          </Button>
        </div>
      </div>

      {warnings.length > 0 && (
        <Alert className={warnings[0]?.startsWith('✓') ? 'border-green-700 bg-green-950/20' : ''}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs space-y-0.5">
            {warnings.map((w, i) => <div key={i}>{w}</div>)}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {/* Project + Relay */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Project Name</label>
          <Input value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. 33kV DF5W Substation" className="h-8" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Relay / IED Model</label>
          <Input value={relay} onChange={e => setRelay(e.target.value)} placeholder="e.g. ABB RED670, P54x, 7SJ85" className="h-8" />
        </div>
      </div>

      <Tabs defaultValue="ct">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="ct">CT Data</TabsTrigger>
          <TabsTrigger value="wiring">Wiring</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="line">Line</TabsTrigger>
          <TabsTrigger value="ieds">IEDs</TabsTrigger>
        </TabsList>

        <TabsContent value="ct">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm">CT Nameplate Parameters</CardTitle><CardDescription className="text-xs">From CT manufacturer datasheet</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="CT Primary (Ipn)" value={ct.ratio_primary}   onChange={v => setCT(p => ({...p, ratio_primary: v}))}   unit="A" />
            <Field label="CT Secondary (In)" value={ct.ratio_secondary} onChange={v => setCT(p => ({...p, ratio_secondary: v}))} unit="A" />
            <Field label="Accuracy Class"    value={ct.accuracy_class}  onChange={v => setCT(p => ({...p, accuracy_class: v}))}  type="text" />
            <Field label="Rct"               value={ct.rct}             onChange={v => setCT(p => ({...p, rct: v}))}             unit="Ω" />
            <Field label="Rated Burden (PN)" value={ct.rated_burden_va} onChange={v => setCT(p => ({...p, rated_burden_va: v}))} unit="VA" />
            <Field label="ALF"               value={ct.alf}             onChange={v => setCT(p => ({...p, alf: v}))} />
            <Field label="Vk Available"      value={ct.vk_available}    onChange={v => setCT(p => ({...p, vk_available: v}))}    unit="V" />
            <Field label="Io at Vk"          value={ct.io_at_vk}        onChange={v => setCT(p => ({...p, io_at_vk: v}))}        unit="mA" />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="wiring">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm">CT Wiring Parameters</CardTitle><CardDescription className="text-xs">Cable from CT to relay panel</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Conductor (mm²)"   value={wiring.conductor_mm2}  onChange={v => setWiring(p => ({...p, conductor_mm2: v}))}  unit="mm²" />
            <Field label="R at 20°C (R20)"   value={wiring.r20}            onChange={v => setWiring(p => ({...p, r20: v}))}            unit="Ω/km" />
            <Field label="Temp. Coefficient" value={wiring.alpha}          onChange={v => setWiring(p => ({...p, alpha: v}))} />
            <Field label="Temperature"       value={wiring.temperature}    onChange={v => setWiring(p => ({...p, temperature: v}))}    unit="°C" />
            <Field label="Cable Length"      value={wiring.cable_length_m} onChange={v => setWiring(p => ({...p, cable_length_m: v}))} unit="m" />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Cores (1=single, 2=loop)</label>
              <Input type="number" min={1} max={2} value={wiring.cores} onChange={e => setWiring(p => ({...p, cores: e.target.value}))} className="font-mono text-sm h-8" />
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="system">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm">System Parameters</CardTitle><CardDescription className="text-xs">Network / power system data</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Frequency"       value={system.frequency}        onChange={v => setSystem(p => ({...p, frequency: v}))}        unit="Hz" />
            <Field label="Bus Voltage"     value={system.bus_voltage_kv}   onChange={v => setSystem(p => ({...p, bus_voltage_kv: v}))}   unit="kV" />
            <Field label="Max Fault (Ikmax)" value={system.fault_current_ka} onChange={v => setSystem(p => ({...p, fault_current_ka: v}))} unit="kA" />
            <Field label="X/R Ratio"       value={system.xr_ratio}         onChange={v => setSystem(p => ({...p, xr_ratio: v}))} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="line">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Line / Cable Parameters</CardTitle><CardDescription className="text-xs">Sequence impedances of the protected feeder</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="R1 (pos. seq.)" value={line.r1}        onChange={v => setLine(p => ({...p, r1: v}))}        unit="Ω/km" />
            <Field label="X1 (pos. seq.)" value={line.x1}        onChange={v => setLine(p => ({...p, x1: v}))}        unit="Ω/km" />
            <Field label="R0 (zero seq.)" value={line.r0}        onChange={v => setLine(p => ({...p, r0: v}))}        unit="Ω/km" />
            <Field label="X0 (zero seq.)" value={line.x0}        onChange={v => setLine(p => ({...p, x0: v}))}        unit="Ω/km" />
            <Field label="Line Length"    value={line.length_km} onChange={v => setLine(p => ({...p, length_km: v}))} unit="km" />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="ieds">
          <Card><CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-sm">Connected IEDs / Relays</CardTitle><CardDescription className="text-xs">All devices connected to this CT core</CardDescription></div>
              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setIEDs(p => [...p, { name: '', burden_va: '0', type: 'protection' }])}>
                <Plus className="h-3 w-3" />Add IED
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {ieds.map((ied, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-5 h-8 text-sm" placeholder="IED name (e.g. ABB RED670)" value={ied.name} onChange={e => setIEDs(p => p.map((d,j) => j===i ? {...d, name: e.target.value} : d))} />
                <Input className="col-span-3 h-8 text-sm font-mono" type="number" step="any" placeholder="Burden VA" value={ied.burden_va} onChange={e => setIEDs(p => p.map((d,j) => j===i ? {...d, burden_va: e.target.value} : d))} />
                <Input className="col-span-3 h-8 text-sm" placeholder="Type" value={ied.type} onChange={e => setIEDs(p => p.map((d,j) => j===i ? {...d, type: e.target.value} : d))} />
                <Button size="sm" variant="ghost" className="col-span-1 h-8 text-destructive hover:bg-destructive/10 px-2" onClick={() => setIEDs(p => p.filter((_,j) => j!==i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {ieds.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No IEDs added. Click "Add IED" to add relay burdens.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Result */}
      {result && (
        <Card className={ok ? 'border-green-700 bg-green-950/20' : 'border-red-700 bg-red-950/20'}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {ok ? <CheckCircle className="h-6 w-6 text-green-500" /> : <AlertTriangle className="h-6 w-6 text-red-500" />}
              <div>
                <CardTitle className={ok ? 'text-green-400' : 'text-red-400'}>{result.verdict}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{result.conclusion}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Kssc summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Kssc Required',  value: result.kssc_required,  color: '' },
                { label: 'Kssc Available', value: result.kssc_available, color: ok ? 'text-green-500' : 'text-red-500' },
                { label: 'Vk Required',    value: `${result.vk_required} V`,  color: '' },
                { label: 'Vk Available',   value: `${result.vk_available} V`, color: ok ? 'text-green-500' : 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded p-3 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Section breakdown */}
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { title: 'Wiring', data: { 'R at temp (Ω/km)': result.wiring.r_at_temp, 'RL loop (Ω)': result.wiring.rl_loop, 'PL burden (VA)': result.wiring.pl_burden_va } },
                { title: 'Source Impedance', data: { 'Zs (Ω)': result.source.zs, 'Rs (Ω)': result.source.rs, 'Xs (Ω)': result.source.xs, 'tp (s)': result.source.tp } },
                { title: 'Fault Currents', data: { 'If 3ph (A)': result.faults.if_3ph, 'If 1ph (A)': result.faults.if_1ph, 'Z total 3ph (Ω)': result.faults.z_total_3ph } },
                { title: 'CT Burden', data: { 'PE internal (VA)': result.burden.pe, 'PL lead (VA)': result.burden.pl, 'IED total (VA)': result.burden.ied_total_va, 'Total (VA)': result.burden.total_va } },
              ].map(sec => (
                <div key={sec.title} className="rounded-lg border border-border p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{sec.title}</p>
                  {Object.entries(sec.data).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">All intermediate values</summary>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {Object.entries(result.intermediates).map(([k, v]) => (
                  <div key={k} className="flex justify-between bg-muted rounded px-3 py-1.5">
                    <span className="text-muted-foreground text-xs">{k}</span>
                    <span className="font-mono text-xs font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </details>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>Modify Inputs</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!result && (
        <Button onClick={handleCompute} disabled={busy} className="gap-2">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Computing...</> : <><Zap className="h-4 w-4" />Run Full Analysis</>}
        </Button>
      )}
    </div>
  );
}
