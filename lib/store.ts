// In-memory store shared across all API routes (mock DB until Prisma is ready)
// All routes read/write from here so data is always consistent

export interface StoredComputation {
  id: string;
  templateId: string;
  templateName: string;
  createdAt: string;
  createdBy: { name: string; email: string };
  sheet1: Sheet1Inputs;
  sheet2: Sheet2Inputs;
  verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  ealreq_max: number;
  vk_required: number;
  vk_available: number;
  intermediates: Record<string, number | string>;
  approvalStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface StoredApproval {
  id: string;
  computationId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  comments?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  user: { name: string; email: string };
  details?: string;
}

// Global store — persists for the lifetime of the dev server process
const globalStore = global as typeof global & {
  _syncspaceComputations?: StoredComputation[];
  _syncspaceApprovals?: StoredApproval[];
  _syncspaceAudit?: AuditEntry[];
};

if (!globalStore._syncspaceComputations) {
  globalStore._syncspaceComputations = [];
}

if (!globalStore._syncspaceApprovals) {
  globalStore._syncspaceApprovals = [];
}

if (!globalStore._syncspaceAudit) {
  globalStore._syncspaceAudit = [];
}

export const store = {
  // ── Computations ──────────────────────────────────────────────────────────
  getComputations(): StoredComputation[] {
    return globalStore._syncspaceComputations!;
  },
  addComputation(c: StoredComputation) {
    globalStore._syncspaceComputations!.unshift(c);
  },

  // ── Approvals ─────────────────────────────────────────────────────────────
  getApprovals(): StoredApproval[] {
    return globalStore._syncspaceApprovals!;
  },
  addApproval(a: StoredApproval) {
    globalStore._syncspaceApprovals!.unshift(a);
  },
  updateApproval(id: string, patch: Partial<StoredApproval>) {
    const idx = globalStore._syncspaceApprovals!.findIndex(a => a.id === id);
    if (idx !== -1) globalStore._syncspaceApprovals![idx] = { ...globalStore._syncspaceApprovals![idx], ...patch };
  },
  updateComputationApprovalStatus(computationId: string, status: StoredComputation['approvalStatus']) {
    const idx = globalStore._syncspaceComputations!.findIndex(c => c.id === computationId);
    if (idx !== -1) globalStore._syncspaceComputations![idx].approvalStatus = status;
  },

  // ── Audit ─────────────────────────────────────────────────────────────────
  getAudit(): AuditEntry[] {
    return globalStore._syncspaceAudit!;
  },
  addAudit(entry: Omit<AuditEntry, 'id' | 'createdAt'>) {
    globalStore._syncspaceAudit!.unshift({
      id: `log-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...entry,
    });
  },

  // ── Stats (derived live from store) ───────────────────────────────────────
  getStats() {
    const comps = globalStore._syncspaceComputations!;
    const approvals = globalStore._syncspaceApprovals!;
    return {
      totalTemplates: 3, // fixed — 3 protection function templates
      totalComputations: comps.length,
      completedComputations: comps.filter(c => c.approvalStatus !== 'PENDING').length,
      pendingApprovals: approvals.filter(a => a.status === 'PENDING').length,
    };
  },
};
