const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    });
  }
}

loadEnv();

const DB_NAME = process.env.DB_NAME || 'ct-adequacy';
const URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/ct-adequacy';

async function updateWorkspaces() {
  let client;
  try {
    console.log(`Connecting to MongoDB at ${URI}...`);
    client = new MongoClient(URI, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    const db = client.db(DB_NAME);
    const workspacesCollection = db.collection('workspaces');

    const result = await workspacesCollection.updateMany(
      {
        $or: [
          { name: { $regex: /df5w|33kv|substation/i } },
          { description: { $regex: /df5w|199571|cable feeders|contract/i } }
        ]
      },
      {
        $set: {
          name: '2026 CT/VT Adequacy Check',
          description: '',
          updatedAt: new Date()
        }
      }
    );

    console.log(`Successfully updated ${result.modifiedCount} workspace documents in MongoDB.`);
  } catch (err) {
    console.log('MongoDB connection/update status:', err.message);
  } finally {
    if (client) await client.close();
  }
}

updateWorkspaces();
