import { getApprovals, ObjectId } from '@/lib/db';

export async function createApprovalRequest(
  computationId: string,
  workflowId: string,
  requestedById: string
) {
  const col = await getApprovals();
  const now = new Date();
  const result = await col.insertOne({
    computationId: new ObjectId(computationId),
    workflowId:    new ObjectId(workflowId),
    requestedById: new ObjectId(requestedById),
    status:        'PENDING',
    steps:         [],
    createdAt:     now,
    updatedAt:     now,
  });
  return { id: result.insertedId.toString() };
}

export async function approveStep(requestId: string, stepId: string, comments?: string) {
  const col = await getApprovals();
  const now = new Date();
  await col.updateOne(
    { _id: new ObjectId(requestId), 'steps._id': new ObjectId(stepId) },
    { $set: { 'steps.$.status': 'APPROVED', 'steps.$.comments': comments ?? null, 'steps.$.decidedAt': now, updatedAt: now } }
  );
  // Check if all steps approved
  const req = await col.findOne({ _id: new ObjectId(requestId) });
  if (req && Array.isArray(req.steps) && req.steps.every((s: any) => s.status === 'APPROVED')) {
    await col.updateOne({ _id: new ObjectId(requestId) }, { $set: { status: 'APPROVED', updatedAt: now } });
  }
}

export async function rejectStep(requestId: string, stepId: string, comments: string) {
  const col = await getApprovals();
  const now = new Date();
  await col.updateOne(
    { _id: new ObjectId(requestId), 'steps._id': new ObjectId(stepId) },
    { $set: { 'steps.$.status': 'REJECTED', 'steps.$.comments': comments, 'steps.$.decidedAt': now, updatedAt: now } }
  );
  await col.updateOne({ _id: new ObjectId(requestId) }, { $set: { status: 'REJECTED', updatedAt: now } });
}

export async function getPendingApprovalsForUser(userId: string) {
  const col = await getApprovals();
  return col.find({
    'steps.assigneeId': new ObjectId(userId),
    'steps.status':     'PENDING',
    status:             'PENDING',
  }).sort({ createdAt: -1 }).toArray();
}
