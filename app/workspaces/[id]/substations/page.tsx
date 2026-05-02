'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus, Building2, ChevronRight, CheckCircle,
  AlertTriangle, HelpCircle, AlertCircle, Zap,
} from 'lucide-react';

interface IEDResult {
  id: string; templateName: string; verdict: string;
  vk_required: number; vk_available: number; createdAt: string;
}
interface IED {
  id: string; name: string; model: string; functions: string[];
  ct: { ratio: string; class: string; rct: number; vk: number };
  latestResult: IEDResult | null;
}
interface Bay {
  id: string; name: string; type: string; voltage: string; ieds: IED[];
}
interface Substation {
  id: string; name: string; voltageLevel: string; location: string; bays: Bay[];
}
interface Summary { totalIEDs: number; adequate: number; underDim: number; notChecked: number }

const BAY_TYPE_COLOR: Record<string, string> = {
  FEEDER: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  TRANSFORMER: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  BUSBAR: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  COUPLER: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  OTHER: 'bg-muted text-muted-foreground',
};

function VerdictIcon({ verdict }: { verdict: string | null }) {
  if (!verdict) return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  return verdict === 'SUITABLY DIMENSIONED'
    ? <CheckCircle className="h-4 w-4 text-green-500" />
    : <AlertTriangle className="h-4 w-4 text-red-500" />;
}

export default function SubstationsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [loading, setLoading]       = useState(true);
  const [tree, setTree]             = useState<Substation[]>([]);
  const [summary, setSummary]       = useState<Summary | null>(null);
  const [error, setError]           = useState('');
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [subForm, setSubForm]       = useState({ name: '', voltageLevel: '', location: '', description: '' });
  const [saving, setSaving]         = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/workspaces/${workspaceId}/hierarchy`)
      .then(r => r.json())
      .then(d => { setTree(d.tree ?? []); setSummary(d.summary ?? null); })
      .catch(() => setError('Failed to load hierarchy'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [workspaceId]);

  const handleAddSubstation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/substations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setAddSubOpen(false);
      setSubForm({ name: '', voltageLevel: '', location: '', description: '' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add substation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Substations</h2>
          <p className="text-sm text-muted-foreground">Substation → Bay → IED hierarchy</p>
        </div>
        <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Substation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Substation</DialogTitle></DialogHeader>
            <form onSubmit={handleAddSubstation} className="space-y-3 mt-2">
              {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-1">
                <label className="text-sm font-medium">Substation Name *</label>
                <Input value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 33kV DF5W SS" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Voltage Level</label>
                  <Input value={subForm.voltageLevel} onChange={e => setSubForm(p => ({ ...p, voltageLevel: e.target.value }))} placeholder="e.g. 33kV" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Location</label>
                  <Input value={subForm.location} onChange={e => setSubForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Site A" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <Input value={subForm.description} onChange={e => setSubForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Create Substation'}</Button>
                <Button type="button" variant="outline" onClick={() => setAddSubOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary bar */}
      {summary && summary.totalIEDs > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total IEDs',    value: summary.totalIEDs,  color: 'text-foreground' },
            { label: 'Adequate',      value: summary.adequate,   color: 'text-green-500'  },
            { label: 'Under Dim.',    value: summary.underDim,   color: 'text-red-500'    },
            { label: 'Not Checked',   value: summary.notChecked, color: 'text-muted-foreground' },
          ].map(s => (
            <Card key={s.label} className="text-center py-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {tree.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No substations yet.</p>
            <p className="text-xs text-muted-foreground">Add a substation to start organising your IEDs by bay.</p>
          </CardContent>
        </Card>
      )}

      {/* Substation tree */}
      {tree.map(sub => (
        <Card key={sub.id} className="overflow-hidden">
          <CardHeader className="bg-muted/40 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">{sub.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {[sub.voltageLevel, sub.location].filter(Boolean).join(' · ')}
                  </CardDescription>
                </div>
              </div>
              <Link href={`/workspaces/${workspaceId}/substations/${sub.id}`}>
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  Manage <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {sub.bays.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No bays yet —{' '}
                <Link href={`/workspaces/${workspaceId}/substations/${sub.id}`} className="text-primary hover:underline">
                  add bays
                </Link>
              </p>
            ) : (
              sub.bays.map(bay => (
                <div key={bay.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${BAY_TYPE_COLOR[bay.type] ?? BAY_TYPE_COLOR.OTHER}`}>
                        {bay.type}
                      </span>
                      <span className="text-sm font-medium">{bay.name}</span>
                      {bay.voltage && <span className="text-xs text-muted-foreground">{bay.voltage}</span>}
                    </div>
                    <Link href={`/workspaces/${workspaceId}/substations/${sub.id}/bays/${bay.id}`}>
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                        IEDs <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>

                  {/* IED list */}
                  {bay.ieds.length > 0 && (
                    <div className="grid gap-1.5 pl-2">
                      {bay.ieds.map(ied => (
                        <div key={ied.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                          <div className="flex items-center gap-2">
                            <VerdictIcon verdict={ied.latestResult?.verdict ?? null} />
                            <div>
                              <span className="text-sm font-medium">{ied.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{ied.model}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {ied.latestResult ? (
                              <span className={`text-xs font-mono ${ied.latestResult.verdict === 'SUITABLY DIMENSIONED' ? 'text-green-500' : 'text-red-500'}`}>
                                Vk {ied.latestResult.vk_available}V / {ied.latestResult.vk_required}V req
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not checked</span>
                            )}
                            <Link href={`/workspaces/${workspaceId}/computations/new?iedId=${ied.id}`}>
                              <Button variant="outline" size="sm" className="h-6 text-xs gap-1">
                                <Zap className="h-3 w-3" />Check
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
