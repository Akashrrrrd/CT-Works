/**
 * Seed Relay Templates Script
 * Populates the database with predefined relay templates
 */

const { MongoClient, ObjectId } = require('mongodb');
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

loadEnv();

const DB_NAME = process.env.DB_NAME || 'ct-adequacy';

async function getDb() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL environment variable is not set');
  
  const client = new MongoClient(uri);
  await client.connect();
  return client.db(DB_NAME);
}

const PREDEFINED_RELAY_TEMPLATES = [
  {
    name: 'RED670',
    manufacturer: 'ABB',
    model: 'Transformer Differential + Distance + Breaker Failure',
    type: 'DIFFERENTIAL',
    functions: {
      differential: true,
      distance: true,
      breakerFailure: true,
      overcurrent: false,
      directional: false
    },
    specifications: {
      ratedVoltage: 110,
      ratedCurrent: 5,
      frequency: 50,
      accuracy: 'Class 1',
      burden: 0.5
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    name: 'REB670',
    manufacturer: 'ABB',
    model: 'Busbar Differential Protection',
    type: 'DIFFERENTIAL',
    functions: {
      differential: true,
      distance: false,
      breakerFailure: false,
      overcurrent: false,
      directional: false
    },
    specifications: {
      ratedVoltage: 110,
      ratedCurrent: 5,
      frequency: 50,
      accuracy: 'Class 1',
      burden: 0.5
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    name: 'REF615',
    manufacturer: 'ABB',
    model: 'Feeder Differential Protection',
    type: 'DIFFERENTIAL',
    functions: {
      differential: true,
      distance: false,
      breakerFailure: false,
      overcurrent: true,
      directional: false
    },
    specifications: {
      ratedVoltage: 110,
      ratedCurrent: 5,
      frequency: 50,
      accuracy: 'Class 1',
      burden: 0.5
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    name: 'REL670',
    manufacturer: 'ABB',
    model: 'Line Distance Protection',
    type: 'DISTANCE',
    functions: {
      differential: false,
      distance: true,
      breakerFailure: false,
      overcurrent: true,
      directional: true
    },
    specifications: {
      ratedVoltage: 110,
      ratedCurrent: 5,
      frequency: 50,
      accuracy: 'Class 1',
      burden: 0.5
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    name: 'REQ650',
    manufacturer: 'ABB',
    model: 'Breaker Failure Protection',
    type: 'BREAKER_FAILURE',
    functions: {
      differential: false,
      distance: false,
      breakerFailure: true,
      overcurrent: true,
      directional: false
    },
    specifications: {
      ratedVoltage: 110,
      ratedCurrent: 5,
      frequency: 50,
      accuracy: 'Class 1',
      burden: 0.5
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    name: '7SJ85',
    manufacturer: 'SIEMENS',
    model: 'Multifunctional Protection Relay',
    type: 'OVERCURRENT',
    functions: {
      differential: false,
      distance: true,
      breakerFailure: true,
      overcurrent: true,
      directional: true
    },
    specifications: {
      ratedVoltage: 110,
      ratedCurrent: 5,
      frequency: 50,
      accuracy: 'Class 1',
      burden: 0.5
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    name: 'SEL-387E',
    manufacturer: 'SEL',
    model: 'Current Differential Relay',
    type: 'DIFFERENTIAL',
    functions: {
      differential: true,
      distance: false,
      breakerFailure: true,
      overcurrent: true,
      directional: false
    },
    specifications: {
      ratedVoltage: 125,
      ratedCurrent: 5,
      frequency: 60,
      accuracy: 'Class 1',
      burden: 0.2
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    name: 'SEL-421',
    manufacturer: 'SEL',
    model: 'Protection, Automation, and Control System',
    type: 'DISTANCE',
    functions: {
      differential: false,
      distance: true,
      breakerFailure: true,
      overcurrent: true,
      directional: true
    },
    specifications: {
      ratedVoltage: 125,
      ratedCurrent: 5,
      frequency: 60,
      accuracy: 'Class 1',
      burden: 0.2
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

async function seedRelayTemplates() {
  try {
    const db = await getDb();
    const relayTemplatesCollection = db.collection('relay_templates');
    
    console.log('🌱 Seeding predefined relay templates...');
    
    // Check if templates already exist
    const existingCount = await relayTemplatesCollection.countDocuments({
      workspaceId: { $exists: false } // Global templates
    });
    
    if (existingCount > 0) {
      console.log(`⚪ ${existingCount} global relay templates already exist. Skipping seed.`);
      return;
    }
    
    // Insert predefined templates (without workspaceId to make them global)
    const result = await relayTemplatesCollection.insertMany(PREDEFINED_RELAY_TEMPLATES);
    
    console.log(`✅ Successfully seeded ${result.insertedCount} relay templates`);
    
    // List the seeded templates
    console.log('\n📋 Seeded Templates:');
    PREDEFINED_RELAY_TEMPLATES.forEach((template, index) => {
      const functions = Object.entries(template.functions)
        .filter(([_, enabled]) => enabled)
        .map(([func, _]) => func)
        .join(', ');
      
      console.log(`  ${index + 1}. ${template.manufacturer} ${template.name} - ${functions}`);
    });
    
    console.log('\n🎉 Relay templates seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to seed relay templates:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedRelayTemplates();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedRelayTemplates };