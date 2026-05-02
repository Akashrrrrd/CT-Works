import { NextRequest, NextResponse } from 'next/server';
import { getComputations, getTemplates, getUsers, getWorkspaces, getApprovals, getAuditLogs, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { calculateCTAdequacy } from '@/lib/services/ct-adequacy';
import type { Sheet1Inputs, Sheet2Inputs } from '@/lib/services/ct-adequacy';

async function auth(request: NextRequest) {
  // Middleware forwards verified user info via headers
  const userId = request.headers.get('x-user-id');
  const email  = request.headers.get('x-user-email');
  const role   = request.headers.get('x-user-role');
  if (userId && email && role) {
    return { userId, email, role } as { userId: string; email: string; role: string };
  }
  // Fallback: verify cookie directly
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }      = await params;
    const currentUser = await auth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const computations = await getComputations();
    const list = await computations
      .find({ workspaceId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(list.map(c => ({
      id:             c._id.toString(),
      templateId:     c.templateId?.toString(),
      templateName:   c.templateName,
      verdict:        c.verdict,
      vk_required:    c.vk_required,
      vk_available:   c.vk_available,
      ealreq_max:     c.ealreq_max,
      vk_breakdown:   c.vk_breakdown  ?? [],
      intermediates:  c.intermediates ?? {},
      sheet1:         c.sheet1        ?? {},
      sheet2:         c.sheet2        ?? {},
      approvalStatus: c.approvalStatus ?? 'PENDING',
      createdAt:      c.createdAt,
      createdBy:      c.createdBy     ?? { name: 'Unknown', email: '' },
    })));
  } catch (error) {
    console.error('Computations GET error:', error);
    return NextResponse.json({ error: 'Failed to load computations' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }      = await params;
    const currentUser = await auth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { templateId, sheet1, sheet2 } = body as {
      templateId: string;
      sheet1: Sheet1Inputs;
      sheet2: Sheet2Inputs;
    };

    if (!templateId || !sheet1 || !sheet2) {
      return NextResponse.json({ error: 'templateId, sheet1 and sheet2 are required' }, { status: 400 });
    }

    // Load template to get iedType
    const templates = await getTemplates();
    const template  = await templates.findOne({ _id: new ObjectId(templateId) });
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    // Run the CT adequacy calculation using iedType (not the MongoDB _id)
    const result = calculateCTAdequacy(template.iedType, sheet1, sheet2);

    // Fetch user info for audit
    const users = await getUsers();
    const user  = await users.findOne({ _id: new ObjectId(currentUser.userId) });

    const now = new Date();
    const computations = await getComputations();
    const insertResult = await computations.insertOne({
      workspaceId:    new ObjectId(id),
      templateId:     template._id,
      templateName:   template.name,
      iedType:        template.iedType,
      sheet1,
      sheet2,
      approvalStatus: 'PENDING',
      createdById:    new ObjectId(currentUser.userId),
      createdBy:      { name: user?.name ?? 'Unknown', email: user?.email ?? '' },
      createdAt:      now,
      updatedAt:      now,
      verdict:        result.verdict,
      ealreq_max:     result.ealreq_max,
      vk_required:    result.vk_required,
      vk_available:   result.vk_available,
      vk_breakdown:   result.vk_breakdown,
      intermediates:  result.intermediates,
    });

    const compId = insertResult.insertedId;

    // Create approval record in MongoDB
    const approvals = await getApprovals();
    await approvals.insertOne({
      workspaceId:   new ObjectId(id),
      computationId: compId,
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
      resourceType: 'Computation',
      resourceId:   compId.toString(),
      details:      `${template.name} — ${result.verdict}`,
      createdAt:    now,
    });

    return NextResponse.json({
      id:             compId.toString(),
      templateName:   template.name,
      ...result,
      approvalStatus: 'PENDING',
      createdAt:      now,
    }, { status: 201 });

  } catch (error) {
    console.error('Computation POST error:', error);
    return NextResponse.json({ error: 'Failed to run computation' }, { status: 500 });
  }
}
