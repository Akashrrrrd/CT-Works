import { MongoClient, Db, ObjectId } from 'mongodb';

const uri = process.env.DATABASE_URL!;
const DB_NAME = process.env.DB_NAME || 'ct-adequacy';

if (!uri) throw new Error('DATABASE_URL environment variable is not set');

// Reuse client across hot-reloads in dev
const globalForMongo = global as unknown as { _mongoClient?: MongoClient };

let client: MongoClient;

if (process.env.NODE_ENV === 'development') {
  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(uri);
  }
  client = globalForMongo._mongoClient;
} else {
  client = new MongoClient(uri);
}

export async function getDb(): Promise<Db> {
  await client.connect();
  return client.db(DB_NAME);
}

export { ObjectId };

// ── Collection helpers ────────────────────────────────────────────────────────

export async function getUsers()        { return (await getDb()).collection('users'); }
export async function getOrgs()         { return (await getDb()).collection('organizations'); }
export async function getWorkspaces()   { return (await getDb()).collection('workspaces'); }
export async function getTemplates()    { return (await getDb()).collection('templates'); }
export async function getComputations() { return (await getDb()).collection('computations'); }
export async function getAuditLogs()    { return (await getDb()).collection('audit_logs'); }
export async function getApprovals()    { return (await getDb()).collection('approvals'); }
export async function getSubstations()  { return (await getDb()).collection('substations'); }
export async function getBays()         { return (await getDb()).collection('bays'); }
export async function getIEDs()         { return (await getDb()).collection('ieds'); }
export async function getRelayFormulas(){ return (await getDb()).collection('relay_formulas'); }
export async function getProjects()     { return (await getDb()).collection('projects'); }
