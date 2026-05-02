import { NextRequest, NextResponse } from 'next/server';
import { getApprovals, getComputations, ObjectId } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wsId = new ObjectId(id);
  const [approvalDocs, computationDocs] = await Promise.all([
    (await getApprovals()).find({ workspaceId: wsId }).sort({ createdAt: -1 }).toArray(),
    (await getComputations()).find({ workspaceId: wsId }).toArray(),
  ]);

  const compMap = new Map(computationDocs.map(c => [c._id.toString(), c]));

  const enriched = approvalDocs.map(apr => {
    const comp = compMap.get(apr.computationId?.toString() ?? '');
    return {
      id:         apr._id.toString(),
      status:     apr.status,
      createdAt:  apr.createdAt,
      comments:   apr.comments   ?? null,
      reviewedAt: apr.reviewedAt ?? null,
      reviewedBy: apr.reviewedBy ?? null,
      computation: comp ? {
        id:           comp._id.toString(),
        templateName: comp.templateName,
        verdict:      comp.verdict,
        ealreq_max:   comp.ealreq_max,
        vk_required:  comp.vk_required,
        vk_available: comp.vk_available,
        sheet1:       comp.sheet1,
        sheet2:       comp.sheet2,
        createdBy:    comp.createdBy,
        createdAt:    comp.createdAt,
      } : null,
    };
  });

  return NextResponse.json(enriched);
}
