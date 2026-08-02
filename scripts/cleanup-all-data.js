/**
 * Comprehensive Data Cleanup Script
 * Removes all data, templates, relays, IEDs, and bays from the system
 * Usage: node scripts/cleanup-all-data.js
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

async function cleanupAllData() {
 const { client, db } = await getDb();
 
 try {
 console.log('🧹 Starting comprehensive data cleanup...');
 console.log('⚠️ This will remove ALL data, templates, relays, IEDs, and bays');
 
 // Collections to completely clear
 const collectionsToCleanup = [
 // Core data entities
 'templates',
 'relay_templates', 
 'relay_formulas',
 'substations',
 'bays',
 'bay_types',
 'ieds',
 'equipment',
 'cables',
 'transformers',
 
 // Analysis and computation data
 'computations',
 'analysis_results',
 'vt_checks',
 'ct_checks',
 'reports',
 'analytics',
 'comparisons',
 'dashboards',
 
 // Import and processing data
 'import_jobs',
 'excel_imports',
 'file_uploads',
 'data_sources',
 
 // Projects and tasks
 'projects',
 'tasks',
 'milestones',
 'deliverables',
 
 // Standards and references
 'standards',
 'references',
 'calculation_methods',
 'validation_rules',
 
 // Workflow and approvals
 'approvals',
 'workflows',
 'approval_chains',
 'review_comments',
 
 // External data
 'external_data',
 'integrations',
 'webhooks'
 ];
 
 // Collections to preserve (keep user accounts, organizations, workspaces)
 const preserveCollections = [
 'users',
 'organizations', 
 'workspaces',
 'sessions',
 'refresh_tokens',
 'user_roles',
 'permissions',
 'settings',
 'configurations',
 'user_preferences',
 'notifications',
 'audit_logs',
 'activity_logs',
 'user_activity',
 'system_logs',
 'api_keys',
 'backups',
 'archives',
 'versions',
 'snapshots'
 ];
 
 let totalDeleted = 0;
 
 // Clean up each collection
 for (const collectionName of collectionsToCleanup) {
 try {
 const collection = db.collection(collectionName);
 const count = await collection.countDocuments();
 
 if (count > 0) {
 const result = await collection.deleteMany({});
 totalDeleted += result.deletedCount;
 console.log(`✅ Cleared ${collectionName}: ${result.deletedCount} documents`);
 } else {
 console.log(`⚪ ${collectionName}: already empty`);
 }
 } catch (error) {
 console.log(`❌ Failed to clear ${collectionName}:`, error.message);
 }
 }
 
 // Show preserved collections for confirmation
 console.log('\n📋 Preserved collections (users, workspaces, etc.):');
 for (const collectionName of preserveCollections) {
 try {
 const collection = db.collection(collectionName);
 const count = await collection.countDocuments();
 console.log(` ${collectionName}: ${count} documents preserved`);
 } catch (error) {
 console.log(` ${collectionName}: collection not found`);
 }
 }
 
 console.log('\n🎉 Cleanup completed successfully!');
 console.log(`📊 Total documents deleted: ${totalDeleted}`);
 console.log('✅ All data, templates, relays, IEDs, and bays have been removed');
 console.log('✅ User accounts, workspaces, and system settings preserved');
 
 } catch (error) {
 console.error('❌ Cleanup failed:', error);
 throw error;
 } finally {
 await client.close();
 }
}

// Check if script is run directly
if (require.main === module) {
 cleanupAllData()
 .then(() => {
 console.log('\n🚀 Ready for fresh data setup!');
 process.exit(0);
 })
 .catch(error => {
 console.error('💥 Cleanup failed:', error);
 process.exit(1);
 });
}

module.exports = { cleanupAllData };