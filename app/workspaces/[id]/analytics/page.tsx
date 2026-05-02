'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { CheckCircle, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface Computation {
  id: string; templateName: string; verdict: string;
  vk_required: number; vk_available: number; ealreq_max: number;
  approvalStatus: string; createdAt: string;
  sheet2: { bus_voltage_kv: number };
}

const COLORS = { suitable: '#22c55e', under: '#ef4444', pending: '#f59e0b', approved: '#3b82f6' };

export default function AnalyticsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [loading, setLoading]           = useState(true);
  const [computations, setComputations] = useState<Computation[]>([]);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/computations`)
      .then(r => r.json())
      .then(d => setComputations(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
    </div>
  );

  if (computations.length === 0) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Analytics</h2>
      <Card><CardContent className="py-16 text-center text-muted-foreground">No computations yet. Run some CT adequacy checks to see analytics.</CardContent></Card>
    </div>
  );

  // ── Derived data ────────────────────────────────────────────────────────────
  const suitable  = computations.filter(c => c.verdict === 'SUITABLY DIMENSIONED').length;
  const underDim  = computations.filter(c => c.verdict === 'UNDER DIMENSIONED').length;
  const pending   = computations.filter(c => c.approvalStatus === 'PENDING').length;
  const approved  = computations.filter(c => c.approvalStatus === 'APPROVED').length;
  const total     = computations.length;
  const pct       = total > 0 ? Math.round((suitable / total) * 100) : 0;

  // Verdict pie
  const verdictPie = [
    { name: 'Suitable',      value: suitable, color: COLORS.suitable },
    { name: 'Under Dim.',    value: underDim, color: COLORS.under    },
  ].filter(d => d.value > 0);

  // Approval pie
  const approvalPie = [
    { name: 'Approved', value: approved,                                    color: COLORS.approved },
    { name: 'Pending',  value: pending,                                     color: COLORS.pending  },
    { name: 'Rejected', value: total - approved - pending,                  color: COLORS.under    },
  ].filter(d => d.value > 0);

  // Vk margin bar chart — top 10
  const marginData = computations
    .map(c => ({
      name:   c.templateName.replace(/\s*–.*/, '').substring(0, 14),
      margin: +(c.vk_available - c.vk_required).toFixed(1),
      fill:   c.vk_available >= c.vk_required ? COLORS.suitable : COLORS.under,
    }))
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 12);

  // Computations over time (by day)
  const byDay: Record<string, { date: string; suitable: number; under: number }> = {};
  computations.forEach(c => {
    const d = new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (!byDay[d]) byDay[d] = { date: d, suitable: 0, under: 0 };
    if (c.verdict === 'SUITABLY DIMENSIONED') byDay[d].suitable++;
    else byDay[d].under++;
  });
  const timelineData = Object.values(byDay).slice(-14);

  // By protection function
  const byFunction: Record<string, { name: string; suitable: number; under: number }> = {};
  computations.forEach(c => {
    const fn = c.templateName.replace(/\s*\(.*\)/, '').trim();
    if (!byFunction[fn]) byFunction[fn] = { name: fn.substring(0, 20), suitable: 0, under: 0 };
    if (c.verdict === 'SUITABLY DIMENSIONED') byFunction[fn].suitable++;
    else byFunction[fn].under++;
  });
  const functionData = Object.values(byFunction);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">CT adequacy check performance overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Checks',    value: total,    icon: <TrendingUp className="h-4 w-4" />,     color: 'text-foreground'  },
          { label: 'Suitable',        value: suitable, icon: <CheckCircle className="h-4 w-4" />,    color: 'text-green-500'   },
          { label: 'Under Dim.',      value: underDim, icon: <AlertTriangle className="h-4 w-4" />,  color: 'text-red-500'     },
          { label: 'Pending Review',  value: pending,  icon: <Clock className="h-4 w-4" />,          color: 'text-amber-500'   },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <span className={k.color}>{k.icon}</span>
              </div>
              <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Adequacy rate */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Adequacy Rate</span>
            <span className={`font-bold ${pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{suitable} of {total} CTs are suitably dimensioned</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Verdict distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Verdict Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={verdictPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {verdictPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Approval status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={approvalPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {approvalPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vk margin bar */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vk Margin per Computation</CardTitle>
            <CardDescription className="text-xs">Positive = adequate, negative = under-dimensioned</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={marginData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="V" />
                <Tooltip formatter={(v: number) => [`${v} V`, 'Margin']} />
                <Bar dataKey="margin" radius={[3, 3, 0, 0]}>
                  {marginData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Timeline */}
        {timelineData.length > 1 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Computations Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timelineData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="suitable" stroke={COLORS.suitable} strokeWidth={2} dot={false} name="Suitable" />
                  <Line type="monotone" dataKey="under"    stroke={COLORS.under}    strokeWidth={2} dot={false} name="Under Dim." />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* By protection function */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Results by Protection Function</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={functionData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="suitable" fill={COLORS.suitable} name="Suitable"   radius={[3, 3, 0, 0]} />
                <Bar dataKey="under"    fill={COLORS.under}    name="Under Dim." radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
