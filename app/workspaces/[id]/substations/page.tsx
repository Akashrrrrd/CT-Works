'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
 Plus, Building2, Edit, Trash2, MoreVertical, AlertCircle, GitCompare,
} from 'lucide-react';

interface Substation {
 id: string; name: string; voltageLevel: string; location: string; 
 approvedBy: string; startDate: string; clientName: string; 
}

export default function ProjectsPage() {
 const params = useParams();
 const router = useRouter();
 const workspaceId = params.id as string;

 const [loading, setLoading] = useState(true);
 const [tree, setTree] = useState<Substation[]>([]);
 const [error, setError] = useState('');
 const [addSubOpen, setAddSubOpen] = useState(false);
 const [editSubOpen, setEditSubOpen] = useState(false);
 const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
 const [editingProject, setEditingProject] = useState<Substation | null>(null);
 const [deletingProject, setDeletingProject] = useState<Substation | null>(null);
 const [subForm, setSubForm] = useState({ 
 name: '', 
 voltageLevel: '', 
 location: '', 
 description: '', 
 approvedBy: '', 
 startDate: '', 
 clientName: '' 
 });
 const [editForm, setEditForm] = useState({ 
 name: '', 
 voltageLevel: '', 
 location: '', 
 description: '', 
 approvedBy: '', 
 startDate: '', 
 clientName: '' 
 });
 const [saving, setSaving] = useState(false);

 const load = () => {
 setLoading(true);
 fetch(`/api/workspaces/${workspaceId}/hierarchy`)
 .then(r => r.json())
 .then(d => { setTree(d.tree ?? []); })
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
 setSubForm({ 
 name: '', 
 voltageLevel: '', 
 location: '', 
 description: '', 
 approvedBy: '', 
 startDate: '', 
 clientName: '' 
 });
 load();
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to add project');
 } finally {
 setSaving(false);
 }
 };

 const handleEditProject = (project: Substation) => {
 setEditingProject(project);
 setEditForm({
 name: project.name,
 voltageLevel: project.voltageLevel,
 location: project.location,
 description: '',
 approvedBy: project.approvedBy || '',
 startDate: project.startDate || '',
 clientName: project.clientName || ''
 });
 setEditSubOpen(true);
 };

 const handleUpdateProject = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingProject) return;
 setSaving(true);
 try {
 const res = await fetch(`/api/workspaces/${workspaceId}/substations`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ projectId: editingProject.id, ...editForm }),
 });
 if (!res.ok) throw new Error((await res.json()).error);
 setEditSubOpen(false);
 setEditingProject(null);
 load();
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to update project');
 } finally {
 setSaving(false);
 }
 };

 const handleDeleteProject = (project: Substation) => {
 setDeletingProject(project);
 setDeleteConfirmOpen(true);
 };

 const confirmDeleteProject = async () => {
 if (!deletingProject) return;
 setSaving(true);
 try {
 const res = await fetch(`/api/workspaces/${workspaceId}/substations`, {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ projectId: deletingProject.id }),
 });
 if (!res.ok) throw new Error((await res.json()).error);
 setDeleteConfirmOpen(false);
 setDeletingProject(null);
 load();
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to delete project');
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
 <h2 className="text-2xl font-bold">Projects</h2>
 <p className="text-sm text-muted-foreground">Project → Bay → IED hierarchy</p>
 </div>
 </div>

 {/* Projects Grid */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
 {/* New Project Card */}
 <Card 
 className="aspect-square flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 transition-colors"
 onClick={() => setAddSubOpen(true)}
 >
 <CardContent className="flex flex-col items-center justify-center p-6 text-center">
 <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
 <Plus className="h-6 w-6 text-primary" />
 </div>
 <p className="text-sm font-medium text-muted-foreground">New Project</p>
 </CardContent>
 </Card>

 {/* Existing Projects */}
 {tree.map(project => (
 <Card 
 key={project.id} 
 className="aspect-square relative cursor-pointer hover:shadow-md transition-shadow group"
 onClick={() => router.push(`/workspaces/${workspaceId}/substations/${project.id}`)}
 >
 <CardContent className="p-4 h-full flex flex-col justify-between">
 {/* Three-dot menu */}
 <div className="flex justify-between items-start">
 <div /> {/* Spacer */}
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
 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
 <Edit className="h-4 w-4 mr-2" />
 Edit
 </DropdownMenuItem>
 <DropdownMenuItem 
 onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
 className="text-red-600"
 >
 <Trash2 className="h-4 w-4 mr-2" />
 Delete
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 {/* Project Content */}
 <div className="flex-1 flex flex-col justify-center text-center">
 <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
 <h3 className="font-semibold text-sm leading-tight mb-1">{project.name}</h3>
 {project.voltageLevel && (
 <p className="text-xs text-muted-foreground">{project.voltageLevel}</p>
 )}
 </div>

 {/* Project Info */}
 <div className="space-y-1">
 {project.clientName && (
 <p className="text-xs text-muted-foreground truncate">
 <span className="font-medium">Client:</span> {project.clientName}
 </p>
 )}
 {project.approvedBy && (
 <p className="text-xs text-muted-foreground truncate">
 <span className="font-medium">By:</span> {project.approvedBy}
 </p>
 )}
 {project.startDate && (
 <p className="text-xs text-muted-foreground">
 <span className="font-medium">Start:</span> {new Date(project.startDate).toLocaleDateString()}
 </p>
 )}
 </div>
 </CardContent>
 </Card>
 ))}
 </div>

 {/* Dialogs */}
 <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
 <DialogContent className="max-w-2xl">
 <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
 <form onSubmit={handleAddSubstation} className="space-y-4 mt-2">
 {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
 <div className="space-y-1">
 <label className="text-sm font-medium">Project Name *</label>
 <Input value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 2026 Substation" required />
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
 <div className="grid grid-cols-3 gap-3">
 <div className="space-y-1">
 <label className="text-sm font-medium">Approved By</label>
 <Input value={subForm.approvedBy} onChange={e => setSubForm(p => ({ ...p, approvedBy: e.target.value }))} placeholder="e.g. John Smith" />
 </div>
 <div className="space-y-1">
 <label className="text-sm font-medium">Start Date</label>
 <Input 
 type="date" 
 value={subForm.startDate} 
 onChange={e => setSubForm(p => ({ ...p, startDate: e.target.value }))} 
 />
 </div>
 <div className="space-y-1">
 <label className="text-sm font-medium">Client Name</label>
 <Input value={subForm.clientName} onChange={e => setSubForm(p => ({ ...p, clientName: e.target.value }))} placeholder="e.g. ABC Corp" />
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-sm font-medium">Description</label>
 <Input value={subForm.description} onChange={e => setSubForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
 </div>
 <div className="flex gap-2 pt-2">
 <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Create Project'}</Button>
 <Button type="button" variant="outline" onClick={() => setAddSubOpen(false)}>Cancel</Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>

 <Dialog open={editSubOpen} onOpenChange={setEditSubOpen}>
 <DialogContent className="max-w-2xl">
 <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
 <form onSubmit={handleUpdateProject} className="space-y-4 mt-2">
 {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
 <div className="space-y-1">
 <label className="text-sm font-medium">Project Name *</label>
 <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. 2026 Substation" required />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-sm font-medium">Voltage Level</label>
 <Input value={editForm.voltageLevel} onChange={e => setEditForm(p => ({ ...p, voltageLevel: e.target.value }))} placeholder="e.g. 33kV" />
 </div>
 <div className="space-y-1">
 <label className="text-sm font-medium">Location</label>
 <Input value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Site A" />
 </div>
 </div>
 <div className="grid grid-cols-3 gap-3">
 <div className="space-y-1">
 <label className="text-sm font-medium">Approved By</label>
 <Input value={editForm.approvedBy} onChange={e => setEditForm(p => ({ ...p, approvedBy: e.target.value }))} placeholder="e.g. John Smith" />
 </div>
 <div className="space-y-1">
 <label className="text-sm font-medium">Start Date</label>
 <Input 
 type="date" 
 value={editForm.startDate} 
 onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} 
 />
 </div>
 <div className="space-y-1">
 <label className="text-sm font-medium">Client Name</label>
 <Input value={editForm.clientName} onChange={e => setEditForm(p => ({ ...p, clientName: e.target.value }))} placeholder="e.g. ABC Corp" />
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-sm font-medium">Description</label>
 <Input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
 </div>
 <div className="flex gap-2 pt-2">
 <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Updating...' : 'Update Project'}</Button>
 <Button type="button" variant="outline" onClick={() => setEditSubOpen(false)}>Cancel</Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>

 <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader><DialogTitle>Delete Project</DialogTitle></DialogHeader>
 <div className="space-y-4 mt-2">
 {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
 <p className="text-sm text-muted-foreground">
 Are you sure you want to delete "<span className="font-medium">{deletingProject?.name}</span>"? 
 </p>
 <p className="text-sm text-muted-foreground">
 This will also delete all associated bays and IEDs. This action cannot be undone.
 </p>
 <div className="flex gap-2 pt-2">
 <Button 
 variant="destructive" 
 disabled={saving} 
 className="flex-1"
 onClick={confirmDeleteProject}
 >
 {saving ? 'Deleting...' : 'Delete Project'}
 </Button>
 <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
