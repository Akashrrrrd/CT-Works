'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, HardHat, ShieldCheck, BarChart3, AlertCircle, Copy, Check, FileText } from 'lucide-react';

interface User {
  id: string; employeeId: string; name: string; email: string; role: string; createdAt: string;
}

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ENGINEER: { label: 'Engineer',    icon: <HardHat className="h-3 w-3" />,    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  ADMIN:    { label: 'Admin / Lead',icon: <ShieldCheck className="h-3 w-3" />, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  MANAGER:  { label: 'Manager',     icon: <BarChart3 className="h-3 w-3" />,   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function PDFBrandingCard() {
  const KEYS = [
    { key: 'pdf_company',    label: 'Company Name',    placeholder: 'e.g. Hitachi Energy' },
    { key: 'pdf_project',    label: 'Project Name',    placeholder: 'e.g. 33kV DF5W Substation' },
    { key: 'pdf_contract',   label: 'Contract No.',    placeholder: 'e.g. N-19957.1-DF5W' },
    { key: 'pdf_substation', label: 'Substation Name', placeholder: 'e.g. 33kV DF5W SS' },
    { key: 'pdf_revision',   label: 'Revision No.',    placeholder: 'e.g. A' },
  ];
  const [vals, setVals] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    return Object.fromEntries(KEYS.map(k => [k.key, localStorage.getItem(k.key) ?? '']));
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    KEYS.forEach(k => {
      if (vals[k.key]) localStorage.setItem(k.key, vals[k.key]);
      else localStorage.removeItem(k.key);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">PDF Report Branding</CardTitle>
        </div>
        <CardDescription className="text-xs">These values appear on every PDF report header. Stored in your browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {KEYS.map(k => (
            <div key={k.key} className="space-y-1">
              <label className="text-xs font-medium">{k.label}</label>
              <Input
                value={vals[k.key] ?? ''}
                onChange={e => setVals(p => ({ ...p, [k.key]: e.target.value }))}
                placeholder={k.placeholder}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
        <Button size="sm" onClick={save} className="gap-2">
          {saved ? <><Check className="h-3.5 w-3.5" />Saved</> : 'Save Branding'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [created, setCreated] = useState<{ employeeId: string; password: string } | null>(null);

  const [form, setForm] = useState({
    name: '', employeeId: '', role: 'ENGINEER', password: '',
  });

  const load = () => {
    fetch(`/api/workspaces/${workspaceId}/users`)
      .then(r => r.json())
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [workspaceId]);

  // Auto-generate Employee ID from name + role
  const autoId = (name: string, role: string) => {
    const prefix = role === 'ENGINEER' ? 'ENG' : role === 'ADMIN' ? 'ADM' : 'MGR';
    const existing = users.filter(u => u.employeeId.startsWith(prefix));
    const next = String(existing.length + 1).padStart(3, '0');
    return `${prefix}-${next}`;
  };

  const handleNameChange = (name: string) => {
    setForm(p => ({ ...p, name, employeeId: autoId(name, p.role) }));
  };

  const handleRoleChange = (role: string) => {
    setForm(p => ({ ...p, role, employeeId: autoId(p.name, role) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreated({ employeeId: data.employeeId, password: form.password });
      setForm({ name: '', employeeId: '', role: 'ENGINEER', password: '' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const grouped = {
    MANAGER:  users.filter(u => u.role === 'MANAGER'),
    ADMIN:    users.filter(u => u.role === 'ADMIN'),
    ENGINEER: users.filter(u => u.role === 'ENGINEER'),
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Workspace configuration and user management</p>
      </div>

      {/* PDF Report Branding */}
      <PDFBrandingCard />

      {/* User Management */}
      <div className="flex justify-between items-start">

        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setCreated(null); setError(''); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add User</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>New Team Member</DialogTitle></DialogHeader>

            {/* Success state — show credentials */}
            {created ? (
              <div className="space-y-4 mt-2">
                <div className="rounded-lg border border-green-700 bg-green-950/20 p-4 space-y-3">
                  <p className="text-sm font-semibold text-green-400">User created successfully</p>
                  <p className="text-xs text-muted-foreground">Share these credentials with the user. The password cannot be recovered later.</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-muted rounded px-3 py-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Employee ID</p>
                        <p className="font-mono font-bold">{created.employeeId}</p>
                      </div>
                      <CopyButton text={created.employeeId} />
                    </div>
                    <div className="flex items-center justify-between bg-muted rounded px-3 py-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Password</p>
                        <p className="font-mono font-bold">{created.password}</p>
                      </div>
                      <CopyButton text={created.password} />
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => { setCreated(null); setOpen(false); }}>Done</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 mt-2">
                {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name *</label>
                  <Input value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Aakash Rajendran" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Role *</label>
                  <Select value={form.role} onValueChange={handleRoleChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENGINEER">Engineer</SelectItem>
                      <SelectItem value="ADMIN">Admin / Lead</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Employee ID *</label>
                  <Input
                    value={form.employeeId}
                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value.toUpperCase() }))}
                    placeholder="e.g. ENG-002"
                    className="font-mono"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Auto-generated — edit if needed</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Password *</label>
                  <Input
                    type="text"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min 6 characters"
                    required
                  />
                  <p className="text-xs text-muted-foreground">You'll see this once — share it with the user</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Creating...' : 'Create User'}</Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        Object.entries(grouped).map(([role, list]) => {
          const meta = ROLE_META[role];
          if (list.length === 0) return null;
          return (
            <Card key={role}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${meta.color}`}>
                    {meta.icon}{meta.label}
                  </span>
                  <CardDescription className="text-xs">{list.length} member{list.length !== 1 ? 's' : ''}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map(u => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono text-xs text-muted-foreground">{u.employeeId}</span>
                        <CopyButton text={u.employeeId} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}

      {!loading && users.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No users yet. Add your first team member.</CardContent></Card>
      )}
    </div>
  );
}
