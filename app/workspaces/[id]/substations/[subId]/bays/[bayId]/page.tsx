'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, AlertCircle, Edit, Trash2, MoreVertical, Cpu, CheckCircle, AlertTriangle, HelpCircle, Zap, Calculator, Loader2, Download, GitCompare } from 'lucide-react';

const IED_MODELS = ['SIEMENS 7SJ85', 'RED670'];

// Model-based protection functions mapping
const MODEL_FUNCTIONS: Record<string, string[]> = {
  'SIEMENS 7SJ85': ['tpl-differential', 'tpl-distance', 'tpl-breaker-failure'],
  'RED670': ['tpl-differential', 'tpl-distance', 'tpl-breaker-failure'],
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
  ct: { ratio: string; class: string; rct: number; ratedBurden?: number; alf?: number; vk: number; io: number };
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
    // Wiring parameters - with default test values
    conductor_mm2: '2.5',
    resistance_20c: '7.41',
    temp_coefficient: '0.00393',
    temperature: '75',
    cable_length_m: '50',
    
    // System parameters - with default test values
    system_frequency: '50',
    bus_voltage_kv: '33',
    max_fault_current_ka: '12.5',
    xr_ratio: '15',
    
    // Line parameters - with default test values
    r1: '0.0221',
    x1: '0.1600',
    r0: '0.1300',
    x0: '0.0600',
    line_length_km: '1.74',
  });
  
  // Compare states
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIeds, setSelectedIeds] = useState<string[]>([]);
  
  const [iedForm, setIedForm] = useState({
    name: '', 
    model: '', 
    functions: [],
    ctRatio: '', 
    ctSecondary: '1',
    ctClass: '', 
    rct: '', 
    ratedBurden: '',
    alf: '',
    vk: '', 
    io: '',
  });
  
  const [editForm, setEditForm] = useState({
    name: '', 
    model: 'SIEMENS 7SJ85', 
    functions: MODEL_FUNCTIONS['SIEMENS 7SJ85'] || [],
    ctRatio: '', 
    ctSecondary: '1',
    ctClass: 'PX', 
    rct: '', 
    ratedBurden: '',
    alf: '',
    vk: '', 
    io: '',
  });

  const [saving, setSaving] = useState(false);

  // Helper function to check if all required fields are filled
  const validateFormComplete = (form: typeof iedForm): { valid: boolean; missingFields: string[] } => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('IED Tag / Name');
    if (!form.model) missing.push('Relay / IED Model');
    if (!form.ctRatio) missing.push('CT Primary (Ipn)');
    if (!form.ctSecondary) missing.push('CT Secondary (In)');
    if (!form.ctClass) missing.push('Accuracy Class');
    if (!form.rct) missing.push('Rct (Ω)');
    if (!form.vk) missing.push('Vk Available (V)');
    if (!form.io) missing.push('Io at Vk (mA)');
    // System and line parameters
    if (!systemParams.conductor_mm2) missing.push('Conductor (mm²)');
    if (!systemParams.resistance_20c) missing.push('R at 20°C (Ω/km)');
    if (!systemParams.temp_coefficient) missing.push('Temp. Coefficient');
    if (!systemParams.temperature) missing.push('Temperature (°C)');
    if (!systemParams.cable_length_m) missing.push('Cable Length (m)');
    if (!systemParams.system_frequency) missing.push('Frequency (Hz)');
    if (!systemParams.bus_voltage_kv) missing.push('Bus Voltage (kV)');
    if (!systemParams.max_fault_current_ka) missing.push('Max Fault (kA)');
    if (!systemParams.xr_ratio) missing.push('X/R Ratio');
    if (!systemParams.r1) missing.push('R1 (Ω/km)');
    if (!systemParams.x1) missing.push('X1 (Ω/km)');
    if (!systemParams.r0) missing.push('R0 (Ω/km)');
    if (!systemParams.x0) missing.push('X0 (Ω/km)');
    if (!systemParams.line_length_km) missing.push('Line Length (km)');
    return { valid: missing.length === 0, missingFields: missing };
  };

  // Handle model change to automatically set functions and template
  const handleModelChange = (model: string, isEdit: boolean = false) => {
    const functions = MODEL_FUNCTIONS[model] || [];
    if (isEdit) {
      setEditForm(p => ({ ...p, model, functions }));
    } else {
      setIedForm(p => ({ ...p, model, functions }));
      // Auto-select template based on relay model - exact matching first
      if (templates.length > 0) {
        // Exact template name match first
        const exactMatch = templates.find(t => 
          t.name.toLowerCase() === model.toLowerCase() ||
          t.iedType.toLowerCase().includes(model.toLowerCase().replace(/\s+/g, '-'))
        );
        
        if (exactMatch) {
          console.log('Template auto-selected (exact match):', exactMatch.name);
          setSelectedTemplate(exactMatch);
        } else {
          // Fallback to partial match
          const partialMatch = templates.find(t => 
            t.name.toLowerCase().includes(model.toLowerCase()) && 
            !t.name.toLowerCase().includes('differential') // Avoid RED670 transformer differential when looking for SIEMENS
          );
          if (partialMatch) {
            console.log('Template auto-selected (partial match):', partialMatch.name);
            setSelectedTemplate(partialMatch);
          }
        }
      }
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
    
    // Pre-fill IED form with existing data
    const [primary, secondary] = ied.ct.ratio.split('/');
    setIedForm({
      name: ied.name,
      model: ied.model,
      functions: ied.functions,
      ctRatio: primary || '',
      ctSecondary: secondary || '1',
      ctClass: ied.ct.class,
      rct: ied.ct.rct.toString(),
      vk: ied.ct.vk.toString(),
      io: ied.ct.io.toString(),
    });
    
    // Auto-select template based on model
    handleModelChange(ied.model, false);
    
    // Do not force user to select - template should auto-select
    // setSelectedTemplate(null);
    
    // Keep existing system params - they have good default values
    // User can modify them in the form if needed
    
    setIedOpen(true);
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
          name: iedForm.name,
          model: iedForm.model,
          functions: iedForm.functions,
          ctRatio: `${iedForm.ctRatio}/${iedForm.ctSecondary}`,
          ctClass: iedForm.ctClass,
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
    // Extract CT ratio primary/secondary parts
    const [primary, secondary] = ied.ct.ratio.split('/');
    setEditForm({
      name: ied.name,
      model: ied.model,
      functions: [...ied.functions],
      ctRatio: primary || '',
      ctSecondary: secondary || '1',
      ctClass: ied.ct.class,
      rct: ied.ct.rct.toString(),
      ratedBurden: ied.ct.ratedBurden?.toString() || '',
      alf: ied.ct.alf?.toString() || '',
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
          name: editForm.name,
          model: editForm.model,
          functions: editForm.functions,
          ctRatio: editForm.ctRatio.includes('/') ? editForm.ctRatio : `${editForm.ctRatio}/${editForm.ctSecondary}`,
          ctClass: editForm.ctClass,
          rct: parseFloat(editForm.rct) || 0,
          ratedBurden: parseFloat(editForm.ratedBurden) || 0,
          alf: parseFloat(editForm.alf) || 0,
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
        <DialogContent className="w-screen max-w-[99vw] max-h-[95vh] overflow-hidden flex flex-col p-8 mx-2">
          <DialogHeader className="mb-6 shrink-0">
            <DialogTitle className="text-2xl font-bold">Create New IED - Complete CT Adequacy Analysis</DialogTitle>
            <div className="sr-only">Form to create a new IED for CT adequacy analysis with template selection, CT data, wiring parameters, system parameters, and line parameters</div>
          </DialogHeader>
          
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-6">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            
            {!computationResult && (<>
            <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900 p-6 rounded-lg shrink-0">
              <div className="space-y-2">
                <label className="text-sm font-semibold">IED Tag / Name *</label>
                <Input 
                  value={iedForm.name} 
                  onChange={e => setIedForm(p => ({ ...p, name: e.target.value }))} 
                  className="h-10 text-base border border-gray-300"
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Relay / IED Model *</label>
                <Select value={iedForm.model || ''} onValueChange={v => handleModelChange(v, false)}>
                  <SelectTrigger className="h-10 text-base border border-gray-300">
                    <SelectValue placeholder="Select a relay model" />
                  </SelectTrigger>
                  <SelectContent>
                    {IED_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Template Display */}
            {selectedTemplate && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 rounded shrink-0">
                <p className="text-xs text-green-800 dark:text-green-200">
                  <span className="font-semibold">✓ Template:</span> {selectedTemplate.name}
                </p>
              </div>
            )}
            
            {/* Tabbed Content with better styling */}
            <Tabs defaultValue="ct" className="w-full border rounded-lg overflow-hidden">
              <TabsList className="grid grid-cols-5 w-full bg-slate-100 dark:bg-slate-800 rounded-none border-b">
                <TabsTrigger value="ct" className="text-sm font-medium rounded-none">CT Data</TabsTrigger>
                <TabsTrigger value="wiring" className="text-sm font-medium rounded-none">Wiring</TabsTrigger>
                <TabsTrigger value="system" className="text-sm font-medium rounded-none">System</TabsTrigger>
                <TabsTrigger value="line" className="text-sm font-medium rounded-none">Line</TabsTrigger>
                <TabsTrigger value="ieds" className="text-sm font-medium rounded-none">IEDs</TabsTrigger>
              </TabsList>

              {/* CT Data Tab */}
              <TabsContent value="ct" className="p-6 space-y-4 m-0">
                <div>
                  <h3 className="font-semibold mb-4">CT Nameplate Parameters</h3>
                  <p className="text-sm text-muted-foreground mb-6">From CT manufacturer datasheet</p>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">CT Primary (Ipn)</label>
                      <Input type="number" step="any" value={iedForm.ctRatio} onChange={e => setIedForm(p => ({...p, ctRatio: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">CT Secondary (In)</label>
                      <Input type="number" step="any" value={iedForm.ctSecondary} onChange={e => setIedForm(p => ({...p, ctSecondary: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Accuracy Class</label>
                      <Input type="text" value={iedForm.ctClass} onChange={e => setIedForm(p => ({...p, ctClass: e.target.value}))} className="h-10 border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Rct (Ω)</label>
                      <Input type="number" step="any" value={iedForm.rct} onChange={e => setIedForm(p => ({...p, rct: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Rated Burden (VA)</label>
                      <Input type="number" step="any" value={iedForm.ratedBurden} onChange={e => setIedForm(p => ({...p, ratedBurden: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">ALF</label>
                      <Input type="number" step="any" value={iedForm.alf} onChange={e => setIedForm(p => ({...p, alf: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Vk Available (V)</label>
                      <Input type="number" step="any" value={iedForm.vk} onChange={e => setIedForm(p => ({...p, vk: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Io at Vk (mA)</label>
                      <Input type="number" step="any" value={iedForm.io} onChange={e => setIedForm(p => ({...p, io: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Wiring Tab */}
              <TabsContent value="wiring" className="p-6 space-y-4 m-0">
                <div>
                  <h3 className="font-semibold mb-4">CT Wiring Parameters</h3>
                  <p className="text-sm text-muted-foreground mb-6">Cable from CT to relay panel</p>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Conductor (mm²)</label>
                      <Input type="number" step="any" value={systemParams.conductor_mm2} onChange={e => setSystemParams(p => ({...p, conductor_mm2: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">R at 20°C (Ω/km)</label>
                      <Input type="number" step="any" value={systemParams.resistance_20c} onChange={e => setSystemParams(p => ({...p, resistance_20c: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Temp. Coefficient</label>
                      <Input type="number" step="any" value={systemParams.temp_coefficient} onChange={e => setSystemParams(p => ({...p, temp_coefficient: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Temperature (°C)</label>
                      <Input type="number" step="any" value={systemParams.temperature} onChange={e => setSystemParams(p => ({...p, temperature: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Cable Length (m)</label>
                      <Input type="number" step="any" value={systemParams.cable_length_m} onChange={e => setSystemParams(p => ({...p, cable_length_m: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system" className="p-6 space-y-4 m-0">
                <div>
                  <h3 className="font-semibold mb-4">System Parameters</h3>
                  <p className="text-sm text-muted-foreground mb-6">Network / power system data</p>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Frequency (Hz)</label>
                      <Input type="number" step="any" value={systemParams.system_frequency} onChange={e => setSystemParams(p => ({...p, system_frequency: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Bus Voltage (kV)</label>
                      <Input type="number" step="any" value={systemParams.bus_voltage_kv} onChange={e => setSystemParams(p => ({...p, bus_voltage_kv: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Max Fault (kA)</label>
                      <Input type="number" step="any" value={systemParams.max_fault_current_ka} onChange={e => setSystemParams(p => ({...p, max_fault_current_ka: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">X/R Ratio</label>
                      <Input type="number" step="any" value={systemParams.xr_ratio} onChange={e => setSystemParams(p => ({...p, xr_ratio: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Line Tab */}
              <TabsContent value="line" className="p-6 space-y-4 m-0">
                <div>
                  <h3 className="font-semibold mb-4">Line / Cable Parameters</h3>
                  <p className="text-sm text-muted-foreground mb-6">Sequence impedances of the protected feeder</p>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">R1 (Ω/km)</label>
                      <Input type="number" step="any" value={systemParams.r1} onChange={e => setSystemParams(p => ({...p, r1: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">X1 (Ω/km)</label>
                      <Input type="number" step="any" value={systemParams.x1} onChange={e => setSystemParams(p => ({...p, x1: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">R0 (Ω/km)</label>
                      <Input type="number" step="any" value={systemParams.r0} onChange={e => setSystemParams(p => ({...p, r0: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">X0 (Ω/km)</label>
                      <Input type="number" step="any" value={systemParams.x0} onChange={e => setSystemParams(p => ({...p, x0: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Line Length (km)</label>
                      <Input type="number" step="any" value={systemParams.line_length_km} onChange={e => setSystemParams(p => ({...p, line_length_km: e.target.value}))} className="h-10 font-mono border border-gray-300" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* IEDs Tab */}
              <TabsContent value="ieds" className="p-6 space-y-4 m-0">
                <div>
                  <h3 className="font-semibold mb-4">Connected IEDs / Relays</h3>
                  <p className="text-sm text-muted-foreground mb-4">All devices connected to this CT core</p>
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <Input className="col-span-5 h-10 text-sm border border-gray-300" defaultValue={iedForm.name} />
                    <Input className="col-span-4 h-10 text-sm font-mono border border-gray-300" type="number" step="any" />
                    <Input className="col-span-3 h-10 text-sm border border-gray-300" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            </>
            )}
          </div>

          {/* Compute & Modify Buttons */}
          <div className="pt-4 border-t shrink-0 mt-6 flex gap-2">
            {!computationResult && (
              <Button 
                onClick={async () => {
                  const validation = validateFormComplete(iedForm);
                  if (!validation.valid) {
                    setError(`Missing required fields: ${validation.missingFields.join(', ')}`);
                    return;
                  }
                  
                  if (!selectedTemplate || !selectedTemplate.id) {
                    setError('Please select or ensure a template is auto-selected for the relay model.');
                    return;
                  }
                  
                  setSaving(true);
                  setError('');
                  try {
                    // Build sheet1 from CT Data tab
                    const sheet1 = {
                      ct_ratio_primary: parseFloat(iedForm.ctRatio || '1'),
                      ct_ratio_secondary: parseFloat(iedForm.ctSecondary || '1'),
                      accuracy_class: iedForm.ctClass || '5P20',
                      ct_resistance: parseFloat(iedForm.rct || '0'),
                      rated_burden: parseFloat(iedForm.ratedBurden || '15'),
                      accuracy_limit_factor: parseFloat(iedForm.alf || '20'),
                      knee_point_voltage: parseFloat(iedForm.vk || '400'),
                      magnetizing_current: parseFloat(iedForm.io || '30'),
                      ied_burden: 0.02, // Default IED burden
                      conductor_cross_section: parseFloat(systemParams.conductor_mm2 || '2.5'),
                      resistance_20c: parseFloat(systemParams.resistance_20c || '7.41'),
                      temp_coefficient: parseFloat(systemParams.temp_coefficient || '0.00393'),
                      operating_temperature: parseFloat(systemParams.temperature || '75'),
                      cable_length: parseFloat(systemParams.cable_length_m || '50'),
                    };
                    
                    // Build sheet2 from System and Line tabs
                    const sheet2 = {
                      system_frequency: parseFloat(systemParams.system_frequency || '50'),
                      bus_voltage: parseFloat(systemParams.bus_voltage_kv || '33'),
                      max_fault_current: parseFloat(systemParams.max_fault_current_ka || '12.5'),
                      xr_ratio: parseFloat(systemParams.xr_ratio || '15'),
                      positive_seq_resistance: parseFloat(systemParams.r1 || '0.0221'),
                      positive_seq_reactance: parseFloat(systemParams.x1 || '0.1600'),
                      zero_seq_resistance: parseFloat(systemParams.r0 || '0.1300'),
                      zero_seq_reactance: parseFloat(systemParams.x0 || '0.0600'),
                      line_length: parseFloat(systemParams.line_length_km || '1.74'),
                    };
                    
                    console.log('Sending to API:', {
                      templateId: selectedTemplate?.id,
                      templateName: selectedTemplate?.name,
                      iedFormData: {
                        name: iedForm.name,
                        model: iedForm.model,
                        ctRatio: iedForm.ctRatio,
                        rct: iedForm.rct,
                        vk: iedForm.vk,
                        io: iedForm.io
                      },
                      sheet1: sheet1,
                      sheet2: sheet2
                    });
                    
                    const res = await fetch(`/api/workspaces/${workspaceId}/computations`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ templateId: selectedTemplate.id, sheet1, sheet2 }),
                    });
                    
                    console.log('Response status:', res.status, 'ok:', res.ok);
                    const data = await res.json();
                    console.log('API Response data:', data);
                    
                    if (!res.ok) {
                      console.error('API Error Response:', data);
                      const errorMsg = data.error || data.message || data.details || `API Error: ${res.status}`;
                      throw new Error(errorMsg);
                    }
                    
                    setComputationResult(data);
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Computation failed';
                    setError(msg);
                    console.error('Compute error:', e);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                size="sm"
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /></> : <><Zap className="h-4 w-4" />Compute</>}
              </Button>
            )}
            
            {computationResult && (
              <Button 
                onClick={() => {
                  setComputationResult(null);
                }}
                size="sm"
                className="gap-1.5 border border-gray-300"
              >
                Modify
              </Button>
            )}
          </div>

          {/* Computation Results - Display Below */}
          {computationResult && (
            <div className="pt-6 border-t shrink-0">
              <Card className={computationResult.verdict === 'SUITABLY DIMENSIONED' ? 'border-green-700 bg-green-950/20' : 'border-red-700 bg-red-950/20'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {computationResult.verdict === 'SUITABLY DIMENSIONED' ? 
                      <CheckCircle className="h-6 w-6 text-green-500" /> : 
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    }
                    <div>
                      <CardTitle className={computationResult.verdict === 'SUITABLY DIMENSIONED' ? 'text-green-400' : 'text-red-400'}>
                        {computationResult.verdict}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted rounded p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">Vk Required</p>
                      <p className="text-2xl font-bold">{computationResult.vk_required}</p>
                      <p className="text-xs text-muted-foreground">V</p>
                    </div>
                    <div className="bg-muted rounded p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">Vk Available</p>
                      <p className="text-2xl font-bold">{computationResult.vk_available}</p>
                      <p className="text-xs text-muted-foreground">V</p>
                    </div>
                    <div className="bg-muted rounded p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">Ealreq Max</p>
                      <p className="text-2xl font-bold">{computationResult.ealreq_max}</p>
                      <p className="text-xs text-muted-foreground">V</p>
                    </div>
                  </div>

                  {computationResult.vk_breakdown && (
                    <div>
                      <h4 className="font-semibold mb-3 text-sm">Calculation Breakdown</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-muted">
                              <th className="text-left p-3 font-semibold">Fault Condition</th>
                              <th className="text-right p-3 font-semibold">Ealreq (V)</th>
                              <th className="text-right p-3 font-semibold">Vk Req (V)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {computationResult.vk_breakdown.map((row, ri) => (
                              <tr key={ri} className={`border-t ${row.isMax ? 'bg-yellow-50 dark:bg-yellow-950/20 font-semibold' : ''}`}>
                                <td className="p-3">
                                  {row.label}
                                  {row.isMax && <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-1 rounded">MAX</span>}
                                </td>
                                <td className="p-3 text-right">{row.ealreq}</td>
                                <td className="p-3 text-right">{row.vk}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit IED Dialog - Shows Full Analysis Form */}
      <Dialog open={editIedOpen} onOpenChange={setEditIedOpen}>
        <DialogContent className="w-screen max-w-[99vw] max-h-[95vh] overflow-hidden flex flex-col p-8 mx-2">
          <DialogHeader className="mb-6 shrink-0">
            <DialogTitle className="text-2xl font-bold">Edit IED - Complete CT Adequacy Analysis</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-6">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            
            {/* IED Info - Side by Side */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900 p-6 rounded-lg shrink-0">
              <div className="space-y-2">
                <label className="text-sm font-semibold">IED Tag / Name *</label>
                <Input 
                  value={editForm.name} 
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} 
                  placeholder="e.g. T1-RED670" 
                  className="h-10 text-base"
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Relay / IED Model *</label>
                <Select value={editForm.model} onValueChange={v => handleModelChange(v, true)}>
                  <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IED_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabbed Content with better styling */}
            <Tabs defaultValue="ct" className="w-full border rounded-lg overflow-hidden">
              <TabsList className="grid grid-cols-5 w-full bg-slate-100 dark:bg-slate-800 rounded-none border-b">
                <TabsTrigger value="ct" className="text-sm font-medium rounded-none">CT Data</TabsTrigger>
                <TabsTrigger value="wiring" className="text-sm font-medium rounded-none">Wiring</TabsTrigger>
                <TabsTrigger value="system" className="text-sm font-medium rounded-none">System</TabsTrigger>
                <TabsTrigger value="line" className="text-sm font-medium rounded-none">Line</TabsTrigger>
                <TabsTrigger value="ieds" className="text-sm font-medium rounded-none">IEDs</TabsTrigger>
              </TabsList>

              {/* CT Data Tab */}
              <TabsContent value="ct" className="p-6 space-y-4 m-0">
                <div>
                  <h3 className="font-semibold mb-4">CT Nameplate Parameters</h3>
                  <p className="text-sm text-muted-foreground mb-6">From CT manufacturer datasheet</p>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">CT Primary (Ipn)</label>
                      <Input type="number" step="any" value={editForm.ctRatio} onChange={e => setEditForm(p => ({...p, ctRatio: e.target.value}))} placeholder="600" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">CT Secondary (In)</label>
                      <Input type="number" step="any" value={editForm.ctSecondary} onChange={e => setEditForm(p => ({...p, ctSecondary: e.target.value}))} placeholder="1" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Accuracy Class</label>
                      <Input type="text" value={editForm.ctClass} onChange={e => setEditForm(p => ({...p, ctClass: e.target.value}))} placeholder="5P20" className="h-10 border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Rct (Ω)</label>
                      <Input type="number" step="any" value={editForm.rct} onChange={e => setEditForm(p => ({...p, rct: e.target.value}))} placeholder="3.5" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Rated Burden (VA)</label>
                      <Input type="number" step="any" value={editForm.ratedBurden} onChange={e => setEditForm(p => ({...p, ratedBurden: e.target.value}))} placeholder="15" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">ALF</label>
                      <Input type="number" step="any" value={editForm.alf} onChange={e => setEditForm(p => ({...p, alf: e.target.value}))} placeholder="20" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Vk Available (V)</label>
                      <Input type="number" step="any" value={editForm.vk} onChange={e => setEditForm(p => ({...p, vk: e.target.value}))} placeholder="400" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium h-10 flex items-center">Io at Vk (mA)</label>
                      <Input type="number" step="any" value={editForm.io} onChange={e => setEditForm(p => ({...p, io: e.target.value}))} placeholder="30" className="h-10 font-mono border border-gray-300" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Wiring Tab */}
              <TabsContent value="wiring" className="p-6 space-y-4 m-0">
                <div>
                  <h3 className="font-semibold mb-4">CT Wiring Parameters</h3>
                  <p className="text-sm text-muted-foreground mb-4">Cable from CT to relay panel</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Conductor (mm²)</label>
                      <Input type="number" step="any" placeholder="2.5" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">R at 20°C (Ω/km)</label>
                      <Input type="number" step="any" placeholder="7.41" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Temp. Coefficient</label>
                      <Input type="number" step="any" placeholder="0.00393" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Temperature (°C)</label>
                      <Input type="number" step="any" placeholder="75" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cable Length (m)</label>
                      <Input type="number" step="any" placeholder="50" className="h-10 font-mono border border-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cores (1/2)</label>
                      <Input type="number" min="1" max="2" placeholder="2" className="h-10 font-mono border border-gray-300" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system" className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-4">System Parameters</h3>
                  <p className="text-sm text-muted-foreground mb-4">Network / power system data</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Frequency (Hz)</label>
                      <Input type="number" step="any" placeholder="50" className="h-10 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bus Voltage (kV)</label>
                      <Input type="number" step="any" placeholder="33" className="h-10 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Fault (kA)</label>
                      <Input type="number" step="any" placeholder="12.5" className="h-10 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">X/R Ratio</label>
                      <Input type="number" step="any" placeholder="15" className="h-10 font-mono" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Line Tab */}
              <TabsContent value="line" className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-4">Line / Cable Parameters</h3>
                  <p className="text-sm text-muted-foreground mb-4">Sequence impedances of the protected feeder</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">R1 (Ω/km)</label>
                      <Input type="number" step="any" placeholder="0.125" className="h-10 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">X1 (Ω/km)</label>
                      <Input type="number" step="any" placeholder="0.112" className="h-10 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">R0 (Ω/km)</label>
                      <Input type="number" step="any" placeholder="0.375" className="h-10 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">X0 (Ω/km)</label>
                      <Input type="number" step="any" placeholder="0.336" className="h-10 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Line Length (km)</label>
                      <Input type="number" step="any" placeholder="5" className="h-10 font-mono" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* IEDs Tab */}
              <TabsContent value="ieds" className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-4">Connected IEDs / Relays</h3>
                  <p className="text-sm text-muted-foreground mb-4">All devices connected to this CT core</p>
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <Input className="col-span-5 h-10 text-sm" placeholder="IED name" defaultValue={editForm.name} />
                    <Input className="col-span-4 h-10 text-sm font-mono" type="number" step="any" placeholder="Burden VA" />
                    <Input className="col-span-3 h-10 text-sm" placeholder="Type" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Compute & Modify Buttons */}
            <div className="pt-4 border-t flex gap-2">
              <Button 
                onClick={() => runComputation()} 
                disabled={computing || !editForm.name || !editForm.model}
                size="sm"
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
              >
                {computing ? <><Loader2 className="h-4 w-4 animate-spin" /></> : <><Zap className="h-4 w-4" />Compute</>}
              </Button>
              <Button 
                onClick={() => {
                  setComputationResult(null);
                }}
                size="sm"
                className="gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                Modify
              </Button>
            </div>
          </div>
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