import { NextRequest, NextResponse } from 'next/server';
import { sanitizeWorkspaceName, sanitizeWorkspaceDescription } from '@/lib/workspace-sanitizer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json([
    {
      id: 'ws-2026-substation',
      name: '2026 CT/VT Adequacy Check',
      description: '',
      createdAt: '2026-03-16T00:00:00.000Z',
    },
  ]);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json(
    {
      id: `ws-${Date.now()}`,
      name: sanitizeWorkspaceName(body.name),
      description: sanitizeWorkspaceDescription(body.description) || '',
      createdAt: new Date().toISOString(),
    },
    { status: 201 }
  );
}
