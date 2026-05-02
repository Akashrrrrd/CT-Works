import { NextRequest, NextResponse } from 'next/server';
import { getApprovals, getComputations, getAuditLogs, getUsers, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await auth(req);
  if (!currentUser || !['ADMIN', 'MANAGER'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { approvalId, comments } = await req.json();
  if (!approvalId) return NextResponse.json({ error: 'approvalId is required' }, { status: 400 });

  const approvals = await getApprovals();
  const approval  = await approvals.findOne({ _id: new ObjectId(approvalId) });
  if (!approval)              return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
  if (approval.status !== 'PENDING') return NextResponse.json({ error: 'Already resolved' }, { status: 400 });

  const now = new Date();

  // Fetch reviewer name
  const users    = await getUsers();
  const reviewer = await users.findOne({ _id: new ObjectId(currentUser.userId) });

  await approvals.updateOne(
    { _id: new ObjectId(approvalId) },
    { $set: { status: 'APPROVED', comments: comments ?? null, reviewedAt: now, reviewedBy: reviewer?.name ?? currentUser.email, updatedAt: now } }
  );

  // Update computation approval status
  const computations = await getComputations();
  await computations.updateOne(
    { _id: approval.computationId },
    { $set: { approvalStatus: 'APPROVED', updatedAt: now } }
  );

  // Audit log
  const audit = await getAuditLogs();
  await audit.insertOne({
    workspaceId:  new ObjectId(id),
    userId:       new ObjectId(currentUser.userId),
    userName:     reviewer?.name ?? currentUser.email,
    action:       'APPROVAL_APPROVED',
    resourceType: 'Approval',
    resourceId:   approvalId,
    details:      comments ?? 'Approved',
    createdAt:    now,
  });

  return NextResponse.json({ success: true });
}
