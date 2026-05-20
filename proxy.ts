import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

// Routes that require a minimum role level
// ENGINEER < ADMIN < MANAGER  (index = privilege level)
const ROLE_LEVEL: Record<UserRole, number> = {
  ENGINEER: 1,
  ADMIN:    2,
  MANAGER:  3,
};

// Patterns that require at least ADMIN
const ADMIN_ROUTES = [
  /^\/api\/workspaces\/[^/]+\/approvals\/(approve|reject)/,
  /^\/workspaces\/[^/]+\/settings/,
];

// Template POST (create) - Allow all authenticated users to create templates
// const ADMIN_POST_ROUTES = [
//   /^\/api\/workspaces\/[^/]+\/templates$/,
// ];

// Patterns that require at least MANAGER
const MANAGER_ROUTES = [
  /^\/api\/workspaces\/[^/]+\/audit/,
  /^\/workspaces\/[^/]+\/audit/,
];

// Public routes — no auth needed (signup removed — users are seeded by admin)
const PUBLIC_ROUTES = [
  /^\/$/, 
  /^\/auth\/login/,
  /^\/api\/auth\/login/,
  /^\/api\/auth\/logout/,
  /^\/api\/auth\/me/,
  /^\/api\/auth\/refresh/,
  /^\/api\/debug/, // Allow debug endpoint for testing
];

function isPublic(path: string) {
  return PUBLIC_ROUTES.some(r => r.test(path));
}

function requiredLevel(path: string, method: string): number {
  if (MANAGER_ROUTES.some(r => r.test(path))) return ROLE_LEVEL.MANAGER;
  if (ADMIN_ROUTES.some(r => r.test(path)))   return ROLE_LEVEL.ADMIN;
  // Template creation now allowed for all authenticated users
  // if (method === 'POST' && ADMIN_POST_ROUTES.some(r => r.test(path))) return ROLE_LEVEL.ADMIN;
  return ROLE_LEVEL.ENGINEER;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL('/auth/login', request.url));
    res.cookies.delete('auth-token');
    return res;
  }

  const userLevel = ROLE_LEVEL[payload.role as UserRole] ?? 0;
  const needed    = requiredLevel(pathname, request.method);

  if (userLevel < needed) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Forward user info to route handlers via headers
  const headers = new Headers(request.headers);
  headers.set('x-user-id',   payload.userId);
  headers.set('x-user-email', payload.email);
  headers.set('x-user-role',  payload.role);

  return NextResponse.next({ request: { headers } });
}

export default proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*|placeholder.*|public/).*)'],
};
