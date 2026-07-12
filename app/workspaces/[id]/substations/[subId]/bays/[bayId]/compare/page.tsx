'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, GitCompare, CheckCircle, AlertTriangle, HelpCircle, Cpu } from 'lucide-react';

interface IED { 
  id: string; 
  name: string; 
  model: string; 
  functions: string[]; 
  ct: { ratio: string; class: string; rct: number; vk: number; io: number };
  latestResult?: { verdict: string; vk_required: number; vk_available: number } | null;
}

function VerdictIcon({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  return verdict === 'SUITABLY DIMENSIONED'
    ? <CheckCircle className="h-4 w-4 text-green-500" />
    : <AlertTriangle className="h-4 w-4 text-red-500" />;
}

function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) return <Badge variant="outline">Not Checked</Badge>;
  return verdict === 'SUITABLY DIMENSIONED'
    ? <Badge className="bg-green-600 hover:bg-green-700">Adequate</Badge>
    : <Badge variant="destructive">Under Dim</Badge>;
}

export default function CompareIedsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.id as string;
  const subId = params.subId as string;
  const bayId = params.bayId as string;
  const iedIds = searchParams?.get('ieds')?.split(',') || [];

  const [loading, setLoading] = useState(true);
  const [ieds, setIeds] = useState<IED[]>([]);
  const [bayName, setBayName] = useState('');
  const [subName, setSubName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (iedIds.length < 2) {
      setError('At least 2 IEDs are required for comparison');
      setLoading(false);
      return;
    }

    fetch(`/api/workspaces/${workspaceId}/hierarchy`)
      .then(r => r.json())
      .then(d => {
        const sub = (d.tree ?? []).find((s: any) => s.id === subId);
        if (sub) {
          setSubName(sub.name);
          const bay = sub.bays?.find((b: any) => b.id === bayId);
          if (bay) {
            setBayName(bay.name);
            const allIeds = bay.ieds ?? [];
            const selectedIeds = allIeds.filter((ied: IED) => iedIds.includes(ied.id));
            setIeds(selectedIeds);
          }
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, [workspaceId, subId, bayId, iedIds]);

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;

  if (error) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/workspaces/${workspaceId}/substations/${subId}/bays/${bayId}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />Back to {bayName}
          </Button>
        </Link>
        <h2 className="text-xl font-bold">Compare IEDs</h2>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600">{error}</p>
          <Link href={`/workspaces/${workspaceId}/substations/${subId}/bays/${bayId}`}>
            <Button className="mt-4">Back to IEDs</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/workspaces/${workspaceId}/substations/${subId}/bays/${bayId}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />Back to {bayName}
          </Button>
        </Link>
        <GitCompare className="h-5 w-5" />
        <h2 className="text-xl font-bold">Compare IEDs ({ieds.length})</h2>
      </div>

      {/* Comparison Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            IED Comparison Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ieds.map((ied, index) => (
              <div key={ied.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <VerdictIcon verdict={ied.latestResult?.verdict} />
                  <span className="font-semibold">{ied.name}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Model:</span> {ied.model}</div>
                  <div><span className="font-medium">CT Ratio:</span> {ied.ct.ratio}</div>
                  <div><span className="font-medium">CT Class:</span> {ied.ct.class}</div>
                  <div className="pt-2">
                    <VerdictBadge verdict={ied.latestResult?.verdict} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Parameter</th>
                  {ieds.map((ied, index) => (
                    <th key={ied.id} className="text-center p-3 font-medium">
                      IED #{index + 1}<br/>
                      <span className="text-xs text-muted-foreground font-normal">{ied.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">Model</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center">{ied.model}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">CT Ratio</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center font-mono">{ied.ct.ratio}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">CT Class</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center">{ied.ct.class}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Rct (Ω)</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center font-mono">{ied.ct.rct}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Vk Available (V)</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center font-mono">{ied.ct.vk}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Io at Vk (mA)</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center font-mono">{ied.ct.io}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Protection Functions</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {ied.functions.map(func => (
                          <Badge key={func} variant="outline" className="text-xs">
                            {func.replace('tpl-', '').replace('-', ' ').toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Adequacy Results Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>CT Adequacy Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Result</th>
                  {ieds.map((ied, index) => (
                    <th key={ied.id} className="text-center p-3 font-medium">
                      IED #{index + 1}<br/>
                      <span className="text-xs text-muted-foreground font-normal">{ied.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">Verdict</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center">
                      <VerdictBadge verdict={ied.latestResult?.verdict} />
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Vk Required (V)</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center font-mono">
                      {ied.latestResult?.vk_required || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Vk Available (V)</td>
                  {ieds.map(ied => (
                    <td key={ied.id} className="p-3 text-center font-mono">
                      {ied.latestResult?.vk_available || ied.ct.vk}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Safety Margin (V)</td>
                  {ieds.map(ied => {
                    const margin = ied.latestResult 
                      ? ied.latestResult.vk_available - ied.latestResult.vk_required
                      : null;
                    const isPositive = margin !== null && margin >= 0;
                    
                    return (
                      <td key={ied.id} className="p-3 text-center font-mono">
                        <span className={margin !== null ? (isPositive ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}>
                          {margin !== null ? (isPositive ? '+' : '') + margin.toFixed(1) : 'N/A'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Summary & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Adequacy Status</h4>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {ieds.filter(ied => ied.latestResult?.verdict === 'SUITABLY DIMENSIONED').length} Adequate
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">
                    {ieds.filter(ied => ied.latestResult?.verdict === 'UNDER DIMENSIONED').length} Under-dimensioned
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {ieds.filter(ied => !ied.latestResult?.verdict).length} Not Checked
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Key Observations</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {ieds.length} IEDs compared across different models and specifications</li>
                <li>• CT ratios range from {Math.min(...ieds.map(ied => parseFloat(ied.ct.ratio.split('/')[0]) || 0))} to {Math.max(...ieds.map(ied => parseFloat(ied.ct.ratio.split('/')[0]) || 0))} A primary</li>
                <li>• Vk availability ranges from {Math.min(...ieds.map(ied => ied.ct.vk))}V to {Math.max(...ieds.map(ied => ied.ct.vk))}V</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link href={`/workspaces/${workspaceId}/substations/${subId}/bays/${bayId}`}>
          <Button>Back to IEDs</Button>
        </Link>
        <Button variant="outline" onClick={() => window.print()}>
          Print Comparison
        </Button>
      </div>
    </div>
  );
}