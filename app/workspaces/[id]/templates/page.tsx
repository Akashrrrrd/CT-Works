'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Shield, Activity } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  iedType: string;
  relay: string;
  function: string;
  inputSchema: Record<string, unknown>;
}

const SHEET1_INPUTS = ['CT Ratio', 'Class of Accuracy', 'CT Resistance (Rct)', 'Knee Point Voltage (Vk)', 'Magnetizing Current (Io)'];
const SHEET2_INPUTS = ['System Frequency', 'Bus Voltage Level', 'Max. Bus Fault Level', 'R1, X1, R0, X0', 'Route Length', 'Relay Burden', 'Lead Resistance'];

export default function TemplatesPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/templates`)
      .then(r => r.json())
      .then(data => setTemplates(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Computation Templates</h2>
          <p className="text-muted-foreground">CT adequacy check functions available in this workspace</p>
        </div>
        <Link href={`/workspaces/${workspaceId}/computations/new`}>
          <Button className="gap-2"><Zap className="h-4 w-4" />Run Check</Button>
        </Link>
      </div>

      {/* Input reference card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Required Inputs for All Templates</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">CT EQUIPMENT DATA</p>
            <div className="space-y-1">
              {SHEET1_INPUTS.map(f => (
                <div key={f} className="text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">NETWORK & SYSTEM DATA</p>
            <div className="space-y-1">
              {SHEET2_INPUTS.map(f => (
                <div key={f} className="text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {templates.map(t => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {t.function === 'DIFFERENTIAL' && <Shield className="h-5 w-5 text-primary" />}
                  {t.function === 'DISTANCE' && <Activity className="h-5 w-5 text-primary" />}
                  {t.function === 'BREAKER_FAILURE' && <Zap className="h-5 w-5 text-primary" />}
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </div>
                <Badge variant="outline">{t.relay}</Badge>
              </div>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Output: <span className="font-medium text-foreground">Suitably Dimensioned / Under Dimensioned</span>
                </p>
                <Link href={`/workspaces/${workspaceId}/computations/new`}>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />Run
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
