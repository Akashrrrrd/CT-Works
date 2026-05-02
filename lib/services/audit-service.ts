import { getAuditLogs, ObjectId } from '@/lib/db';

export interface AuditLogEntry {
  organizationId: string;
  userId?:        string;
  action:         string;
  resourceType:   string;
  resourceId?:    string;
  changes?:       Record<string, unknown>;
  ipAddress?:     string;
}

export async function createAuditLog(entry: AuditLogEntry) {
  const col = await getAuditLogs();
  await col.insertOne({
    organizationId: new ObjectId(entry.organizationId),
    userId:         entry.userId ? new ObjectId(entry.userId) : null,
    action:         entry.action,
    resourceType:   entry.resourceType,
    resourceId:     entry.resourceId ?? null,
    changes:        entry.changes ?? {},
    ipAddress:      entry.ipAddress ?? null,
    createdAt:      new Date(),
  });
}

export async function getAuditLogsList(
  organizationId: string,
  options?: { limit?: number; offset?: number; userId?: string; resourceType?: string }
) {
  const col = await getAuditLogs();
  const { limit = 100, offset = 0, userId, resourceType } = options ?? {};

  const filter: Record<string, unknown> = { organizationId: new ObjectId(organizationId) };
  if (userId)       filter.userId       = new ObjectId(userId);
  if (resourceType) filter.resourceType = resourceType;

  return col.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray();
}
