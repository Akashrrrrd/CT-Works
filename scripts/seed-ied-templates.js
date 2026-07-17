/**
 * Seed script to add the three IED templates to the database
 * These templates use exact Hitachi N-19957 2-DF4W formulas and calculations
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/mydatabase';

const IED_TEMPLATES = [
  {
    name: 'SIEMENS 7SJ85 - Multi-Function Protection Relay',
    description: 'SIEMENS 7SJ85 multi-function protection relay with exact CT adequacy calculations per Hitachi standards N-19957 2-DF4W. Supports differential, distance, and overcurrent protection for 33kV feeder applications.',
    iedType: 'tpl-siemens-7sj85',
    formula: 'ct-adequacy:tpl-siemens-7sj85',
    isIEDTemplate: true,
    hitachiReference: 'N-19957 2-DF4W',
    application: '33kV Feeder Protection',
    functions: ['Differential Protection', 'Distance Protection', 'Overcurrent Protection'],
    inputSchema: {
      ct_wiring: {
        conductor_cross_section: { type: 'number', default: 6.0, unit: 'mm²' },
        resistance_20c: { type: 'number', default: 3.69, unit: 'Ω/km' },
        temperature_coefficient: { type: 'number', default: 0.00393, unit: '/°C' },
        conductor_length: { type: 'number', default: 120, unit: 'm' },
        cores: { type: 'number', default: 2 }
      },
      system: {
        system_frequency: { type: 'number', default: 50, unit: 'Hz' },
        bus_voltage_level: { type: 'number', default: 132, unit: 'kV' },
        max_bus_fault_level: { type: 'number', default: 50, unit: 'kA' },
        xr_ratio: { type: 'number', default: 15 }
      },
      power_line: {
        positive_sequence_resistance: { type: 'number', default: 0.0221, unit: 'Ω/km' },
        positive_sequence_reactance: { type: 'number', default: 0.1600, unit: 'Ω/km' },
        zero_sequence_resistance: { type: 'number', default: 0.1300, unit: 'Ω/km' },
        zero_sequence_reactance: { type: 'number', default: 0.0600, unit: 'Ω/km' },
        route_length: { type: 'number', default: 1.74, unit: 'km' }
      },
      ct_core: {
        ct_ratio_primary: { type: 'number', default: 2000, unit: 'A' },
        ct_ratio_secondary: { type: 'number', default: 1, unit: 'A' },
        class_of_accuracy: { type: 'string', default: 'PX' },
        rated_burden: { type: 'number', default: 7.5, unit: 'VA' },
        accuracy_limit_factor: { type: 'number', default: 10 },
        ct_resistance: { type: 'number', default: 0.5, unit: 'Ω' }
      },
      connected_devices: {
        ied_names: { type: 'array', default: ['7SJ85'] },
        burden_values: { type: 'array', default: [0.02], unit: 'VA' }
      }
    }
  },
  {
    name: 'ABB RET670 - Multi-Function Transformer Protection',
    description: 'ABB RET670 multi-function transformer protection relay with exact CT adequacy calculations per Hitachi standards N-19957 2-DF4W. Supports transformer differential (87T) and REF protection for 132kV/33kV, 100MVA transformers.',
    iedType: 'tpl-abb-ret670',
    formula: 'ct-adequacy:tpl-abb-ret670',
    isIEDTemplate: true,
    hitachiReference: 'N-19957 2-DF4W',
    application: '132kV/33kV Transformer Protection',
    functions: ['Transformer Differential (87T)', 'REF Protection', 'Overcurrent Protection'],
    inputSchema: {
      ct_parameters: {
        ct_ratio_tap1: { type: 'number', default: 3200, unit: 'A' },
        ct_ratio_tap2: { type: 'number', default: 600, unit: 'A' },
        ct_ratio_secondary: { type: 'number', default: 1, unit: 'A' },
        class_of_accuracy: { type: 'string', default: 'PX' },
        ct_resistance: { type: 'number', default: 16, unit: 'Ω' },
        knee_point_voltage: { type: 'number', default: 1600, unit: 'V' },
        magnetizing_current: { type: 'number', default: 10, unit: 'mA' }
      },
      system_parameters: {
        system_frequency: { type: 'number', default: 50, unit: 'Hz' },
        hv_bus_voltage: { type: 'number', default: 132, unit: 'kV' },
        mv_bus_voltage: { type: 'number', default: 33, unit: 'kV' },
        max_hv_fault_current: { type: 'number', default: 50000, unit: 'A' },
        max_mv_fault_current: { type: 'number', default: 40000, unit: 'A' },
        transformer_rating_mva: { type: 'number', default: 100, unit: 'MVA' },
        percentage_impedance: { type: 'number', default: 25, unit: '%' }
      },
      wiring_parameters: {
        total_lead_resistance: { type: 'number', default: 1.10, unit: 'Ω' },
        conductor_length: { type: 'number', default: 120, unit: 'm' },
        conductor_cross_section: { type: 'number', default: 6.0, unit: 'mm²' },
        resistance_per_km: { type: 'number', default: 3.69, unit: 'Ω/km' }
      },
      connected_devices: {
        ret670_burden: { type: 'number', default: 0.02, unit: 'VA' },
        other_devices_burden: { type: 'number', default: 0, unit: 'VA' }
      }
    }
  },
  {
    name: 'RED670 - Line Differential & Distance Protection',
    description: 'RED670 line differential and distance protection relay with exact CT adequacy calculations per Hitachi standards N-19957 2-DF4W. Supports line differential (87L) and distance protection for 132kV cable feeders.',
    iedType: 'tpl-red670',
    formula: 'ct-adequacy:tpl-red670',
    isIEDTemplate: true,
    hitachiReference: 'N-19957 2-DF4W',
    application: '132kV Cable Feeder Protection',
    functions: ['Line Differential (87L)', 'Distance Protection (21)', 'Overcurrent Protection'],
    inputSchema: {
      ct_parameters: {
        ct_ratio_tap1: { type: 'number', default: 3200, unit: 'A' },
        ct_ratio_tap2: { type: 'number', default: 1800, unit: 'A' },
        ct_ratio_secondary: { type: 'number', default: 1, unit: 'A' },
        class_of_accuracy: { type: 'string', default: 'PX' },
        ct_resistance_tap1: { type: 'number', default: 9.8, unit: 'Ω' },
        ct_resistance_tap2: { type: 'number', default: 5.6, unit: 'Ω' },
        knee_point_voltage_tap1: { type: 'number', default: 2000, unit: 'V' },
        knee_point_voltage_tap2: { type: 'number', default: 1250, unit: 'V' },
        magnetizing_current_tap1: { type: 'number', default: 10, unit: 'mA' },
        magnetizing_current_tap2: { type: 'number', default: 20, unit: 'mA' }
      },
      system_parameters: {
        system_frequency: { type: 'number', default: 50, unit: 'Hz' },
        hv_bus_voltage: { type: 'number', default: 132, unit: 'kV' },
        mv_bus_voltage: { type: 'number', default: 132, unit: 'kV' },
        max_hv_fault_current: { type: 'number', default: 50000, unit: 'A' },
        max_through_fault_3ph: { type: 'number', default: 42230, unit: 'A' },
        max_through_fault_1ph: { type: 'number', default: 43475, unit: 'A' },
        max_endzone1_3ph: { type: 'number', default: 43585, unit: 'A' },
        max_endzone1_1ph: { type: 'number', default: 44648, unit: 'A' },
        xr_ratio: { type: 'number', default: 15 },
        system_time_constant_3ph: { type: 'number', default: 47.73, unit: 'ms' },
        system_time_constant_1ph_through: { type: 'number', default: 27.37, unit: 'ms' },
        system_time_constant_1ph_endzone: { type: 'number', default: 29.64, unit: 'ms' }
      },
      wiring_parameters: {
        total_lead_resistance: { type: 'number', default: 1.10, unit: 'Ω' },
        conductor_length: { type: 'number', default: 120, unit: 'm' },
        conductor_cross_section: { type: 'number', default: 6.0, unit: 'mm²' },
        resistance_per_km: { type: 'number', default: 4.48759, unit: 'Ω/km' }
      },
      connected_devices: {
        red670_burden: { type: 'number', default: 0.02, unit: 'VA' },
        other_devices_burden: { type: 'number', default: 0, unit: 'VA' }
      },
      cable_parameters: {
        positive_sequence_resistance: { type: 'number', default: 0.0221, unit: 'Ω/km' },
        positive_sequence_reactance: { type: 'number', default: 0.1600, unit: 'Ω/km' },
        zero_sequence_resistance: { type: 'number', default: 0.1300, unit: 'Ω/km' },
        zero_sequence_reactance: { type: 'number', default: 0.0600, unit: 'Ω/km' },
        route_length: { type: 'number', default: 1.74, unit: 'km' }
      }
    }
  }
];

async function seedIEDTemplates() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const templates = db.collection('templates');
    
    // Clear existing IED templates first
    console.log('Removing existing IED templates...');
    await templates.deleteMany({ 
      iedType: { $in: ['tpl-siemens-7sj85', 'tpl-abb-ret670', 'tpl-red670'] }
    });
    
    // Add the new IED templates
    console.log('Adding IED templates...');
    for (const template of IED_TEMPLATES) {
      const result = await templates.insertOne({
        ...template,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Added ${template.name} (ID: ${result.insertedId})`);
    }
    
    console.log(`\n🎉 Successfully seeded ${IED_TEMPLATES.length} IED templates!`);
    console.log('\nThe following templates are now available:');
    console.log('1. 🔵 SIEMENS 7SJ85 - Multi-Function Protection Relay');
    console.log('2. 🔴 ABB RET670 - Multi-Function Transformer Protection');
    console.log('3. 🟢 RED670 - Line Differential & Distance Protection');
    console.log('\nAll templates use exact Hitachi N-19957 2-DF4W formulas and calculations.');
    
  } catch (error) {
    console.error('Error seeding IED templates:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  seedIEDTemplates()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed to seed IED templates:', error);
      process.exit(1);
    });
}

module.exports = { seedIEDTemplates, IED_TEMPLATES };