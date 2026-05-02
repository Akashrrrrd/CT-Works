import { NextRequest, NextResponse } from 'next/server';
import { getComputations, getRelayFormulas, getUsers, getApprovals, getAuditLogs, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { runFullAnalysis } from '@/lib/services/calculation-engine';
import type { FullAnalysisInput } from '@/lib/services/calculation-engine';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await auth(req);
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: FullAnalysisInput & { projectName?: string; relayName?: string } = await req.json();

  // Validate required fields
  if (!body.ct || !body.wiring || !body.system || !body.line) {
    return NextResponse.json({ error: 'ct, wiring, system and line are required' }, { status: 400 });
  }

  // Run the full analysis
  const result = runFullAnalysis(body);

  // Fetch relay formulas if relay name provided
  let relayFormulas: unknown[] = [];
  if (body.relayName) {
    const formulaCol = await getRelayFormulas();
    relayFormulas = await formulaCol
      .find({ relayName: { $regex: body.relayName, $options: 'i' }, validated: true })
      .toArray();
  }

  const users = await getUsers();
  const user  = await users.findOne({ _id: new ObjectId(currentUser.userId) });
  const now   = new Date();

  const computations = await getComputations();
  const insertResult = await computations.insertOne({
    workspaceId:    new ObjectId(id),
    type:           'FULL_ANALYSIS',
    projectName:    body.projectName ?? 'Unnamed Project',
    relayName:      body.relayName   ?? '',
    input:          body,
    result,
    relayFormulas,
    approvalStatus: 'PENDING',
    createdById:    new ObjectId(currentUser.userId),
    createdBy:      { name: user?.name ?? 'Unknown', email: user?.email ?? '' },
    createdAt:      now,
    updatedAt:      now,
    // Flat fields for list views
    verdict:        result.verdict,
    kssc_required:  result.kssc_required,
    kssc_available: result.kssc_available,
    vk_required:    result.vk_required,
    vk_available:   result.vk_available,
    templateName:   `${body.relayName ?? 'Analysis'} — ${body.ct.ratio_primary}/${body.ct.ratio_secondary}A`,
  });

  // Create approval record
  const approvals = await getApprovals();
  await approvals.insertOne({
    workspaceId:   new ObjectId(id),
    computationId: insertResult.insertedId,
    status:        'PENDING',
    createdAt:     now,
    updatedAt:     now,
  });

  // Audit log
  const audit = await getAuditLogs();
  await audit.insertOne({
    workspaceId:  new ObjectId(id),
    userId:       new ObjectId(currentUser.userId),
    userName:     user?.name ?? currentUser.email,
    action:       'COMPUTATION_CREATED',
    resourceType: 'FullAnalysis',
    resourceId:   insertResult.insertedId.toString(),
    details:      `${body.relayName ?? 'Analysis'} — ${result.verdict}`,
    createdAt:    now,
  });

  return NextResponse.json({
    id:      insertResult.insertedId.toString(),
    result,
    relayFormulas,
  }, { status: 201 });
}
