// Edge-compatible auth — no 'use server' directive, no Node-only APIs
// Used by both middleware (Edge) and API routes (Node)

export type UserRole = 'ENGINEER' | 'ADMIN' | 'MANAGER';

export interface JwtPayload {
  userId: string;
  email:  string;
  name:   string;
  role:   UserRole;
  iat:    number;
  exp:    number;
}

const COOKIE_NAME = 'auth-token';

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  return s;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function b64uEncode(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64uDecode(str: string): Uint8Array {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return new Uint8Array(
    atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
      .split('').map(c => c.charCodeAt(0))
  );
}

// ── Token creation ────────────────────────────────────────────────────────────

export async function createJWT(
  payload: { userId: string; email: string; name: string; role: UserRole },
  expiresInSeconds = 60 * 60 * 8   // 8-hour access token
): Promise<string> {
  const secret = getSecret();
  const now    = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresInSeconds };

  const header     = b64uEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body       = b64uEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const message    = `${header}.${body}`;
  const key        = await getKey(secret);
  const sig        = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));

  return `${message}.${b64uEncode(sig)}`;
}

// ── Token verification ────────────────────────────────────────────────────────

export async function verifyJWT(token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;
    const message = `${header}.${body}`;
    const key     = await getKey(getSecret());
    const valid   = await crypto.subtle.verify(
      'HMAC', key, b64uDecode(sig), new TextEncoder().encode(message)
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(b64uDecode(body))
    ) as JwtPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Cookie helpers (Node runtime only — use in API routes, not middleware) ────

export async function setAuthCookie(token: string): Promise<void> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  store.set(COOKIE_NAME, token, cookieOptions());
}

export async function clearAuthCookie(): Promise<void> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return token ? verifyJWT(token) : null;
}

export function cookieOptions(maxAge = 60 * 60 * 8) {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax'  as const,
    maxAge,
    path:     '/',
  };
}

export { COOKIE_NAME };
