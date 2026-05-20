import { NextRequest, NextResponse } from 'next/server';
import { getComputations, getTemplates, getUsers, getApprovals, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const email  = request.headers.get('x-user-email');
  const role   = request.headers.get('x-user-role');
  if (userId && email && role) {
    return { userId, email, role } as { userId: string; email: string; role: string };
  }
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await auth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const timeRange = url.searchParams.get('range') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Fetch data
    const [computations, templates, users, approvals] = await Promise.all([
      getComputations(),
      getTemplates(),
      getUsers(),
      getApprovals()
    ]);

    // Get workspace data
    const workspaceComputations = await computations
      .find({ 
        workspaceId: new ObjectId(id),
        createdAt: { $gte: startDate }
      })
      .sort({ createdAt: -1 })
      .toArray();

    const allWorkspaceComputations = await computations
      .find({ workspaceId: new ObjectId(id) })
      .toArray();

    const workspaceTemplates = await templates
      .find({ workspaceId: new ObjectId(id) })
      .toArray();

    const workspaceApprovals = await approvals
      .find({ workspaceId: new ObjectId(id) })
      .toArray();

    // Calculate analytics
    const totalComputations = allWorkspaceComputations.length;
    const adequateComputations = allWorkspaceComputations.filter(c => c.verdict === 'SUITABLY DIMENSIONED').length;
    const adequacyRate = totalComputations > 0 ? (adequateComputations / totalComputations) * 100 : 0;

    // Calculate average response time (mock for now)
    const avgResponseTime = Math.floor(Math.random() * 100) + 200; // 200-300ms

    // Active users (simplified)
    const allUsers = await users.find({}).toArray();
    const activeUsers = allUsers.length;

    // Daily trends
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayComputations = workspaceComputations.filter(c => {
        const compDate = new Date(c.createdAt);
        return compDate >= dayStart && compDate <= dayEnd;
      });

      dailyTrends.push({
        date: date.toISOString().split('T')[0],
        adequate: dayComputations.filter(c => c.verdict === 'SUITABLY DIMENSIONED').length,
        inadequate: dayComputations.filter(c => c.verdict === 'UNDER DIMENSIONED').length
      });
    }

    // Monthly trends (last 4 months)
    const monthlyTrends = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthComputations = allWorkspaceComputations.filter(c => {
        const compDate = new Date(c.createdAt);
        return compDate >= monthStart && compDate <= monthEnd;
      });

      const monthTotal = monthComputations.length;
      const monthAdequate = monthComputations.filter(c => c.verdict === 'SUITABLY DIMENSIONED').length;
      const monthRate = monthTotal > 0 ? (monthAdequate / monthTotal) * 100 : 0;

      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        total: monthTotal,
        rate: Math.round(monthRate * 10) / 10
      });
    }

    // Template usage analysis
    const templateUsage = new Map<string, number>();
    allWorkspaceComputations.forEach(c => {
      const templateName = c.templateName || 'Unknown';
      templateUsage.set(templateName, (templateUsage.get(templateName) || 0) + 1);
    });

    const templateUsageArray = Array.from(templateUsage.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalComputations) * 1000) / 10
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Template performance (mock data)
    const templatePerformance = templateUsageArray.map(t => ({
      name: t.name,
      avgTime: Math.floor(Math.random() * 200) + 150, // 150-350ms
      successRate: Math.round((Math.random() * 10 + 90) * 10) / 10 // 90-100%
    }));

    // User activity analysis
    const userActivity = allUsers.slice(0, 5).map(user => {
      const userComputations = allWorkspaceComputations.filter(c => 
        c.createdById && c.createdById.toString() === user._id.toString()
      ).length;
      
      return {
        user: user.name,
        computations: userComputations,
        lastActive: `${Math.floor(Math.random() * 120) + 5} minutes ago`
      };
    }).sort((a, b) => b.computations - a.computations);

    // Role distribution
    const roleDistribution = allUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // System performance metrics (mock data)
    const systemPerformance = [
      { metric: 'Response Time', value: avgResponseTime, trend: 'down' as const },
      { metric: 'Throughput', value: Math.floor(Math.random() * 50) + 100, trend: 'up' as const },
      { metric: 'Error Rate', value: Math.round(Math.random() * 20) / 10, trend: 'stable' as const },
      { metric: 'Cache Hit Rate', value: Math.round((Math.random() * 10 + 85) * 10) / 10, trend: 'up' as const }
    ];

    // System errors (mock data)
    const systemErrors = [
      { type: 'Validation Error', count: Math.floor(Math.random() * 20), lastOccurred: '2 hours ago' },
      { type: 'Calculation Timeout', count: Math.floor(Math.random() * 5), lastOccurred: '1 day ago' },
      { type: 'Database Connection', count: Math.floor(Math.random() * 3), lastOccurred: '3 days ago' }
    ];

    const analyticsData = {
      overview: {
        totalComputations,
        adequacyRate: Math.round(adequacyRate * 10) / 10,
        avgResponseTime,
        activeUsers
      },
      trends: {
        daily: dailyTrends,
        monthly: monthlyTrends
      },
      templates: {
        usage: templateUsageArray,
        performance: templatePerformance
      },
      users: {
        activity: userActivity,
        roles: roleDistribution
      },
      system: {
        performance: systemPerformance,
        errors: systemErrors
      }
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to load analytics data' }, { status: 500 });
  }
}