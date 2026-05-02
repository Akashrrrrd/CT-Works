'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Activity, CheckCircle, XCircle, Zap, User } from 'lucide-react';

interface AuditLog {
  id: string; action: string; resourceType: string;
  resourceId?: string; userName?: string; details?: string; createdAt: string;
}

const ACTION_META: Record<string, { color: string; icon: React.ReactNode }> = {
  COMPUTATION_CREATED: { color: 'bg-blue-600',   icon: <Zap className="h-3 w-3" /> },
  APPROVAL_APPROVED:   { color: 'bg-green-600',  icon: <CheckCircle className="h-3 w-3" /> },
  APPROVAL_REJECTED:   { color: 'bg-red-600',    icon: <XCircle className="h-3 w-3" /> },
  USER_CREATED:        { color: 'bg-purple-600', icon: <User className="h-3 w-3" /> },
};

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? { color: 'bg-muted-foreground', icon: <Activity className="h-3 w-3" /> };
  return (
    <Badge className={`${meta.color} gap-1 text-xs`}>
      {meta.icon}{action.replace(/_/g, ' ')}
    </Badge>
  );
}

export default function AuditLogsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [loading, setLoading]   = useState(true);
  const [logs,    setLogs]      = useState<AuditLog[]>([]);
  const [search,  setSearch]    = useState('');
  const [action,  setAction]    = useState('ALL');

  const fetchLogs = useCallback(() => {
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (action !== 'ALL') qs.set('action', action);
    fetch(`/api/workspaces/${workspaceId}/audit?${qs}`)
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [workspaceId, search, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const exportCSV = () => {
    const rows = [['Timestamp', 'Action', 'Resource', 'User', 'Details'],
      ...logs.map(l => [new Date(l.createdAt).toISOString(), l.action, `${l.resourceType}:${l.resourceId ?? ''}`, l.userName ?? '', l.details ?? ''])];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const uniqueActions = ['ALL', ...Array.from(new Set(logs.map(l => l.action)))];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">Complete action history — {logs.length} entries</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" />Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, details..." className="pl-9" />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {uniqueActions.map(a => (
              <SelectItem key={a} value={a}>{a === 'ALL' ? 'All actions' : a.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Actions',   value: logs.length },
            { label: 'Unique Users',    value: new Set(logs.map(l => l.userName).filter(Boolean)).size },
            { label: 'Resource Types',  value: new Set(logs.map(l => l.resourceType)).size },
          ].map(s => (
            <Card key={s.label} className="text-center py-3">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No audit logs yet. Actions will appear here as you use the platform.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionBadge action={log.action} />
                  <span className="text-sm font-medium">{log.resourceType}</span>
                  {log.resourceId && <span className="text-xs text-muted-foreground font-mono truncate max-w-32">{log.resourceId.slice(-8)}</span>}
                </div>
                {log.details && <p className="text-xs text-muted-foreground truncate">{log.details}</p>}
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-xs font-medium">{log.userName ?? 'System'}</p>
                <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
