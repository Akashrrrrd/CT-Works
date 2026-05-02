import { NextRequest, NextResponse } from 'next/server';
import { getSubstations, getUsers, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const col = await getSubstations();
  const list = await col.find({ workspaceId: new ObjectId(id) }).sort({ name: 1 }).toArray();
  return NextResponse.json(list.map(s => ({ ...s, id: s._id.toString(), _id: undefined })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, voltageLevel, location, description } = body;
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const col = await getSubstations();
  const now = new Date();
  const result = await col.insertOne({
    workspaceId:  new ObjectId(id),
    name,
    voltageLevel: voltageLevel ?? '',
    location:     location    ?? '',
    description:  description ?? '',
    createdById:  new ObjectId(user.userId),
    createdAt:    now,
    updatedAt:    now,
  });

  return NextResponse.json({ id: result.insertedId.toString(), name }, { status: 201 });
}
