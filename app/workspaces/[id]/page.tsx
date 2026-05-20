'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebSocket, useWebSocketSubscription } from '@/lib/services/websocket';
import {
  Calculator, CheckCircle, AlertTriangle, Clock, Users, Building2,
  Activity, FileText, CheckSquare, Zap, ArrowRight, RefreshCw, Shield, Database,
  BarChart3, ShieldCheck, FlaskConical, Upload, Cpu, GitCompare, Wifi, WifiOff
} from 'lucide-react';

interface OverviewStats {
  computations: {
    total: number;
    adequate: number;
    inadequate: number;
    pending: number;
    todayCount: number;
  };
  templates: {
    total: number;
    mostUsed: string;
    recentlyAdded: number;
  };
  approvals: {
    pending: number;
    approved: number;
    rejected: number;
  };
  users: {
    active: number;
    online: number;
    roles: Record<string, number>;
  };
  substations: {
    total: number;
    analyzed: number;
    pending: number;
  };
  system: {
    health: 'good' | 'warning' | 'critical';
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'computation' | 'approval' | 'template' | 'user';
  description: string;
  timestamp: string | Date;
  user: string;
  status?: 'success' | 'warning' | 'error';
}

export default function WorkspaceOverview() {
  const params = useParams();
  const workspaceId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket(workspaceId);

  const fetchData = useCallback(async () => {
    try {
      // Fetch overview statistics
      const [statsRes, activityRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/overview`),
        fetch(`/api/workspaces/${workspaceId}/activity`)
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch overview data:', error);
      setStats(null); // Set to null instead of mock data
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Set up real-time subscriptions
  useWebSocketSubscription(workspaceId, 'computation_update', (message) => {
    console.log('Computation update received:', message);
    fetchData(); // Refresh data when computation updates
  });

  useWebSocketSubscription(workspaceId, 'approval_update', (message) => {
    console.log('Approval update received:', message);
    fetchData(); // Refresh data when approval updates
  });

  useWebSocketSubscription(workspaceId, 'user_activity', (message) => {
    console.log('User activity received:', message);
    // Add new activity to the list
    setRecentActivity(prev => [
      {
        id: message.data.id || Date.now().toString(),
        type: message.data.type || 'user',
        description: message.data.description || 'User activity',
        timestamp: new Date(message.timestamp),
        user: message.data.user || 'Unknown',
        status: message.data.status || 'success'
      },
      ...prev.slice(0, 9) // Keep only latest 10 activities
    ]);
  });

  useEffect(() => {
    fetchData();
    
    // Set up periodic updates every 30 seconds as fallback
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'computation': return <Calculator className="h-4 w-4" />;
      case 'approval': return <CheckSquare className="h-4 w-4" />;
      case 'template': return <FileText className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-none space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const adequacyRate = stats ? (stats.computations.adequate / stats.computations.total) * 100 : 0;
  const analysisProgress = stats ? (stats.substations.analyzed / stats.substations.total) * 100 : 0;

  return (
    <div className="w-full max-w-none space-y-4">
      {/* Header with real-time indicator */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workspace Overview</h2>
          <p className="text-muted-foreground">
            Real-time dashboard for CT/VT adequacy analysis
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-500" />
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Offline</span>
              </>
            )}
          </div>
          <span>•</span>
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Computations</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.computations.total}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                +{stats?.computations.todayCount} today
              </Badge>
              <span>{adequacyRate.toFixed(1)}% adequate</span>
            </div>
            <Progress value={adequacyRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvals.pending}</div>
            <div className="text-xs text-muted-foreground">
              {stats?.approvals.approved} approved, {stats?.approvals.rejected} rejected
            </div>
            <Link href={`/workspaces/${workspaceId}/approvals`}>
              <Button variant="ghost" size="sm" className="mt-2 h-auto text-xs text-muted-foreground hover:text-foreground">
                Review pending <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.online}</div>
            <div className="text-xs text-muted-foreground">
              of {stats?.users.active} total users
            </div>
            <div className="flex gap-1 mt-2">
              <Badge variant="outline" className="text-xs">
                {stats?.users.roles.ENGINEER || 0} Engineers
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stats?.users.roles.ADMIN || 0} Admins
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className={`h-4 w-4 ${
              stats?.system.health === 'good' ? 'text-green-500' :
              stats?.system.health === 'warning' ? 'text-yellow-500' : 'text-red-500'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{stats?.system.health}</div>
            <div className="text-xs text-muted-foreground">
              {stats?.system.uptime}% uptime • {stats?.system.responseTime}ms avg
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${
                stats?.system.health === 'good' ? 'bg-green-500' :
                stats?.system.health === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-xs">All systems operational</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href={`/workspaces/${workspaceId}/computations/new`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-500" />
                New CT Check
              </CardTitle>
              <CardDescription>
                Run adequacy analysis for current transformers
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href={`/workspaces/${workspaceId}/import-excel`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-500" />
                Import Excel
              </CardTitle>
              <CardDescription>
                Upload Excel file with CT parameters for analysis
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href={`/workspaces/${workspaceId}/analysis`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-purple-500" />
                Full Analysis
              </CardTitle>
              <CardDescription>
                Comprehensive substation analysis dashboard
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href={`/workspaces/${workspaceId}/substations`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-500" />
                Substations
              </CardTitle>
              <CardDescription>
                Manage substation configurations and data
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        {/* Recent Activity */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest actions across the workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              {recentActivity.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                  <div className={`mt-0.5 ${getStatusColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{activity.user}</span>
                      <span>•</span>
                      <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <Link href={`/workspaces/${workspaceId}/activity`}>
                <Button variant="ghost" size="sm" className="w-full">
                  View all activity <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Progress */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Analysis Progress
            </CardTitle>
            <CardDescription>
              Substation analysis completion status
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>{analysisProgress.toFixed(0)}%</span>
                </div>
                <Progress value={analysisProgress} />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-500">{stats?.substations.analyzed}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{stats?.substations.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.substations.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">CT Adequacy Checks</span>
                  <Badge variant={adequacyRate > 80 ? "default" : "destructive"}>
                    {adequacyRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Template Coverage</span>
                  <Badge variant="secondary">{stats?.templates.total} templates</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Most Used Template</span>
                  <span className="text-sm font-medium">{stats?.templates.mostUsed}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <Link href={`/workspaces/${workspaceId}/analytics`}>
                <Button variant="outline" size="sm" className="w-full">
                  View detailed analytics <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Indicators */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="h-fit">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Computation Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{stats?.computations.adequate} Adequate</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">{stats?.computations.inadequate} Inadequate</span>
                </div>
              </div>
              <Link href={`/workspaces/${workspaceId}/computations`}>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Template Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">{stats?.templates.total} Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{stats?.templates.recentlyAdded} Recently Added</span>
                </div>
              </div>
              <Link href={`/workspaces/${workspaceId}/templates`}>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">System Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    stats?.system.health === 'good' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-sm capitalize">{stats?.system.health}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{stats?.system.responseTime}ms response</span>
                </div>
              </div>
              <Link href={`/workspaces/${workspaceId}/settings`}>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}