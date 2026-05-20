/**
 * Database Setup CLI
 * Usage: npm run db:init | npm run db:reset | npm run db:drop
 */

import { initializeDatabase, dropDatabase, resetDatabase } from '../lib/database/init';

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'init':
        console.log('🚀 Initializing database...');
        const result = await initializeDatabase();
        console.log('\n📊 Initialization Summary:');
        console.log(`✅ Collections created: ${result.collections}`);
        console.log(`✅ Indexes created: ${result.indexes}`);
        console.log(`✅ Database size: ${(result.stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
        break;

      case 'drop':
        console.log('⚠️  Are you sure you want to drop the entire database?');
        console.log('This action cannot be undone!');
        
        // In a real CLI, you'd want to add confirmation prompt
        if (process.env.NODE_ENV === 'development') {
          await dropDatabase();
        } else {
          console.log('❌ Database drop is only allowed in development environment');
          process.exit(1);
        }
        break;

      case 'reset':
        console.log('🔄 Resetting database (drop + init)...');
        if (process.env.NODE_ENV === 'development') {
          await resetDatabase();
        } else {
          console.log('❌ Database reset is only allowed in development environment');
          process.exit(1);
        }
        break;

      case 'status':
        console.log('📊 Checking database status...');
        const { getDb } = await import('../lib/db');
        const db = await getDb();
        const stats = await db.stats();
        const collections = await db.listCollections().toArray();
        
        console.log(`\n📊 Database Status:`);
        console.log(`Database: ${stats.db}`);
        console.log(`Collections: ${collections.length}`);
        console.log(`Documents: ${stats.objects}`);
        console.log(`Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
        
        console.log(`\n📁 Collections:`);
        collections.forEach(col => {
          console.log(`  - ${col.name}`);
        });
        break;

      default:
        console.log(`
🗄️  CT/VT Adequacy Analysis - Database Management CLI

Usage:
  npm run db:init     - Initialize database with collections and indexes
  npm run db:drop     - Drop entire database (dev only)
  npm run db:reset    - Reset database (drop + init) (dev only)
  npm run db:status   - Show database status and collections

Examples:
  npm run db:init
  npm run db:status
  npm run db:reset
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