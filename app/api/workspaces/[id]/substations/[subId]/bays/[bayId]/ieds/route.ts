import { NextRequest, NextResponse } from 'next/server';
import { getIEDs, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string; bayId: string }> }
) {
  const { bayId } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const col = await getIEDs();
  const list = await col.find({ bayId: new ObjectId(bayId) }).sort({ name: 1 }).toArray();
  return NextResponse.json(list.map(i => ({ ...i, id: i._id.toString(), _id: undefined })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string; bayId: string }> }
) {
  const { id, subId, bayId } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, model, serialNumber, functions, ctRatio, ctClass, rct, vk, io } = body;
  if (!name || !model) return NextResponse.json({ error: 'name and model are required' }, { status: 400 });

  const col = await getIEDs();
  const now = new Date();
  const result = await col.insertOne({
    workspaceId:  new ObjectId(id),
    substationId: new ObjectId(subId),
    bayId:        new ObjectId(bayId),
    name,
    model,                              // e.g. RED670, SEL-421
    serialNumber: serialNumber ?? '',
    // Protection functions this IED performs
    functions:    functions    ?? [],   // ['tpl-differential', 'tpl-distance']
    // CT nameplate data stored with IED for reuse
    ct: {
      ratio:   ctRatio ?? '',           // e.g. "800/1"
      class:   ctClass ?? 'PX',
      rct:     rct     ?? 0,
      vk:      vk      ?? 0,
      io:      io      ?? 0,
    },
    createdById:  new ObjectId(user.userId),
    createdAt:    now,
    updatedAt:    now,
  });

  return NextResponse.json({ id: result.insertedId.toString(), name, model }, { status: 201 });
}
