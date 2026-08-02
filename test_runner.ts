import * as fs from 'fs';
import * as path from 'path';
import { ExcelProcessor } from './lib/services/excel-processor';
import { AutomatedCalculationEngine } from './lib/services/automated-calculation-engine';

async function run() {
 const testDir = path.join(__dirname, 'test cases');
 const files = fs.readdirSync(testDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

 for (const file of files) {
 console.log(`\n===========================================`);
 console.log(`Testing: ${file}`);
 console.log(`===========================================`);
 
 try {
 const buffer = fs.readFileSync(path.join(testDir, file));
 
 // Mock web File object
 const mockedFile = {
 name: file,
 size: buffer.length,
 lastModified: Date.now(),
 arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
 } as any;
 
 const validationResult = await ExcelProcessor.processExcelFile(mockedFile);
 
 if (!validationResult.isValid) {
 console.log(`Parse errors:`, validationResult.errors);
 continue;
 }
 
 const data = validationResult.data;
 if (!data) continue;
 
 // Transform ExcelData to CTVTAdequacyInput
 const input: any = {
 system: {
 bus_fault_level: parseFloat(data.standard_parameters.bus_fault_level || '31.5'),
 system_frequency: parseFloat(data.standard_parameters.system_frequency || '50'),
 bus_voltage_level: parseFloat(data.standard_parameters.bus_voltage_level || '132'),
 xr_ratio: parseFloat(data.standard_parameters.xr_ratio || '10')
 },
 ct_wiring: {
 conductor_cross_section: parseFloat(data.standard_parameters.ct_wiring_conductor_cross_section_1 || '6'),
 resistance_w_km_20c: parseFloat(data.standard_parameters.resistance_w_km_20c_1 || '3.69'),
 lead_length_ct_to_relay: parseFloat(data.standard_parameters.lead_length_vt_to_relay_1 || '50')
 },
 vt_wiring: {
 conductor_cross_section: parseFloat(data.standard_parameters.ct_wiring_conductor_cross_section_2 || '2.5'),
 resistance_w_km_20c: parseFloat(data.standard_parameters.resistance_w_km_20c_2 || '8.87'),
 lead_length_vt_to_relay: parseFloat(data.standard_parameters.lead_length_vt_to_relay_2 || '50')
 },
 transmission_line: {
 positive_sequence_resistance: parseFloat(data.standard_parameters.positive_seq_resistance_r1 || '0.0221'),
 positive_sequence_reactance: parseFloat(data.standard_parameters.positive_seq_reactance_z1 || '0.16'),
 zero_sequence_resistance: parseFloat(data.standard_parameters.negative_seq_resistance_r0 || '0.13'),
 zero_sequence_reactance: parseFloat(data.standard_parameters.negative_seq_reactance_z0 || '0.06'),
 route_length: parseFloat(data.standard_parameters.route_length || '0.2'),
 source_impedance_zs: 0
 },
 ieds: data.devices.map(d => ({
 ied_name: d.device_name,
 ct_ratio: d.ct_ratio,
 accuracy_class: d.accuracy_class,
 ct_resistance: parseFloat(d.ct_resistance || '0'),
 knee_point_voltage: parseFloat(d.vk_knee_point_voltage || '0'),
 accuracy_limit_factor: 20
 }))
 };

 // Find RED670 or 7SJ85
 const ied = input.ieds.find((i: any) => i.ied_name.includes('RED670') || i.ied_name.includes('7SJ85'));
 if (!ied) {
 console.log(`No RED670 or 7SJ85 found in ${file}, using first device: ${input.ieds[0]?.ied_name}`);
 } else {
 input.ieds = [ied]; // Just test the first supported one
 }

 const report = AutomatedCalculationEngine.performCompleteAnalysis(input);
 console.log(`Verdict: ${report.overall_verdict}`);
 const res = report.ied_results[0];
 if (res) {
 console.log(`Device: ${res.ied_name}`);
 if (res.required_vk) console.log(`Required Vk: ${res.required_vk.toFixed(2)} V | Available Vk: ${res.available_vk?.toFixed(2)} V`);
 if (res.required_kssc) console.log(`Required Kssc: ${res.required_kssc.toFixed(2)} | Available Kssc: ${res.available_kssc?.toFixed(2)}`);
 }
 
 } catch (err: any) {
 console.log(`Error testing ${file}:`, err.message);
 }
 }
}

run().catch(console.error);
