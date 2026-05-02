'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, CheckCircle, AlertCircle, Trash2, FlaskConical } from 'lucide-react';
import { evaluateRelayFormula } from '@/lib/services/calculation-engine';
import type { RelayFormula } from '@/lib/services/calculation-engine';

interface StoredFormula extends RelayFormula {
  id: string; relayName: string; validated: boolean; createdAt: string;
}

const BUILTIN_FORMULAS: RelayFormula[] = [
  { name: 'Knee Point Voltage (P54x)',    expression: 'VA * ALF / In + Rct * ALF * In',                    variables: ['VA','ALF','In','Rct'],          type: 'equation',         description: 'Vk = (VA × ALF) / In + (Rct × ALF × In)' },
  { name: 'Differential Protection Vk',  expression: 'K * In * (Rct + 2 * RL)',                           variables: ['K','In','Rct','RL'],             type: 'inequality_gte',   description: 'Vk ≥ K × In × (Rct + 2RL)' },
  { name: 'Distance Protection Vk',      expression: 'K_RPA * If * (1 + XR) * (Rct + RL)',                variables: ['K_RPA','If','XR','Rct','RL'],    type: 'inequality_gte',   description: 'Vk ≥ K_RPA × If × (1 + X/R) × (Rct + RL)' },
  { name: 'Close-up Fault Vk',           expression: 'Kmax * Ifmax * (Rct + RL)',                         variables: ['Kmax','Ifmax','Rct','RL'],       type: 'inequality_gte',   description: 'Vk ≥ Kmax × Ifmax × (Rct + RL)' },
  { name: 'IEEE C-Class Vk',             expression: '1.05 * C + 100 * Rct',                              variables: ['C','Rct'],                       type: 'equation',         description: 'Vk = 1.05 × C + 100 × Rct' },
  { name: 'K Factor (no transient)',      expression: '40 + 0.07 * If * XR',                              variables: ['If','XR'],                       type: 'equation',         description: 'K = 40 + 0.07 × If × X/R' },
  { name: 'K Factor (with transient)',    expression: '(1.42 * If + 53.7) * (0.00606 * XR + 0.515)',      variables: ['If','XR'],                       type: 'equation',         description: 'K = (1.42If + 53.7)(6.06E-3 × X/R + 0.515)' },
];

export default function RelayFormulasPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [formulas, setFormulas] = useState<StoredFormula[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [testVars, setTestVars] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string>('');
  const [testingId,  setTestingId]  = useState<string | null>(null);

  const [form, setForm] = useState({
    relayName: '', name: '', expression: '', variables: '',
    type: 'equation' as RelayFormula['type'], description: '',
  });

  const load = () => {
    fetch('/api/relay-formulas')
      .then(r => r.json())
      .then(d => setFormulas(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch('/api/relay-formulas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, variables: form.variables.split(',').map(v => v.trim()).filter(Boolean) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOpen(false);
      setForm({ relayName: '', name: '', expression: '', variables: '', type: 'equation', description: '' });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/relay-formulas/${id}`, { method: 'DELETE' });
    load();
  };

  const handleValidate = async (id: string) => {
    await fetch(`/api/relay-formulas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validated: true }),
    });
    load();
  };

  const handleTest = (formula: RelayFormula & { id?: string }) => {
    setTestingId(formula.id ?? formula.name);
    const vars: Record<string, string> = {};
    for (const v of formula.variables) vars[v] = '';
    setTestVars(vars);
    setTestResult('');
  };

  const runTest = (formula: RelayFormula) => {
    try {
      const ctx = Object.fromEntries(Object.entries(testVars).map(([k, v]) => [k, parseFloat(v)]));
      const r   = evaluateRelayFormula(formula, ctx);
      setTestResult(`Result: ${r.result}  |  ${r.expression_substituted}`);
    } catch (e) {
      setTestResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  };

  const grouped = formulas.reduce<Record<string, StoredFormula[]>>((acc, f) => {
    (acc[f.relayName] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Relay Formula Library</h2>
          <p className="text-sm text-muted-foreground">Dynamic formula store — no hardcoded relay logic</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Formula</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Relay Formula</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-3 mt-2">
              {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Relay Name *</label>
                  <Input value={form.relayName} onChange={e => setForm(p => ({...p, relayName: e.target.value}))} placeholder="e.g. P54x, RED670" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Formula Name *</label>
                  <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Knee Point Voltage" required />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Expression * <span className="text-muted-foreground">(use variable names)</span></label>
                <Input value={form.expression} onChange={e => setForm(p => ({...p, expression: e.target.value}))} placeholder="e.g. VA * ALF / In + Rct * ALF * In" required className="font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Variables <span className="text-muted-foreground">(comma-separated)</span></label>
                  <Input value={form.variables} onChange={e => setForm(p => ({...p, variables: e.target.value}))} placeholder="VA, ALF, In, Rct" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Type</label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({...p, type: v as RelayFormula['type']}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equation">Equation (=)</SelectItem>
                      <SelectItem value="inequality_gte">Inequality (≥)</SelectItem>
                      <SelectItem value="inequality_lte">Inequality (≤)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Description</label>
                <Textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Human-readable formula description" className="min-h-16 text-sm" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save Formula'}</Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Built-in formulas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Built-in Formulas (P54x / IEC 61869)</CardTitle>
          <CardDescription className="text-xs">Pre-loaded from relay application guides — read only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {BUILTIN_FORMULAS.map(f => (
            <div key={f.name} className="rounded-lg border border-border px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-primary/40 text-primary">{f.type === 'equation' ? '=' : '≥'}</Badge>
                  <span className="text-sm font-medium">{f.name}</span>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => handleTest(f)}>
                    <FlaskConical className="h-3 w-3" />Test
                  </Button>
                </div>
              </div>
              <code className="text-xs font-mono text-muted-foreground block">{f.expression}</code>
              <p className="text-xs text-muted-foreground">{f.description}</p>

              {testingId === f.name && (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    {f.variables.map(v => (
                      <div key={v} className="space-y-0.5">
                        <label className="text-xs text-muted-foreground">{v}</label>
                        <Input type="number" step="any" className="h-7 text-xs font-mono" value={testVars[v] ?? ''} onChange={e => setTestVars(p => ({...p, [v]: e.target.value}))} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => runTest(f)}><FlaskConical className="h-3 w-3" />Evaluate</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setTestingId(null)}>Close</Button>
                    {testResult && <code className="text-xs font-mono text-green-400 flex-1">{testResult}</code>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* User-defined formulas */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No custom formulas yet. Add formulas from relay manuals.</CardContent></Card>
      ) : (
        Object.entries(grouped).map(([relayName, list]) => (
          <Card key={relayName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{relayName}</CardTitle>
              <CardDescription className="text-xs">{list.length} formula{list.length !== 1 ? 's' : ''} · {list.filter(f => f.validated).length} validated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {list.map(f => (
                <div key={f.id} className="rounded-lg border border-border px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{f.type === 'equation' ? '=' : '≥'}</Badge>
                      <span className="text-sm font-medium">{f.name}</span>
                      {f.validated
                        ? <Badge className="bg-green-700 text-xs gap-1"><CheckCircle className="h-3 w-3" />Validated</Badge>
                        : <Badge variant="outline" className="text-xs border-amber-600 text-amber-500">Unvalidated</Badge>}
                    </div>
                    <div className="flex gap-1">
                      {!f.validated && (
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleValidate(f.id)}>Validate</Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => handleTest(f)}>
                        <FlaskConical className="h-3 w-3" />Test
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-destructive hover:bg-destructive/10 px-2" onClick={() => handleDelete(f.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <code className="text-xs font-mono text-muted-foreground block">{f.expression}</code>
                  {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}

                  {testingId === f.id && (
                    <div className="mt-2 space-y-2 border-t border-border pt-2">
                      <div className="grid grid-cols-3 gap-2">
                        {f.variables.map(v => (
                          <div key={v} className="space-y-0.5">
                            <label className="text-xs text-muted-foreground">{v}</label>
                            <Input type="number" step="any" className="h-7 text-xs font-mono" value={testVars[v] ?? ''} onChange={e => setTestVars(p => ({...p, [v]: e.target.value}))} />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => runTest(f)}><FlaskConical className="h-3 w-3" />Evaluate</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setTestingId(null)}>Close</Button>
                        {testResult && <code className="text-xs font-mono text-green-400 flex-1">{testResult}</code>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
