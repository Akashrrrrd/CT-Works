const { MongoClient } = require('mongodb');

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb+srv://aakashrajendran2004_db_user:DgsXV9M6nexbmJE6@ct-users.eb31d0y.mongodb.net/?appName=CT-Users';
const DB_NAME = process.env.DB_NAME || 'ct-adequacy';

// Only relays from your Hitachi PDF documents
const HITACHI_TEMPLATES = [
  {
    name: 'RED670 – Transformer Differential + Distance + Breaker Failure',
    description: 'ABB RED670 complete protection relay as shown in Hitachi documents.',
    iedType: 'tpl-red670',
    formula: 'ct-adequacy:tpl-red670',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',          type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',         type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',           type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)',type: 'number', example: 3.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 540  },
        io_at_vk:           { label: 'Io at Vk (mA)',            type: 'number', example: 20   },
      },
      sheet2: {
        frequency:          { label: 'Frequency (Hz)',           type: 'number', example: 50   },
        bus_voltage_kv:     { label: 'Bus Voltage (kV)',         type: 'number', example: 33   },
        max_bus_fault_mva:  { label: 'Max Fault Level (MVA)',    type: 'number', example: 1800 },
        r1:                 { label: 'R1 (Ω/km)',                type: 'number', example: 0.0221},
        x1:                 { label: 'X1 (Ω/km)',                type: 'number', example: 0.1600},
        r0:                 { label: 'R0 (Ω/km)',                type: 'number', example: 0.1300},
        x0:                 { label: 'X0 (Ω/km)',                type: 'number', example: 0.0600},
        route_length_km:    { label: 'Cable Length (km)',         type: 'number', example: 10   },
        relay_burden_va:    { label: 'Relay Burden Sr (VA)',      type: 'number', example: 0.02 },
        lead_resistance:    { label: 'Lead Resistance Rl (Ω)',   type: 'number', example: 0.47 },
      },
    },
    outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
  },
  {
    name: 'REQ650 – Breaker Failure Protection',
    description: 'ABB REQ650 breaker failure relay as shown in Hitachi documents.',
    iedType: 'tpl-req650',
    formula: 'ct-adequacy:tpl-req650',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',          type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',         type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',           type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)',type: 'number', example: 3.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 540  },
        io_at_vk:           { label: 'Io at Vk (mA)',            type: 'number', example: 20   },
      },
      sheet2: {
        frequency:          { label: 'Frequency (Hz)',           type: 'number', example: 50   },
        bus_voltage_kv:     { label: 'Bus Voltage (kV)',         type: 'number', example: 33   },
        max_bus_fault_mva:  { label: 'Max Fault Level (MVA)',    type: 'number', example: 1800 },
        r1:                 { label: 'R1 (Ω/km)',                type: 'number', example: 0.0221},
        x1:                 { label: 'X1 (Ω/km)',                type: 'number', example: 0.1600},
        r0:                 { label: 'R0 (Ω/km)',                type: 'number', example: 0.1300},
        x0:                 { label: 'X0 (Ω/km)',                type: 'number', example: 0.0600},
        route_length_km:    { label: 'Cable Length (km)',         type: 'number', example: 10   },
        relay_burden_va:    { label: 'Relay Burden Sr (VA)',      type: 'number', example: 0.02 },
        lead_resistance:    { label: 'Lead Resistance Rl (Ω)',   type: 'number', example: 0.47 },
      },
    },
    outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
  },
];

async function updateTemplates() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Clear all templates
    await db.collection('templates').deleteMany({});
    console.log('✓ Cleared all templates');
    
    // Insert only Hitachi document templates
    await db.collection('templates').insertMany(HITACHI_TEMPLATES);
    console.log('✓ Inserted Hitachi relay templates only');
    
  } catch (error) {
    console.error('Error updating templates:', error);
  } finally {
    await client.close();
  }
}

updateTemplates();