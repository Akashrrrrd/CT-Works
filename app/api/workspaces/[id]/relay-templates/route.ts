import { NextRequest, NextResponse } from 'next/server';
import { getRelayTemplates, ObjectId } from '@/lib/db';
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

    const relayTemplates = await getRelayTemplates();
    
    // Get both workspace-specific and global templates
    const [workspaceTemplates, globalTemplates] = await Promise.all([
      relayTemplates
        .find({ workspaceId: new ObjectId(id) })
        .sort({ createdAt: -1 })
        .toArray(),
      relayTemplates
        .find({ workspaceId: { $exists: false } })
        .sort({ createdAt: 1 })
        .toArray()
    ]);

    // Combine and format templates
    const allTemplates = [...globalTemplates, ...workspaceTemplates].map(template => ({
      id: template._id.toString(),
      name: template.name,
      manufacturer: template.manufacturer,
      model: template.model,
      type: template.type,
      functions: template.functions,
      specifications: template.specifications,
      datasheet: template.datasheet,
      createdAt: template.createdAt.toISOString(),
      createdBy: template.createdBy,
      isGlobal: !template.workspaceId
    }));

    return NextResponse.json(allTemplates);

  } catch (error) {
    console.error('Relay templates GET error:', error);
    return NextResponse.json({ error: 'Failed to load relay templates' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await auth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { 
      name, 
      manufacturer, 
      model, 
      type = 'DIFFERENTIAL',
      functions,
      specifications,
      datasheet 
    } = body;

    if (!name || !manufacturer) {
      return NextResponse.json({ error: 'Name and manufacturer are required' }, { status: 400 });
    }

    const relayTemplates = await getRelayTemplates();
    
    const newTemplate = {
      workspaceId: new ObjectId(id),
      name,
      manufacturer,
      model: model || 'Custom Relay',
      type,
      functions: {
        differential: functions?.differential || false,
        distance: functions?.distance || false,
        breakerFailure: functions?.breakerFailure || false,
        overcurrent: functions?.overcurrent || false,
        directional: functions?.directional || false
      },
      specifications: specifications || {
        ratedVoltage: 0,
        ratedCurrent: 0,
        frequency: 50,
        accuracy: 'Class 1',
        burden: 0
      },
      datasheet: datasheet || null,
      createdBy: new ObjectId(currentUser.userId),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await relayTemplates.insertOne(newTemplate);

    return NextResponse.json({
      id: result.insertedId.toString(),
      name: newTemplate.name,
      manufacturer: newTemplate.manufacturer,
      model: newTemplate.model,
      type: newTemplate.type,
      functions: newTemplate.functions,
      specifications: newTemplate.specifications,
      createdAt: newTemplate.createdAt.toISOString(),
      createdBy: newTemplate.createdBy.toString()
    }, { status: 201 });

  } catch (error) {
    console.error('Relay template POST error:', error);
    return NextResponse.json({ error: 'Failed to create relay template' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await auth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const templateId = url.searchParams.get('templateId');
    
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const relayTemplates = await getRelayTemplates();
    
    const result = await relayTemplates.deleteOne({
      _id: new ObjectId(templateId),
      workspaceId: new ObjectId(id) // Only allow deletion of workspace templates
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Template not found or cannot be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Relay template DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete relay template' }, { status: 500 });
  }
}