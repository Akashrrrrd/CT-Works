/**
 * Database Initialization Script
 * Creates all collections and indexes for the CT/VT Adequacy Analysis Platform
 */

import { getDb } from '../db';
import { DATABASE_INDEXES } from './schemas';

export async function initializeDatabase() {
  const db = await getDb();
  
  console.log('🚀 Initializing CT/VT Adequacy Analysis Database...');

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE ALL COLLECTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  const collections = [
    // Core System Collections
    'users',
    'organizations', 
    'workspaces',

    // Authentication & Authorization
    'sessions',
    'refresh_tokens',
    'user_roles',
    'permissions',

    // CT/VT Analysis Features
    'templates',
    'computations',
    'relay_formulas',
    'relay_templates',
    'vt_checks',
    'ct_checks',

    // Infrastructure & Equipment
    'substations',
    'bays',
    'ieds',
    'equipment',
    'cables',
    'transformers',

    // Data Import & Processing
    'import_jobs',
    'excel_imports',
    'file_uploads',
    'data_sources',

    // Analysis & Reporting
    'analysis_results',
    'reports',
    'analytics',
    'comparisons',
    'dashboards',

    // Workflow & Approvals
    'approvals',
    'workflows',
    'approval_chains',
    'review_comments',

    // Activity & Audit
    'audit_logs',
    'activity_logs',
    'user_activity',
    'system_logs',

    // Settings & Configuration
    'settings',
    'configurations',
    'user_preferences',
    'notifications',

    // Projects & Tasks
    'projects',
    'tasks',
    'milestones',
    'deliverables',

    // Standards & References
    'standards',
    'references',
    'calculation_methods',
    'validation_rules',

    // Integration & External Systems
    'integrations',
    'api_keys',
    'webhooks',
    'external_data',

    // Backup & Archive
    'backups',
    'archives',
    'versions',
    'snapshots'
  ];

  // Create collections if they don't exist
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map(c => c.name);

  for (const collectionName of collections) {
    if (!existingNames.includes(collectionName)) {
      await db.createCollection(collectionName);
      console.log(`✅ Created collection: ${collectionName}`);
    } else {
      console.log(`⚪ Collection already exists: ${collectionName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE INDEXES FOR PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('\n📊 Creating database indexes...');

  for (const [collectionName, indexes] of Object.entries(DATABASE_INDEXES)) {
    const collection = db.collection(collectionName);
    
    for (const index of indexes) {
      try {
        await collection.createIndex(index);
        console.log(`✅ Created index on ${collectionName}:`, index);
      } catch (error) {
        console.log(`⚠️  Index already exists on ${collectionName}:`, index);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE ADDITIONAL PERFORMANCE INDEXES
  // ═══════════════════════════════════════════════════════════════════════════════

  const additionalIndexes = [
    // Text search indexes
    { collection: 'substations', index: { name: 'text', 'location.address': 'text' } },
    { collection: 'templates', index: { name: 'text', description: 'text' } },
    { collection: 'relay_templates', index: { name: 'text', manufacturer: 'text', model: 'text' } },
    { collection: 'ieds', index: { name: 'text', manufacturer: 'text', model: 'text' } },
    
    // Compound indexes for common queries
    { collection: 'computations', index: { workspaceId: 1, approvalStatus: 1, createdAt: -1 } },
    { collection: 'activity_logs', index: { workspaceId: 1, userId: 1, timestamp: -1 } },
    { collection: 'notifications', index: { userId: 1, isRead: 1, createdAt: -1 } },
    { collection: 'approvals', index: { workspaceId: 1, approver: 1, status: 1 } },
    
    // Geospatial indexes
    { collection: 'substations', index: { 'location.coordinates': '2dsphere' } },
    
    // TTL indexes for cleanup
    { collection: 'sessions', index: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
    { collection: 'refresh_tokens', index: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
    { collection: 'notifications', index: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } }
  ];

  for (const { collection: collectionName, index, options } of additionalIndexes) {
    try {
      const collection = db.collection(collectionName);
      await collection.createIndex(index, options);
      console.log(`✅ Created special index on ${collectionName}:`, index);
    } catch (error) {
      console.log(`⚠️  Special index already exists on ${collectionName}:`, index);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEED DEFAULT DATA
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('\n🌱 Seeding default data...');

  // Default permissions
  const permissionsCollection = db.collection('permissions');
  const defaultPermissions = [
    { name: 'CREATE_COMPUTATION', resource: 'computation', action: 'CREATE', description: 'Create new CT/VT computations' },
    { name: 'VIEW_COMPUTATION', resource: 'computation', action: 'READ', description: 'View computations' },
    { name: 'APPROVE_COMPUTATION', resource: 'computation', action: 'UPDATE', description: 'Approve/reject computations' },
    { name: 'DELETE_COMPUTATION', resource: 'computation', action: 'DELETE', description: 'Delete computations' },
    { name: 'MANAGE_TEMPLATES', resource: 'template', action: 'CREATE', description: 'Manage relay templates' },
    { name: 'MANAGE_SUBSTATIONS', resource: 'substation', action: 'CREATE', description: 'Manage substation data' },
    { name: 'VIEW_ANALYTICS', resource: 'analytics', action: 'READ', description: 'View analytics and reports' },
    { name: 'MANAGE_USERS', resource: 'user', action: 'CREATE', description: 'Manage workspace users' },
    { name: 'MANAGE_SETTINGS', resource: 'settings', action: 'UPDATE', description: 'Manage workspace settings' }
  ];

  for (const permission of defaultPermissions) {
    await permissionsCollection.updateOne(
      { name: permission.name },
      { $setOnInsert: permission },
      { upsert: true }
    );
  }

  // Default calculation methods
  const calculationMethodsCollection = db.collection('calculation_methods');
  const defaultMethods = [
    {
      name: 'IEC_61869_2',
      standard: 'IEC',
      description: 'IEC 61869-2 Current Transformer Standard',
      version: '2012',
      formulas: {
        differential: 'Ealreq = If × (Rct + Rl + Rb)',
        distance: 'Ealreq = If × (Rct + Rl + Rb)',
        breaker_failure: 'Ealreq = 5 × If × (Rct + Rl + Rb)'
      }
    },
    {
      name: 'IEEE_C37_110',
      standard: 'IEEE',
      description: 'IEEE C37.110 Current Transformer Standard',
      version: '2007',
      formulas: {
        differential: 'Ealreq = If × (Rct + Rl + Rb)',
        distance: 'Ealreq = If × (Rct + Rl + Rb)',
        breaker_failure: 'Ealreq = 5 × If × (Rct + Rl + Rb)'
      }
    }
  ];

  for (const method of defaultMethods) {
    await calculationMethodsCollection.updateOne(
      { name: method.name },
      { $setOnInsert: method },
      { upsert: true }
    );
  }

  // Default standards
  const standardsCollection = db.collection('standards');
  const defaultStandards = [
    { code: 'IEC_61869_2', name: 'IEC 61869-2', description: 'Instrument transformers - Current transformers', version: '2012' },
    { code: 'IEC_61869_3', name: 'IEC 61869-3', description: 'Instrument transformers - Voltage transformers', version: '2011' },
    { code: 'IEEE_C37_110', name: 'IEEE C37.110', description: 'Guide for the Application of Current Transformers', version: '2007' },
    { code: 'IEEE_C57_13', name: 'IEEE C57.13', description: 'Standard Requirements for Instrument Transformers', version: '2016' }
  ];

  for (const standard of defaultStandards) {
    await standardsCollection.updateOne(
      { code: standard.code },
      { $setOnInsert: standard },
      { upsert: true }
    );
  }

  console.log('✅ Default data seeded successfully');

  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDATION AND HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('\n🔍 Running database health check...');

  const stats = await db.stats();
  console.log(`📊 Database: ${stats.db}`);
  console.log(`📁 Collections: ${stats.collections}`);
  console.log(`📄 Documents: ${stats.objects}`);
  console.log(`💾 Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🗂️  Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n🎉 Database initialization completed successfully!');
  
  return {
    success: true,
    collections: collections.length,
    indexes: Object.values(DATABASE_INDEXES).flat().length + additionalIndexes.length,
    stats
  };
}

export async function dropDatabase() {
  const db = await getDb();
  console.log('⚠️  Dropping entire database...');
  await db.dropDatabase();
  console.log('✅ Database dropped successfully');
}

export async function resetDatabase() {
  console.log('🔄 Resetting database...');
  await dropDatabase();
  await initializeDatabase();
  console.log('✅ Database reset completed');
}