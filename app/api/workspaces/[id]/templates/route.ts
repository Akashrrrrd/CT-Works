import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

const IED_META: Record<string, { function: string; relay: string }> = {
  'tpl-differential':    { function: 'DIFFERENTIAL',   relay: 'RED 670 / REF 615 / REB 670' },
  'tpl-distance':        { function: 'DISTANCE',        relay: 'SEL-421 / REL 670' },
  'tpl-breaker-failure': { function: 'BREAKER_FAILURE', relay: 'REQ 650 / REB 500' },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth check
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = await verifyJWT(token);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Query templates directly by workspaceId — no extra org lookup needed
    const templates = await getTemplates();

    let wsObjectId: ObjectId;
    try {
      wsObjectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
    }

    const list = await templates
      .find({ workspaceId: wsObjectId })
      .sort({ createdAt: 1 })
      .toArray();

    // If nothing found by ObjectId, try string match as fallback
    const result = list.length > 0 ? list : await templates
      .find({ workspaceId: id })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json(result.map(t => ({
      id:          t._id.toString(),
      name:        t.name,
      description: t.description ?? '',
      iedType:     t.iedType,
      function:    IED_META[t.iedType]?.function ?? 'DIFFERENTIAL',
      relay:       IED_META[t.iedType]?.relay    ?? '',
      inputSchema: t.inputSchema,
      createdAt:   t.createdAt,
    })));

  } catch (error) {
    console.error('Templates fetch error:', error);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}
