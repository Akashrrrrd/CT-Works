import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

const IED_META: Record<string, { function: string; relay: string }> = {
  'tpl-red670':     { function: 'DIFFERENTIAL + DISTANCE + BREAKER_FAILURE', relay: 'ABB RED670' },
  'tpl-reb670':     { function: 'BUSBAR DIFFERENTIAL',                        relay: 'ABB REB670' },
  'tpl-ref615':     { function: 'FEEDER DIFFERENTIAL',                        relay: 'ABB REF615' },
  'tpl-rel670':     { function: 'DISTANCE PROTECTION',                        relay: 'ABB REL670' },
  'tpl-req650':     { function: 'BREAKER FAILURE',                            relay: 'ABB REQ650' },
  // Legacy support
  'tpl-differential':    { function: 'DIFFERENTIAL',   relay: 'Generic Differential' },
  'tpl-distance':        { function: 'DISTANCE',        relay: 'Generic Distance' },
  'tpl-breaker-failure': { function: 'BREAKER_FAILURE', relay: 'Generic Breaker Failure' },
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

    // First try workspace-specific templates
    let result = await templates
      .find({ workspaceId: wsObjectId })
      .sort({ createdAt: 1 })
      .toArray();

    // If no workspace-specific templates, try string match as fallback
    if (result.length === 0) {
      result = await templates
        .find({ workspaceId: id })
        .sort({ createdAt: 1 })
        .toArray();
    }

    // If still no results, return global templates (no workspaceId)
    if (result.length === 0) {
      result = await templates
        .find({ workspaceId: { $exists: false } })
        .sort({ createdAt: 1 })
        .toArray();
    }

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

export async function POST(
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

    const body = await request.json();
    const { name, description, relay, iedType, functions } = body;

    if (!name || !iedType) {
      return NextResponse.json({ error: 'Name and iedType are required' }, { status: 400 });
    }

    // Convert workspace ID to ObjectId
    let wsObjectId: ObjectId;
    try {
      wsObjectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
    }

    // Create the template document
    const template = {
      name,
      description: description || '',
      iedType,
      relay: relay || '',
      functions: functions || [],
      workspaceId: wsObjectId,
      createdAt: new Date(),
      createdBy: currentUser.id,
      inputSchema: {
        type: 'object',
        properties: {
          sheet1: { type: 'object' },
          sheet2: { type: 'object' }
        }
      }
    };

    // Insert into database
    const templates = await getTemplates();
    const result = await templates.insertOne(template);

    // Update IED_META for this new template
    const functionName = functions.join(' + ').toUpperCase() || 'CUSTOM';
    IED_META[iedType] = { 
      function: functionName, 
      relay: relay || 'Custom Relay' 
    };

    return NextResponse.json({
      id: result.insertedId.toString(),
      name: template.name,
      description: template.description,
      iedType: template.iedType,
      function: functionName,
      relay: template.relay,
      createdAt: template.createdAt,
    });

  } catch (error) {
    console.error('Template creation error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
