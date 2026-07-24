'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  iedType: string;
  relay: string;
  function: string;
  inputSchema: Record<string, unknown>;
}

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
          <h2 className="text-2xl font-bold">IED Templates</h2>
          <p className="text-muted-foreground">Available protection relay templates for CT/VT adequacy analysis</p>
        </div>
        <Link href={`/workspaces/${workspaceId}/computations/new`}>
          <Button className="gap-2">
            <Zap className="h-4 w-4" />
            Add New Template
          </Button>
        </Link>
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
          <div className="text-sm text-gray-600">
            <p><strong>Document:</strong> N-19957 2-DF4W</p>
            <p><strong>Functions:</strong> 87, 21, 50/51, 50N/51N, 50BF</p>
            <p><strong>Voltage Level:</strong> 132kV/33kV</p>
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
          <div className="text-sm text-gray-600">
            <p><strong>Application:</strong> 132kV Cable Feeder Protection</p>
            <p><strong>Functions:</strong> 87L, 21 (Zones 1-3), 50/51, 50BF</p>
            <p><strong>CT Ratio:</strong> 3200/1800/1A</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
