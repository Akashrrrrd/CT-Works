import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search       = searchParams.get('search')       ?? '';
  const action       = searchParams.get('action')       ?? '';
  const resourceType = searchParams.get('resourceType') ?? '';
  const limit        = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

  const col   = await getAuditLogs();
  const query: Record<string, unknown> = { workspaceId: new ObjectId(id) };
  if (action)       query.action       = action;
  if (resourceType) query.resourceType = resourceType;
  if (search)       query.$or = [
    { userName:   { $regex: search, $options: 'i' } },
    { details:    { $regex: search, $options: 'i' } },
    { resourceId: { $regex: search, $options: 'i' } },
  ];

  const logs = await col.find(query).sort({ createdAt: -1 }).limit(limit).toArray();

  return NextResponse.json(logs.map(l => ({
    id:           l._id.toString(),
    action:       l.action,
    resourceType: l.resourceType,
    resourceId:   l.resourceId,
    userName:     l.userName,
    details:      l.details,
    createdAt:    l.createdAt,
  })));
}
