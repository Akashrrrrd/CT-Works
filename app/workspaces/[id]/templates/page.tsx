'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, AlertCircle, Loader2 } from 'lucide-react';

interface Template {
 id: string;
 name: string;
 description: string;
 iedType: string;
 relay: string;
 function: string;
 inputSchema: Record<string, unknown>;
}

export default function TemplatesPage() {
 const params = useParams();
 const workspaceId = params.id as string;
 const [templates, setTemplates] = useState<Template[]>([]);
 const [loading, setLoading] = useState(true);
 const [newTemplateOpen, setNewTemplateOpen] = useState(false);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 const [newTemplate, setNewTemplate] = useState({
 name: '',
 relay: '',
 description: '',
 templateName: '',
 parameters: {
 ct_ratio_primary: '',
 ct_ratio_secondary: '',
 accuracy_class: '',
 rct: '',
 vk_available: '',
 io_at_vk: '',
 frequency: '',
 bus_voltage_kv: '',
 max_bus_fault_mva: '',
 r1: '',
 x1: '',
 r0: '',
 x0: '',
 route_length_km: '',
 relay_burden_va: '',
 lead_resistance: '',
 },
 });

 useEffect(() => {
 fetch(`/api/workspaces/${workspaceId}/templates`)
 .then(r => r.json())
 .then(data => setTemplates(Array.isArray(data) ? data : []))
 .finally(() => setLoading(false));
 }, [workspaceId]);

 const handleCreateTemplate = async () => {
 setSaving(true);
 setError('');
 try {
 const res = await fetch(`/api/workspaces/${workspaceId}/templates`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(newTemplate),
 });
 if (!res.ok) throw new Error((await res.json()).error);
 setNewTemplateOpen(false);
 setNewTemplate({
 name: '',
 relay: '',
 description: '',
 templateName: '',
 parameters: {
 ct_ratio_primary: '',
 ct_ratio_secondary: '',
 accuracy_class: '',
 rct: '',
 vk_available: '',
 io_at_vk: '',
 frequency: '',
 bus_voltage_kv: '',
 max_bus_fault_mva: '',
 r1: '',
 x1: '',
 r0: '',
 x0: '',
 route_length_km: '',
 relay_burden_va: '',
 lead_resistance: '',
 },
 });
 // Refresh templates
 const updatedRes = await fetch(`/api/workspaces/${workspaceId}/templates`);
 const updatedData = await updatedRes.json();
 setTemplates(Array.isArray(updatedData) ? updatedData : []);
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to create template');
 } finally {
 setSaving(false);
 }
 };

 if (loading) return (
 <div className="space-y-4">
 {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
 </div>
 );

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-2xl font-bold">IED Templates</h2>
 <p className="text-muted-foreground">Available protection relay templates for CT/VT adequacy analysis</p>
 </div>
 <Button onClick={() => setNewTemplateOpen(true)} className="gap-2">
 <Zap className="h-4 w-4" />
 Add New Template
 </Button>
 </div>

 {/* Featured Template - Siemens 7SJ85 */}
 <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Zap className="h-8 w-8 text-blue-600" />
 <div>
 <CardTitle className="text-xl">SIEMENS 7SJ85 - Multi-function Protection Relay</CardTitle>
 <CardDescription className="text-base">
 Complete CT/VT adequacy calculation per Engineering standards for 132/33kV substation
 </CardDescription>
 </div>
 </div>
 <Badge variant="default" className="bg-blue-600">NEW</Badge>
 </div>
 <div className="flex gap-2 mt-2">
 <Badge variant="secondary">Differential Protection</Badge>
 <Badge variant="secondary">Distance Protection</Badge>
 <Badge variant="secondary">Overcurrent Protection</Badge>
 <Badge variant="outline">Standard Area</Badge>
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-sm text-gray-600">
 <p><strong></strong> </p>
 <p><strong>Functions:</strong> 87, 21, 50/51, 50N/51N, 50BF</p>
 <p><strong>Voltage Level:</strong> 132kV/33kV</p>
 </div>
 </CardContent>
 </Card>

 {/* RED670 Template */}
 <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Zap className="h-8 w-8 text-green-600" />
 <div>
 <CardTitle className="text-xl">RED670 - Line Differential & Distance Protection</CardTitle>
 <CardDescription className="text-base">
 132kV Cable Feeders line protection CT adequacy calculation per Engineering standards 
 </CardDescription>
 </div>
 </div>
 <Badge variant="default" className="bg-green-600">CABLE FEEDER</Badge>
 </div>
 <div className="flex gap-2 mt-2">
 <Badge variant="secondary">Line Differential (87L)</Badge>
 <Badge variant="secondary">Distance Protection</Badge>
 <Badge variant="secondary">Overcurrent Protection</Badge>
 <Badge variant="outline">132kV Application</Badge>
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-sm text-gray-600">
 <p><strong>Application:</strong> 132kV Cable Feeder Protection</p>
 <p><strong>Functions:</strong> 87L, 21 (Zones 1-3), 50/51, 50BF</p>
 <p><strong>CT Ratio:</strong> 3200/1800/1A</p>
 </div>
 </CardContent>
 </Card>

 {/* Add New Template Dialog */}
 <Dialog open={newTemplateOpen} onOpenChange={setNewTemplateOpen}>
 <DialogContent className="w-screen max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-6">
 <DialogHeader className="mb-6 shrink-0">
 <DialogTitle className="text-2xl font-bold">Create New IED Template</DialogTitle>
 </DialogHeader>

 <div className="flex-1 overflow-y-auto space-y-6 pr-6">
 {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

 {/* Template Basic Info */}
 <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900 p-6 rounded-lg shrink-0">
 <div className="space-y-2">
 <label className="text-sm font-semibold">Template Name *</label>
 <Input 
 value={newTemplate.name} 
 onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} 
 placeholder="e.g. SIEMENS 7SJ85" 
 className="h-10 text-base"
 required 
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-semibold">Relay Model *</label>
 <Input 
 value={newTemplate.relay} 
 onChange={e => setNewTemplate(p => ({ ...p, relay: e.target.value }))} 
 placeholder="e.g. SIEMENS, ABB, etc." 
 className="h-10 text-base"
 required 
 />
 </div>
 <div className="col-span-2 space-y-2">
 <label className="text-sm font-semibold">Description</label>
 <Input 
 value={newTemplate.description} 
 onChange={e => setNewTemplate(p => ({ ...p, description: e.target.value }))} 
 placeholder="Detailed description of the template" 
 className="h-10 text-base"
 />
 </div>
 </div>

 {/* Parameters Tabs */}
 <Tabs defaultValue="ct" className="w-full border rounded-lg overflow-hidden">
 <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-800 rounded-none border-b">
 <TabsTrigger value="ct" className="text-sm font-medium rounded-none">CT Data</TabsTrigger>
 <TabsTrigger value="system" className="text-sm font-medium rounded-none">System</TabsTrigger>
 <TabsTrigger value="line" className="text-sm font-medium rounded-none">Line</TabsTrigger>
 </TabsList>

 {/* CT Data Tab */}
 <TabsContent value="ct" className="p-6 space-y-4 m-0">
 <h3 className="font-semibold mb-4">CT Nameplate Parameters</h3>
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">CT Primary (Ipn) - Default</label>
 <Input type="number" step="any" value={newTemplate.parameters.ct_ratio_primary} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, ct_ratio_primary: e.target.value}}))} placeholder="600" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">CT Secondary (In) - Default</label>
 <Input type="number" step="any" value={newTemplate.parameters.ct_ratio_secondary} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, ct_ratio_secondary: e.target.value}}))} placeholder="1" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Accuracy Class - Default</label>
 <Input type="text" value={newTemplate.parameters.accuracy_class} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, accuracy_class: e.target.value}}))} placeholder="5P20" className="h-10" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Rct (Ω) - Default</label>
 <Input type="number" step="any" value={newTemplate.parameters.rct} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, rct: e.target.value}}))} placeholder="3.5" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Vk Available (V) - Default</label>
 <Input type="number" step="any" value={newTemplate.parameters.vk_available} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, vk_available: e.target.value}}))} placeholder="400" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Io at Vk (mA) - Default</label>
 <Input type="number" step="any" value={newTemplate.parameters.io_at_vk} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, io_at_vk: e.target.value}}))} placeholder="30" className="h-10 font-mono" />
 </div>
 </div>
 </TabsContent>

 {/* System Tab */}
 <TabsContent value="system" className="p-6 space-y-4 m-0">
 <h3 className="font-semibold mb-4">System Parameters - Default Values</h3>
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Frequency (Hz)</label>
 <Input type="number" step="any" value={newTemplate.parameters.frequency} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, frequency: e.target.value}}))} placeholder="50" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Bus Voltage (kV)</label>
 <Input type="number" step="any" value={newTemplate.parameters.bus_voltage_kv} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, bus_voltage_kv: e.target.value}}))} placeholder="33" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Max Bus Fault (MVA)</label>
 <Input type="number" step="any" value={newTemplate.parameters.max_bus_fault_mva} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, max_bus_fault_mva: e.target.value}}))} placeholder="1000" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Relay Burden (VA)</label>
 <Input type="number" step="any" value={newTemplate.parameters.relay_burden_va} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, relay_burden_va: e.target.value}}))} placeholder="5" className="h-10 font-mono" />
 </div>
 </div>
 </TabsContent>

 {/* Line Tab */}
 <TabsContent value="line" className="p-6 space-y-4 m-0">
 <h3 className="font-semibold mb-4">Line / Cable Parameters - Default Values</h3>
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">R1 (Ω/km)</label>
 <Input type="number" step="any" value={newTemplate.parameters.r1} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, r1: e.target.value}}))} placeholder="0.125" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">X1 (Ω/km)</label>
 <Input type="number" step="any" value={newTemplate.parameters.x1} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, x1: e.target.value}}))} placeholder="0.112" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">R0 (Ω/km)</label>
 <Input type="number" step="any" value={newTemplate.parameters.r0} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, r0: e.target.value}}))} placeholder="0.375" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">X0 (Ω/km)</label>
 <Input type="number" step="any" value={newTemplate.parameters.x0} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, x0: e.target.value}}))} placeholder="0.336" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Route Length (km)</label>
 <Input type="number" step="any" value={newTemplate.parameters.route_length_km} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, route_length_km: e.target.value}}))} placeholder="1" className="h-10 font-mono" />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium h-10 flex items-center">Lead Resistance (Ω)</label>
 <Input type="number" step="any" value={newTemplate.parameters.lead_resistance} onChange={e => setNewTemplate(p => ({...p, parameters: {...p.parameters, lead_resistance: e.target.value}}))} placeholder="0.05" className="h-10 font-mono" />
 </div>
 </div>
 </TabsContent>
 </Tabs>
 </div>

 {/* Action Buttons - Fixed at bottom */}
 <div className="flex gap-2 pt-4 border-t shrink-0 mt-6">
 <Button 
 onClick={handleCreateTemplate} 
 disabled={saving || !newTemplate.name || !newTemplate.relay}
 className="flex-1 h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
 >
 {saving ? <><Loader2 className="h-5 w-5 animate-spin mr-2" />Creating...</> : <>Create Template</>}
 </Button>
 <Button 
 onClick={() => setNewTemplateOpen(false)} 
 variant="outline"
 className="h-12"
 >
 Cancel
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
