import { NextRequest, NextResponse } from 'next/server';
import { getUsers, getWorkspaces, getOrgs, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }      = await params;
    const currentUser = await auth(request);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await getUsers();
    const user  = await users.findOne({ _id: new ObjectId(currentUser.userId) });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const workspaces = await getWorkspaces();
    const workspace  = await workspaces.findOne({
      _id: new ObjectId(id),
      organizationId: user.organizationId,
    });
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const orgs = await getOrgs();
    const org  = workspace.organizationId
      ? await orgs.findOne({ _id: workspace.organizationId })
      : null;

    return NextResponse.json({
      workspace: {
        id:           workspace._id.toString(),
        name:         workspace.name,
        description:  workspace.description,
        organization: org ? { id: org._id.toString(), name: org.name } : null,
      },
      user: {
        id:    user._id.toString(),
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (error) {
    console.error('Workspace fetch error:', error);
    return NextResponse.json({ error: 'Failed to load workspace' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }      = await params;
    const currentUser = await auth(request);
    if (!currentUser || !['ADMIN', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body       = await request.json();
    const workspaces = await getWorkspaces();
    await workspaces.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: body.name, description: body.description, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workspace update error:', error);
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
  }
}
