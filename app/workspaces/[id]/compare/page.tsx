'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertTriangle, Trophy, Minus } from 'lucide-react';

interface Computation {
  id: string;
  templateName: string;
  verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  ealreq_max: number;
  vk_required: number;
  vk_available: number;
  vk_breakdown: { label: string; ealreq: number; vk: number; isMax: boolean }[];
  createdAt: string;
  createdBy: { name: string };
  sheet1: {
    ct_ratio_primary: number; ct_ratio_secondary: number;
    accuracy_class: string; rct: number; vk_available: number; io_at_vk: number;
  };
  sheet2: {
    frequency: number; bus_voltage_kv: number; max_bus_fault_mva: number;
    r1: number; x1: number; r0: number; x0: number;
    route_length_km: number; relay_burden_va: number; lead_resistance: number;
  };
}

type DiffResult = 'better' | 'worse' | 'equal';

function diff(a: number, b: number, lowerIsBetter = false): [DiffResult, DiffResult] {
  if (a === b) return ['equal', 'equal'];
  if (lowerIsBetter) return a < b ? ['better', 'worse'] : ['worse', 'better'];
  return a > b ? ['better', 'worse'] : ['worse', 'better'];
}

function DiffBadge({ result }: { result: DiffResult }) {
  if (result === 'better') return <Trophy className="h-4 w-4 text-green-500 shrink-0" />;
  if (result === 'worse')  return <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />;
  return <Minus className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const ok = verdict === 'SUITABLY DIMENSIONED';
  return (
    <Badge className={`gap-1 text-xs ${ok ? 'bg-green-700' : 'bg-red-700'}`}>
      {ok ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {ok ? 'Suitable' : 'Under Dim.'}
    </Badge>
  );
}

export default function ComparePage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [computations, setComputations] = useState<Computation[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/computations`)
      .then(r => r.json())
      .then((data: Computation[]) => {
        setComputations(data);
        if (data.length >= 2) { setLeftId(data[0].id); setRightId(data[1].id); }
        else if (data.length === 1) setLeftId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const left  = computations.find(c => c.id === leftId)  ?? null;
  const right = computations.find(c => c.id === rightId) ?? null;

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );

  if (computations.length < 2) return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Compare Computations</h2>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">You need at least 2 computations to compare.</p>
          <p className="text-sm text-muted-foreground mt-1">Run more CT adequacy checks first.</p>
        </CardContent>
      </Card>
    </div>
  );

  // Comparison rows
  const ctRows: { label: string; left: string | number; right: string | number; lowerBetter?: boolean; numeric?: boolean }[] = left && right && left.sheet1 && right.sheet1 ? [
    { label: 'CT Ratio',           left: `${left.sheet1.ct_ratio_primary}/${left.sheet1.ct_ratio_secondary} A`,  right: `${right.sheet1.ct_ratio_primary}/${right.sheet1.ct_ratio_secondary} A` },
    { label: 'Class of Accuracy',  left: left.sheet1.accuracy_class,   right: right.sheet1.accuracy_class },
    { label: 'CT Resistance (Rct)',left: `${left.sheet1.rct} Ω`,       right: `${right.sheet1.rct} Ω`,       lowerBetter: true, numeric: true },
    { label: 'Vk Available',       left: `${left.sheet1.vk_available} V`, right: `${right.sheet1.vk_available} V`, numeric: true },
    { label: 'Io at Vk',           left: `${left.sheet1.io_at_vk} mA`, right: `${right.sheet1.io_at_vk} mA`, lowerBetter: true, numeric: true },
  ] : [];

  const resultRows: { label: string; leftVal: number; rightVal: number; unit: string; lowerBetter?: boolean }[] = left && right && left.sheet1 && right.sheet1 ? [
    { label: 'Ealreq (max)',   leftVal: left.ealreq_max,   rightVal: right.ealreq_max,   unit: 'V', lowerBetter: true },
    { label: 'Vk Required',   leftVal: left.vk_required,  rightVal: right.vk_required,  unit: 'V', lowerBetter: true },
    { label: 'Vk Available',  leftVal: left.vk_available, rightVal: right.vk_available, unit: 'V' },
    { label: 'Margin (Vk avail - Vk req)', leftVal: +(left.vk_available - left.vk_required).toFixed(2), rightVal: +(right.vk_available - right.vk_required).toFixed(2), unit: 'V' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Compare Computations</h2>
        <p className="text-muted-foreground text-sm">Select two computations to compare side by side</p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">COMPUTATION A</label>
          <Select value={leftId} onValueChange={setLeftId}>
            <SelectTrigger><SelectValue placeholder="Select computation" /></SelectTrigger>
            <SelectContent>
              {computations.filter(c => c.id !== rightId).map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.templateName} — {new Date(c.createdAt).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">COMPUTATION B</label>
          <Select value={rightId} onValueChange={setRightId}>
            <SelectTrigger><SelectValue placeholder="Select computation" /></SelectTrigger>
            <SelectContent>
              {computations.filter(c => c.id !== leftId).map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.templateName} — {new Date(c.createdAt).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {left && right && (
        <>
          {/* Verdict summary */}
          <div className="grid grid-cols-2 gap-4">
            {[left, right].map((c, i) => {
              const ok = c.verdict === 'SUITABLY DIMENSIONED';
              return (
                <Card key={i} className={ok ? 'border-green-700 bg-green-950/10' : 'border-red-700 bg-red-950/10'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">{i === 0 ? 'COMPUTATION A' : 'COMPUTATION B'}</span>
                      <VerdictBadge verdict={c.verdict} />
                    </div>
                    <CardTitle className="text-sm">{c.templateName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ealreq (max)</span>
                      <span className="font-mono font-medium">{c.ealreq_max} V</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vk Required</span>
                      <span className="font-mono font-medium">{c.vk_required} V</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vk Available</span>
                      <span className="font-mono font-bold">{c.vk_available} V</span>
                    </div>
                    <div className={`flex justify-between pt-1 border-t border-border`}>
                      <span className="text-muted-foreground">Margin</span>
                      <span className={`font-mono font-bold ${(c.vk_available - c.vk_required) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(c.vk_available - c.vk_required) >= 0 ? '+' : ''}{(c.vk_available - c.vk_required).toFixed(2)} V
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      {new Date(c.createdAt).toLocaleString()} · {c.createdBy.name}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CT Parameters comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CT Equipment Data</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2 w-1/3">Parameter</th>
                    <th className="text-center py-2 w-1/3">Computation A</th>
                    <th className="text-center py-2 w-1/3">Computation B</th>
                  </tr>
                </thead>
                <tbody>
                  {ctRows.map((row, i) => {
                    const [lDiff, rDiff] = row.numeric
                      ? diff(+String(row.left).replace(/[^\d.]/g,''), +String(row.right).replace(/[^\d.]/g,''), row.lowerBetter)
                      : ['equal' as DiffResult, 'equal' as DiffResult];
                    return (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2.5 text-muted-foreground">{row.label}</td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {row.numeric && <DiffBadge result={lDiff} />}
                            <span className="font-mono">{row.left}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {row.numeric && <DiffBadge result={rDiff} />}
                            <span className="font-mono">{row.right}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Results comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calculation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2 w-1/3">Parameter</th>
                    <th className="text-center py-2 w-1/3">Computation A</th>
                    <th className="text-center py-2 w-1/3">Computation B</th>
                  </tr>
                </thead>
                <tbody>
                  {resultRows.map((row, i) => {
                    const [lDiff, rDiff] = diff(row.leftVal, row.rightVal, row.lowerBetter);
                    const isMargin = row.label.includes('Margin');
                    return (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2.5 text-muted-foreground">{row.label}</td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <DiffBadge result={lDiff} />
                            <span className={`font-mono font-medium ${isMargin ? (row.leftVal >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>
                              {isMargin && row.leftVal >= 0 ? '+' : ''}{row.leftVal} {row.unit}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <DiffBadge result={rDiff} />
                            <span className={`font-mono font-medium ${isMargin ? (row.rightVal >= 0 ? 'text-green-500' : 'text-red-500') : ''}`}>
                              {isMargin && row.rightVal >= 0 ? '+' : ''}{row.rightVal} {row.unit}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Vk breakdown per condition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vk Required — Per Fault Condition</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2 w-1/3">Fault Condition</th>
                    <th className="text-center py-2 w-1/3">Computation A (V)</th>
                    <th className="text-center py-2 w-1/3">Computation B (V)</th>
                  </tr>
                </thead>
                <tbody>
                  {left.vk_breakdown.map((row, i) => {
                    const rightRow = right.vk_breakdown[i];
                    const [lDiff, rDiff] = rightRow ? diff(row.vk, rightRow.vk, true) : ['equal' as DiffResult, 'equal' as DiffResult];
                    return (
                      <tr key={i} className={`border-b border-border last:border-0 ${row.isMax ? 'bg-primary/5' : ''}`}>
                        <td className="py-2.5 text-muted-foreground">
                          {row.isMax && <span className="text-xs bg-primary text-primary-foreground px-1 py-0.5 rounded mr-1">MAX</span>}
                          {row.label}
                        </td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <DiffBadge result={lDiff} />
                            <span className="font-mono">{row.vk}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          {rightRow ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <DiffBadge result={rDiff} />
                              <span className="font-mono">{rightRow.vk}</span>
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Conclusion */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Conclusion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(() => {
                const leftOk  = left.verdict  === 'SUITABLY DIMENSIONED';
                const rightOk = right.verdict === 'SUITABLY DIMENSIONED';
                const leftMargin  = +(left.vk_available  - left.vk_required).toFixed(2);
                const rightMargin = +(right.vk_available - right.vk_required).toFixed(2);

                if (leftOk && rightOk) {
                  const better = leftMargin >= rightMargin ? 'A' : 'B';
                  return (
                    <>
                      <p>Both computations pass the CT adequacy check.</p>
                      <p className="font-medium">Computation {better} has a higher safety margin ({better === 'A' ? leftMargin : rightMargin} V vs {better === 'A' ? rightMargin : leftMargin} V) — preferred choice.</p>
                    </>
                  );
                }
                if (leftOk && !rightOk) return (
                  <>
                    <p className="font-medium text-green-600">Computation A passes. Computation B fails.</p>
                    <p className="text-muted-foreground">Computation B is under dimensioned by {Math.abs(rightMargin).toFixed(2)} V. The CT in Computation A is the correct choice.</p>
                  </>
                );
                if (!leftOk && rightOk) return (
                  <>
                    <p className="font-medium text-green-600">Computation B passes. Computation A fails.</p>
                    <p className="text-muted-foreground">Computation A is under dimensioned by {Math.abs(leftMargin).toFixed(2)} V. The CT in Computation B is the correct choice.</p>
                  </>
                );
                return (
                  <>
                    <p className="font-medium text-red-600">Both computations fail the CT adequacy check.</p>
                    <p className="text-muted-foreground">
                      A: short by {Math.abs(leftMargin).toFixed(2)} V &nbsp;|&nbsp; B: short by {Math.abs(rightMargin).toFixed(2)} V.
                      {leftMargin > rightMargin ? ' Computation A is closer to passing.' : ' Computation B is closer to passing.'}
                    </p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
