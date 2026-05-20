import { NextRequest, NextResponse } from 'next/server';
import { getComputations, getTemplates, getUsers, getApprovals, getAuditLogs, getActivityLogs, ObjectId } from '@/lib/db';
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
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Fetch recent activity from multiple sources
    const [auditLogs, activityLogs, computations, approvals, users] = await Promise.all([
      getAuditLogs(),
      getActivityLogs(),
      getComputations(),
      getApprovals(),
      getUsers()
    ]);

    // Get activity logs for this workspace
    const workspaceActivityLogs = await activityLogs
      .find({ workspaceId: new ObjectId(id) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // Get recent audit logs
    const recentAuditLogs = await auditLogs
      .find({ workspaceId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Also get recent computations and approvals for activity
    const [recentComputations, recentApprovals] = await Promise.all([
      computations
        .find({ workspaceId: new ObjectId(id) })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
      approvals
        .find({ workspaceId: new ObjectId(id) })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray()
    ]);

    // Get user lookup map
    const allUsers = await users.find({}).toArray();
    const userMap = new Map(allUsers.map(u => [u._id.toString(), u]));

    // Combine and format activity data
    const activities: any[] = [];

    // Add activity log entries (primary source)
    workspaceActivityLogs.forEach(log => {
      const user = userMap.get(log.userId?.toString()) || { name: 'Unknown User' };
      
      activities.push({
        id: `activity_${log._id}`,
        type: log.type.toLowerCase(),
        description: log.description,
        timestamp: new Date(log.timestamp),
        user: user.name,
        status: getStatusFromType(log.type),
        details: log.metadata ? JSON.stringify(log.metadata) : undefined
      });
    });

    // Add computation activities
    recentComputations.forEach(comp => {
      const user = userMap.get(comp.createdBy?.toString()) || { name: 'Unknown User' };
      
      activities.push({
        id: `comp_${comp._id}`,
        type: 'computation',
        description: `CT adequacy check ${comp.result?.verdict === 'SUITABLY DIMENSIONED' ? 'passed' : 'failed'} for ${comp.templateName}`,
        timestamp: new Date(comp.createdAt),
        user: user.name,
        status: comp.result?.verdict === 'SUITABLY DIMENSIONED' ? 'success' : 'warning',
        details: `Template: ${comp.templateName}, Status: ${comp.approvalStatus}`
      });
    });

    // Add approval activities
    recentApprovals.forEach(approval => {
      const user = userMap.get(approval.approver?.toString()) || { name: 'System' };
      let description = '';
      let status = 'success';
      
      switch (approval.status) {
        case 'APPROVED':
          description = 'Computation approved by reviewer';
          status = 'success';
          break;
        case 'REJECTED':
          description = 'Computation rejected by reviewer';
          status = 'error';
          break;
        case 'PENDING':
          description = 'Computation submitted for approval';
          status = 'warning';
          break;
        default:
          description = 'Approval status updated';
      }

      activities.push({
        id: `approval_${approval._id}`,
        type: 'approval',
        description,
        timestamp: new Date(approval.createdAt),
        user: user.name,
        status,
        details: approval.comments || `Resource: ${approval.resourceType}`
      });
    });

    // Add audit log activities
    recentAuditLogs.forEach(log => {
      let type = 'user';
      let status = 'success';
      
      if (log.action.includes('COMPUTATION')) {
        type = 'computation';
      } else if (log.action.includes('TEMPLATE')) {
        type = 'template';
      } else if (log.action.includes('APPROVAL')) {
        type = 'approval';
      }

      if (log.action.includes('FAILED') || log.action.includes('ERROR')) {
        status = 'error';
      } else if (log.action.includes('WARNING')) {
        status = 'warning';
      }

      activities.push({
        id: `audit_${log._id}`,
        type,
        description: log.details || log.action.replace(/_/g, ' ').toLowerCase(),
        timestamp: new Date(log.createdAt),
        user: log.userName || 'System',
        status,
        details: `Action: ${log.action}, Resource: ${log.resourceType}`
      });
    });

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return NextResponse.json(sortedActivities);

  } catch (error) {
    console.error('Activity API error:', error);
    return NextResponse.json({ error: 'Failed to load activity data' }, { status: 500 });
  }
}

// Helper function to determine status from activity type
function getStatusFromType(type: string): string {
  switch (type.toUpperCase()) {
    case 'CREATE':
    case 'UPDATE':
    case 'LOGIN':
      return 'success';
    case 'DELETE':
    case 'LOGOUT':
      return 'warning';
    case 'ERROR':
      return 'error';
    default:
      return 'info';
  }
}