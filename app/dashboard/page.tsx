'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Settings, LogOut, HardHat, ShieldCheck, BarChart3,
  Calculator, FileText, CheckSquare, BookOpen,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import type { UserRole } from '@/lib/auth';

interface Workspace { id: string; name: string; description?: string; createdAt: string }
interface DashboardData {
  user: { id: string; name: string; email: string; role: UserRole };
  workspaces: Workspace[];
}

const ROLE_META: Record<UserRole, { label: string; icon: React.ReactNode; color: string; hint: string }> = {
  ENGINEER: {
    label: 'Engineer',
    icon: <HardHat className="h-4 w-4" />,
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    hint: 'Import Excel files to extract CT data and create adequacy computations automatically.',
  },
  ADMIN: {
    label: 'Admin / Team Lead',
    icon: <ShieldCheck className="h-4 w-4" />,
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    hint: 'Import Excel data, review computations, and manage relay templates with approval workflows.',
  },
  MANAGER: {
    label: 'Manager',
    icon: <BarChart3 className="h-4 w-4" />,
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    hint: 'Access Excel import features, view all computations, and export comprehensive PDF reports.',
  },
};

const ROLE_QUICK_ACTIONS: Record<UserRole, { label: string; icon: React.ReactNode; href: (id: string) => string }[]> = {
  ENGINEER: [
    { label: 'Import Excel Data', icon: <FileText className="h-4 w-4" />, href: id => `/workspaces/${id}/relay-templates` },
    { label: 'New Computation', icon: <Calculator className="h-4 w-4" />, href: id => `/workspaces/${id}/computations/new` },
  ],
  ADMIN: [
    { label: 'Import Excel Data', icon: <FileText className="h-4 w-4" />, href: id => `/workspaces/${id}/relay-templates` },
    { label: 'Pending Approvals', icon: <CheckSquare className="h-4 w-4" />, href: id => `/workspaces/${id}/approvals` },
  ],
  MANAGER: [
    { label: 'Import Excel Data', icon: <FileText className="h-4 w-4" />, href: id => `/workspaces/${id}/relay-templates` },
    { label: 'All Computations', icon: <Calculator className="h-4 w-4" />, href: id => `/workspaces/${id}/computations` },
  ],
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => router.push('/auth/login')}>Back to Login</Button>
        </Card>
      </div>
    );
  }

  const role     = data?.user.role ?? 'ENGINEER';
  const roleMeta = ROLE_META[role];
  const quickActions = ROLE_QUICK_ACTIONS[role];
  const firstWs  = data?.workspaces[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">CT/VT Adequacy Platform</h1>
            <p className="text-xs text-muted-foreground">IEC 61869 — Protection Relay CT Check</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <p className="font-medium text-sm">{data?.user.name}</p>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${roleMeta.color}`}>
                  {roleMeta.icon}{roleMeta.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{data?.user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Role hint banner */}
        <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${roleMeta.color}`}>
          {roleMeta.icon}
          <p className="text-sm">{roleMeta.hint}</p>
        </div>

        {/* Quick actions for first workspace */}
        {firstWs && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map(a => (
                <Link key={a.label} href={a.href(firstWs.id)}>
                  <Button variant="outline" size="sm" className="gap-2">
                    {a.icon}{a.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Workspaces */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Workspaces</h2>
              <p className="text-sm text-muted-foreground">Your substations / project environments</p>
            </div>
            {(role === 'ADMIN' || role === 'MANAGER') && (
              <Link href="/dashboard/workspace/new">
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />New Workspace</Button>
              </Link>
            )}
          </div>

          {data?.workspaces.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground mb-4">No workspaces yet</p>
                {(role === 'ADMIN' || role === 'MANAGER') && (
                  <Link href="/dashboard/workspace/new">
                    <Button>Create First Workspace</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.workspaces.map(ws => (
                <Link key={ws.id} href={`/workspaces/${ws.id}`}>
                  <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                    <CardHeader>
                      <CardTitle className="text-base">{ws.name}</CardTitle>
                      <CardDescription className="text-xs">{ws.description || 'No description'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild><span>Open</span></Button>
                        {(role === 'ADMIN' || role === 'MANAGER') && (
                          <Button variant="ghost" size="sm" onClick={e => { e.preventDefault(); router.push(`/workspaces/${ws.id}/settings`); }}>
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
