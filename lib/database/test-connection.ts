/**
 * Database Connection Test
 * Tests MongoDB connection and basic operations
 */

import { getDb, getUsers, getWorkspaces, getComputations } from '../db';

export async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const db = await getDb();
    const stats = await db.stats();
    console.log(`✅ Connected to database: ${stats.db}`);
    console.log(`📁 Collections: ${stats.collections}`);
    console.log(`📄 Documents: ${stats.objects}`);
    
    // Test collection access
    const usersCollection = await getUsers();
    const userCount = await usersCollection.countDocuments();
    console.log(`👥 Users collection: ${userCount} documents`);
    
    const workspacesCollection = await getWorkspaces();
    const workspaceCount = await workspacesCollection.countDocuments();
    console.log(`🏢 Workspaces collection: ${workspaceCount} documents`);
    
    const computationsCollection = await getComputations();
    const computationCount = await computationsCollection.countDocuments();
    console.log(`🧮 Computations collection: ${computationCount} documents`);
    
    // Test a simple query
    const sampleUser = await usersCollection.findOne({});
    if (sampleUser) {
      console.log(`👤 Sample user found: ${sampleUser.email}`);
    } else {
      console.log('👤 No users found in database');
    }
    
    console.log('✅ Database connection test completed successfully!');
    
    return {
      success: true,
      stats: {
        database: stats.db,
        collections: stats.collections,
        documents: stats.objects,
        users: userCount,
        workspaces: workspaceCount,
        computations: computationCount
      }
    };
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function testCollectionOperations() {
  try {
    console.log('🧪 Testing collection operations...');
    
    const usersCollection = await getUsers();
    
    // Test insert
    const testUser = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      role: 'ENGINEER' as const,
      organizationId: new (await import('mongodb')).ObjectId(),
      isActive: true,
      preferences: {
        theme: 'light' as const,
        language: 'en',
        timezone: 'UTC',
        notifications: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if test user already exists
    const existingUser = await usersCollection.findOne({ email: testUser.email });
    if (!existingUser) {
      const insertResult = await usersCollection.insertOne(testUser);
      console.log(`✅ Test user inserted with ID: ${insertResult.insertedId}`);
      
      // Clean up - delete the test user
      await usersCollection.deleteOne({ _id: insertResult.insertedId });
      console.log('🧹 Test user cleaned up');
    } else {
      console.log('⚪ Test user already exists, skipping insert test');
    }
    
    console.log('✅ Collection operations test completed successfully!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Collection operations test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}