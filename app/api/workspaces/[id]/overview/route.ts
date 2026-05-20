import { NextRequest, NextResponse } from 'next/server';
import { getComputations, getTemplates, getUsers, getWorkspaces, getApprovals, ObjectId } from '@/lib/db';
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
    const [computations, templates, users, approvals] = await Promise.all([
      getComputations(),
      getTemplates(),
      getUsers(),
      getApprovals()
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

    // Get all users (for active user count)
    const allUsers = await users.find({}).toArray();

    // Calculate computation statistics
    const totalComputations = workspaceComputations.length;
    const adequateComputations = workspaceComputations.filter(c => c.verdict === 'SUITABLY DIMENSIONED').length;
    const inadequateComputations = workspaceComputations.filter(c => c.verdict === 'UNDER DIMENSIONED').length;
    const pendingComputations = totalComputations - adequateComputations - inadequateComputations;

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
    const activeUsers = allUsers.length;
    const onlineUsers = Math.floor(activeUsers * 0.3); // Mock online users (30% of active)
    
    const roleDistribution = allUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Substation statistics (mock data for now)
    const totalSubstations = 12;
    const analyzedSubstations = Math.floor(totalSubstations * 0.67); // 67% analyzed
    const pendingSubstations = totalSubstations - analyzedSubstations;

    // System health (mock data)
    const systemHealth = {
      health: 'good' as const,
      uptime: 99.8,
      responseTime: Math.floor(Math.random() * 100) + 200, // 200-300ms
      errorRate: Math.random() * 0.5 // 0-0.5%
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