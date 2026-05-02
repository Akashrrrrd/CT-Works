import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const lines = readFileSync(resolve(__dir, '../.env'), 'utf8').split('\n');
  for (const line of lines) {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
} catch {}

const client = new MongoClient(process.env.DATABASE_URL);
await client.connect();
const users = client.db(process.env.DB_NAME || 'ct-adequacy').collection('users');

await users.updateOne({ email: 'engineer@ct-adequacy.app' }, { $set: { employeeId: 'ENG-001' } });
await users.updateOne({ email: 'admin@ct-adequacy.app' },    { $set: { employeeId: 'ADM-001' } });
await users.updateOne({ email: 'manager@ct-adequacy.app' },  { $set: { employeeId: 'MGR-001' } });

console.log('Done. Employee IDs assigned:');
const all = await users.find({}).toArray();
all.forEach(u => console.log(' ', u.employeeId, '|', u.name, '|', u.role));
await client.close();
