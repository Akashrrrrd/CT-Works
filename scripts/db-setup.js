/**
 * Database Setup CLI (JavaScript version)
 * Usage: node scripts/db-setup.js init
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
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
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  }
}

// Load environment variables
loadEnv();

const DB_NAME = process.env.DB_NAME || 'ct-adequacy';

async function getDb() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL environment variable is not set');
  
  const client = new MongoClient(uri);
  await client.connect();
  return client.db(DB_NAME);
}

async function initializeDatabase() {
  const db = await getDb();
  
  console.log('🚀 Initializing CT/VT Adequacy Analysis Database...');

  // Collections to create
  const collections = [
    // Core System Collections
    'users', 'organizations', 'workspaces',
    // Authentication & Authorization
    'sessions', 'refresh_tokens', 'user_roles', 'permissions',
    // CT/VT Analysis Features
    'templates', 'computations', 'relay_formulas', 'relay_templates', 'vt_checks', 'ct_checks',
    // Infrastructure & Equipment
    'substations', 'bays', 'ieds', 'equipment', 'cables', 'transformers',
    // Data Import & Processing
    'import_jobs', 'excel_imports', 'file_uploads', 'data_sources',
    // Analysis & Reporting
    'analysis_results', 'reports', 'analytics', 'comparisons', 'dashboards',
    // Workflow & Approvals
    'approvals', 'workflows', 'approval_chains', 'review_comments',
    // Activity & Audit
    'audit_logs', 'activity_logs', 'user_activity', 'system_logs',
    // Settings & Configuration
    'settings', 'configurations', 'user_preferences', 'notifications',
    // Projects & Tasks
    'projects', 'tasks', 'milestones', 'deliverables',
    // Standards & References
    'standards', 'references', 'calculation_methods', 'validation_rules',
    // Integration & External Systems
    'integrations', 'api_keys', 'webhooks', 'external_data',
    // Backup & Archive
    'backups', 'archives', 'versions', 'snapshots'
  ];

  // Create collections if they don't exist
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map(c => c.name);

  let createdCount = 0;
  for (const collectionName of collections) {
    if (!existingNames.includes(collectionName)) {
      await db.createCollection(collectionName);
      console.log(`✅ Created collection: ${collectionName}`);
      createdCount++;
    } else {
      console.log(`⚪ Collection already exists: ${collectionName}`);
    }
  }

  // Create basic indexes
  console.log('\n📊 Creating database indexes...');
  
  const indexes = [
    { collection: 'users', index: { email: 1 } },
    { collection: 'workspaces', index: { organizationId: 1 } },
    { collection: 'computations', index: { workspaceId: 1 } },
    { collection: 'computations', index: { createdAt: -1 } },
    { collection: 'templates', index: { workspaceId: 1 } },
    { collection: 'substations', index: { workspaceId: 1 } },
    { collection: 'audit_logs', index: { workspaceId: 1 } },
    { collection: 'audit_logs', index: { createdAt: -1 } },
    { collection: 'approvals', index: { workspaceId: 1 } },
    { collection: 'approvals', index: { status: 1 } }
  ];

  let indexCount = 0;
  for (const { collection: collectionName, index } of indexes) {
    try {
      const collection = db.collection(collectionName);
      await collection.createIndex(index);
      console.log(`✅ Created index on ${collectionName}:`, index);
      indexCount++;
    } catch (error) {
      console.log(`⚠️  Index already exists on ${collectionName}:`, index);
    }
  }

  // Get database stats
  const stats = await db.stats();
  
  console.log('\n🎉 Database initialization completed successfully!');
  console.log(`📊 Database: ${stats.db}`);
  console.log(`📁 Collections: ${collections.length}`);
  console.log(`📄 Documents: ${stats.objects}`);
  console.log(`💾 Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
  
  return {
    success: true,
    collections: collections.length,
    created: createdCount,
    indexes: indexCount,
    stats
  };
}

async function checkStatus() {
  const db = await getDb();
  const stats = await db.stats();
  const collections = await db.listCollections().toArray();
  
  console.log(`📊 Database Status:`);
  console.log(`Database: ${stats.db}`);
  console.log(`Collections: ${collections.length}`);
  console.log(`Documents: ${stats.objects}`);
  console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
  
  console.log(`\n📁 Collections:`);
  collections.forEach(col => {
    console.log(`  - ${col.name}`);
  });
}

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'init':
        console.log('🚀 Initializing database...');
        const result = await initializeDatabase();
        console.log('\n📊 Initialization Summary:');
        console.log(`✅ Total collections: ${result.collections}`);
        console.log(`✅ Collections created: ${result.created}`);
        console.log(`✅ Indexes created: ${result.indexes}`);
        break;

      case 'status':
        console.log('📊 Checking database status...');
        await checkStatus();
        break;

      default:
        console.log(`
🗄️  CT/VT Adequacy Analysis - Database Management CLI

Usage:
  node scripts/db-setup.js init     - Initialize database with collections and indexes
  node scripts/db-setup.js status   - Show database status and collections

Examples:
  node scripts/db-setup.js init
  node scripts/db-setup.js status
        `);
        break;
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Database operation failed:', error);
    process.exit(1);
  }
}

main();