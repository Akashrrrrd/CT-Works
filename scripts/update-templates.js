const { MongoClient } = require('mongodb');

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb+srv://aakashrajendran2004_db_user:DgsXV9M6nexbmJE6@ct-users.eb31d0y.mongodb.net/?appName=CT-Users';
const DB_NAME = process.env.DB_NAME || 'ct-adequacy';

// Standard relay templates - 2 IED Templates
const IED_TEMPLATES = [
 {
 name: 'SIEMENS 7SJ85 – Multi-function Protection Relay',
 description: 'SIEMENS 7SJ85 multi-function protection relay for feeder overcurrent protection (50/51) as per standard.',
 iedType: 'tpl-siemens-7sj85',
 formula: 'ct-adequacy:tpl-siemens-7sj85',
 inputSchema: {
 sheet1: {
 ct_ratio_primary: { label: 'CT Primary (A)', type: 'number', example: 600 },
 ct_ratio_secondary: { label: 'CT Secondary (A)', type: 'number', example: 1 },
 accuracy_class: { label: 'Accuracy Class', type: 'string', example: '5P20' },
 ct_resistance: { label: 'CT Winding Resistance (Ω)',type: 'number', example: 2.5 },
 rated_burden: { label: 'Rated Burden (VA)', type: 'number', example: 15 },
 accuracy_limit_factor: { label: 'ALF', type: 'number', example: 20 },
 knee_point_voltage: { label: 'Vk Available (V)', type: 'number', example: 400 },
 magnetizing_current: { label: 'Io at Vk (mA)', type: 'number', example: 30 },
 },
 sheet2: {
 system_frequency: { label: 'Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage: { label: 'Bus Voltage (kV)', type: 'number', example: 33 },
 max_fault_current: { label: 'Max Fault (kA)', type: 'number', example: 12.5 },
 xr_ratio: { label: 'X/R Ratio', type: 'number', example: 15 },
 positive_seq_resistance: { label: 'R1 (Ω/km)', type: 'number', example: 0.0221},
 positive_seq_reactance: { label: 'X1 (Ω/km)', type: 'number', example: 0.1600},
 zero_seq_resistance: { label: 'R0 (Ω/km)', type: 'number', example: 0.1300},
 zero_seq_reactance: { label: 'X0 (Ω/km)', type: 'number', example: 0.0600},
 line_length: { label: 'Line Length (km)', type: 'number', example: 1.74 },
 },
 },
 outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
 },
 {
 name: 'RED670 – Transformer Differential Protection Relay',
 description: 'ABB RED670 transformer differential protection relay as per IEC 61869 PX class standard.',
 iedType: 'tpl-red670',
 formula: 'ct-adequacy:tpl-red670',
 inputSchema: {
 sheet1: {
 ct_ratio_primary: { label: 'CT Primary (A)', type: 'number', example: 1200 },
 ct_ratio_secondary: { label: 'CT Secondary (A)', type: 'number', example: 1 },
 accuracy_class: { label: 'Accuracy Class', type: 'string', example: 'PX' },
 ct_resistance: { label: 'CT Winding Resistance (Ω)',type: 'number', example: 3.5 },
 rated_burden: { label: 'Rated Burden (VA)', type: 'number', example: 10 },
 accuracy_limit_factor: { label: 'ALF', type: 'number', example: 15 },
 knee_point_voltage: { label: 'Vk Available (V)', type: 'number', example: 600 },
 magnetizing_current: { label: 'Io at Vk (mA)', type: 'number', example: 40 },
 },
 sheet2: {
 system_frequency: { label: 'Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage: { label: 'Bus Voltage (kV)', type: 'number', example: 66 },
 max_fault_current: { label: 'Max Fault (kA)', type: 'number', example: 50 },
 xr_ratio: { label: 'X/R Ratio', type: 'number', example: 12 },
 positive_seq_resistance: { label: 'R1 (Ω/km)', type: 'number', example: 0.015},
 positive_seq_reactance: { label: 'X1 (Ω/km)', type: 'number', example: 0.120},
 zero_seq_resistance: { label: 'R0 (Ω/km)', type: 'number', example: 0.100},
 zero_seq_reactance: { label: 'X0 (Ω/km)', type: 'number', example: 0.050},
 line_length: { label: 'Line Length (km)', type: 'number', example: 2.5 },
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
 
 // Insert only Standard Engineering document templates
 await db.collection('templates').insertMany(STANDARD_TEMPLATES);
 console.log('✓ Inserted Standard Engineering relay templates only');
 
 } catch (error) {
 console.error('Error updating templates:', error);
 } finally {
 await client.close();
 }
}

updateTemplates();