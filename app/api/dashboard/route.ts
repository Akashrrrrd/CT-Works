import { NextResponse } from 'next/server';
import { getUsers, getWorkspaces, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    const currentUser = token ? await verifyJWT(token) : null;
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await getUsers();
    const user  = await users.findOne({ _id: new ObjectId(currentUser.userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspaces = await getWorkspaces();

    // Show all workspaces in the same organization — every role can see them
    const wsList = await workspaces.find({
      organizationId: user.organizationId,
    }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({
      user: {
        id:    user._id.toString(),
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
      workspaces: wsList.map(w => ({
        id:          w._id.toString(),
        name:        w.name,
        description: w.description,
        createdAt:   w.createdAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
