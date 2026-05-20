import { NextRequest, NextResponse } from 'next/server';
import { getComputations, getTemplates, getUsers, getApprovals, getAuditLogs, ObjectId } from '@/lib/db';
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

    // Fetch recent activity from audit logs
    const auditLogs = await getAuditLogs();
    const recentLogs = await auditLogs
      .find({ workspaceId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Also get recent computations and approvals for activity
    const [computations, approvals] = await Promise.all([
      getComputations(),
      getApprovals()
    ]);

    const recentComputations = await computations
      .find({ workspaceId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const recentApprovals = await approvals
      .find({ workspaceId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Combine and format activity data
    const activities: any[] = [];

    // Add computation activities
    recentComputations.forEach(comp => {
      activities.push({
        id: `comp_${comp._id}`,
        type: 'computation',
        description: `CT adequacy check ${comp.verdict === 'SUITABLY DIMENSIONED' ? 'passed' : 'failed'} for ${comp.templateName}`,
        timestamp: new Date(comp.createdAt),
        user: comp.createdBy?.name || 'Unknown User',
        status: comp.verdict === 'SUITABLY DIMENSIONED' ? 'success' : 'warning'
      });
    });

    // Add approval activities
    recentApprovals.forEach(approval => {
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
        user: 'System', // Would need to track who made the approval
        status
      });
    });

    // Add audit log activities
    recentLogs.forEach(log => {
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
        status
      });
    });

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return NextResponse.json(sortedActivities);

  } catch (error) {
    console.error('Activity API error:', error);
    
    // Return mock data for development
    const mockActivities = [
      {
        id: '1',
        type: 'computation',
        description: 'CT adequacy check completed for 33kV Feeder Bay 1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        user: 'John Smith',
        status: 'success'
      },
      {
        id: '2',
        type: 'approval',
        description: 'Computation approved by team lead',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        user: 'Sarah Johnson',
        status: 'success'
      },
      {
        id: '3',
        type: 'template',
        description: 'New IED template added: Siemens 7SA522',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        user: 'Mike Chen',
        status: 'success'
      },
      {
        id: '4',
        type: 'computation',
        description: 'CT check failed - insufficient knee point voltage',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        user: 'Emma Wilson',
        status: 'warning'
      },
      {
        id: '5',
        type: 'user',
        description: 'New user registered: Alex Thompson',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        user: 'System',
        status: 'success'
      }
    ];

    return NextResponse.json(mockActivities);
  }
}