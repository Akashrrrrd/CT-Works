import { NextRequest, NextResponse } from 'next/server';
import { getRelayFormulas, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

// GET — list all relay formulas (optionally filter by relay name)
export async function GET(req: NextRequest) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const relay = new URL(req.url).searchParams.get('relay') ?? '';
  const col   = await getRelayFormulas();
  const query = relay ? { relayName: { $regex: relay, $options: 'i' } } : {};
  const list  = await col.find(query).sort({ relayName: 1, name: 1 }).toArray();

  return NextResponse.json(list.map(f => ({ ...f, id: f._id.toString(), _id: undefined })));
}

// POST — create / update a relay formula
export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { relayName, name, expression, variables, type, description, validated } = body;

  if (!relayName || !name || !expression) {
    return NextResponse.json({ error: 'relayName, name and expression are required' }, { status: 400 });
  }

  const col = await getRelayFormulas();
  const now = new Date();

  const result = await col.insertOne({
    relayName,
    name,
    expression,
    variables:   variables   ?? [],
    type:        type        ?? 'equation',
    description: description ?? '',
    validated:   validated   ?? false,
    createdById: new ObjectId(user.userId),
    createdAt:   now,
    updatedAt:   now,
  });

  return NextResponse.json({ id: result.insertedId.toString(), relayName, name }, { status: 201 });
}
