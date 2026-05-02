/**
 * POST /api/auth/refresh
 * Issues a new 8-hour token if the current one is valid but expiring soon (< 1 hour left).
 * Called automatically by the client auth hook.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, createJWT, cookieOptions, COOKIE_NAME } from '@/lib/auth';
import { getUsers, ObjectId } from '@/lib/db';
import type { UserRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    const res = NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  const now       = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - now;

  // Only refresh if less than 1 hour remaining
  if (remaining > 3600) {
    return NextResponse.json({ refreshed: false, expiresIn: remaining });
  }

  // Fetch fresh user from DB to pick up any role/name changes
  try {
    const users = await getUsers();
    const user  = await users.findOne({ _id: new ObjectId(payload.userId) });
    if (!user) {
      const res = NextResponse.json({ error: 'User not found' }, { status: 401 });
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    const newToken = await createJWT({
      userId: user._id.toString(),
      email:  user.email,
      name:   user.name,
      role:   user.role as UserRole,
    });

    const response = NextResponse.json({ refreshed: true });
    response.cookies.set(COOKIE_NAME, newToken, cookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
