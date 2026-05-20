/**
 * Comprehensive Sample Data Seeding Script
 * Populates the database with realistic sample data for all features
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

async function seedSampleData() {
  try {
    const db = await getDb();
    console.log('🌱 Seeding comprehensive sample data...');

    // Create sample organization
    const organizationsCollection = db.collection('organizations');
    const existingOrg = await organizationsCollection.findOne({ name: 'Hitachi Energy' });
    
    let organizationId;
    if (!existingOrg) {
      const orgResult = await organizationsCollection.insertOne({
        name: 'Hitachi Energy',
        domain: 'hitachienergy.com',
        logo: null,
        address: {
          street: '123 Power Grid Avenue',
          city: 'Zurich',
          state: 'ZH',
          country: 'Switzerland',
          zipCode: '8050'
        },
        settings: {
          defaultStandard: 'IEC',
          defaultCurrency: 'CHF',
          workingHours: {
            start: '08:00',
            end: '17:00',
            timezone: 'Europe/Zurich'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      organizationId = orgResult.insertedId;
      console.log('✅ Created sample organization');
    } else {
      organizationId = existingOrg._id;
      console.log('⚪ Organization already exists');
    }

    // Create sample users
    const usersCollection = db.collection('users');
    const existingUsers = await usersCollection.countDocuments({ organizationId });
    
    if (existingUsers === 0) {
      const sampleUsers = [
        {
          email: 'john.smith@hitachienergy.com',
          name: 'John Smith',
          password: '$2a$10$example.hash.for.password123', // In real app, properly hash passwords
          role: 'ENGINEER',
          organizationId,
          isActive: true,
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          preferences: {
            theme: 'light',
            language: 'en',
            timezone: 'Europe/Zurich',
            notifications: true
          },
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          updatedAt: new Date()
        },
        {
          email: 'sarah.johnson@hitachienergy.com',
          name: 'Sarah Johnson',
          password: '$2a$10$example.hash.for.password123',
          role: 'ADMIN',
          organizationId,
          isActive: true,
          lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          preferences: {
            theme: 'dark',
            language: 'en',
            timezone: 'Europe/Zurich',
            notifications: true
          },
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        {
          email: 'mike.chen@hitachienergy.com',
          name: 'Mike Chen',
          password: '$2a$10$example.hash.for.password123',
          role: 'MANAGER',
          organizationId,
          isActive: true,
          lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          preferences: {
            theme: 'system',
            language: 'en',
            timezone: 'Asia/Singapore',
            notifications: false
          },
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        {
          email: 'emma.wilson@hitachienergy.com',
          name: 'Emma Wilson',
          password: '$2a$10$example.hash.for.password123',
          role: 'ENGINEER',
          organizationId,
          isActive: true,
          lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          preferences: {
            theme: 'light',
            language: 'en',
            timezone: 'America/New_York',
            notifications: true
          },
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      ];

      const userResult = await usersCollection.insertMany(sampleUsers);
      console.log(`✅ Created ${userResult.insertedCount} sample users`);
    } else {
      console.log('⚪ Users already exist');
    }

    // Get user IDs for references
    const users = await usersCollection.find({ organizationId }).toArray();
    const userIds = users.map(u => u._id);

    // Create sample workspace
    const workspacesCollection = db.collection('workspaces');
    const existingWorkspace = await workspacesCollection.findOne({ organizationId });
    
    let workspaceId;
    if (!existingWorkspace) {
      const workspaceResult = await workspacesCollection.insertOne({
        name: 'Main Substation Analysis',
        description: 'Primary workspace for CT/VT adequacy analysis projects',
        organizationId,
        ownerId: userIds[1], // Sarah Johnson (Admin)
        members: [
          { userId: userIds[0], role: 'EDITOR', joinedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
          { userId: userIds[1], role: 'ADMIN', joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          { userId: userIds[2], role: 'VIEWER', joinedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
          { userId: userIds[3], role: 'EDITOR', joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }
        ],
        settings: {
          isPublic: false,
          allowExternalSharing: false,
          defaultApprovalWorkflow: null
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      });
      workspaceId = workspaceResult.insertedId;
      console.log('✅ Created sample workspace');
    } else {
      workspaceId = existingWorkspace._id;
      console.log('⚪ Workspace already exists');
    }

    // Create sample substations
    const substationsCollection = db.collection('substations');
    const existingSubstations = await substationsCollection.countDocuments({ workspaceId });
    
    if (existingSubstations === 0) {
      const sampleSubstations = [
        {
          workspaceId,
          name: 'Central Substation 132kV',
          location: {
            address: 'Industrial District, Zurich, Switzerland',
            coordinates: { latitude: 47.3769, longitude: 8.5417 }
          },
          voltageLevel: 132,
          type: 'TRANSMISSION',
          configuration: 'DOUBLE_BUS',
          bays: [],
          createdBy: userIds[0],
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        {
          workspaceId,
          name: 'Distribution Hub 33kV',
          location: {
            address: 'City Center, Zurich, Switzerland',
            coordinates: { latitude: 47.3667, longitude: 8.5500 }
          },
          voltageLevel: 33,
          type: 'DISTRIBUTION',
          configuration: 'SINGLE_BUS',
          bays: [],
          createdBy: userIds[3],
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        {
          workspaceId,
          name: 'Industrial Feeder 11kV',
          location: {
            address: 'Manufacturing Zone, Winterthur, Switzerland',
            coordinates: { latitude: 47.5000, longitude: 8.7500 }
          },
          voltageLevel: 11,
          type: 'INDUSTRIAL',
          configuration: 'RING',
          bays: [],
          createdBy: userIds[0],
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      ];

      const substationResult = await substationsCollection.insertMany(sampleSubstations);
      console.log(`✅ Created ${substationResult.insertedCount} sample substations`);
    } else {
      console.log('⚪ Substations already exist');
    }

    // Create sample templates (if not already created by relay templates seeding)
    const templatesCollection = db.collection('templates');
    const existingTemplates = await templatesCollection.countDocuments({ workspaceId });
    
    if (existingTemplates === 0) {
      const sampleTemplates = [
        {
          workspaceId,
          name: 'ABB RED670 Analysis',
          description: 'Standard template for ABB RED670 transformer differential protection',
          relay: 'ABB',
          iedType: 'tpl-red670',
          functions: ['differential', 'distance', 'breaker_failure'],
          parameters: {
            ct_ratio_primary: { type: 'number', default: 1000, required: true },
            ct_ratio_secondary: { type: 'number', default: 5, required: true },
            accuracy_class: { type: 'string', default: '5P20', required: true },
            rct: { type: 'number', default: 2.5, required: true },
            vk_available: { type: 'number', default: 800, required: true }
          },
          createdBy: userIds[1],
          createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        {
          workspaceId,
          name: 'Siemens 7SJ85 Analysis',
          description: 'Template for Siemens 7SJ85 multifunctional protection relay',
          relay: 'SIEMENS',
          iedType: 'tpl-7sj85',
          functions: ['distance', 'overcurrent', 'directional'],
          parameters: {
            ct_ratio_primary: { type: 'number', default: 800, required: true },
            ct_ratio_secondary: { type: 'number', default: 1, required: true },
            accuracy_class: { type: 'string', default: '5P10', required: true },
            rct: { type: 'number', default: 1.8, required: true },
            vk_available: { type: 'number', default: 600, required: true }
          },
          createdBy: userIds[0],
          createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      ];

      const templateResult = await templatesCollection.insertMany(sampleTemplates);
      console.log(`✅ Created ${templateResult.insertedCount} sample templates`);
    } else {
      console.log('⚪ Templates already exist');
    }

    // Get template IDs for computations
    const templates = await templatesCollection.find({ workspaceId }).toArray();

    // Create sample computations
    const computationsCollection = db.collection('computations');
    const existingComputations = await computationsCollection.countDocuments({ workspaceId });
    
    if (existingComputations === 0 && templates.length > 0) {
      const sampleComputations = [
        {
          workspaceId,
          templateId: templates[0]._id,
          templateName: templates[0].name,
          iedType: templates[0].iedType,
          sheet1: {
            ct_ratio_primary: 1000,
            ct_ratio_secondary: 5,
            accuracy_class: '5P20',
            rct: 2.5,
            vk_available: 800,
            io_at_vk: 0.02
          },
          sheet2: {
            frequency: 50,
            bus_voltage_kv: 132,
            max_bus_fault_mva: 2500,
            r1: 0.15,
            x1: 0.85,
            r0: 0.45,
            x0: 2.55,
            route_length_km: 0.5,
            relay_burden_va: 0.5,
            lead_resistance: 0.47
          },
          result: {
            verdict: 'SUITABLY DIMENSIONED',
            ealreq_max: 650.5,
            vk_required: 650.5,
            vk_available: 800,
            vk_breakdown: [
              { label: 'Differential (k=1)', ealreq: 325.2, vk: 325.2, isMax: false },
              { label: 'Distance (k=1)', ealreq: 325.2, vk: 325.2, isMax: false },
              { label: 'Breaker Failure (k=5)', ealreq: 650.5, vk: 650.5, isMax: true }
            ],
            intermediates: {
              if_primary: 18.94,
              if_secondary: 0.095,
              total_burden: 0.97,
              safety_factor: 1.2
            }
          },
          approvalStatus: 'APPROVED',
          createdBy: userIds[0],
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
        {
          workspaceId,
          templateId: templates[0]._id,
          templateName: templates[0].name,
          iedType: templates[0].iedType,
          sheet1: {
            ct_ratio_primary: 800,
            ct_ratio_secondary: 5,
            accuracy_class: '5P15',
            rct: 3.0,
            vk_available: 600,
            io_at_vk: 0.025
          },
          sheet2: {
            frequency: 50,
            bus_voltage_kv: 33,
            max_bus_fault_mva: 1200,
            r1: 0.25,
            x1: 1.15,
            r0: 0.75,
            x0: 3.45,
            route_length_km: 1.2,
            relay_burden_va: 0.8,
            lead_resistance: 0.85
          },
          result: {
            verdict: 'UNDER DIMENSIONED',
            ealreq_max: 720.8,
            vk_required: 720.8,
            vk_available: 600,
            vk_breakdown: [
              { label: 'Differential (k=1)', ealreq: 360.4, vk: 360.4, isMax: false },
              { label: 'Distance (k=1)', ealreq: 360.4, vk: 360.4, isMax: false },
              { label: 'Breaker Failure (k=5)', ealreq: 720.8, vk: 720.8, isMax: true }
            ],
            intermediates: {
              if_primary: 21.05,
              if_secondary: 0.131,
              total_burden: 1.65,
              safety_factor: 1.2
            }
          },
          approvalStatus: 'PENDING',
          createdBy: userIds[3],
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ];

      const computationResult = await computationsCollection.insertMany(sampleComputations);
      console.log(`✅ Created ${computationResult.insertedCount} sample computations`);
    } else {
      console.log('⚪ Computations already exist or no templates available');
    }

    // Create sample activity logs
    const activityLogsCollection = db.collection('activity_logs');
    const existingActivityLogs = await activityLogsCollection.countDocuments({ workspaceId });
    
    if (existingActivityLogs === 0) {
      const sampleActivityLogs = [
        {
          workspaceId,
          userId: userIds[0],
          type: 'CREATE',
          description: 'CT adequacy check completed for 132kV Transformer Bay',
          metadata: { templateName: 'ABB RED670 Analysis', result: 'SUITABLY DIMENSIONED' },
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        },
        {
          workspaceId,
          userId: userIds[1],
          type: 'UPDATE',
          description: 'Computation approved by team lead',
          metadata: { action: 'APPROVED', computationId: 'comp_001' },
          timestamp: new Date(Date.now() - 15 * 60 * 1000)
        },
        {
          workspaceId,
          userId: userIds[2],
          type: 'CREATE',
          description: 'New relay template added: Siemens 7SJ85',
          metadata: { templateName: 'Siemens 7SJ85', manufacturer: 'SIEMENS' },
          timestamp: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          workspaceId,
          userId: userIds[3],
          type: 'CREATE',
          description: 'CT check failed - insufficient knee point voltage',
          metadata: { required: '720V', available: '600V', status: 'UNDER DIMENSIONED' },
          timestamp: new Date(Date.now() - 45 * 60 * 1000)
        },
        {
          workspaceId,
          userId: userIds[1],
          type: 'LOGIN',
          description: 'User logged into workspace',
          metadata: { sessionId: 'sess_' + Date.now() },
          timestamp: new Date(Date.now() - 60 * 60 * 1000)
        }
      ];

      const activityResult = await activityLogsCollection.insertMany(sampleActivityLogs);
      console.log(`✅ Created ${activityResult.insertedCount} sample activity logs`);
    } else {
      console.log('⚪ Activity logs already exist');
    }

    // Create sample approvals
    const approvalsCollection = db.collection('approvals');
    const existingApprovals = await approvalsCollection.countDocuments({ workspaceId });
    
    if (existingApprovals === 0) {
      const computations = await computationsCollection.find({ workspaceId }).toArray();
      
      if (computations.length > 0) {
        const sampleApprovals = [
          {
            workspaceId,
            resourceType: 'COMPUTATION',
            resourceId: computations[0]._id,
            status: 'APPROVED',
            approver: userIds[1], // Sarah Johnson (Admin)
            requester: userIds[0], // John Smith
            comments: 'CT adequacy analysis looks good. All parameters within acceptable limits.',
            approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          }
        ];

        if (computations.length > 1) {
          sampleApprovals.push({
            workspaceId,
            resourceType: 'COMPUTATION',
            resourceId: computations[1]._id,
            status: 'PENDING',
            approver: userIds[2], // Mike Chen (Manager)
            requester: userIds[3], // Emma Wilson
            comments: '',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          });
        }

        const approvalResult = await approvalsCollection.insertMany(sampleApprovals);
        console.log(`✅ Created ${approvalResult.insertedCount} sample approvals`);
      }
    } else {
      console.log('⚪ Approvals already exist');
    }

    console.log('\n🎉 Sample data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Organization: Hitachi Energy`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Workspace: Main Substation Analysis`);
    console.log(`- Substations: ${await substationsCollection.countDocuments({ workspaceId })}`);
    console.log(`- Templates: ${await templatesCollection.countDocuments({ workspaceId })}`);
    console.log(`- Computations: ${await computationsCollection.countDocuments({ workspaceId })}`);
    console.log(`- Activity Logs: ${await activityLogsCollection.countDocuments({ workspaceId })}`);
    console.log(`- Approvals: ${await approvalsCollection.countDocuments({ workspaceId })}`);

  } catch (error) {
    console.error('❌ Failed to seed sample data:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedSampleData();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedSampleData };