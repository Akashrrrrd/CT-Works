'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, CheckCircle, AlertTriangle, HelpCircle, Zap, AlertCircle } from 'lucide-react';

const BAY_TYPES = ['FEEDER', 'TRANSFORMER', 'BUSBAR', 'COUPLER', 'OTHER'];
const IED_MODELS = ['RED670', 'REB670', 'REF615', 'REL670', 'REQ650', 'REB500', 'SEL-421', 'SEL-311C', 'P443', 'P142', 'OTHER'];
const FUNCTIONS = [
  { value: 'tpl-differential',    label: 'Differential' },
  { value: 'tpl-distance',        label: 'Distance' },
  { value: 'tpl-breaker-failure', label: 'Breaker Failure' },
];

const BAY_TYPE_COLOR: Record<string, string> = {
  FEEDER: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  TRANSFORMER: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  BUSBAR: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  COUPLER: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  OTHER: 'bg-muted text-muted-foreground',
};

interface IED { id: string; name: string; model: string; functions: string[]; ct: { ratio: string; class: string; rct: number; vk: number; io: number }; latestResult: { verdict: string; vk_required: number; vk_available: number } | null }
interface Bay { id: string; name: string; type: string; voltage: string; ieds: IED[] }

export default function SubstationDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const subId       = params.subId as string;

  const [loading, setLoading]     = useState(true);
  const [bays, setBays]           = useState<Bay[]>([]);
  const [subName, setSubName]     = useState('');
  const [error, setError]         = useState('');

  // Bay form
  const [bayOpen, setBayOpen]     = useState(false);
  const [bayForm, setBayForm]     = useState({ name: '', type: 'FEEDER', voltage: '', description: '' });

  // IED form
  const [iedOpen, setIedOpen]     = useState(false);
  const [iedBayId, setIedBayId]   = useState('');
  const [iedForm, setIedForm]     = useState({
    name: '', model: 'RED670', serialNumber: '',
    functions: [] as string[],
    ctRatio: '', ctClass: 'PX', rct: '', vk: '', io: '',
  });
  const [saving, setSaving]       = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/workspaces/${workspaceId}/hierarchy`)
      .then(r => r.json())
      .then(d => {
        const sub = (d.tree ?? []).find((s: any) => s.id === subId);
        if (sub) { setSubName(sub.name); setBays(sub.bays ?? []); }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [subId]);

  const addBay = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/substations/${subId}/bays`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bayForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setBayOpen(false); setBayForm({ name: '', type: 'FEEDER', voltage: '', description: '' }); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const addIED = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/substations/${subId}/bays/${iedBayId}/ieds`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...iedForm, rct: parseFloat(iedForm.rct) || 0, vk: parseFloat(iedForm.vk) || 0, io: parseFloat(iedForm.io) || 0 }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setIedOpen(false);
      setIedForm({ name: '', model: 'RED670', serialNumber: '', functions: [], ctRatio: '', ctClass: 'PX', rct: '', vk: '', io: '' });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const toggleFn = (fn: string) => setIedForm(p => ({
    ...p, functions: p.functions.includes(fn) ? p.functions.filter(f => f !== fn) : [...p.functions, fn],
  }));

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}/substations`}>
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Substations</Button>
          </Link>
          <h2 className="text-xl font-bold">{subName}</h2>
        </div>
        <Dialog open={bayOpen} onOpenChange={setBayOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Bay</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Bay</DialogTitle></DialogHeader>
            <form onSubmit={addBay} className="space-y-3 mt-2">
              {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-1">
                <label className="text-sm font-medium">Bay Name *</label>
                <Input value={bayForm.name} onChange={e => setBayForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Feeder 1 – Incoming" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={bayForm.type} onValueChange={v => setBayForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BAY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Voltage</label>
                  <Input value={bayForm.voltage} onChange={e => setBayForm(p => ({ ...p, voltage: e.target.value }))} placeholder="e.g. 33kV" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Add Bay'}</Button>
                <Button type="button" variant="outline" onClick={() => setBayOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {bays.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No bays yet. Add a bay to start adding IEDs.</CardContent></Card>
      )}

      {bays.map(bay => (
        <Card key={bay.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${BAY_TYPE_COLOR[bay.type] ?? BAY_TYPE_COLOR.OTHER}`}>{bay.type}</span>
                <CardTitle className="text-base">{bay.name}</CardTitle>
                {bay.voltage && <span className="text-xs text-muted-foreground">{bay.voltage}</span>}
              </div>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
                onClick={() => { setIedBayId(bay.id); setIedOpen(true); }}>
                <Plus className="h-3 w-3" />Add IED
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {bay.ieds.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No IEDs in this bay yet.</p>
            )}
            {bay.ieds.map(ied => {
              const ok = ied.latestResult?.verdict === 'SUITABLY DIMENSIONED';
              return (
                <div key={ied.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    {!ied.latestResult
                      ? <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      : ok ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                    <div>
                      <p className="text-sm font-medium">{ied.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ied.model} · CT {ied.ct.ratio || '—'} · {ied.functions.map(f => FUNCTIONS.find(x => x.value === f)?.label ?? f).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ied.latestResult ? (
                      <span className={`text-xs font-mono ${ok ? 'text-green-500' : 'text-red-500'}`}>
                        {ied.latestResult.vk_available}V / {ied.latestResult.vk_required}V req
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not checked</span>
                    )}
                    <Link href={`/workspaces/${workspaceId}/computations/new?iedId=${ied.id}`}>
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                        <Zap className="h-3 w-3" />Run Check
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Add IED Dialog */}
      <Dialog open={iedOpen} onOpenChange={setIedOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add IED to Bay</DialogTitle></DialogHeader>
          <form onSubmit={addIED} className="space-y-3 mt-2">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">IED Tag / Name *</label>
                <Input value={iedForm.name} onChange={e => setIedForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. T1-RED670" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Model *</label>
                <Select value={iedForm.model} onValueChange={v => setIedForm(p => ({ ...p, model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{IED_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Protection Functions</label>
              <div className="flex gap-2 flex-wrap">
                {FUNCTIONS.map(f => (
                  <button key={f.value} type="button"
                    onClick={() => toggleFn(f.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                      ${iedForm.functions.includes(f.value) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">CT Nameplate Data</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">CT Ratio</label>
                <Input value={iedForm.ctRatio} onChange={e => setIedForm(p => ({ ...p, ctRatio: e.target.value }))} placeholder="800/1" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Class</label>
                <Input value={iedForm.ctClass} onChange={e => setIedForm(p => ({ ...p, ctClass: e.target.value }))} placeholder="PX" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Rct (Ω)</label>
                <Input type="number" step="any" value={iedForm.rct} onChange={e => setIedForm(p => ({ ...p, rct: e.target.value }))} placeholder="3.5" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Vk (V)</label>
                <Input type="number" step="any" value={iedForm.vk} onChange={e => setIedForm(p => ({ ...p, vk: e.target.value }))} placeholder="540" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Io at Vk (mA)</label>
                <Input type="number" step="any" value={iedForm.io} onChange={e => setIedForm(p => ({ ...p, io: e.target.value }))} placeholder="20" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Serial No.</label>
                <Input value={iedForm.serialNumber} onChange={e => setIedForm(p => ({ ...p, serialNumber: e.target.value }))} placeholder="Optional" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Add IED'}</Button>
              <Button type="button" variant="outline" onClick={() => setIedOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
