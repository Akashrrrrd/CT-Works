/**
 * Selective Data Cleanup Script
 * Allows selective removal of specific data types
 * Usage: 
 *   node scripts/selective-cleanup.js --all
 *   node scripts/selective-cleanup.js --templates --relays
 *   node scripts/selective-cleanup.js --infrastructure --computations
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
  return { client, db: client.db(DB_NAME) };
}

// Define cleanup categories
const CLEANUP_CATEGORIES = {
  templates: {
    name: 'Templates & Relay Configurations',
    collections: ['templates', 'relay_templates', 'relay_formulas']
  },
  relays: {
    name: 'Relay & IED Data',
    collections: ['ieds', 'relay_templates', 'relay_formulas']
  },
  infrastructure: {
    name: 'Substations, Bays & Equipment',
    collections: ['substations', 'bays', 'bay_types', 'equipment', 'cables', 'transformers']
  },
  computations: {
    name: 'Analysis & Computation Results',
    collections: ['computations', 'analysis_results', 'vt_checks', 'ct_checks']
  },
  projects: {
    name: 'Projects & Tasks',
    collections: ['projects', 'tasks', 'milestones', 'deliverables']
  },
  imports: {
    name: 'Import & Upload Data',
    collections: ['import_jobs', 'excel_imports', 'file_uploads', 'data_sources']
  },
  reports: {
    name: 'Reports & Analytics',
    collections: ['reports', 'analytics', 'comparisons', 'dashboards']
  },
  approvals: {
    name: 'Workflow & Approvals',
    collections: ['approvals', 'workflows', 'approval_chains', 'review_comments']
  }
};

async function cleanupCategory(db, categoryKey) {
  const category = CLEANUP_CATEGORIES[categoryKey];
  if (!category) {
    console.log(`❌ Unknown category: ${categoryKey}`);
    return 0;
  }
  
  console.log(`\n🧹 Cleaning up ${category.name}...`);
  let totalDeleted = 0;
  
  for (const collectionName of category.collections) {
    try {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      
      if (count > 0) {
        const result = await collection.deleteMany({});
        totalDeleted += result.deletedCount;
        console.log(`  ✅ Cleared ${collectionName}: ${result.deletedCount} documents`);
      } else {
        console.log(`  ⚪ ${collectionName}: already empty`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to clear ${collectionName}:`, error.message);
    }
  }
  
  return totalDeleted;
}

async function selectiveCleanup() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🧹 Selective Data Cleanup Tool\n');
    console.log('Available options:');
    console.log('  --all                    Clean all data (equivalent to full cleanup)');
    console.log('  --templates             Clean templates & relay configurations');
    console.log('  --relays                Clean relay & IED data');
    console.log('  --infrastructure        Clean substations, bays & equipment'); 
    console.log('  --computations          Clean analysis & computation results');
    console.log('  --projects              Clean projects & tasks');
    console.log('  --imports               Clean import & upload data');
    console.log('  --reports               Clean reports & analytics');
    console.log('  --approvals             Clean workflow & approvals\n');
    console.log('Examples:');
    console.log('  node scripts/selective-cleanup.js --templates --relays');
    console.log('  node scripts/selective-cleanup.js --infrastructure');
    console.log('  node scripts/selective-cleanup.js --all');
    return;
  }
  
  const { client, db } = await getDb();
  
  try {
    console.log('🧹 Starting selective data cleanup...');
    
    let totalDeleted = 0;
    
    if (args.includes('--all')) {
      // Clean all categories
      for (const categoryKey of Object.keys(CLEANUP_CATEGORIES)) {
        totalDeleted += await cleanupCategory(db, categoryKey);
      }
    } else {
      // Clean selected categories
      for (const arg of args) {
        const categoryKey = arg.replace('--', '');
        totalDeleted += await cleanupCategory(db, categoryKey);
      }
    }
    
    console.log('\n🎉 Selective cleanup completed successfully!');
    console.log(`📊 Total documents deleted: ${totalDeleted}`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Check if script is run directly
if (require.main === module) {
  selectiveCleanup()
    .then(() => {
      console.log('\n🚀 Cleanup completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { selectiveCleanup, CLEANUP_CATEGORIES };