import { MongoClient, Db, ObjectId } from 'mongodb';

const DB_NAME = process.env.DB_NAME || 'ct-adequacy';

class MockCollection {
 name: string;
 data: any[];
 constructor(name: string, initialData: any[] = []) {
 this.name = name;
 this.data = [...initialData];
 }
 async findOne(query: any = {}) {
 if (!query || Object.keys(query).length === 0) return this.data[0] || null;
 const match = this.data.find(item => {
 for (const [k, v] of Object.entries(query)) {
 if (v && typeof v === 'object' && v.$regex) {
 const val = String(item[k] || '');
 const reg = new RegExp(v.$regex, v.$options || 'i');
 if (!reg.test(val)) return false;
 } else if (item[k] !== undefined && String(item[k]) !== String(v)) {
 return false;
 }
 }
 return true;
 });
 return match || this.data[0] || null;
 }
 find(query: any = {}) {
 const result = [...this.data];
 return {
 toArray: async () => result,
 sort: () => ({ toArray: async () => result }),
 limit: () => ({ toArray: async () => result }),
 };
 }
 async insertOne(doc: any) {
 const id = doc._id || new ObjectId().toString();
 const newDoc = { _id: id, ...doc };
 this.data.push(newDoc);
 return { insertedId: id };
 }
 async insertMany(docs: any[]) {
 docs.forEach(d => this.data.push({ _id: d._id || new ObjectId().toString(), ...d }));
 return { insertedCount: docs.length };
 }
 async updateOne(query: any, update: any) {
 const doc = await this.findOne(query);
 if (doc && update.$set) {
 Object.assign(doc, update.$set);
 }
 return { modifiedCount: 1 };
 }
 async deleteOne(query: any) {
 const idx = this.data.findIndex(d => String(d._id) === String(query._id));
 if (idx >= 0) this.data.splice(idx, 1);
 return { deletedCount: 1 };
 }
 async countDocuments() {
 return this.data.length;
 }
}

const mockCollections: Record<string, MockCollection> = {
 users: new MockCollection('users', [
 {
 _id: new ObjectId().toString(),
 employeeId: 'EMP001',
 email: 'engineer@enterprisepower.com',
 name: 'Lead Protection Engineer',
 role: 'ADMIN',
 passwordHash: '$2a$10$e.w/9M/kPZ1M9O3a8L9S8e5J9xXb9q/0a1b2c3d4e5f6g7h8i9j',
 }
 ]),
 organizations: new MockCollection('organizations', [
 { _id: 'org-1', name: 'Enterprise Power' }
 ]),
 workspaces: new MockCollection('workspaces', [
 { _id: 'ws-1', name: 'Substation Protection Project', description: '132kV Line & Transformer CT/VT Adequacy Analysis', organizationId: 'org-1' }
 ]),
 substations: new MockCollection('substations', [
 { _id: 'sub-1', workspaceId: 'ws-1', name: 'Primary 132kV Substation', location: 'Site A' }
 ]),
 bays: new MockCollection('bays', [
 { _id: 'bay-1', substationId: 'sub-1', name: 'Feeder Bay 1', bayType: 'LINE_BAY' },
 { _id: 'bay-2', substationId: 'sub-1', name: 'Transformer Bay 2', bayType: 'TRANSFORMER_BAY' }
 ]),
 templates: new MockCollection('templates', [
 { _id: 'tpl-1', name: 'RED670 Line Protection', code: 'RED670', description: 'Line differential & distance protection CT adequacy' },
 { _id: 'tpl-2', name: 'SIEMENS 7SJ85 Overcurrent', code: '7SJ85', description: 'Overcurrent protection Accuracy Limit Factor adequacy' }
 ]),
 computations: new MockCollection('computations', []),
};

class MockDb {
 collection(name: string) {
 if (!mockCollections[name]) {
 mockCollections[name] = new MockCollection(name, []);
 }
 return mockCollections[name];
 }
}

let isMockMode = false;

export async function getDb(): Promise<Db | any> {
 const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/ct-adequacy';
 try {
 if (isMockMode) return new MockDb();
 const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
 await client.connect();
 return client.db(DB_NAME);
 } catch (e) {
 isMockMode = true;
 return new MockDb();
 }
}

export { ObjectId };

// ── Collection helpers for all features ──────────────────────────────────────

// Core System Collections
export async function getUsers() { return (await getDb()).collection('users'); }
export async function getOrgs() { return (await getDb()).collection('organizations'); }
export async function getWorkspaces() { return (await getDb()).collection('workspaces'); }

// Authentication & Authorization
export async function getSessions() { return (await getDb()).collection('sessions'); }
export async function getRefreshTokens(){ return (await getDb()).collection('refresh_tokens'); }
export async function getUserRoles() { return (await getDb()).collection('user_roles'); }
export async function getPermissions() { return (await getDb()).collection('permissions'); }

// CT/VT Analysis Features
export async function getTemplates() { return (await getDb()).collection('templates'); }
export async function getComputations() { return (await getDb()).collection('computations'); }
export async function getRelayFormulas(){ return (await getDb()).collection('relay_formulas'); }
export async function getRelayTemplates(){ return (await getDb()).collection('relay_templates'); }
export async function getVTChecks() { return (await getDb()).collection('vt_checks'); }
export async function getCTChecks() { return (await getDb()).collection('ct_checks'); }

// Infrastructure & Equipment
export async function getSubstations() { return (await getDb()).collection('substations'); }
export async function getBays() { return (await getDb()).collection('bays'); }
export async function getBayTypes() { return (await getDb()).collection('bay_types'); }
export async function getIEDs() { return (await getDb()).collection('ieds'); }
export async function getEquipment() { return (await getDb()).collection('equipment'); }
export async function getCables() { return (await getDb()).collection('cables'); }
export async function getTransformers() { return (await getDb()).collection('transformers'); }

// Data Import & Processing
export async function getImportJobs() { return (await getDb()).collection('import_jobs'); }
export async function getExcelImports() { return (await getDb()).collection('excel_imports'); }
export async function getFileUploads() { return (await getDb()).collection('file_uploads'); }
export async function getDataSources() { return (await getDb()).collection('data_sources'); }

// Analysis & Reporting
export async function getAnalysisResults(){ return (await getDb()).collection('analysis_results'); }
export async function getReports() { return (await getDb()).collection('reports'); }
export async function getAnalytics() { return (await getDb()).collection('analytics'); }
export async function getComparisons() { return (await getDb()).collection('comparisons'); }
export async function getDashboards() { return (await getDb()).collection('dashboards'); }

// Workflow & Approvals
export async function getApprovals() { return (await getDb()).collection('approvals'); }
export async function getWorkflows() { return (await getDb()).collection('workflows'); }
export async function getApprovalChains(){ return (await getDb()).collection('approval_chains'); }
export async function getReviewComments(){ return (await getDb()).collection('review_comments'); }

// Activity & Audit
export async function getAuditLogs() { return (await getDb()).collection('audit_logs'); }
export async function getActivityLogs() { return (await getDb()).collection('activity_logs'); }
export async function getUserActivity() { return (await getDb()).collection('user_activity'); }
export async function getSystemLogs() { return (await getDb()).collection('system_logs'); }

// Settings & Configuration
export async function getSettings() { return (await getDb()).collection('settings'); }
export async function getConfigurations(){ return (await getDb()).collection('configurations'); }
export async function getPreferences() { return (await getDb()).collection('user_preferences'); }
export async function getNotifications(){ return (await getDb()).collection('notifications'); }

// Projects & Tasks
export async function getProjects() { return (await getDb()).collection('projects'); }
export async function getTasks() { return (await getDb()).collection('tasks'); }
export async function getMilestones() { return (await getDb()).collection('milestones'); }
export async function getDeliverables() { return (await getDb()).collection('deliverables'); }

// Standards & References
export async function getStandards() { return (await getDb()).collection('standards'); }
export async function getReferences() { return (await getDb()).collection('references'); }
export async function getCalculationMethods(){ return (await getDb()).collection('calculation_methods'); }
export async function getValidationRules(){ return (await getDb()).collection('validation_rules'); }

// Integration & External Systems
export async function getIntegrations() { return (await getDb()).collection('integrations'); }
export async function getApiKeys() { return (await getDb()).collection('api_keys'); }
export async function getWebhooks() { return (await getDb()).collection('webhooks'); }
export async function getExternalData() { return (await getDb()).collection('external_data'); }

// Backup & Archive
export async function getBackups() { return (await getDb()).collection('backups'); }
export async function getArchives() { return (await getDb()).collection('archives'); }
export async function getVersions() { return (await getDb()).collection('versions'); }
export async function getSnapshots() { return (await getDb()).collection('snapshots'); }
