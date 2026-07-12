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
import { ArrowLeft, Plus, AlertCircle, Edit, Trash2, MoreVertical, Zap, GitCompare } from 'lucide-react';

interface Bay { 
  id: string; 
  name: string; 
  type: string; 
  voltage: string; 
  description?: string;
}

const BAY_TYPE_COLOR: Record<string, string> = {
  FEEDER: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  TRANSFORMER: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  BUSBAR: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  COUPLER: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  OTHER: 'bg-muted text-muted-foreground',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const subId       = params.subId as string;

  const [loading, setLoading]     = useState(true);
  const [bays, setBays]           = useState<Bay[]>([]);
  const [subName, setSubName]     = useState('');
  const [error, setError]         = useState('');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedBays, setSelectedBays] = useState<string[]>([]);

  // Bay form states
  const [bayOpen, setBayOpen]     = useState(false);
  const [editBayOpen, setEditBayOpen] = useState(false);
  const [deleteBayOpen, setDeleteBayOpen] = useState(false);
  const [editingBay, setEditingBay] = useState<Bay | null>(null);
  const [deletingBay, setDeletingBay] = useState<Bay | null>(null);
  
  const [bayForm, setBayForm] = useState({ 
    name: '', 
    type: 'FEEDER', 
    voltage: '', 
    description: '',
    customType: ''
  });
  
  const [editForm, setEditForm] = useState({ 
    name: '', 
    type: 'FEEDER', 
    voltage: '', 
    description: '',
    customType: ''
  });

  const [saving, setSaving] = useState(false);
  const [showCustomType, setShowCustomType] = useState(false);
  const [showEditCustomType, setShowEditCustomType] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/workspaces/${workspaceId}/hierarchy`),
      fetch(`/api/workspaces/${workspaceId}/substations/${subId}/bays?types=true`)
    ])
      .then(([hierarchyRes, typesRes]) => Promise.all([hierarchyRes.json(), typesRes.json()]))
      .then(([hierarchyData, typesData]) => {
        const sub = (hierarchyData.tree ?? []).find((s: any) => s.id === subId);
        if (sub) { 
          setSubName(sub.name); 
          setBays(sub.bays ?? []); 
        }
        if (typesData.types) {
          setAvailableTypes(typesData.types);
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [subId]);

  const addBay = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSaving(true); 
    setError('');
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/substations/${subId}/bays`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({
          ...bayForm,
          customType: showCustomType ? bayForm.customType : ''
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setBayOpen(false); 
      setBayForm({ name: '', type: 'FEEDER', voltage: '', description: '', customType: '' }); 
      setShowCustomType(false);
      load();
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleEditBay = (bay: Bay) => {
    setEditingBay(bay);
    setEditForm({
      name: bay.name,
      type: bay.type,
      voltage: bay.voltage,
      description: bay.description || '',
      customType: ''
    });
    setShowEditCustomType(false);
    setEditBayOpen(true);
  };

  const updateBay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBay) return;
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/substations/${subId}/bays`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bayId: editingBay.id, 
          ...editForm,
          customType: showEditCustomType ? editForm.customType : ''
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setEditBayOpen(false);
      setEditingBay(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update bay');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBay = (bay: Bay) => {
    setDeletingBay(bay);
    setDeleteBayOpen(true);
  };

  const confirmDeleteBay = async () => {
    if (!deletingBay) return;
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/substations/${subId}/bays`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bayId: deletingBay.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setDeleteBayOpen(false);
      setDeletingBay(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete bay');
    } finally {
      setSaving(false);
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedBays([]);
  };

  const toggleBaySelection = (bayId: string) => {
    if (selectedBays.includes(bayId)) {
      setSelectedBays(prev => prev.filter(id => id !== bayId));
    } else if (selectedBays.length < 3) {
      setSelectedBays(prev => [...prev, bayId]);
    }
  };

  const handleCompareBays = () => {
    if (selectedBays.length >= 2) {
      router.push(`/workspaces/${workspaceId}/substations/${subId}/compare?bays=${selectedBays.join(',')}`);
    }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}/substations`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />Projects
            </Button>
          </Link>
          <h2 className="text-xl font-bold">{subName}</h2>
        </div>
        <div className="flex gap-2">
          {compareMode && selectedBays.length >= 2 && (
            <Button onClick={handleCompareBays} className="gap-2">
              <GitCompare className="h-4 w-4" />
              Compare ({selectedBays.length})
            </Button>
          )}
          <Button 
            variant={compareMode ? "default" : "outline"} 
            onClick={toggleCompareMode} 
            className="gap-2"
          >
            <GitCompare className="h-4 w-4" />
            {compareMode ? 'Cancel Compare' : 'Compare Bays'}
          </Button>
        </div>
      </div>

      {/* Bays Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* New Bay Card */}
        <Card 
          className="aspect-square flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 transition-colors"
          onClick={() => setBayOpen(true)}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">New Bay</p>
          </CardContent>
        </Card>

        {/* Existing Bays */}
        {bays.map(bay => (
          <Card 
            key={bay.id} 
            className={`aspect-square relative cursor-pointer hover:shadow-md transition-shadow group ${
              compareMode 
                ? selectedBays.includes(bay.id)
                  ? 'ring-2 ring-primary bg-primary/5'
                  : selectedBays.length >= 3
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:ring-1 hover:ring-primary/50'
                : ''
            }`}
            onClick={() => compareMode 
              ? toggleBaySelection(bay.id)
              : router.push(`/workspaces/${workspaceId}/substations/${subId}/bays/${bay.id}`)
            }
          >
            <CardContent className="p-4 h-full flex flex-col justify-between">
              {/* Compare mode selection or Three-dot menu */}
              <div className="flex justify-between items-start">
                {compareMode && selectedBays.includes(bay.id) && (
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {selectedBays.indexOf(bay.id) + 1}
                  </div>
                )}
                {!compareMode && (
                  <div className="flex justify-end w-full">
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditBay(bay); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleDeleteBay(bay); }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {/* Bay Content */}
              <div className="flex-1 flex flex-col justify-center text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold text-sm leading-tight mb-1">{bay.name}</h3>
                {bay.voltage && (
                  <p className="text-xs text-muted-foreground">{bay.voltage}</p>
                )}
              </div>

              {/* Bay Type Badge */}
              <div className="flex justify-center">
                <span className={`text-[10px] font-semibold px-2 py-1 rounded border ${BAY_TYPE_COLOR[bay.type] ?? BAY_TYPE_COLOR.OTHER}`}>
                  {bay.type}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialogs */}
      <Dialog open={bayOpen} onOpenChange={setBayOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Bay</DialogTitle></DialogHeader>
          <form onSubmit={addBay} className="space-y-4 mt-2">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-1">
              <label className="text-sm font-medium">Bay Name *</label>
              <Input 
                value={bayForm.name} 
                onChange={e => setBayForm(p => ({ ...p, name: e.target.value }))} 
                placeholder="e.g. Feeder 1 – Incoming" 
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={showCustomType ? 'OTHERS' : bayForm.type} 
                  onValueChange={v => {
                    if (v === 'OTHERS') {
                      setShowCustomType(true);
                      setBayForm(p => ({ ...p, type: '', customType: '' }));
                    } else {
                      setShowCustomType(false);
                      setBayForm(p => ({ ...p, type: v, customType: '' }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    <SelectItem value="OTHERS">Others (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                {showCustomType && (
                  <Input 
                    value={bayForm.customType} 
                    onChange={e => setBayForm(p => ({ ...p, customType: e.target.value }))} 
                    placeholder="Enter custom type"
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Voltage</label>
                <Input 
                  value={bayForm.voltage} 
                  onChange={e => setBayForm(p => ({ ...p, voltage: e.target.value }))} 
                  placeholder="e.g. 33kV" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Input 
                value={bayForm.description} 
                onChange={e => setBayForm(p => ({ ...p, description: e.target.value }))} 
                placeholder="Optional description" 
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Creating...' : 'Create Bay'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setBayOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Bay Dialog */}
      <Dialog open={editBayOpen} onOpenChange={setEditBayOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Bay</DialogTitle></DialogHeader>
          <form onSubmit={updateBay} className="space-y-4 mt-2">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-1">
              <label className="text-sm font-medium">Bay Name *</label>
              <Input 
                value={editForm.name} 
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} 
                placeholder="e.g. Feeder 1 – Incoming" 
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={showEditCustomType ? 'OTHERS' : editForm.type} 
                  onValueChange={v => {
                    if (v === 'OTHERS') {
                      setShowEditCustomType(true);
                      setEditForm(p => ({ ...p, type: '', customType: '' }));
                    } else {
                      setShowEditCustomType(false);
                      setEditForm(p => ({ ...p, type: v, customType: '' }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    <SelectItem value="OTHERS">Others (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                {showEditCustomType && (
                  <Input 
                    value={editForm.customType} 
                    onChange={e => setEditForm(p => ({ ...p, customType: e.target.value }))} 
                    placeholder="Enter custom type"
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Voltage</label>
                <Input 
                  value={editForm.voltage} 
                  onChange={e => setEditForm(p => ({ ...p, voltage: e.target.value }))} 
                  placeholder="e.g. 33kV" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Input 
                value={editForm.description} 
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} 
                placeholder="Optional description" 
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Updating...' : 'Update Bay'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditBayOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Bay Dialog */}
      <Dialog open={deleteBayOpen} onOpenChange={setDeleteBayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete Bay</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "<span className="font-medium">{deletingBay?.name}</span>"? 
            </p>
            <p className="text-sm text-muted-foreground">
              This will also delete all associated IEDs. This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="destructive" 
                disabled={saving} 
                className="flex-1"
                onClick={confirmDeleteBay}
              >
                {saving ? 'Deleting...' : 'Delete Bay'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDeleteBayOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
