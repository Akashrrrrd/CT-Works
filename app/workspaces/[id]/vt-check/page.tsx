'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Zap, CheckCircle, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { calculateVTAdequacy } from '@/lib/services/vt-adequacy';
import type { VTInputs, VTAdequacyResult } from '@/lib/services/vt-adequacy';

type FormState = Record<keyof VTInputs, string>;

const FIELDS: { key: keyof VTInputs; label: string; unit: string; section: 'nameplate' | 'burden' | 'system' }[] = [
  { key: 'vt_ratio_primary',   label: 'VT Primary Voltage',     unit: 'V',  section: 'nameplate' },
  { key: 'vt_ratio_secondary', label: 'VT Secondary Voltage',   unit: 'V',  section: 'nameplate' },
  { key: 'accuracy_class',     label: 'Accuracy Class',         unit: '',   section: 'nameplate' },
  { key: 'burden_va',          label: 'Rated Burden',           unit: 'VA', section: 'nameplate' },
  { key: 'relay_burden_va',    label: 'Relay Burden',           unit: 'VA', section: 'burden'    },
  { key: 'lead_burden_va',     label: 'Lead / Cable Burden',    unit: 'VA', section: 'burden'    },
  { key: 'metering_burden_va', label: 'Metering Burden',        unit: 'VA', section: 'burden'    },
  { key: 'bus_voltage_kv',     label: 'Bus Voltage',            unit: 'kV', section: 'system'    },
  { key: 'frequency',          label: 'Frequency',              unit: 'Hz', section: 'system'    },
];

const DEFAULTS: FormState = {
  vt_ratio_primary: '33000', vt_ratio_secondary: '110',
  accuracy_class: '3P', burden_va: '100',
  relay_burden_va: '15', lead_burden_va: '5', metering_burden_va: '10',
  bus_voltage_kv: '33', frequency: '50',
};

export default function VTCheckPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [form,   setForm]   = useState<FormState>(DEFAULTS);
  const [result, setResult] = useState<VTAdequacyResult | null>(null);
  const [error,  setError]  = useState('');
  const [busy,   setBusy]   = useState(false);

  const handleCompute = () => {
    setBusy(true); setError(''); setResult(null);
    try {
      const inputs: VTInputs = {
        vt_ratio_primary:   parseFloat(form.vt_ratio_primary),
        vt_ratio_secondary: parseFloat(form.vt_ratio_secondary),
        accuracy_class:     form.accuracy_class,
        burden_va:          parseFloat(form.burden_va),
        relay_burden_va:    parseFloat(form.relay_burden_va),
        lead_burden_va:     parseFloat(form.lead_burden_va),
        metering_burden_va: parseFloat(form.metering_burden_va),
        bus_voltage_kv:     parseFloat(form.bus_voltage_kv),
        frequency:          parseFloat(form.frequency),
      };
      for (const [k, v] of Object.entries(inputs)) {
        if (k !== 'accuracy_class' && isNaN(v as number)) throw new Error(`Invalid value for ${k}`);
      }
      setResult(calculateVTAdequacy(inputs));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calculation error');
    } finally {
      setBusy(false);
    }
  };

  const sections = [
    { key: 'nameplate', label: 'VT Nameplate Data',     desc: 'From the VT manufacturer datasheet' },
    { key: 'burden',    label: 'Connected Burden',       desc: 'All burdens connected to this VT core' },
    { key: 'system',    label: 'System Parameters',      desc: 'Network data' },
  ] as const;

  const ok = result?.verdict === 'SUITABLY DIMENSIONED';

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/workspaces/${workspaceId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Back to Overview
      </Link>

      <div>
        <h2 className="text-2xl font-bold">VT Adequacy Check</h2>
        <p className="text-sm text-muted-foreground">IEC 61869-3 — Voltage Transformer burden adequacy</p>
      </div>

      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {sections.map(sec => (
        <Card key={sec.key}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{sec.label}</CardTitle>
            <CardDescription className="text-xs">{sec.desc}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {FIELDS.filter(f => f.section === sec.key).map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-medium">{f.label}</label>
                <div className="flex gap-2 items-center">
                  <Input
                    type={f.key === 'accuracy_class' ? 'text' : 'number'}
                    step="any"
                    value={form[f.key]}
                    onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setResult(null); }}
                    className="font-mono"
                  />
                  {f.unit && <span className="text-xs text-muted-foreground w-8 shrink-0">{f.unit}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Result */}
      {result && (
        <Card className={ok ? 'border-green-700 bg-green-950/20' : 'border-red-700 bg-red-950/20'}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {ok ? <CheckCircle className="h-6 w-6 text-green-500" /> : <AlertTriangle className="h-6 w-6 text-red-500" />}
              <CardTitle className={ok ? 'text-green-400' : 'text-red-400'}>{result.verdict}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Burden</p>
                <p className="text-xl font-bold">{result.total_burden_va} VA</p>
              </div>
              <div className={`rounded p-3 text-center border ${ok ? 'border-green-700 bg-green-950/30' : 'border-red-700 bg-red-950/30'}`}>
                <p className="text-xs text-muted-foreground">Rated Burden</p>
                <p className="text-xl font-bold">{result.rated_burden_va} VA</p>
              </div>
              <div className="bg-muted rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">Utilisation</p>
                <p className={`text-xl font-bold ${result.burden_pct > 100 ? 'text-red-500' : result.burden_pct > 80 ? 'text-amber-500' : 'text-green-500'}`}>
                  {result.burden_pct}%
                </p>
              </div>
            </div>

            {/* Burden bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Burden utilisation</span>
                <span>{result.burden_pct}% of {result.rated_burden_va} VA</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${result.burden_pct > 100 ? 'bg-red-500' : result.burden_pct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(result.burden_pct, 100)}%` }}
                />
              </div>
            </div>

            <Badge className={`w-full justify-center py-2 text-sm ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
              {ok
                ? `✓ SUITABLY DIMENSIONED — ${result.burden_margin_va} VA margin remaining`
                : `✗ UNDER DIMENSIONED — Exceeds rated burden by ${Math.abs(result.burden_margin_va).toFixed(1)} VA`}
            </Badge>

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-xs">Show intermediates</summary>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {Object.entries(result.intermediates).map(([k, v]) => (
                  <div key={k} className="flex justify-between bg-muted rounded px-3 py-1.5">
                    <span className="text-muted-foreground text-xs">{k}</span>
                    <span className="font-mono text-xs font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </details>

            <Button variant="outline" size="sm" onClick={() => setResult(null)}>Modify Inputs</Button>
          </CardContent>
        </Card>
      )}

      {!result && (
        <Button onClick={handleCompute} disabled={busy} className="gap-2">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Computing...</> : <><Zap className="h-4 w-4" />Compute VT Adequacy</>}
        </Button>
      )}
    </div>
  );
}
