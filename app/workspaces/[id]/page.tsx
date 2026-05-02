'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Zap, CheckSquare, TrendingUp, Plus,
  CheckCircle, AlertTriangle, Clock, Building2,
  BarChart3, ShieldCheck,
} from 'lucide-react';

interface Stats {
  totalTemplates:        number;
  totalComputations:     number;
  pendingApprovals:      number;
  completedComputations: number;
  suitablyDimensioned:   number;
  underDimensioned:      number;
}

interface RecentComputation {
  id: string; templateName: string;
  verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  vk_required: number; vk_available: number;
  approvalStatus: string; createdAt: string;
  createdBy: { name: string };
}

export default function WorkspaceOverviewPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [recent,  setRecent]  = useState<RecentComputation[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/workspaces/${workspaceId}/stats`).then(r => r.json()),
      fetch(`/api/workspaces/${workspaceId}/computations`).then(r => r.json()),
    ]).then(([s, c]) => {
      setStats(s);
      setRecent(Array.isArray(c) ? c.slice(0, 5) : []);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  const adequate  = stats?.suitablyDimensioned ?? 0;
  const underDim  = stats?.underDimensioned    ?? 0;
  const total     = stats?.totalComputations   ?? 0;
  const pct       = total > 0 ? Math.round((adequate / total) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* Adequacy health bar */}
      {total > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall CT Adequacy</span>
            <span className={`font-bold ${pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {pct}% Suitable
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />{adequate} Suitable</span>
            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" />{underDim} Under Dim.</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{total - adequate - underDim} Pending</span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href={`/workspaces/${workspaceId}/templates`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IED Templates</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTemplates ?? 0}</div>
              <p className="text-xs text-muted-foreground">Protection functions</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/workspaces/${workspaceId}/computations`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Computations</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalComputations ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">{adequate} suitable</span>
                {underDim > 0 && <span className="text-red-500 ml-2">{underDim} under dim.</span>}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/workspaces/${workspaceId}/approvals`}>
          <Card className={`hover:border-primary/50 transition-colors cursor-pointer ${(stats?.pendingApprovals ?? 0) > 0 ? 'border-amber-600/50' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <CheckSquare className={`h-4 w-4 ${(stats?.pendingApprovals ?? 0) > 0 ? 'text-amber-500' : 'text-primary'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(stats?.pendingApprovals ?? 0) > 0 ? 'text-amber-500' : ''}`}>
                {stats?.pendingApprovals ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/workspaces/${workspaceId}/substations`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Substations</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedComputations ?? 0}</div>
              <p className="text-xs text-muted-foreground">Approved checks</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Run CT Adequacy Check</CardTitle>
            </div>
            <CardDescription className="text-xs">Select a protection function and enter parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/workspaces/${workspaceId}/computations/new`}>
              <Button className="w-full gap-2" size="sm"><Plus className="h-3 w-3" />New Computation</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Manage Substations</CardTitle>
            </div>
            <CardDescription className="text-xs">Organise IEDs by substation and bay</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/workspaces/${workspaceId}/substations`}>
              <Button variant="outline" className="w-full gap-2" size="sm"><Building2 className="h-3 w-3" />View Hierarchy</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Compare Results</CardTitle>
            </div>
            <CardDescription className="text-xs">Side-by-side CT adequacy comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/workspaces/${workspaceId}/compare`}>
              <Button variant="outline" className="w-full gap-2" size="sm"><BarChart3 className="h-3 w-3" />Compare</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent computations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Computations</CardTitle>
            <CardDescription className="text-xs">Latest CT adequacy check results</CardDescription>
          </div>
          <Link href={`/workspaces/${workspaceId}/computations`}>
            <Button variant="ghost" size="sm" className="text-xs">View all</Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">No computations yet.</p>
              <Link href={`/workspaces/${workspaceId}/computations/new`}>
                <Button size="sm" className="gap-1"><Plus className="h-3 w-3" />Run first check</Button>
              </Link>
            </div>
          ) : (
            recent.map(c => {
              const ok = c.verdict === 'SUITABLY DIMENSIONED';
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {ok
                      ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      : <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{c.templateName}</p>
                      <p className="text-xs text-muted-foreground">
                        Vk req: {c.vk_required}V · avail: {c.vk_available}V
                        {c.createdBy?.name && ` · ${c.createdBy.name}`}
                        {' · '}{new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${ok ? 'bg-green-700' : 'bg-red-700'}`}>
                      {ok ? 'Suitable' : 'Under Dim.'}
                    </Badge>
                    {c.approvalStatus === 'PENDING' && (
                      <Badge variant="outline" className="text-xs gap-1 border-amber-600 text-amber-500">
                        <Clock className="h-3 w-3" />Pending
                      </Badge>
                    )}
                    {c.approvalStatus === 'APPROVED' && (
                      <Badge variant="outline" className="text-xs border-green-700 text-green-400 gap-1">
                        <ShieldCheck className="h-3 w-3" />Approved
                      </Badge>
                    )}
                    {c.approvalStatus === 'REJECTED' && (
                      <Badge variant="outline" className="text-xs border-red-700 text-red-400">Rejected</Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
