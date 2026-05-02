import { NextRequest, NextResponse } from 'next/server';
import { getBays, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

// Bay types used in substations
export const BAY_TYPES = ['FEEDER', 'TRANSFORMER', 'BUSBAR', 'COUPLER', 'OTHER'] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { subId } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  const { name, type, voltage, description } = body;
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const col = await getBays();
  const now = new Date();
  const result = await col.insertOne({
    workspaceId:   new ObjectId(id),
    substationId:  new ObjectId(subId),
    name,
    type:          type        ?? 'FEEDER',
    voltage:       voltage     ?? '',
    description:   description ?? '',
    createdById:   new ObjectId(user.userId),
    createdAt:     now,
    updatedAt:     now,
  });

  return NextResponse.json({ id: result.insertedId.toString(), name }, { status: 201 });
}
