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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
 ArrowLeft, Plus, AlertCircle, Pencil, Trash2, MoreVertical, Cpu,
 CheckCircle2, AlertTriangle, CircleDashed, Zap, Loader2, GitCompare,
 ChevronRight, RotateCcw, Save, Download,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const IED_MODELS = ['SIEMENS 7SJ85', 'RED670'] as const;
type IedModel = typeof IED_MODELS[number];

const MODEL_FUNCTIONS: Record<string, string[]> = {
 'SIEMENS 7SJ85': ['tpl-differential', 'tpl-distance', 'tpl-breaker-failure'],
 RED670: ['tpl-differential', 'tpl-distance', 'tpl-breaker-failure'],
};

const DEFAULT_SYSTEM_PARAMS = {
 // Wiring — CT to relay panel
 conductor_mm2: '2.5',
 resistance_20c: '7.41',
 temp_coefficient: '0.00393',
 temperature: '75',
 cable_length_m: '50',
 // System / network
 system_frequency: '50',
 bus_voltage_kv: '33',
 max_fault_current_ka: '12.5',
 xr_ratio: '15',
 // Protected line (RED670 only — needed for endzone-1 fault currents)
 r1: '0.0221',
 x1: '0.1600',
 r0: '0.1300',
 x0: '0.0600',
 line_length_km: '1.74',
};

type SystemParams = typeof DEFAULT_SYSTEM_PARAMS;

interface IedFormState {
 name: string;
 model: string;
 functions: string[];
 // Common CT nameplate fields
 ctRatio: string; // Siemens: single CT primary. RED670: Tap-1 primary.
 ctRatioTap2: string; // RED670 only — Tap-2 primary.
 ctSecondary: string;
 ctClass: string;
 rct: string;
 // Siemens (Kssc method) only
 ratedBurden: string;
 alf: string;
 // RED670 (Vk/Ealreq method) only
 vk: string;
 io: string;
}

const emptyIedForm = (model = ''): IedFormState => ({
 name: '',
 model,
 functions: MODEL_FUNCTIONS[model] || [],
 ctRatio: '',
 ctRatioTap2: '',
 ctSecondary: '1',
 ctClass: model === 'RED670' ? 'PX' : '5P20',
 rct: '',
 ratedBurden: '',
 alf: '',
 vk: '',
 io: '',
});

// Required fields differ per model
function getRequiredFieldLabels(model: string): { key: keyof IedFormState; label: string }[] {
 const common: { key: keyof IedFormState; label: string }[] = [
 { key: 'name', label: 'IED tag / name' },
 { key: 'model', label: 'Relay / IED model' },
 { key: 'ctRatio', label: 'CT primary (Ipn)' },
 { key: 'ctSecondary', label: 'CT secondary (In)' },
 { key: 'ctClass', label: 'Accuracy class' },
 { key: 'rct', label: 'Rct' },
 ];
 if (model === 'RED670') {
 return [...common, { key: 'vk', label: 'Vk available' }, { key: 'io', label: 'Io at Vk' }];
 }
 // Siemens 7SJ85 — Kssc method
 return [...common, { key: 'ratedBurden', label: 'Rated burden' }, { key: 'alf', label: 'ALF' }];
}

interface IED {
 id: string;
 name: string;
 model: string;
 functions: string[];
 ct: { ratio: string; ratioTap2?: string; class: string; rct: number; ratedBurden?: number; alf?: number; vk?: number; io?: number };
 latestResult?: { verdict: string; vk_required?: number; vk_available?: number; required_kssc?: number; available_kssc?: number } | null;
}

interface ComputationResult {
 verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
 templateType?: 'SIEMENS_7SJ85' | 'RED670' | string;
 // RED670 fields
 vk_required?: number;
 vk_available?: number;
 ealreq_max?: number;
 vk_breakdown?: { label: string; ealreq: number; vk: number; isMax: boolean }[];
 // Siemens fields
 required_kssc?: number;
 available_kssc?: number;
 intermediates?: Record<string, any>;
}

interface Template {
 id: string;
 name: string;
 description: string;
 relay: string;
 iedType: string;
}

// -----------------------------------------------------------------------------
// Small presentational helpers
// -----------------------------------------------------------------------------

function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
 if (!verdict) {
 return (
 <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
 <CircleDashed className="h-3.5 w-3.5" />
 Not checked
 </span>
 );
 }
 const adequate = verdict === 'SUITABLY DIMENSIONED';
 return (
 <span
 className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${
 adequate ? 'text-emerald-600' : 'text-rose-600'
 }`}
 >
 {adequate ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
 {adequate ? 'Adequate' : 'Under-dimensioned'}
 </span>
 );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
 return <label className="block text-xs font-medium text-slate-600 mb-1.5">{children}</label>;
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
 return (
 <div className="mb-5">
 <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
 <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
 </div>
 );
}

// -----------------------------------------------------------------------------
// Payload builder — branches per model so each calculator only receives the
// fields it actually uses.
// -----------------------------------------------------------------------------

function buildPayload(form: IedFormState, sys: SystemParams) {
 const num = (v: string, fallback: number) => {
 const n = parseFloat(v);
 return Number.isFinite(n) ? n : fallback;
 };

 const isRed670 = form.model === 'RED670';

 if (isRed670) {
 // RED670 — Vk/Ealreq (knee-point voltage) method
 const sheet1 = {
 ct_ratio_tap1: num(form.ctRatio, 1),
 ct_ratio_tap2: num(form.ctRatioTap2, num(form.ctRatio, 1)),
 ct_ratio_secondary: num(form.ctSecondary, 1),
 accuracy_class: form.ctClass || 'PX',
 ct_resistance: num(form.rct, 0),
 knee_point_voltage: num(form.vk, 400),
 magnetizing_current: num(form.io, 30),
 ied_burden: 0.02,
 conductor_cross_section: num(sys.conductor_mm2, 2.5),
 resistance_20c: num(sys.resistance_20c, 7.41),
 temp_coefficient: num(sys.temp_coefficient, 0.00393),
 operating_temperature: num(sys.temperature, 75),
 cable_length: num(sys.cable_length_m, 50),
 };
 const sheet2 = {
 system_frequency: num(sys.system_frequency, 50),
 bus_voltage: num(sys.bus_voltage_kv, 33),
 max_fault_current: num(sys.max_fault_current_ka, 12.5),
 xr_ratio: num(sys.xr_ratio, 15),
 positive_seq_resistance: num(sys.r1, 0.0221),
 positive_seq_reactance: num(sys.x1, 0.16),
 zero_seq_resistance: num(sys.r0, 0.13),
 zero_seq_reactance: num(sys.x0, 0.06),
 line_length: num(sys.line_length_km, 1.74),
 };
 return { sheet1, sheet2 };
 }

 // SIEMENS 7SJ85 — Kssc (accuracy limit factor) method. No line/Vk fields needed.
 const sheet1 = {
 ct_ratio_primary: num(form.ctRatio, 1),
 ct_ratio_secondary: num(form.ctSecondary, 1),
 accuracy_class: form.ctClass || '5P20',
 ct_resistance: num(form.rct, 0),
 rated_burden: num(form.ratedBurden, 15),
 accuracy_limit_factor: num(form.alf, 20),
 ied_burden: 0.02,
 conductor_cross_section: num(sys.conductor_mm2, 2.5),
 resistance_20c: num(sys.resistance_20c, 7.41),
 temp_coefficient: num(sys.temp_coefficient, 0.00393),
 operating_temperature: num(sys.temperature, 75),
 cable_length: num(sys.cable_length_m, 50),
 };
 const sheet2 = {
 system_frequency: num(sys.system_frequency, 50),
 bus_voltage: num(sys.bus_voltage_kv, 33),
 max_fault_current: num(sys.max_fault_current_ka, 12.5),
 xr_ratio: num(sys.xr_ratio, 15),
 };
 return { sheet1, sheet2 };
}

function validateForm(form: IedFormState, sys: SystemParams): string[] {
 const isRed670 = form.model === 'RED670';
 const required = getRequiredFieldLabels(form.model);
 const missing = required.filter(({ key }) => !String(form[key] ?? '').trim()).map((f) => f.label);

 if (isRed670 && !String(form.ctRatioTap2 ?? '').trim()) {
 missing.push('CT primary Tap-2');
 }

 const sysCommon: { key: keyof SystemParams; label: string }[] = [
 { key: 'conductor_mm2', label: 'Conductor (mm²)' },
 { key: 'resistance_20c', label: 'R at 20°C' },
 { key: 'temp_coefficient', label: 'Temp. coefficient' },
 { key: 'temperature', label: 'Operating temperature' },
 { key: 'cable_length_m', label: 'Cable length' },
 { key: 'system_frequency', label: 'Frequency' },
 { key: 'bus_voltage_kv', label: 'Bus voltage' },
 { key: 'max_fault_current_ka', label: 'Max fault current' },
 { key: 'xr_ratio', label: 'X/R ratio' },
 ];
 const sysLine: { key: keyof SystemParams; label: string }[] = [
 { key: 'r1', label: 'R1' },
 { key: 'x1', label: 'X1' },
 { key: 'r0', label: 'R0' },
 { key: 'x0', label: 'X0' },
 { key: 'line_length_km', label: 'Line length' },
 ];

 const sysRequired = isRed670 ? [...sysCommon, ...sysLine] : sysCommon;
 missing.push(...sysRequired.filter(({ key }) => !String(sys[key] ?? '').trim()).map((f) => f.label));
 return missing;
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

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

 const [templates, setTemplates] = useState<Template[]>([]);
 const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

 // Create / check dialog (shared) ------------------------------------------------
 const [iedOpen, setIedOpen] = useState(false);
 const [dialogMode, setDialogMode] = useState<'create' | 'check'>('create');
 const [checkingIed, setCheckingIed] = useState<IED | null>(null);
 const [iedForm, setIedForm] = useState<IedFormState>(emptyIedForm());
 const [systemParams, setSystemParams] = useState<SystemParams>(DEFAULT_SYSTEM_PARAMS);
 const [computationResult, setComputationResult] = useState<ComputationResult | null>(null);
 const [computing, setComputing] = useState(false);
 const [saving, setSaving] = useState(false);

 // Edit dialog ---------------------------------------------------------------
 const [editIedOpen, setEditIedOpen] = useState(false);
 const [editingIed, setEditingIed] = useState<IED | null>(null);
 const [editForm, setEditForm] = useState<IedFormState>(emptyIedForm());
 const [editSystemParams, setEditSystemParams] = useState<SystemParams>(DEFAULT_SYSTEM_PARAMS);
 const [editResult, setEditResult] = useState<ComputationResult | null>(null);
 const [editComputing, setEditComputing] = useState(false);

 // Delete dialog ---------------------------------------------------------------
 const [deleteIedOpen, setDeleteIedOpen] = useState(false);
 const [deletingIed, setDeletingIed] = useState<IED | null>(null);

 // Compare ---------------------------------------------------------------
 const [compareMode, setCompareMode] = useState(false);
 const [selectedIeds, setSelectedIeds] = useState<string[]>([]);

 // ---------------------------------------------------------------------------
 // Data loading
 // ---------------------------------------------------------------------------

 const load = () => {
 setLoading(true);
 fetch(`/api/workspaces/${workspaceId}/hierarchy`)
 .then((r) => r.json())
 .then((d) => {
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

 useEffect(() => {
 load();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [bayId]);

 useEffect(() => {
 fetch(`/api/workspaces/${workspaceId}/templates`)
 .then((r) => r.json())
 .then((data) => {
 if (Array.isArray(data)) setTemplates(data);
 })
 .catch(() => {
 // Non-fatal — template selection will simply stay empty.
 });
 }, [workspaceId]);

 // ---------------------------------------------------------------------------
 // Template auto-selection
 // ---------------------------------------------------------------------------

 const autoSelectTemplate = (model: string) => {
 if (templates.length === 0) return;
 const exact = templates.find(
 (t) => t.name.toLowerCase() === model.toLowerCase() || t.iedType.toLowerCase().includes(model.toLowerCase().replace(/\s+/g, '-'))
 );
 if (exact) {
 setSelectedTemplate(exact);
 return;
 }
 const partial = templates.find(
 (t) => t.name.toLowerCase().includes(model.toLowerCase()) && !t.name.toLowerCase().includes('differential')
 );
 if (partial) setSelectedTemplate(partial);
 };

 const handleModelChange = (model: string, target: 'create' | 'edit') => {
 const functions = MODEL_FUNCTIONS[model] || [];
 const defaultClass = model === 'RED670' ? 'PX' : '5P20';
 if (target === 'edit') {
 setEditForm((p) => ({ ...p, model, functions, ctClass: p.ctClass || defaultClass }));
 } else {
 setIedForm((p) => ({ ...p, model, functions, ctClass: p.ctClass || defaultClass }));
 autoSelectTemplate(model);
 }
 };

 // ---------------------------------------------------------------------------
 // Create / Check dialog
 // ---------------------------------------------------------------------------

 const openCreateDialog = () => {
 setDialogMode('create');
 setCheckingIed(null);
 setIedForm(emptyIedForm());
 setSystemParams(DEFAULT_SYSTEM_PARAMS);
 setComputationResult(null);
 setSelectedTemplate(null);
 setError('');
 setIedOpen(true);
 };

 const openCheckDialog = (ied: IED) => {
 setDialogMode('check');
 setCheckingIed(ied);
 setComputationResult(null);
 setError('');

 const [primary, secondary] = ied.ct.ratio.split('/');
 setIedForm({
 name: ied.name,
 model: ied.model,
 functions: ied.functions,
 ctRatio: primary || '',
 ctRatioTap2: ied.ct.ratioTap2 || '',
 ctSecondary: secondary || '1',
 ctClass: ied.ct.class,
 rct: ied.ct.rct.toString(),
 ratedBurden: ied.ct.ratedBurden?.toString() || '',
 alf: ied.ct.alf?.toString() || '',
 vk: ied.ct.vk?.toString() || '',
 io: ied.ct.io?.toString() || '',
 });
 autoSelectTemplate(ied.model);
 setSystemParams(DEFAULT_SYSTEM_PARAMS);
 setIedOpen(true);
 };

 const runCheck = async () => {
 const missing = validateForm(iedForm, systemParams);
 if (missing.length > 0) {
 setError(`Missing required fields: ${missing.join(', ')}`);
 return;
 }
 if (!selectedTemplate) {
 setError('Select a protection function template for this relay model.');
 return;
 }

 setComputing(true);
 setError('');
 try {
 const { sheet1, sheet2 } = buildPayload(iedForm, systemParams);
 const res = await fetch(`/api/workspaces/${workspaceId}/computations`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ templateId: selectedTemplate.id, sheet1, sheet2 }),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error || data.message || 'Computation failed');
 setComputationResult(data);
 load();
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Computation failed');
 } finally {
 setComputing(false);
 }
 };

 const saveNewIed = async () => {
 const missing = validateForm(iedForm, systemParams);
 if (missing.length > 0) {
 setError(`Missing required fields: ${missing.join(', ')}`);
 return;
 }

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
 ctRatioTap2: iedForm.model === 'RED670' ? iedForm.ctRatioTap2 : undefined,
 ctClass: iedForm.ctClass,
 rct: parseFloat(iedForm.rct) || 0,
 ratedBurden: parseFloat(iedForm.ratedBurden) || 0,
 alf: parseFloat(iedForm.alf) || 0,
 vk: parseFloat(iedForm.vk) || 0,
 io: parseFloat(iedForm.io) || 0,
 }),
 });
 const data = await res.json().catch(() => ({}));
 if (!res.ok) throw new Error(data.error || 'Failed to add IED');

 setIedOpen(false);
 load();
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to add IED');
 } finally {
 setSaving(false);
 }
 };

 // ---------------------------------------------------------------------------
 // Edit dialog
 // ---------------------------------------------------------------------------

 const handleEditIed = (ied: IED) => {
 setEditingIed(ied);
 setEditResult(null);
 setError('');
 const [primary, secondary] = ied.ct.ratio.split('/');
 setEditForm({
 name: ied.name,
 model: ied.model,
 functions: [...ied.functions],
 ctRatio: primary || '',
 ctRatioTap2: ied.ct.ratioTap2 || '',
 ctSecondary: secondary || '1',
 ctClass: ied.ct.class,
 rct: ied.ct.rct.toString(),
 ratedBurden: ied.ct.ratedBurden?.toString() || '',
 alf: ied.ct.alf?.toString() || '',
 vk: ied.ct.vk?.toString() || '',
 io: ied.ct.io?.toString() || '',
 });
 setEditSystemParams(DEFAULT_SYSTEM_PARAMS);
 autoSelectTemplate(ied.model);
 setEditIedOpen(true);
 };

 const runEditCheck = async () => {
 const missing = validateForm(editForm, editSystemParams);
 if (missing.length > 0) {
 setError(`Missing required fields: ${missing.join(', ')}`);
 return;
 }
 if (!selectedTemplate) {
 setError('Select a protection function template for this relay model.');
 return;
 }
 setEditComputing(true);
 setError('');
 try {
 const { sheet1, sheet2 } = buildPayload(editForm, editSystemParams);
 const res = await fetch(`/api/workspaces/${workspaceId}/computations`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ templateId: selectedTemplate.id, sheet1, sheet2 }),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error || data.message || 'Computation failed');
 setEditResult(data);
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Computation failed');
 } finally {
 setEditComputing(false);
 }
 };

 const updateIed = async () => {
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
 ctRatio: `${editForm.ctRatio}/${editForm.ctSecondary}`,
 ctRatioTap2: editForm.model === 'RED670' ? editForm.ctRatioTap2 : undefined,
 ctClass: editForm.ctClass,
 rct: parseFloat(editForm.rct) || 0,
 ratedBurden: parseFloat(editForm.ratedBurden) || 0,
 alf: parseFloat(editForm.alf) || 0,
 vk: parseFloat(editForm.vk) || 0,
 io: parseFloat(editForm.io) || 0,
 }),
 });
 const data = await res.json().catch(() => ({}));
 if (!res.ok) throw new Error(data.error || 'Failed to update IED');

 setEditIedOpen(false);
 setEditingIed(null);
 load();
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to update IED');
 } finally {
 setSaving(false);
 }
 };

 // ---------------------------------------------------------------------------
 // Delete
 // ---------------------------------------------------------------------------

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
 const data = await res.json().catch(() => ({}));
 if (!res.ok) throw new Error(data.error || 'Failed to delete IED');

 setDeleteIedOpen(false);
 setDeletingIed(null);
 load();
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to delete IED');
 } finally {
 setSaving(false);
 }
 };

 // ---------------------------------------------------------------------------
 // Compare
 // ---------------------------------------------------------------------------

 const toggleCompareMode = () => {
 setCompareMode(!compareMode);
 setSelectedIeds([]);
 };

 const toggleIedSelection = (iedId: string) => {
 setSelectedIeds((prev) => {
 if (prev.includes(iedId)) return prev.filter((id) => id !== iedId);
 if (prev.length >= 3) return prev;
 return [...prev, iedId];
 });
 };

 const handleCompareIeds = () => {
 if (selectedIeds.length >= 2) {
 router.push(`/workspaces/${workspaceId}/substations/${subId}/bays/${bayId}/compare?ieds=${selectedIeds.join(',')}`);
 }
 };

 // ---------------------------------------------------------------------------
 // Render
 // ---------------------------------------------------------------------------

 if (loading) {
 return (
 <div className="space-y-4">
 <Skeleton className="h-8 w-64" />
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
 {[...Array(5)].map((_, i) => (
 <Skeleton key={i} className="aspect-square rounded-xl" />
 ))}
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Page header */}
 <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
 <div>
 <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
 <Link href={`/workspaces/${workspaceId}/substations/${subId}`} className="hover:text-slate-700 hover:underline underline-offset-2">
 {subName}
 </Link>
 <ChevronRight className="h-3.5 w-3.5" />
 <span className="text-slate-700 font-medium">{bayName}</span>
 </div>
 <h1 className="text-2xl font-bold tracking-tight text-slate-900">IEDs & CT adequacy</h1>
 </div>

 <div className="flex items-center gap-2">
 <Link href={`/workspaces/${workspaceId}/substations/${subId}`}>
 <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
 <ArrowLeft className="h-4 w-4" />
 Back
 </Button>
 </Link>
 {compareMode && selectedIeds.length >= 2 && (
 <Button onClick={handleCompareIeds} size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
 <GitCompare className="h-4 w-4" />
 Compare {selectedIeds.length} IEDs
 </Button>
 )}
 <Button
 variant={compareMode ? 'default' : 'outline'}
 size="sm"
 onClick={toggleCompareMode}
 className={compareMode ? 'gap-1.5 bg-slate-900 hover:bg-slate-800' : 'gap-1.5'}
 >
 <GitCompare className="h-4 w-4" />
 {compareMode ? 'Cancel compare' : 'Compare IEDs'}
 </Button>
 <Button size="sm" onClick={openCreateDialog} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
 <Plus className="h-4 w-4" />
 New IED
 </Button>
 </div>
 </div>

 {error && !iedOpen && !editIedOpen && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 )}

 {compareMode && (
 <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
 Select 2–3 IEDs to compare their CT adequacy results side by side.
 </div>
 )}

 {/* IEDs grid */}
 {ieds.length === 0 && !compareMode ? (
 <Card
 className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
 onClick={openCreateDialog}
 >
 <CardContent className="flex flex-col items-center justify-center py-16 text-center">
 <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
 <Cpu className="h-7 w-7 text-blue-600" />
 </div>
 <p className="font-semibold text-slate-800">No IEDs in this bay yet</p>
 <p className="text-sm text-slate-500 mt-1 max-w-sm">
 Add the first relay to begin recording CT nameplate data and running adequacy checks.
 </p>
 <Button size="sm" className="mt-4 gap-1.5 bg-blue-600 hover:bg-blue-700">
 <Plus className="h-4 w-4" />
 Add an IED
 </Button>
 </CardContent>
 </Card>
 ) : (
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
 {!compareMode && (
 <Card
 className="aspect-square flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
 onClick={openCreateDialog}
 >
 <CardContent className="flex flex-col items-center justify-center p-6 text-center">
 <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center mb-3">
 <Plus className="h-5 w-5 text-blue-600" />
 </div>
 <p className="text-sm font-medium text-slate-500">New IED</p>
 </CardContent>
 </Card>
 )}

 {ieds.map((ied) => {
 const hasResult = !!ied.latestResult?.verdict;
 const isAdequate = hasResult && ied.latestResult?.verdict === 'SUITABLY DIMENSIONED';
 const accent = !hasResult ? 'bg-slate-200' : isAdequate ? 'bg-emerald-500' : 'bg-rose-500';
 const selected = selectedIeds.includes(ied.id);
 const isRed670 = ied.model === 'RED670';

 return (
 <Card
 key={ied.id}
 className={`aspect-square relative overflow-hidden cursor-pointer transition-all group border-slate-200 ${
 compareMode
 ? selected
 ? 'ring-2 ring-blue-500 shadow-md'
 : selectedIeds.length >= 3
 ? 'opacity-40 cursor-not-allowed'
 : 'hover:ring-1 hover:ring-blue-300'
 : 'hover:shadow-md hover:-translate-y-0.5'
 }`}
 onClick={() => (compareMode ? toggleIedSelection(ied.id) : openCheckDialog(ied))}
 >
 <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
 <CardContent className="p-4 h-full flex flex-col justify-between">
 <div className="flex justify-between items-start">
 <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
 <Cpu className="h-4 w-4 text-slate-500" />
 </div>
 {compareMode && selected ? (
 <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
 {selectedIeds.indexOf(ied.id) + 1}
 </div>
 ) : !compareMode ? (
 <DropdownMenu>
 <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
 <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
 <MoreVertical className="h-4 w-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditIed(ied); }}>
 <Pencil className="h-4 w-4 mr-2" />
 Edit
 </DropdownMenuItem>
 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteIed(ied); }} className="text-rose-600 focus:text-rose-600">
 <Trash2 className="h-4 w-4 mr-2" />
 Delete
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 ) : null}
 </div>

 <div className="text-center">
 <h3 className="font-semibold text-sm leading-tight text-slate-900 truncate">{ied.name}</h3>
 <p className="text-xs text-slate-500 mt-0.5">{ied.model}</p>
 {ied.ct.ratio && <p className="text-xs font-mono text-slate-400 mt-1">CT {ied.ct.ratio}</p>}
 </div>

 <div className="text-center">
 {hasResult ? (
 <div className="space-y-1">
 <p className="text-xs font-mono tabular-nums text-slate-600">
 {isRed670
 ? `${ied.latestResult?.vk_available}V / ${ied.latestResult?.vk_required}V`
 : `Kssc ${ied.latestResult?.available_kssc} / ${ied.latestResult?.required_kssc}`}
 </p>
 <VerdictBadge verdict={ied.latestResult?.verdict} />
 </div>
 ) : (
 <VerdictBadge verdict={null} />
 )}
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}

 {/* -------------------------------------------------------------- */}
 {/* Create / Check dialog */}
 {/* -------------------------------------------------------------- */}
 <Dialog
 open={iedOpen}
 onOpenChange={(open) => {
 setIedOpen(open);
 if (!open) setError('');
 }}
 >
 <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0">
 <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 shrink-0">
 <DialogTitle className="text-lg font-semibold">
 {dialogMode === 'create' ? 'New IED' : `Adequacy check — ${checkingIed?.name}`}
 </DialogTitle>
 </DialogHeader>

 <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
 {error && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-5 rounded-lg">
 <div>
 <FieldLabel>IED tag / name *</FieldLabel>
 <Input
 value={iedForm.name}
 onChange={(e) => setIedForm((p) => ({ ...p, name: e.target.value }))}
 placeholder="e.g. T1-RED670"
 className="h-10"
 />
 </div>
 <div>
 <FieldLabel>Relay / IED model *</FieldLabel>
 <Select value={iedForm.model || ''} onValueChange={(v) => handleModelChange(v, 'create')}>
 <SelectTrigger className="h-10">
 <SelectValue placeholder="Select a relay model" />
 </SelectTrigger>
 <SelectContent>
 {IED_MODELS.map((m) => (
 <SelectItem key={m} value={m}>
 {m}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {selectedTemplate && (
 <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md">
 <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
 <p className="text-xs text-emerald-800">
 <span className="font-semibold">Template:</span> {selectedTemplate.name}
 </p>
 </div>
 )}

 {!iedForm.model ? (
 <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-md p-8 text-center">
 Select a relay model above to see the required inputs.
 </div>
 ) : (
 <IedFieldsForModel
 model={iedForm.model}
 form={iedForm}
 setForm={setIedForm}
 sys={systemParams}
 setSys={setSystemParams}
 />
 )}

 {computationResult && <ResultPanel result={computationResult} model={iedForm.model} />}
 </div>

 <div className="px-6 py-4 border-t border-slate-200 shrink-0 flex items-center gap-2">
 <Button onClick={runCheck} disabled={computing || !iedForm.model} size="sm" variant="outline" className="gap-1.5">
 {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
 {computationResult ? 'Recompute' : 'Run adequacy check'}
 </Button>

 {dialogMode === 'create' && (
 <Button onClick={saveNewIed} disabled={saving} size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
 Save IED
 </Button>
 )}

 <div className="flex-1" />
 <Button variant="ghost" size="sm" onClick={() => setIedOpen(false)}>
 Close
 </Button>
 </div>
 </DialogContent>
 </Dialog>

 {/* -------------------------------------------------------------- */}
 {/* Edit dialog */}
 {/* -------------------------------------------------------------- */}
 <Dialog
 open={editIedOpen}
 onOpenChange={(open) => {
 setEditIedOpen(open);
 if (!open) setError('');
 }}
 >
 <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0">
 <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 shrink-0">
 <DialogTitle className="text-lg font-semibold">Edit IED — {editingIed?.name}</DialogTitle>
 </DialogHeader>

 <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
 {error && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-5 rounded-lg">
 <div>
 <FieldLabel>IED tag / name *</FieldLabel>
 <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. T1-RED670" className="h-10" />
 </div>
 <div>
 <FieldLabel>Relay / IED model *</FieldLabel>
 <Select value={editForm.model} onValueChange={(v) => handleModelChange(v, 'edit')}>
 <SelectTrigger className="h-10">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {IED_MODELS.map((m) => (
 <SelectItem key={m} value={m}>
 {m}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {editForm.model && (
 <IedFieldsForModel
 model={editForm.model}
 form={editForm}
 setForm={setEditForm}
 sys={editSystemParams}
 setSys={setEditSystemParams}
 />
 )}

 {editResult && <ResultPanel result={editResult} model={editForm.model} />}
 </div>

 <div className="px-6 py-4 border-t border-slate-200 shrink-0 flex items-center gap-2">
 <Button onClick={runEditCheck} disabled={editComputing} size="sm" variant="outline" className="gap-1.5">
 {editComputing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
 {editResult ? 'Recompute' : 'Run adequacy check'}
 </Button>
 <Button onClick={updateIed} disabled={saving} size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
 Save changes
 </Button>
 <div className="flex-1" />
 <Button variant="ghost" size="sm" onClick={() => setEditIedOpen(false)}>
 Cancel
 </Button>
 </div>
 </DialogContent>
 </Dialog>

 {/* -------------------------------------------------------------- */}
 {/* Delete confirmation */}
 {/* -------------------------------------------------------------- */}
 <Dialog open={deleteIedOpen} onOpenChange={setDeleteIedOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>Delete IED</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 mt-2">
 {error && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 )}
 <p className="text-sm text-slate-600">
 Delete <span className="font-semibold text-slate-900">{deletingIed?.name}</span>? Its computation history
 will also be removed. This can't be undone.
 </p>
 <div className="flex gap-2 pt-2">
 <Button variant="destructive" disabled={saving} className="flex-1 gap-1.5" onClick={confirmDeleteIed}>
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
 Delete IED
 </Button>
 <Button variant="outline" onClick={() => setDeleteIedOpen(false)}>
 Cancel
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

// -----------------------------------------------------------------------------
// Model-specific field set — this is the core of the request. Renders only
// the CT/wiring/system/line tabs and fields relevant to the selected model.
// -----------------------------------------------------------------------------

function IedFieldsForModel({
 model,
 form,
 setForm,
 sys,
 setSys,
}: {
 model: string;
 form: IedFormState;
 setForm: React.Dispatch<React.SetStateAction<IedFormState>>;
 sys: SystemParams;
 setSys: React.Dispatch<React.SetStateAction<SystemParams>>;
}) {
 const isRed670 = model === 'RED670';

 // RED670 needs a 4th "Line" tab for sequence impedances (endzone-1 faults).
 // Siemens only needs CT / Wiring / System.
 const tabCount = isRed670 ? 4 : 3;

 return (
 <Tabs defaultValue="ct" className="w-full">
 <TabsList className={`grid w-full ${tabCount === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
 <TabsTrigger value="ct">CT data</TabsTrigger>
 <TabsTrigger value="wiring">Wiring</TabsTrigger>
 <TabsTrigger value="system">System</TabsTrigger>
 {isRed670 && <TabsTrigger value="line">Line</TabsTrigger>}
 </TabsList>

 {/* ---------------- CT data ---------------- */}
 <TabsContent value="ct" className="border border-t-0 rounded-b-md p-6">
 <SectionHeading title="CT nameplate parameters" subtitle="From the CT manufacturer datasheet" />
 <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
 <div>
 <FieldLabel>{isRed670 ? 'CT primary — Tap 1 (Ipn)' : 'CT primary (Ipn)'} *</FieldLabel>
 <Input type="number" step="any" value={form.ctRatio} onChange={(e) => setForm((p) => ({ ...p, ctRatio: e.target.value }))} placeholder="600" className="font-mono" />
 </div>
 {isRed670 && (
 <div>
 <FieldLabel>CT primary — Tap 2 (Ipn) *</FieldLabel>
 <Input type="number" step="any" value={form.ctRatioTap2} onChange={(e) => setForm((p) => ({ ...p, ctRatioTap2: e.target.value }))} placeholder="e.g. 1800" className="font-mono" />
 </div>
 )}
 <div>
 <FieldLabel>CT secondary (In) *</FieldLabel>
 <Input type="number" step="any" value={form.ctSecondary} onChange={(e) => setForm((p) => ({ ...p, ctSecondary: e.target.value }))} placeholder="1" className="font-mono" />
 </div>
 <div>
 <FieldLabel>Accuracy class *</FieldLabel>
 <Input value={form.ctClass} onChange={(e) => setForm((p) => ({ ...p, ctClass: e.target.value }))} placeholder={isRed670 ? 'PX' : '5P20'} />
 </div>
 <div>
 <FieldLabel>Rct (Ω) *</FieldLabel>
 <Input type="number" step="any" value={form.rct} onChange={(e) => setForm((p) => ({ ...p, rct: e.target.value }))} className="font-mono" />
 </div>

 {isRed670 ? (
 <>
 <div>
 <FieldLabel>Vk available (V) *</FieldLabel>
 <Input type="number" step="any" value={form.vk} onChange={(e) => setForm((p) => ({ ...p, vk: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>Io at Vk (mA) *</FieldLabel>
 <Input type="number" step="any" value={form.io} onChange={(e) => setForm((p) => ({ ...p, io: e.target.value }))} className="font-mono" />
 </div>
 </>
 ) : (
 <>
 <div>
 <FieldLabel>Rated burden (VA) *</FieldLabel>
 <Input type="number" step="any" value={form.ratedBurden} onChange={(e) => setForm((p) => ({ ...p, ratedBurden: e.target.value }))} placeholder="15" className="font-mono" />
 </div>
 <div>
 <FieldLabel>ALF *</FieldLabel>
 <Input type="number" step="any" value={form.alf} onChange={(e) => setForm((p) => ({ ...p, alf: e.target.value }))} placeholder="20" className="font-mono" />
 </div>
 </>
 )}
 </div>
 </TabsContent>

 {/* ---------------- Wiring (same for both models) ---------------- */}
 <TabsContent value="wiring" className="border border-t-0 rounded-b-md p-6">
 <SectionHeading title="CT wiring parameters" subtitle="Cable run from the CT to the relay panel" />
 <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
 <div>
 <FieldLabel>Conductor (mm²) *</FieldLabel>
 <Input type="number" step="any" value={sys.conductor_mm2} onChange={(e) => setSys((p) => ({ ...p, conductor_mm2: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>R at 20°C (Ω/km) *</FieldLabel>
 <Input type="number" step="any" value={sys.resistance_20c} onChange={(e) => setSys((p) => ({ ...p, resistance_20c: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>Temp. coefficient *</FieldLabel>
 <Input type="number" step="any" value={sys.temp_coefficient} onChange={(e) => setSys((p) => ({ ...p, temp_coefficient: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>Temperature (°C) *</FieldLabel>
 <Input type="number" step="any" value={sys.temperature} onChange={(e) => setSys((p) => ({ ...p, temperature: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>Cable length (m) *</FieldLabel>
 <Input type="number" step="any" value={sys.cable_length_m} onChange={(e) => setSys((p) => ({ ...p, cable_length_m: e.target.value }))} className="font-mono" />
 </div>
 </div>
 </TabsContent>

 {/* ---------------- System ---------------- */}
 <TabsContent value="system" className="border border-t-0 rounded-b-md p-6">
 <SectionHeading title="System parameters" subtitle="Network / power system data" />
 <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
 <div>
 <FieldLabel>Frequency (Hz) *</FieldLabel>
 <Input type="number" step="any" value={sys.system_frequency} onChange={(e) => setSys((p) => ({ ...p, system_frequency: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>Bus voltage (kV) *</FieldLabel>
 <Input type="number" step="any" value={sys.bus_voltage_kv} onChange={(e) => setSys((p) => ({ ...p, bus_voltage_kv: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>Max fault (kA) *</FieldLabel>
 <Input type="number" step="any" value={sys.max_fault_current_ka} onChange={(e) => setSys((p) => ({ ...p, max_fault_current_ka: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>X/R ratio *</FieldLabel>
 <Input type="number" step="any" value={sys.xr_ratio} onChange={(e) => setSys((p) => ({ ...p, xr_ratio: e.target.value }))} className="font-mono" />
 </div>
 </div>
 </TabsContent>

 {/* ---------------- Line — RED670 only ---------------- */}
 {isRed670 && (
 <TabsContent value="line" className="border border-t-0 rounded-b-md p-6">
 <SectionHeading title="Line / cable parameters" subtitle="Sequence impedances of the protected feeder — used for endzone-1 fault currents" />
 <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
 <div>
 <FieldLabel>R1 (Ω/km) *</FieldLabel>
 <Input type="number" step="any" value={sys.r1} onChange={(e) => setSys((p) => ({ ...p, r1: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>X1 (Ω/km) *</FieldLabel>
 <Input type="number" step="any" value={sys.x1} onChange={(e) => setSys((p) => ({ ...p, x1: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>R0 (Ω/km) *</FieldLabel>
 <Input type="number" step="any" value={sys.r0} onChange={(e) => setSys((p) => ({ ...p, r0: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>X0 (Ω/km) *</FieldLabel>
 <Input type="number" step="any" value={sys.x0} onChange={(e) => setSys((p) => ({ ...p, x0: e.target.value }))} className="font-mono" />
 </div>
 <div>
 <FieldLabel>Line length (km) *</FieldLabel>
 <Input type="number" step="any" value={sys.line_length_km} onChange={(e) => setSys((p) => ({ ...p, line_length_km: e.target.value }))} className="font-mono" />
 </div>
 </div>
 </TabsContent>
 )}
 </Tabs>
 );
}

// -----------------------------------------------------------------------------
// Result panel — branches display per model:
// RED670 -> Vk required, Vk available, Ealreq max
// Siemens -> Required Kssc, Available Kssc
// -----------------------------------------------------------------------------

function ResultPanel({ result, model }: { result: ComputationResult; model: string }) {
 const isRed670 = model === 'RED670';
 const adequate = result.verdict === 'SUITABLY DIMENSIONED';

 const handleDownloadReport = async () => {
 try {
 const { generateDevicePDFReport } = await import('@/lib/services/pdf-report');
 
 // Convert result to DeviceResult format expected by pdf-report
 const deviceResult = {
 device_name: model,
 device_type: model === 'RED670' ? 'RED_670' : 'SIEMENS_7SJ85',
 verdict: result.verdict,
 vk_required: result.vk_required ?? 0,
 vk_available: result.vk_available ?? 0,
 ealreq_max: result.ealreq_max ?? 0,
 required_kssc: result.required_kssc ?? 0,
 available_kssc: result.available_kssc ?? 0,
 vk_breakdown: result.vk_breakdown ?? [],
 intermediates: {}, // Empty intermediates object
 inputs: {
 ct_ratio_primary: 0,
 ct_ratio_secondary: 1,
 accuracy_class: '',
 rct: 0,
 lead_resistance: 0,
 relay_burden_va: 0,
 bus_voltage_kv: 0,
 max_bus_fault_kA: 0,
 route_length_km: 0,
 }
 } as any;

 const systemParams = {
 bus_voltage_kv: 0,
 system_frequency: 50,
 max_fault_current_ka: 0,
 } as any;

 await generateDevicePDFReport(deviceResult, systemParams);
 } catch (error) {
 console.error('Error downloading report:', error);
 alert('Failed to download report');
 }
 };

 return (
 <Card className={adequate ? 'border-emerald-300 bg-emerald-50/50' : 'border-rose-300 bg-rose-50/50'}>
 <CardContent className="p-5 space-y-5">
 <div className="flex items-center gap-3">
 <div className={`flex items-center justify-center w-9 h-9 rounded-full ${adequate ? 'bg-emerald-500' : 'bg-rose-500'}`}>
 {adequate ? <CheckCircle2 className="h-5 w-5 text-white" /> : <AlertTriangle className="h-5 w-5 text-white" />}
 </div>
 <p className={`text-base font-semibold ${adequate ? 'text-emerald-700' : 'text-rose-700'}`}>{result.verdict}</p>
 </div>

 {isRed670 ? (
 <>
 <div className="grid grid-cols-3 gap-3">
 <Stat label="Vk required" value={result.vk_required ?? 0} unit="V" />
 <Stat label="Vk available" value={result.vk_available ?? 0} unit="V" />
 <Stat label="Ealreq max" value={result.ealreq_max ?? 0} unit="V" />
 </div>

 {result.vk_breakdown && result.vk_breakdown.length > 0 && (
 <div className="bg-white rounded-lg border border-slate-200 p-4">
 <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">Fault conditions</h4>
 <div className="space-y-1.5">
 {result.vk_breakdown.map((item, idx) => (
 <Row key={idx} label={item.label} value={`${item.ealreq.toFixed(2)} V`} highlight={item.isMax} />
 ))}
 </div>
 </div>
 )}
 </>
 ) : (
 <div className="grid grid-cols-2 gap-3">
 <Stat label="Required Kssc" value={result.required_kssc ?? 0} unit="" />
 <Stat label="Available Kssc" value={result.available_kssc ?? 0} unit="" />
 </div>
 )}

 <div className="flex gap-2 pt-2">
 <Button 
 onClick={handleDownloadReport}
 size="sm" 
 variant="outline" 
 className="gap-1.5 flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300"
 >
 <Download className="h-4 w-4" />
 Download Report
 </Button>
 </div>
 </CardContent>
 </Card>
 );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
 return (
 <div className="bg-white rounded-lg p-3.5 border border-slate-200 text-center">
 <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">{label}</p>
 <p className="text-2xl font-bold text-slate-900 tabular-nums">
 {value.toFixed(2)} {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
 </p>
 </div>
 );
}

function Row({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
 const display = typeof value === 'number' ? value.toFixed(2) : value;
 return (
 <div className={`flex justify-between items-center px-2.5 py-1.5 rounded ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
 <span className="text-sm text-slate-600 flex items-center gap-1.5">
 {label}
 {highlight && (
 <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-300 text-amber-700">
 governing
 </Badge>
 )}
 </span>
 <span className="text-sm font-semibold font-mono text-slate-900">{display}</span>
 </div>
 );
}