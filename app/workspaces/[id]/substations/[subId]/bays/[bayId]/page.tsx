'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, AlertCircle, Edit, Trash2, MoreVertical, Cpu, CheckCircle, AlertTriangle, HelpCircle, Zap, Calculator, Loader2, Download, GitCompare } from 'lucide-react';

const IED_MODELS = ['RED670', 'REB670', 'REF615', 'REL670', 'REQ650', 'REB500', 'SEL-421', 'SEL-311C', 'P443', 'P142', 'OTHER'];

// Model-based protection functions mapping
const MODEL_FUNCTIONS: Record<string, string[]> = {
  'RED670': ['tpl-differential', 'tpl-distance', 'tpl-breaker-failure'], // All 3 functions
  'REB670': ['tpl-differential'], // Only differential (busbar protection)
  'REF615': ['tpl-differential'], // Only differential (feeder protection)
  'REL670': ['tpl-distance'], // Only distance protection
  'REQ650': ['tpl-breaker-failure'], // Only breaker failure
  'REB500': ['tpl-differential', 'tpl-breaker-failure'], // 2 functions
  'SEL-421': ['tpl-differential', 'tpl-distance'], // 2 functions
  'SEL-311C': ['tpl-distance'], // Only distance
  'P443': ['tpl-differential', 'tpl-distance'], // 2 functions
  'P142': ['tpl-distance'], // Only distance
  'OTHER': ['tpl-differential', 'tpl-distance', 'tpl-breaker-failure'], // All 3 for custom
};

const FUNCTIONS = [
  { value: 'tpl-differential',    label: 'Differential' },
  { value: 'tpl-distance',        label: 'Distance' },
  { value: 'tpl-breaker-failure', label: 'Breaker Failure' },
];

interface IED { 
  id: string; 
  name: string; 
  model: string; 
  functions: string[]; 
  ct: { ratio: string; class: string; rct: number; vk: number; io: number };
  latestResult?: { verdict: string; vk_required: number; vk_available: number } | null;
}

interface ComputationResult {
  verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  vk_required: number;
  vk_available: number;
  ealreq_max: number;
  vk_breakdown: { label: string; ealreq: number; vk: number; isMax: boolean }[];
  intermediates: Record<string, number | string>;
}

interface Template { 
  id: string; 
  name: string; 
  description: string; 
  relay: string; 
  iedType: string; 
}

function VerdictIcon({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  return verdict === 'SUITABLY DIMENSIONED'
    ? <CheckCircle className="h-4 w-4 text-green-500" />
    : <AlertTriangle className="h-4 w-4 text-red-500" />;
}

export default function IEDsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const subId = params.subId as string;
  const bayId = params.bayId as string;

  const [loading, setLoading] = useState(true);
  const [ieds, setIeds] = useState<IED[]>([]);
  const [bayName, setBayName] = useState('');
  const [subName, setSubName] = useState('');
  const [error, setError] = useState('');

  // IED form states
  const [iedOpen, setIedOpen] = useState(false);
  const [editIedOpen, setEditIedOpen] = useState(false);
  const [deleteIedOpen, setDeleteIedOpen] = useState(false);
  const [editingIed, setEditingIed] = useState<IED | null>(null);
  const [deletingIed, setDeletingIed] = useState<IED | null>(null);
  
  // Computation dialog states
  const [computationOpen, setComputationOpen] = useState(false);
  const [computingIed, setComputingIed] = useState<IED | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [computing, setComputing] = useState(false);
  const [computationResult, setComputationResult] = useState<ComputationResult | null>(null);
  const [systemParams, setSystemParams] = useState({
    frequency: '50',
    bus_voltage_kv: '33',
    max_bus_fault_mva: '1000',
    r1: '0.1',
    x1: '0.4',
    r0: '0.3',
    x0: '1.2',
    route_length_km: '1.0',
    relay_burden_va: '5.0',
    lead_resistance: '0.05'
  });
  
  // Compare states
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIeds, setSelectedIeds] = useState<string[]>([]);
  
  const [iedForm, setIedForm] = useState({
    name: '', 
    model: 'RED670', 
    functions: MODEL_FUNCTIONS['RED670'] || [], // Set default functions for RED670
    ctRatio: '', 
    ctClass: 'PX', 
    rct: '', 
    vk: '', 
    io: '',
  });
  
  const [editForm, setEditForm] = useState({
    name: '', 
    model: 'RED670', 
    functions: MODEL_FUNCTIONS['RED670'] || [],
    ctRatio: '', 
    ctClass: 'PX', 
    rct: '', 
    vk: '', 
    io: '',
  });

  const [saving, setSaving] = useState(false);

  // Handle model change to automatically set functions
  const handleModelChange = (model: string, isEdit: boolean = false) => {
    const functions = MODEL_FUNCTIONS[model] || [];
    if (isEdit) {
      setEditForm(p => ({ ...p, model, functions }));
    } else {
      setIedForm(p => ({ ...p, model, functions }));
    }
  };

  const load = () => {
    setLoading(true);
    fetch(`/api/workspaces/${workspaceId}/hierarchy`)
      .then(r => r.json())
      .then(d => {
        const sub = (d.tree ?? []).find((s: any) => s.id === subId);
        if (sub) {
          setSubName(sub.name);
          const bay = sub.bays?.find((b: any) => b.id === bayId);
          if (bay) {
            setBayName(bay.name);
            setIeds(bay.ieds ?? []);
          }
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [bayId]);

  // Load templates for computations
  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/templates`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTemplates(data);
        }
      })
      .catch(console.error);
  }, [workspaceId]);

  const openComputationDialog = (ied: IED) => {
    setComputingIed(ied);
    setComputationResult(null);
    
    // Auto-select template based on IED model
    const modelToTemplate: Record<string, string> = {
      'RED670': 'tpl-differential',
      'REB670': 'tpl-differential', 
      'REF615': 'tpl-differential',
      'REL670': 'tpl-distance',
      'REQ650': 'tpl-breaker-failure',
      'REB500': 'tpl-differential',
      'SEL-421': 'tpl-differential',
      'SEL-311C': 'tpl-distance',
      'P443': 'tpl-differential',
      'P142': 'tpl-distance',
    };
    
    const primaryFunction = modelToTemplate[ied.model];
    if (primaryFunction && templates.length > 0) {
      const matchingTemplate = templates.find(t => t.iedType === primaryFunction);
      setSelectedTemplate(matchingTemplate || templates[0] || null);
    }
    
    setComputationOpen(true);
  };

  const runComputation = async () => {
    if (!computingIed || !selectedTemplate) return;
    
    setComputing(true);
    try {
      const parse = (v: string) => { const n = parseFloat(v); if (isNaN(n)) throw new Error(`Invalid value: "${v}"`); return n; };
      
      const [primary, secondary] = computingIed.ct.ratio.split('/');
      const sheet1 = {
        ct_ratio_primary: parse(primary || '1'),
        ct_ratio_secondary: parse(secondary || '1'),
        accuracy_class: computingIed.ct.class,
        rct: computingIed.ct.rct,
        vk_available: computingIed.ct.vk,
        io_at_vk: computingIed.ct.io,
      };
      
      const sheet2 = {
        frequency: parse(systemParams.frequency),
        bus_voltage_kv: parse(systemParams.bus_voltage_kv),
        max_bus_fault_mva: parse(systemParams.max_bus_fault_mva),
        r1: parse(systemParams.r1),
        x1: parse(systemParams.x1),
        r0: parse(systemParams.r0),
        x0: parse(systemParams.x0),
        route_length_km: parse(systemParams.route_length_km),
        relay_burden_va: parse(systemParams.relay_burden_va),
        lead_resistance: parse(systemParams.lead_resistance),
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/computations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate.id, sheet1, sheet2 }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Computation failed');
      
      setComputationResult(data);
      // Refresh IED data to show updated result
      load();
    } catch (error) {
      console.error('Computation error:', error);
      alert(error instanceof Error ? error.message : 'Computation failed');
    } finally {
      setComputing(false);
    }
  };

  const addIED = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/substations/${subId}/bays/${bayId}/ieds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...iedForm,
          rct: parseFloat(iedForm.rct) || 0,
          vk: parseFloat(iedForm.vk) || 0,
          io: parseFloat(iedForm.io) || 0
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setIedOpen(false);
      setIedForm({
        name: '', 
        model: 'RED670', 
        functions: MODEL_FUNCTIONS['RED670'] || [],
        ctRatio: '', 
        ctClass: 'PX', 
        rct: '', 
        vk: '', 
        io: '',
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add IED');
    } finally {
      setSaving(false);
    }
  };

  const handleEditIed = (ied: IED) => {
    setEditingIed(ied);
    setEditForm({
      name: ied.name,
      model: ied.model,
      functions: [...ied.functions],
      ctRatio: ied.ct.ratio,
      ctClass: ied.ct.class,
      rct: ied.ct.rct.toString(),
      vk: ied.ct.vk.toString(),
      io: ied.ct.io.toString(),
    });
    setEditIedOpen(true);
  };

  const updateIed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIed) return;
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/substations/${subId}/bays/${bayId}/ieds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iedId: editingIed.id,
          ...editForm,
          rct: parseFloat(editForm.rct) || 0,
          vk: parseFloat(editForm.vk) || 0,
          io: parseFloat(editForm.io) || 0
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setEditIedOpen(false);
      setEditingIed(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update IED');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIed = (ied: IED) => {
    setDeletingIed(ied);
    setDeleteIedOpen(true);
  };

  const confirmDeleteIed = async () => {
    if (!deletingIed) return;
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/substations/${subId}/bays/${bayId}/ieds`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iedId: deletingIed.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setDeleteIedOpen(false);
      setDeletingIed(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete IED');
    } finally {
      setSaving(false);
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedIeds([]);
  };

  const toggleIedSelection = (iedId: string) => {
    if (selectedIeds.includes(iedId)) {
      setSelectedIeds(prev => prev.filter(id => id !== iedId));
    } else if (selectedIeds.length < 3) {
      setSelectedIeds(prev => [...prev, iedId]);
    }
  };

  const handleCompareIeds = () => {
    if (selectedIeds.length >= 2) {
      router.push(`/workspaces/${workspaceId}/substations/${subId}/bays/${bayId}/compare?ieds=${selectedIeds.join(',')}`);
    }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}/substations/${subId}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />{subName}
            </Button>
          </Link>
          <h2 className="text-xl font-bold">{bayName}</h2>
        </div>
        <div className="flex gap-2">
          {compareMode && selectedIeds.length >= 2 && (
            <Button onClick={handleCompareIeds} className="gap-2">
              <GitCompare className="h-4 w-4" />
              Compare ({selectedIeds.length})
            </Button>
          )}
          <Button 
            variant={compareMode ? "default" : "outline"} 
            onClick={toggleCompareMode} 
            className="gap-2"
          >
            <GitCompare className="h-4 w-4" />
            {compareMode ? 'Cancel Compare' : 'Compare IEDs'}
          </Button>
        </div>
      </div>

      {/* IEDs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* New IED Card */}
        <Card 
          className="aspect-square flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 transition-colors"
          onClick={() => setIedOpen(true)}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">New IED</p>
          </CardContent>
        </Card>

        {/* Existing IEDs */}
        {ieds.map(ied => {
          const hasResult = ied.latestResult && ied.latestResult.verdict;
          const isAdequate = hasResult && ied.latestResult?.verdict === 'SUITABLY DIMENSIONED';
          
          return (
            <Card 
              key={ied.id} 
              className={`aspect-square relative cursor-pointer hover:shadow-md transition-shadow group ${
                compareMode 
                  ? selectedIeds.includes(ied.id)
                    ? 'ring-2 ring-primary bg-primary/5'
                    : selectedIeds.length >= 3
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:ring-1 hover:ring-primary/50'
                  : ''
              }`}
              onClick={() => compareMode 
                ? toggleIedSelection(ied.id)
                : openComputationDialog(ied)
              }
            >
              <CardContent className="p-4 h-full flex flex-col justify-between">
                {/* Compare mode selection or Three-dot menu */}
                <div className="flex justify-between items-start">
                  <VerdictIcon verdict={ied.latestResult?.verdict} />
                  {compareMode && selectedIeds.includes(ied.id) ? (
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {selectedIeds.indexOf(ied.id) + 1}
                    </div>
                  ) : !compareMode ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditIed(ied); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleDeleteIed(ied); }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>

                {/* IED Content */}
                <div className="flex-1 flex flex-col justify-center text-center">
                  <Cpu className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold text-sm leading-tight mb-1">{ied.name}</h3>
                  <p className="text-xs text-muted-foreground mb-1">{ied.model}</p>
                  {ied.ct.ratio && (
                    <p className="text-xs text-muted-foreground">CT {ied.ct.ratio}</p>
                  )}
                </div>

                {/* Status */}
                <div className="text-center">
                  {hasResult ? (
                    <div className="space-y-1">
                      <span className={`text-xs font-mono ${isAdequate ? 'text-green-500' : 'text-red-500'}`}>
                        {ied.latestResult?.vk_available}V / {ied.latestResult?.vk_required}V
                      </span>
                      <p className={`text-[10px] font-semibold ${isAdequate ? 'text-green-500' : 'text-red-500'}`}>
                        {isAdequate ? 'ADEQUATE' : 'UNDER DIM'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Not Checked</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialogs */}
      <Dialog open={iedOpen} onOpenChange={setIedOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New IED</DialogTitle></DialogHeader>
          <form onSubmit={addIED} className="space-y-4 mt-2">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">IED Tag / Name *</label>
                <Input 
                  value={iedForm.name} 
                  onChange={e => setIedForm(p => ({ ...p, name: e.target.value }))} 
                  placeholder="e.g. T1-RED670" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Model *</label>
                <Select value={iedForm.model} onValueChange={v => handleModelChange(v, false)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IED_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">CT Nameplate Data</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">CT Ratio</label>
                  <Input 
                    value={iedForm.ctRatio} 
                    onChange={e => setIedForm(p => ({ ...p, ctRatio: e.target.value }))} 
                    placeholder="800/1" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Class</label>
                  <Input 
                    value={iedForm.ctClass} 
                    onChange={e => setIedForm(p => ({ ...p, ctClass: e.target.value }))} 
                    placeholder="PX" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Rct (Ω)</label>
                  <Input 
                    type="number" 
                    step="any" 
                    value={iedForm.rct} 
                    onChange={e => setIedForm(p => ({ ...p, rct: e.target.value }))} 
                    placeholder="3.5" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Vk (V)</label>
                  <Input 
                    type="number" 
                    step="any" 
                    value={iedForm.vk} 
                    onChange={e => setIedForm(p => ({ ...p, vk: e.target.value }))} 
                    placeholder="540" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Io at Vk (mA)</label>
                  <Input 
                    type="number" 
                    step="any" 
                    value={iedForm.io} 
                    onChange={e => setIedForm(p => ({ ...p, io: e.target.value }))} 
                    placeholder="20" 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Creating...' : 'Create IED'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIedOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit IED Dialog */}
      <Dialog open={editIedOpen} onOpenChange={setEditIedOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit IED</DialogTitle></DialogHeader>
          <form onSubmit={updateIed} className="space-y-4 mt-2">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">IED Tag / Name *</label>
                <Input 
                  value={editForm.name} 
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} 
                  placeholder="e.g. T1-RED670" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Model *</label>
                <Select value={editForm.model} onValueChange={v => handleModelChange(v, true)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IED_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">CT Nameplate Data</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">CT Ratio</label>
                  <Input 
                    value={editForm.ctRatio} 
                    onChange={e => setEditForm(p => ({ ...p, ctRatio: e.target.value }))} 
                    placeholder="800/1" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Class</label>
                  <Input 
                    value={editForm.ctClass} 
                    onChange={e => setEditForm(p => ({ ...p, ctClass: e.target.value }))} 
                    placeholder="PX" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Rct (Ω)</label>
                  <Input 
                    type="number" 
                    step="any" 
                    value={editForm.rct} 
                    onChange={e => setEditForm(p => ({ ...p, rct: e.target.value }))} 
                    placeholder="3.5" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Vk (V)</label>
                  <Input 
                    type="number" 
                    step="any" 
                    value={editForm.vk} 
                    onChange={e => setEditForm(p => ({ ...p, vk: e.target.value }))} 
                    placeholder="540" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Io at Vk (mA)</label>
                  <Input 
                    type="number" 
                    step="any" 
                    value={editForm.io} 
                    onChange={e => setEditForm(p => ({ ...p, io: e.target.value }))} 
                    placeholder="20" 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Updating...' : 'Update IED'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditIedOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete IED Dialog */}
      <Dialog open={deleteIedOpen} onOpenChange={setDeleteIedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete IED</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "<span className="font-medium">{deletingIed?.name}</span>"? 
            </p>
            <p className="text-sm text-muted-foreground">
              This will also delete all associated computation results. This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="destructive" 
                disabled={saving} 
                className="flex-1"
                onClick={confirmDeleteIed}
              >
                {saving ? 'Deleting...' : 'Delete IED'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDeleteIedOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Computation Dialog */}
      <Dialog open={computationOpen} onOpenChange={setComputationOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              CT Adequacy Check - {computingIed?.name} ({computingIed?.model})
            </DialogTitle>
          </DialogHeader>
          
          {computingIed && (
            <div className="space-y-6 mt-4">
              {/* IED Info */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">IED:</span> {computingIed.name}</div>
                    <div><span className="font-medium">Model:</span> {computingIed.model}</div>
                    <div><span className="font-medium">CT Ratio:</span> {computingIed.ct.ratio}</div>
                    <div><span className="font-medium">CT Class:</span> {computingIed.ct.class}</div>
                    <div><span className="font-medium">Rct:</span> {computingIed.ct.rct}Ω</div>
                    <div><span className="font-medium">Vk Available:</span> {computingIed.ct.vk}V</div>
                  </div>
                </CardContent>
              </Card>

              {/* Template Selection */}
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Protection Function Template</label>
                    <div className="bg-muted rounded p-3">
                      {selectedTemplate ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{selectedTemplate.iedType}</Badge>
                            <span className="font-medium">{selectedTemplate.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No template selected</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Parameters */}
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-3">System Parameters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm">System Frequency (Hz)</label>
                      <Input 
                        type="number" 
                        value={systemParams.frequency}
                        onChange={e => setSystemParams(p => ({ ...p, frequency: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm">Bus Voltage (kV)</label>
                      <Input 
                        type="number" 
                        value={systemParams.bus_voltage_kv}
                        onChange={e => setSystemParams(p => ({ ...p, bus_voltage_kv: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm">Max Bus Fault (MVA)</label>
                      <Input 
                        type="number" 
                        value={systemParams.max_bus_fault_mva}
                        onChange={e => setSystemParams(p => ({ ...p, max_bus_fault_mva: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm">Route Length (km)</label>
                      <Input 
                        type="number" 
                        value={systemParams.route_length_km}
                        onChange={e => setSystemParams(p => ({ ...p, route_length_km: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm">Relay Burden (VA)</label>
                      <Input 
                        type="number" 
                        value={systemParams.relay_burden_va}
                        onChange={e => setSystemParams(p => ({ ...p, relay_burden_va: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm">Lead Resistance (Ω)</label>
                      <Input 
                        type="number" 
                        value={systemParams.lead_resistance}
                        onChange={e => setSystemParams(p => ({ ...p, lead_resistance: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results */}
              {computationResult && (
                <Card className={computationResult.verdict === 'SUITABLY DIMENSIONED' ? 'border-green-700 bg-green-950/20' : 'border-red-700 bg-red-950/20'}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-4">
                      {computationResult.verdict === 'SUITABLY DIMENSIONED'
                        ? <CheckCircle className="h-6 w-6 text-green-500" />
                        : <AlertTriangle className="h-6 w-6 text-red-500" />}
                      <h3 className={`text-lg font-semibold ${computationResult.verdict === 'SUITABLY DIMENSIONED' ? 'text-green-400' : 'text-red-400'}`}>
                        {computationResult.verdict}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-muted rounded p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Ealreq (max)</p>
                        <p className="text-xl font-bold">{computationResult.ealreq_max}</p>
                        <p className="text-xs text-muted-foreground">V</p>
                      </div>
                      <div className="bg-muted rounded p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Vk Required</p>
                        <p className="text-xl font-bold">{computationResult.vk_required}</p>
                        <p className="text-xs text-muted-foreground">V</p>
                      </div>
                      <div className={`rounded p-3 text-center border ${computationResult.verdict === 'SUITABLY DIMENSIONED' ? 'border-green-700 bg-green-950/40' : 'border-red-700 bg-red-950/40'}`}>
                        <p className="text-xs text-muted-foreground mb-1">Vk Available</p>
                        <p className="text-xl font-bold">{computationResult.vk_available}</p>
                        <p className="text-xs text-muted-foreground">V</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!computationResult && (
                  <Button 
                    onClick={runComputation} 
                    disabled={computing || !selectedTemplate} 
                    className="gap-2"
                  >
                    {computing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Computing...</>
                    ) : (
                      <><Zap className="h-4 w-4" />Compute</>
                    )}
                  </Button>
                )}
                {computationResult && (
                  <Button onClick={() => setComputationResult(null)} variant="outline">
                    Run Again
                  </Button>
                )}
                <Button variant="outline" onClick={() => setComputationOpen(false)}>
                  {computationResult ? 'Close' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}