import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { getUsers } from '@/lib/db';
import { loginSchema } from '@/lib/schemas/auth';
import { createJWT, cookieOptions, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import type { UserRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`login:${ip}`);
  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { employeeId, password } = validation.data;

    const users = await getUsers();
    // Look up by employeeId (case-insensitive)
    const user = await users.findOne({
      employeeId: { $regex: `^${employeeId.trim()}$`, $options: 'i' },
    });

    // Constant-time — don't reveal if employeeId exists
    if (!user) {
      await compare(password, '$2b$10$invalidhashpaddingtoconstanttime000000000000000000000');
      return NextResponse.json({ error: 'Invalid Employee ID or password' }, { status: 401 });
    }

    const match = await compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid Employee ID or password' }, { status: 401 });
    }

    resetRateLimit(`login:${ip}`);

    const token = await createJWT({
      userId: user._id.toString(),
      email:  user.email,
      name:   user.name,
      role:   user.role as UserRole,
    });

    const response = NextResponse.json({
      user: {
        id:         user._id.toString(),
        employeeId: user.employeeId,
        name:       user.name,
        role:       user.role,
      },
    }, { status: 200 });

    response.cookies.set(COOKIE_NAME, token, cookieOptions());
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
