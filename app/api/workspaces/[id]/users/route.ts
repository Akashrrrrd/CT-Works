import { NextRequest, NextResponse } from 'next/server';
import { getUsers, getOrgs, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { hash } from 'bcryptjs';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

// GET — list all users in the same org
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const currentUser = await auth(req);
  if (!currentUser || !['ADMIN', 'MANAGER'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await getUsers();
  const me    = await users.findOne({ _id: new ObjectId(currentUser.userId) });
  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const list = await users
    .find({ organizationId: me.organizationId }, { projection: { passwordHash: 0 } })
    .sort({ role: 1, name: 1 })
    .toArray();

  return NextResponse.json(list.map(u => ({
    id:         u._id.toString(),
    employeeId: u.employeeId,
    name:       u.name,
    email:      u.email,
    role:       u.role,
    createdAt:  u.createdAt,
  })));
}

// POST — create a new user (Admin/Manager only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const currentUser = await auth(req);
  if (!currentUser || !['ADMIN', 'MANAGER'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, employeeId, role, password, email } = body;

  if (!name || !employeeId || !role || !password) {
    return NextResponse.json({ error: 'name, employeeId, role and password are required' }, { status: 400 });
  }
  if (!['ENGINEER', 'ADMIN', 'MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const users = await getUsers();

  // Check employeeId uniqueness
  const existing = await users.findOne({
    employeeId: { $regex: `^${employeeId.trim()}$`, $options: 'i' },
  });
  if (existing) {
    return NextResponse.json({ error: `Employee ID "${employeeId}" is already taken` }, { status: 400 });
  }

  // Get creator's org
  const me = await users.findOne({ _id: new ObjectId(currentUser.userId) });
  if (!me) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });

  const passwordHash = await hash(password, 10);
  const now = new Date();

  const result = await users.insertOne({
    employeeId:     employeeId.trim().toUpperCase(),
    name,
    email:          email ?? `${employeeId.toLowerCase()}@ct-adequacy.internal`,
    passwordHash,
    role,
    organizationId: me.organizationId,
    createdById:    new ObjectId(currentUser.userId),
    createdAt:      now,
    updatedAt:      now,
  });

  return NextResponse.json({
    id:         result.insertedId.toString(),
    employeeId: employeeId.trim().toUpperCase(),
    name,
    role,
  }, { status: 201 });
}
