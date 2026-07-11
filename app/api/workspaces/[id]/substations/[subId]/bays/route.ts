import { NextRequest, NextResponse } from 'next/server';
import { getBays, getBayTypes, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

// Default bay types
export const DEFAULT_BAY_TYPES = ['FEEDER', 'TRANSFORMER', 'BUSBAR', 'COUPLER'] as const;

async function getAllBayTypes(workspaceId: string) {
  const customTypes = await getBayTypes();
  const customList = await customTypes.find({ workspaceId: new ObjectId(workspaceId) }).toArray();
  const customTypeNames = customList.map(t => t.name);
  
  return [...DEFAULT_BAY_TYPES, ...customTypeNames];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id, subId } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if requesting bay types
  const url = new URL(req.url);
  if (url.searchParams.get('types') === 'true') {
    const types = await getAllBayTypes(id);
    return NextResponse.json({ types });
  }

  const col = await getBays();
  const list = await col.find({ substationId: new ObjectId(subId) }).sort({ name: 1 }).toArray();
  return NextResponse.json(list.map(b => ({ ...b, id: b._id.toString(), _id: undefined })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id, subId } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, type, voltage, description, customType } = body;
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  let finalType = type ?? 'FEEDER';

  // Handle custom type creation
  if (customType && customType.trim()) {
    const bayTypesCol = await getBayTypes();
    const existingType = await bayTypesCol.findOne({ 
      workspaceId: new ObjectId(id), 
      name: customType.trim().toUpperCase() 
    });

    if (!existingType) {
      await bayTypesCol.insertOne({
        workspaceId: new ObjectId(id),
        name: customType.trim().toUpperCase(),
        createdById: new ObjectId(user.userId),
        createdAt: new Date(),
      });
    }
    
    finalType = customType.trim().toUpperCase();
  }

  const col = await getBays();
  const now = new Date();
  const result = await col.insertOne({
    workspaceId:   new ObjectId(id),
    substationId:  new ObjectId(subId),
    name,
    type:          finalType,
    voltage:       voltage     ?? '',
    description:   description ?? '',
    createdById:   new ObjectId(user.userId),
    createdAt:     now,
    updatedAt:     now,
  });

  return NextResponse.json({ 
    id: result.insertedId.toString(), 
    name,
    type: finalType
  }, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { bayId, name, type, voltage, description, customType } = body;
  
  if (!bayId) return NextResponse.json({ error: 'bayId is required' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  let finalType = type ?? 'FEEDER';

  // Handle custom type creation
  if (customType && customType.trim()) {
    const bayTypesCol = await getBayTypes();
    const existingType = await bayTypesCol.findOne({ 
      workspaceId: new ObjectId(id), 
      name: customType.trim().toUpperCase() 
    });

    if (!existingType) {
      await bayTypesCol.insertOne({
        workspaceId: new ObjectId(id),
        name: customType.trim().toUpperCase(),
        createdById: new ObjectId(user.userId),
        createdAt: new Date(),
      });
    }
    
    finalType = customType.trim().toUpperCase();
  }

  const col = await getBays();
  const now = new Date();
  
  const result = await col.updateOne(
    { 
      _id: new ObjectId(bayId), 
      workspaceId: new ObjectId(id) 
    },
    {
      $set: {
        name,
        type: finalType,
        voltage: voltage ?? '',
        description: description ?? '',
        updatedAt: now,
      }
    }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: 'Bay not found' }, { status: 404 });
  }

  return NextResponse.json({ 
    id: bayId,
    name,
    type: finalType
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { bayId } = body;
  
  if (!bayId) return NextResponse.json({ error: 'bayId is required' }, { status: 400 });

  const col = await getBays();
  
  const result = await col.deleteOne({
    _id: new ObjectId(bayId),
    workspaceId: new ObjectId(id)
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Bay not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Bay deleted successfully' });
}
