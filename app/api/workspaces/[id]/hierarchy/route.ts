/**
 * GET /api/workspaces/[id]/hierarchy
 * Returns the full Substation → Bay → IED tree for a workspace in one call.
 * Each IED includes its latest computation result if available.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSubstations, getBays, getIEDs, getComputations, ObjectId } from '@/lib/db';
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

  const [substations, bays, ieds, computations] = await Promise.all([
    (await getSubstations()).find({ workspaceId: wsId }).sort({ name: 1 }).toArray(),
    (await getBays()).find({ workspaceId: wsId }).sort({ name: 1 }).toArray(),
    (await getIEDs()).find({ workspaceId: wsId }).sort({ name: 1 }).toArray(),
    (await getComputations()).find({ workspaceId: wsId }).sort({ createdAt: -1 }).toArray(),
  ]);

  // Index latest computation per IED
  const latestByIed: Record<string, typeof computations[0]> = {};
  for (const c of computations) {
    const key = c.iedId?.toString();
    if (key && !latestByIed[key]) latestByIed[key] = c;
  }

  // Build tree
  const tree = substations.map(sub => ({
    id:           sub._id.toString(),
    name:         sub.name,
    voltageLevel: sub.voltageLevel,
    location:     sub.location,
    description:  sub.description,
    bays: bays
      .filter(b => b.substationId.toString() === sub._id.toString())
      .map(bay => ({
        id:          bay._id.toString(),
        name:        bay.name,
        type:        bay.type,
        voltage:     bay.voltage,
        description: bay.description,
        ieds: ieds
          .filter(ied => ied.bayId.toString() === bay._id.toString())
          .map(ied => {
            const latest = latestByIed[ied._id.toString()];
            return {
              id:           ied._id.toString(),
              name:         ied.name,
              model:        ied.model,
              serialNumber: ied.serialNumber,
              functions:    ied.functions,
              ct:           ied.ct,
              latestResult: latest ? {
                id:           latest._id.toString(),
                templateName: latest.templateName,
                verdict:      latest.verdict,
                vk_required:  latest.vk_required,
                vk_available: latest.vk_available,
                ealreq_max:   latest.ealreq_max,
                createdAt:    latest.createdAt,
              } : null,
            };
          }),
      })),
  }));

  // Summary counts
  const totalIEDs      = ieds.length;
  const adequate       = Object.values(latestByIed).filter(c => c.verdict === 'SUITABLY DIMENSIONED').length;
  const underDim       = Object.values(latestByIed).filter(c => c.verdict === 'UNDER DIMENSIONED').length;
  const notChecked     = totalIEDs - Object.keys(latestByIed).length;

  return NextResponse.json({ tree, summary: { totalIEDs, adequate, underDim, notChecked } });
}
