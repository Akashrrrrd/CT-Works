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
      </div>

      {/* Featured Template - Siemens 7SJ85 */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-xl">SIEMENS 7SJ85 - Multi-function Protection Relay</CardTitle>
                <CardDescription className="text-base">
                  Complete CT/VT adequacy calculation per Hitachi standards N-19957 2-DF4W for 132/33kV substation
                </CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-blue-600">NEW</Badge>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">Differential Protection</Badge>
            <Badge variant="secondary">Distance Protection</Badge>
            <Badge variant="secondary">Overcurrent Protection</Badge>
            <Badge variant="outline">Al Dhafra Area</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p><strong>Document:</strong> N-19957 2-DF4W</p>
              <p><strong>Functions:</strong> 87, 21, 50/51, 50N/51N, 50BF</p>
              <p><strong>Voltage Level:</strong> 132kV/33kV</p>
            </div>
            <Link href={`/workspaces/${workspaceId}/templates/siemens-7sj85`}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Open Calculator
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ABB RET670 Template */}
      <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-600" />
              <div>
                <CardTitle className="text-xl">ABB RET670 - Multi-Function Transformer Protection</CardTitle>
                <CardDescription className="text-base">
                  Complete transformer differential protection CT adequacy calculation per Hitachi standards N-19957 2-DF4W
                </CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-red-600">TRANSFORMER</Badge>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">Differential Protection (87T)</Badge>
            <Badge variant="secondary">REF Protection</Badge>
            <Badge variant="secondary">Overcurrent Protection</Badge>
            <Badge variant="outline">100MVA Rating</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p><strong>Application:</strong> 132kV/33kV Transformer Protection</p>
              <p><strong>Functions:</strong> 87T, REF, 50/51, 50N/51N, 50BF</p>
              <p><strong>CT Ratio:</strong> 3200/600/1A</p>
            </div>
            <Link href={`/workspaces/${workspaceId}/templates/abb-ret670`}>
              <Button className="bg-red-600 hover:bg-red-700">
                Open Calculator
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* RED670 Template */}
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle className="text-xl">RED670 - Line Differential & Distance Protection</CardTitle>
                <CardDescription className="text-base">
                  132kV Cable Feeders line protection CT adequacy calculation per Hitachi standards N-19957 2-DF4W
                </CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-green-600">CABLE FEEDER</Badge>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">Line Differential (87L)</Badge>
            <Badge variant="secondary">Distance Protection</Badge>
            <Badge variant="secondary">Overcurrent Protection</Badge>
            <Badge variant="outline">132kV Application</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p><strong>Application:</strong> 132kV Cable Feeder Protection</p>
              <p><strong>Functions:</strong> 87L, 21 (Zones 1-3), 50/51, 50BF</p>
              <p><strong>CT Ratio:</strong> 3200/1800/1A</p>
            </div>
            <Link href={`/workspaces/${workspaceId}/templates/red670`}>
              <Button className="bg-green-600 hover:bg-green-700">
                Open Calculator
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Input reference card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Required Inputs for All IED Templates</CardTitle>
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
