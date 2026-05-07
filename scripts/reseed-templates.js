const { MongoClient } = require('mongodb');
const { hash } = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb+srv://aakashrajendran2004_db_user:DgsXV9M6nexbmJE6@ct-users.eb31d0y.mongodb.net/?appName=CT-Users';
const DB_NAME = process.env.DB_NAME || 'ct-adequacy';

const IED_TEMPLATES = [
  {
    name: 'RED670 – Transformer Differential + Distance + Breaker Failure',
    description: 'ABB RED670 complete protection: differential, distance, and breaker failure functions.',
    iedType: 'tpl-red670',
    formula: 'ct-adequacy:tpl-red670',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',          type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',         type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',           type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)',type: 'number', example: 2.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 400  },
        io_at_vk:           { label: 'Io at Vk (mA)',            type: 'number', example: 30   },
      },
      sheet2: {
        frequency:          { label: 'Frequency (Hz)',           type: 'number', example: 50   },
        bus_voltage_kv:     { label: 'Bus Voltage (kV)',         type: 'number', example: 33   },
        max_bus_fault_mva:  { label: 'Max Fault Level (MVA)',    type: 'number', example: 750  },
        r1:                 { label: 'R1 (Ω/km)',                type: 'number', example: 0.125},
        x1:                 { label: 'X1 (Ω/km)',                type: 'number', example: 0.112},
        r0:                 { label: 'R0 (Ω/km)',                type: 'number', example: 0.375},
        x0:                 { label: 'X0 (Ω/km)',                type: 'number', example: 0.336},
        route_length_km:    { label: 'Cable Length (km)',         type: 'number', example: 5    },
        relay_burden_va:    { label: 'Relay Burden Sr (VA)',      type: 'number', example: 0.02 },
        lead_resistance:    { label: 'Lead Resistance Rl (Ω)',   type: 'number', example: 0.47 },
      },
    },
    outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
  },
  {
    name: 'REB670 – Busbar Differential',
    description: 'ABB REB670 busbar protection. High-impedance or low-impedance biased differential.',
    iedType: 'tpl-reb670',
    formula: 'ct-adequacy:tpl-reb670',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',          type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',         type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',           type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)',type: 'number', example: 2.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 400  },
        io_at_vk:           { label: 'Io at Vk (mA)',            type: 'number', example: 30   },
      },
      sheet2: {
        frequency:          { label: 'Frequency (Hz)',           type: 'number', example: 50   },
        bus_voltage_kv:     { label: 'Bus Voltage (kV)',         type: 'number', example: 33   },
        max_bus_fault_mva:  { label: 'Max Fault Level (MVA)',    type: 'number', example: 750  },
        r1:                 { label: 'R1 (Ω/km)',                type: 'number', example: 0.125},
        x1:                 { label: 'X1 (Ω/km)',                type: 'number', example: 0.112},
        r0:                 { label: 'R0 (Ω/km)',                type: 'number', example: 0.375},
        x0:                 { label: 'X0 (Ω/km)',                type: 'number', example: 0.336},
        route_length_km:    { label: 'Cable Length (km)',         type: 'number', example: 5    },
        relay_burden_va:    { label: 'Relay Burden Sr (VA)',      type: 'number', example: 0.02 },
        lead_resistance:    { label: 'Lead Resistance Rl (Ω)',   type: 'number', example: 0.47 },
      },
    },
    outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
  },
  {
    name: 'REF615 – Feeder Differential',
    description: 'ABB REF615 feeder protection with differential element for cable feeders.',
    iedType: 'tpl-ref615',
    formula: 'ct-adequacy:tpl-ref615',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',          type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',         type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',           type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)',type: 'number', example: 2.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 400  },
        io_at_vk:           { label: 'Io at Vk (mA)',            type: 'number', example: 30   },
      },
      sheet2: {
        frequency:          { label: 'Frequency (Hz)',           type: 'number', example: 50   },
        bus_voltage_kv:     { label: 'Bus Voltage (kV)',         type: 'number', example: 33   },
        max_bus_fault_mva:  { label: 'Max Fault Level (MVA)',    type: 'number', example: 750  },
        r1:                 { label: 'R1 (Ω/km)',                type: 'number', example: 0.125},
        x1:                 { label: 'X1 (Ω/km)',                type: 'number', example: 0.112},
        r0:                 { label: 'R0 (Ω/km)',                type: 'number', example: 0.375},
        x0:                 { label: 'X0 (Ω/km)',                type: 'number', example: 0.336},
        route_length_km:    { label: 'Cable Length (km)',         type: 'number', example: 5    },
        relay_burden_va:    { label: 'Relay Burden Sr (VA)',      type: 'number', example: 0.02 },
        lead_resistance:    { label: 'Lead Resistance Rl (Ω)',   type: 'number', example: 0.47 },
      },
    },
    outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
  },
  {
    name: 'REL670 – Distance Protection',
    description: 'ABB REL670 distance relay for 132kV/220kV transmission lines.',
    iedType: 'tpl-rel670',
    formula: 'ct-adequacy:tpl-rel670',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',          type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',         type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',           type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)',type: 'number', example: 2.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 400  },
        io_at_vk:           { label: 'Io at Vk (mA)',            type: 'number', example: 30   },
      },
      sheet2: {
        frequency:          { label: 'Frequency (Hz)',           type: 'number', example: 50   },
        bus_voltage_kv:     { label: 'Bus Voltage (kV)',         type: 'number', example: 33   },
        max_bus_fault_mva:  { label: 'Max Fault Level (MVA)',    type: 'number', example: 750  },
        r1:                 { label: 'R1 (Ω/km)',                type: 'number', example: 0.125},
        x1:                 { label: 'X1 (Ω/km)',                type: 'number', example: 0.112},
        r0:                 { label: 'R0 (Ω/km)',                type: 'number', example: 0.375},
        x0:                 { label: 'X0 (Ω/km)',                type: 'number', example: 0.336},
        route_length_km:    { label: 'Cable Length (km)',         type: 'number', example: 5    },
        relay_burden_va:    { label: 'Relay Burden Sr (VA)',      type: 'number', example: 0.02 },
        lead_resistance:    { label: 'Lead Resistance Rl (Ω)',   type: 'number', example: 0.47 },
      },
    },
    outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
  },
  {
    name: 'REQ650 – Breaker Failure Protection',
    description: 'ABB REQ650 breaker failure relay. Uses 5× Iop factor per IEC 61869.',
    iedType: 'tpl-req650',
    formula: 'ct-adequacy:tpl-req650',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',          type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',         type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',           type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)',type: 'number', example: 2.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 400  },
        io_at_vk:           { label: 'Io at Vk (mA)',            type: 'number', example: 30   },
      },
      sheet2: {
        frequency:          { label: 'Frequency (Hz)',           type: 'number', example: 50   },
        bus_voltage_kv:     { label: 'Bus Voltage (kV)',         type: 'number', example: 33   },
        max_bus_fault_mva:  { label: 'Max Fault Level (MVA)',    type: 'number', example: 750  },
        r1:                 { label: 'R1 (Ω/km)',                type: 'number', example: 0.125},
        x1:                 { label: 'X1 (Ω/km)',                type: 'number', example: 0.112},
        r0:                 { label: 'R0 (Ω/km)',                type: 'number', example: 0.375},
        x0:                 { label: 'X0 (Ω/km)',                type: 'number', example: 0.336},
        route_length_km:    { label: 'Cable Length (km)',         type: 'number', example: 5    },
        relay_burden_va:    { label: 'Relay Burden Sr (VA)',      type: 'number', example: 0.02 },
        lead_resistance:    { label: 'Lead Resistance Rl (Ω)',   type: 'number', example: 0.47 },
      },
    },
    outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
  },
];

async function reseedTemplates() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Clear old templates
    await db.collection('templates').deleteMany({});
    console.log('✓ Cleared old templates');
    
    // Insert new templates
    await db.collection('templates').insertMany(IED_TEMPLATES);
    console.log('✓ Inserted new relay-specific templates');
    
  } catch (error) {
    console.error('Error reseeding templates:', error);
  } finally {
    await client.close();
  }
}

reseedTemplates();