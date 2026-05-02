import { NextRequest, NextResponse } from 'next/server';
import { getComputations, getTemplates, getApprovals, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wsId = new ObjectId(id);

  const [computations, templates, approvals] = await Promise.all([
    (await getComputations()).find({ workspaceId: wsId }).toArray(),
    (await getTemplates()).countDocuments({ workspaceId: wsId }),
    (await getApprovals()).find({ workspaceId: wsId }).toArray(),
  ]);

  const pending   = approvals.filter(a => a.status === 'PENDING').length;
  const approved  = computations.filter(c => c.approvalStatus === 'APPROVED').length;
  const suitable  = computations.filter(c => c.verdict === 'SUITABLY DIMENSIONED').length;
  const underDim  = computations.filter(c => c.verdict === 'UNDER DIMENSIONED').length;

  return NextResponse.json({
    totalTemplates:        templates,
    totalComputations:     computations.length,
    pendingApprovals:      pending,
    completedComputations: approved,
    suitablyDimensioned:   suitable,
    underDimensioned:      underDim,
  });
}
