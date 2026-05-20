'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWebSocket, useWebSocketSubscription } from '@/lib/services/websocket';
import {
  Calculator, CheckSquare, FileText, Users, Activity, ArrowLeft, Search,
  Filter, RefreshCw, Clock, AlertCircle, CheckCircle, AlertTriangle,
  Wifi, WifiOff, Calendar
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'computation' | 'approval' | 'template' | 'user' | 'system';
  description: string;
  timestamp: string | Date;
  user: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  details?: string;
  workspaceId?: string;
}

export default function ActivityPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket(workspaceId);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/activity?limit=100`);
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        console.error('Failed to fetch activities:', response.statusText);
        setActivities([]);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Set up real-time subscriptions
  useWebSocketSubscription(workspaceId, 'user_activity', (message) => {
    const newActivity: ActivityItem = {
      id: message.data.id || Date.now().toString(),
      type: message.data.type || 'user',
      description: message.data.description || 'User activity',
      timestamp: new Date(message.timestamp),
      user: message.data.user || 'Unknown',
      status: message.data.status || 'info',
      details: message.data.details
    };
    
    setActivities(prev => [newActivity, ...prev]);
  });

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Filter activities based on search and filters
  useEffect(() => {
    let filtered = activities;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.details?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filterType);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(activity => activity.status === filterStatus);
    }

    setFilteredActivities(filtered);
  }, [activities, searchTerm, filterType, filterStatus]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'info': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'info': return <Clock className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'computation': return <Calculator className="h-4 w-4" />;
      case 'approval': return <CheckSquare className="h-4 w-4" />;
      case 'template': return <FileText className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      case 'system': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success': return <Badge variant="default" className="bg-green-500/15 text-green-400 border-green-500/30">Success</Badge>;
      case 'warning': return <Badge variant="default" className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Warning</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'info': return <Badge variant="secondary">Info</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-none space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/workspaces/${workspaceId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
            <p className="text-muted-foreground">
              Complete history of workspace activities
            </p>
          </div>
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
            onClick={fetchActivities}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="computation">Computations</SelectItem>
                <SelectItem value="approval">Approvals</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="user">User Actions</SelectItem>
                <SelectItem value="system">System Events</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Activities ({filteredActivities.length})</span>
            <Badge variant="secondary">{activities.length} total</Badge>
          </CardTitle>
          <CardDescription>
            Real-time activity feed for this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activities found matching your filters.</p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-muted-foreground">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className={getStatusColor(activity.status)}>
                      {getStatusIcon(activity.status)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        {activity.details && (
                          <p className="text-xs text-muted-foreground mt-1">{activity.details}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                          <span>{activity.user}</span>
                          <span>•</span>
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(activity.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span className="capitalize">{activity.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(activity.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}