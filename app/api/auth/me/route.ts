/**
 * GET /api/auth/me
 * Returns the current authenticated user from the JWT cookie.
 * Used by client components to verify session without a full page reload.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, COOKIE_NAME } from '@/lib/auth';
import { getUsers, ObjectId } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    const res = NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Fetch fresh user data from DB — catches role changes, deactivation, etc.
  try {
    const users = await getUsers();
    const user  = await users.findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { passwordHash: 0 } }
    );

    if (!user) {
      const res = NextResponse.json({ error: 'User not found' }, { status: 401 });
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    // If role changed in DB since token was issued, reflect it
    return NextResponse.json({
      id:        user._id.toString(),
      email:     user.email,
      name:      user.name,
      role:      user.role,
      tokenExp:  payload.exp,
      tokenIat:  payload.iat,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
