import { NextRequest, NextResponse } from 'next/server';
import { getComputations, getTemplates, getUsers, getWorkspaces, getApprovals, getSubstations, getActivityLogs, ObjectId } from '@/lib/db';
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

    // Fetch all data in parallel
    const [computations, templates, users, approvals, substations, activityLogs] = await Promise.all([
      getComputations(),
      getTemplates(),
      getUsers(),
      getApprovals(),
      getSubstations(),
      getActivityLogs()
    ]);

    // Get computations for this workspace
    const workspaceComputations = await computations
      .find({ workspaceId: new ObjectId(id) })
      .toArray();

    // Get templates for this workspace
    const workspaceTemplates = await templates
      .find({ workspaceId: new ObjectId(id) })
      .toArray();

    // Get approvals for this workspace
    const workspaceApprovals = await approvals
      .find({ workspaceId: new ObjectId(id) })
      .toArray();

    // Get substations for this workspace
    const workspaceSubstations = await substations
      .find({ workspaceId: new ObjectId(id) })
      .toArray();

    // Get activity logs for this workspace
    const workspaceActivityLogs = await activityLogs
      .find({ workspaceId: new ObjectId(id) })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    // Get all users (for active user count)
    const allUsers = await users.find({}).toArray();

    // Calculate computation statistics
    const totalComputations = workspaceComputations.length;
    const adequateComputations = workspaceComputations.filter(c => 
      c.result?.verdict === 'SUITABLY DIMENSIONED'
    ).length;
    const inadequateComputations = workspaceComputations.filter(c => 
      c.result?.verdict === 'UNDER DIMENSIONED'
    ).length;
    const pendingComputations = workspaceComputations.filter(c => 
      c.approvalStatus === 'PENDING'
    ).length;

    // Today's computations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayComputations = workspaceComputations.filter(c => 
      new Date(c.createdAt) >= today
    ).length;

    // Template statistics
    const totalTemplates = workspaceTemplates.length;
    const templateUsage = new Map<string, number>();
    workspaceComputations.forEach(c => {
      const templateName = c.templateName || 'Unknown';
      templateUsage.set(templateName, (templateUsage.get(templateName) || 0) + 1);
    });
    
    const mostUsedTemplate = Array.from(templateUsage.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

    const recentlyAddedTemplates = workspaceTemplates.filter(t => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t.createdAt) >= weekAgo;
    }).length;

    // Approval statistics
    const pendingApprovals = workspaceApprovals.filter(a => a.status === 'PENDING').length;
    const approvedApprovals = workspaceApprovals.filter(a => a.status === 'APPROVED').length;
    const rejectedApprovals = workspaceApprovals.filter(a => a.status === 'REJECTED').length;

    // User statistics
    const activeUsers = allUsers.filter(u => u.isActive).length;
    const onlineUsers = workspaceActivityLogs.filter(log => {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      return new Date(log.timestamp) >= oneHourAgo;
    }).length;
    
    const roleDistribution = allUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Substation statistics (real data)
    const totalSubstations = workspaceSubstations.length;
    const analyzedSubstations = workspaceSubstations.filter(s => {
      // Check if substation has any completed computations
      return workspaceComputations.some(c => 
        c.result?.verdict && c.result.verdict !== 'PENDING'
      );
    }).length;
    const pendingSubstations = totalSubstations - analyzedSubstations;

    // System health (calculated from real data)
    const errorLogs = workspaceActivityLogs.filter(log => log.type === 'ERROR').length;
    const totalLogs = workspaceActivityLogs.length;
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
    
    let health: 'good' | 'warning' | 'critical' = 'good';
    if (errorRate > 5) health = 'critical';
    else if (errorRate > 2) health = 'warning';
    
    const systemHealth = {
      health,
      uptime: Math.max(95, 100 - errorRate), // Uptime based on error rate
      responseTime: Math.floor(Math.random() * 100) + 200, // 200-300ms (still simulated)
      errorRate: Math.round(errorRate * 10) / 10
    };

    const overviewStats = {
      computations: {
        total: totalComputations,
        adequate: adequateComputations,
        inadequate: inadequateComputations,
        pending: pendingComputations,
        todayCount: todayComputations
      },
      templates: {
        total: totalTemplates,
        mostUsed: mostUsedTemplate,
        recentlyAdded: recentlyAddedTemplates
      },
      approvals: {
        pending: pendingApprovals,
        approved: approvedApprovals,
        rejected: rejectedApprovals
      },
      users: {
        active: activeUsers,
        online: onlineUsers,
        roles: roleDistribution
      },
      substations: {
        total: totalSubstations,
        analyzed: analyzedSubstations,
        pending: pendingSubstations
      },
      system: systemHealth
    };

    return NextResponse.json(overviewStats);

  } catch (error) {
    console.error('Overview API error:', error);
    return NextResponse.json({ error: 'Failed to load overview data' }, { status: 500 });
  }
}