/**
 * Script to add Siemens 7SJ85 formulas to the database
 * Run: npx tsx scripts/add-7sj85-formulas.ts
 */

import { getRelayFormulas, ObjectId } from '../lib/db';
import { SIEMENS_7SJ85_FORMULAS } from '../lib/formulas/siemens-7sj85-formulas';

async function addSiemens7SJ85Formulas() {
  try {
    console.log('🔧 Adding Siemens 7SJ85 formulas to database...');
    
    const formulasCol = await getRelayFormulas();
    const now = new Date();

    // Check if formulas already exist
    const existingCount = await formulasCol.countDocuments({ 
      relayName: 'SIEMENS 7SJ85' 
    });

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing SIEMENS 7SJ85 formulas. Deleting them first...`);
      await formulasCol.deleteMany({ relayName: 'SIEMENS 7SJ85' });
    }

    // Add all formulas
    const formulasWithMeta = SIEMENS_7SJ85_FORMULAS.map(formula => ({
      ...formula,
      validated: true,
      createdById: new ObjectId(), // System created
      createdAt: now,
      updatedAt: now
    }));

    const result = await formulasCol.insertMany(formulasWithMeta);
    
    console.log(`✅ Successfully added ${result.insertedCount} Siemens 7SJ85 formulas:`);
    
    // Group by category for reporting
    const categories = formulasWithMeta.reduce((acc, formula) => {
      const cat = formula.category || 'general';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   📋 ${category}: ${count} formulas`);
    });

    console.log('\n🎯 Formulas added for calculation categories:');
    console.log('   • CT Wiring Calculations');
    console.log('   • VT Wiring Calculations'); 
    console.log('   • Fault Current Calculations');
    console.log('   • Burden Calculations');
    console.log('   • CT Adequacy Checks');
    console.log('   • Impedance Calculations');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding Siemens 7SJ85 formulas:', error);
    process.exit(1);
  }
}

// Run the script
addSiemens7SJ85Formulas();