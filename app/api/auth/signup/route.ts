import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { getUsers, getOrgs, getWorkspaces, ObjectId } from '@/lib/db';
import { signupSchema } from '@/lib/schemas/auth';
import { createJWT } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { email, password, name, organizationName, role } = validation.data;

    const users = await getUsers();

    // Check duplicate email
    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);
    const now = new Date();

    // Create org
    const orgs = await getOrgs();
    const orgResult = await orgs.insertOne({
      name: organizationName,
      ownerId: null,
      settings: {},
      createdAt: now,
      updatedAt: now,
    });

    // Create user
    const userResult = await users.insertOne({
      email,
      passwordHash,
      name,
      role,
      organizationId: orgResult.insertedId,
      createdAt: now,
      updatedAt: now,
    });

    // Patch org owner
    await orgs.updateOne(
      { _id: orgResult.insertedId },
      { $set: { ownerId: userResult.insertedId } }
    );

    // Create default workspace
    const workspaces = await getWorkspaces();
    await workspaces.insertOne({
      organizationId: orgResult.insertedId,
      name: 'Default Workspace',
      description: 'Your default workspace',
      ownerId: userResult.insertedId,
      members: [],
      createdAt: now,
      updatedAt: now,
    });

    const token = await createJWT({
      userId: userResult.insertedId.toString(),
      email,
      role,
    });

    const response = NextResponse.json(
      { user: { id: userResult.insertedId.toString(), email, name } },
      { status: 201 }
    );
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'An error occurred during signup' }, { status: 500 });
  }
}
