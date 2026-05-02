'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Zap, Menu, Home, FileText, CheckSquare, BookOpen,
  Settings, LogOut, ChevronDown, GitCompare, HardHat,
  ShieldCheck, BarChart3, Calculator, Building2, TrendingUp, Activity, FlaskConical, Cpu,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';
import type { UserRole } from '@/lib/auth';

interface WorkspaceData {
  id: string;
  name: string;
  organization?: { name: string };
}

interface UserData {
  name: string;
  email: string;
  role: UserRole;
}

const ROLE_META: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
  ENGINEER: { label: 'Engineer',        icon: <HardHat className="h-3 w-3" />,    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  ADMIN:    { label: 'Admin',           icon: <ShieldCheck className="h-3 w-3" />, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  MANAGER:  { label: 'Manager',         icon: <BarChart3 className="h-3 w-3" />,   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const params   = useParams();
  const pathname = usePathname();
  const workspaceId = params.id as string;

  const [loading,   setLoading]   = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [user,      setUser]      = useState<UserData | null>(null);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}`)
      .then(r => r.json())
      .then(d => { if (d.workspace) { setWorkspace(d.workspace); setUser(d.user); } })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
  };

  // Build nav based on role
  const allLinks = [
    { href: `/workspaces/${workspaceId}`,               label: 'Overview',       icon: <Home className="h-4 w-4" />,          roles: ['ENGINEER','ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/substations`,   label: 'Substations',    icon: <Building2 className="h-4 w-4" />,     roles: ['ENGINEER','ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/analysis`,      label: 'Full Analysis',  icon: <Cpu className="h-4 w-4" />,           roles: ['ENGINEER','ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/computations`,  label: 'CT Checks',      icon: <Calculator className="h-4 w-4" />,    roles: ['ENGINEER','ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/vt-check`,      label: 'VT Check',       icon: <Activity className="h-4 w-4" />,      roles: ['ENGINEER','ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/templates`,     label: 'IED Templates',  icon: <FileText className="h-4 w-4" />,      roles: ['ENGINEER','ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/relay-formulas`,label: 'Relay Formulas', icon: <FlaskConical className="h-4 w-4" />,  roles: ['ENGINEER','ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/compare`,       label: 'Compare',        icon: <GitCompare className="h-4 w-4" />,    roles: ['ENGINEER','ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/analytics`,     label: 'Analytics',      icon: <TrendingUp className="h-4 w-4" />,    roles: ['ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/approvals`,     label: 'Approvals',      icon: <CheckSquare className="h-4 w-4" />,   roles: ['ADMIN','MANAGER'] },
    { href: `/workspaces/${workspaceId}/audit`,         label: 'Audit Logs',     icon: <BookOpen className="h-4 w-4" />,      roles: ['MANAGER'] },
    { href: `/workspaces/${workspaceId}/settings`,      label: 'Settings',       icon: <Settings className="h-4 w-4" />,      roles: ['ADMIN','MANAGER'] },
  ];

  const visibleLinks = user
    ? allLinks.filter(l => l.roles.includes(user.role))
    : allLinks;

  const NavItems = () => (
    <>
      {visibleLinks.map(({ href, label, icon }) => {
        const isActive = href === `/workspaces/${workspaceId}`
          ? pathname === href
          : pathname.startsWith(href);
        return (
          <Link key={href} href={href}>
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-2 ${isActive ? 'font-semibold' : ''}`}
            >
              {icon}{label}
            </Button>
          </Link>
        );
      })}
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="grid grid-cols-12 h-screen">
          <div className="col-span-3 border-r border-border p-6 hidden lg:block space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
          <div className="col-span-12 lg:col-span-9">
            <Skeleton className="h-16 w-full" />
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roleMeta = user ? ROLE_META[user.role] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 w-64 h-screen bg-sidebar border-r border-sidebar-border p-6 flex-col">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8">
          <Zap className="h-6 w-6 text-sidebar-primary" />
          <span className="font-bold text-lg">CT Adequacy</span>
        </Link>

        <div className="mb-6 pb-6 border-b border-sidebar-border">
          <p className="text-sm font-medium text-sidebar-foreground">{workspace?.name}</p>
          <p className="text-xs text-sidebar-accent-foreground opacity-75">{workspace?.organization?.name}</p>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItems />
        </nav>

        <div className="pt-6 border-t border-sidebar-border space-y-3">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-sidebar-foreground">{user?.name}</p>
              {roleMeta && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleMeta.color}`}>
                  {roleMeta.icon}{roleMeta.label}
                </span>
              )}
            </div>
            <p className="text-xs text-sidebar-accent-foreground opacity-75">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-card border-b border-border p-4 flex justify-between items-center z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-bold">CT Adequacy</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="space-y-6">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <Zap className="h-5 w-5" /><span className="font-bold">CT Adequacy</span>
                </Link>
                {roleMeta && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border ${roleMeta.color}`}>
                    {roleMeta.icon}{roleMeta.label}
                  </span>
                )}
                <nav className="space-y-2"><NavItems /></nav>
                <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 lg:pt-0 pt-20">
        <div className="bg-card border-b border-border px-6 py-4 flex justify-between items-center sticky top-20 lg:top-0 z-30">
          <div>
            <h1 className="text-xl font-bold">{workspace?.name}</h1>
            <p className="text-xs text-muted-foreground">{workspace?.organization?.name}</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {roleMeta && <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleMeta.color}`}>{roleMeta.icon}{roleMeta.label}</span>}
                  {user?.name}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled><span className="text-xs">{user?.email}</span></DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
