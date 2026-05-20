import { MongoClient, Db, ObjectId } from 'mongodb';

const DB_NAME = process.env.DB_NAME || 'ct-adequacy';

// Reuse client across hot-reloads in dev
const globalForMongo = global as unknown as { _mongoClient?: MongoClient };

function getClient(): MongoClient {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL environment variable is not set');

  if (process.env.NODE_ENV === 'development') {
    if (!globalForMongo._mongoClient) {
      globalForMongo._mongoClient = new MongoClient(uri);
    }
    return globalForMongo._mongoClient;
  }
  return new MongoClient(uri);
}

export async function getDb(): Promise<Db> {
  const client = getClient();
  await client.connect();
  return client.db(DB_NAME);
}

export { ObjectId };

// ── Collection helpers for all features ──────────────────────────────────────

// Core System Collections
export async function getUsers()        { return (await getDb()).collection('users'); }
export async function getOrgs()         { return (await getDb()).collection('organizations'); }
export async function getWorkspaces()   { return (await getDb()).collection('workspaces'); }

// Authentication & Authorization
export async function getSessions()     { return (await getDb()).collection('sessions'); }
export async function getRefreshTokens(){ return (await getDb()).collection('refresh_tokens'); }
export async function getUserRoles()    { return (await getDb()).collection('user_roles'); }
export async function getPermissions()  { return (await getDb()).collection('permissions'); }

// CT/VT Analysis Features
export async function getTemplates()    { return (await getDb()).collection('templates'); }
export async function getComputations() { return (await getDb()).collection('computations'); }
export async function getRelayFormulas(){ return (await getDb()).collection('relay_formulas'); }
export async function getRelayTemplates(){ return (await getDb()).collection('relay_templates'); }
export async function getVTChecks()     { return (await getDb()).collection('vt_checks'); }
export async function getCTChecks()     { return (await getDb()).collection('ct_checks'); }

// Infrastructure & Equipment
export async function getSubstations()  { return (await getDb()).collection('substations'); }
export async function getBays()         { return (await getDb()).collection('bays'); }
export async function getIEDs()         { return (await getDb()).collection('ieds'); }
export async function getEquipment()    { return (await getDb()).collection('equipment'); }
export async function getCables()       { return (await getDb()).collection('cables'); }
export async function getTransformers() { return (await getDb()).collection('transformers'); }

// Data Import & Processing
export async function getImportJobs()   { return (await getDb()).collection('import_jobs'); }
export async function getExcelImports() { return (await getDb()).collection('excel_imports'); }
export async function getFileUploads()  { return (await getDb()).collection('file_uploads'); }
export async function getDataSources()  { return (await getDb()).collection('data_sources'); }

// Analysis & Reporting
export async function getAnalysisResults(){ return (await getDb()).collection('analysis_results'); }
export async function getReports()      { return (await getDb()).collection('reports'); }
export async function getAnalytics()    { return (await getDb()).collection('analytics'); }
export async function getComparisons()  { return (await getDb()).collection('comparisons'); }
export async function getDashboards()   { return (await getDb()).collection('dashboards'); }

// Workflow & Approvals
export async function getApprovals()    { return (await getDb()).collection('approvals'); }
export async function getWorkflows()    { return (await getDb()).collection('workflows'); }
export async function getApprovalChains(){ return (await getDb()).collection('approval_chains'); }
export async function getReviewComments(){ return (await getDb()).collection('review_comments'); }

// Activity & Audit
export async function getAuditLogs()    { return (await getDb()).collection('audit_logs'); }
export async function getActivityLogs() { return (await getDb()).collection('activity_logs'); }
export async function getUserActivity() { return (await getDb()).collection('user_activity'); }
export async function getSystemLogs()   { return (await getDb()).collection('system_logs'); }

// Settings & Configuration
export async function getSettings()     { return (await getDb()).collection('settings'); }
export async function getConfigurations(){ return (await getDb()).collection('configurations'); }
export async function getPreferences()  { return (await getDb()).collection('user_preferences'); }
export async function getNotifications(){ return (await getDb()).collection('notifications'); }

// Projects & Tasks
export async function getProjects()     { return (await getDb()).collection('projects'); }
export async function getTasks()        { return (await getDb()).collection('tasks'); }
export async function getMilestones()   { return (await getDb()).collection('milestones'); }
export async function getDeliverables() { return (await getDb()).collection('deliverables'); }

// Standards & References
export async function getStandards()    { return (await getDb()).collection('standards'); }
export async function getReferences()   { return (await getDb()).collection('references'); }
export async function getCalculationMethods(){ return (await getDb()).collection('calculation_methods'); }
export async function getValidationRules(){ return (await getDb()).collection('validation_rules'); }

// Integration & External Systems
export async function getIntegrations() { return (await getDb()).collection('integrations'); }
export async function getApiKeys()      { return (await getDb()).collection('api_keys'); }
export async function getWebhooks()     { return (await getDb()).collection('webhooks'); }
export async function getExternalData() { return (await getDb()).collection('external_data'); }

// Backup & Archive
export async function getBackups()      { return (await getDb()).collection('backups'); }
export async function getArchives()     { return (await getDb()).collection('archives'); }
export async function getVersions()     { return (await getDb()).collection('versions'); }
export async function getSnapshots()    { return (await getDb()).collection('snapshots'); }
