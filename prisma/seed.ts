/**
 * Seed script — creates standard IED CT adequacy templates.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
 * Or add to package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ── IED template definitions ──────────────────────────────────────────────────
// Each entry maps to a protection function + relay model.
// iedType must match the templateId keys in ct-adequacy.ts:
// 'tpl-differential' | 'tpl-distance' | 'tpl-breaker-failure'

const IED_TEMPLATES = [
 // ── From your PDF documents ──────────────────────────────────────────────
 {
 name: 'RED670 – Transformer Differential + Distance + Breaker Failure',
 description: 'ABB RED670 complete protection relay as shown in engineering documents.',
 iedType: 'tpl-red670',
 formula: 'ct-adequacy:tpl-red670',
 inputSchema: {
 sheet1: {
 ct_ratio_primary: { label: 'CT Primary (A)', type: 'number', example: 600 },
 ct_ratio_secondary: { label: 'CT Secondary (A)', type: 'number', example: 1 },
 accuracy_class: { label: 'Accuracy Class', type: 'string', example: 'PX' },
 rct: { label: 'CT Winding Resistance (Ω)',type: 'number', example: 2.5 },
 vk_available: { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 400 },
 io_at_vk: { label: 'Io at Vk (mA)', type: 'number', example: 30 },
 },
 sheet2: {
 frequency: { label: 'Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage_kv: { label: 'Bus Voltage (kV)', type: 'number', example: 33 },
 max_bus_fault_mva: { label: 'Max Fault Level (MVA)', type: 'number', example: 750 },
 r1: { label: 'R1 (Ω/km)', type: 'number', example: 0.125},
 x1: { label: 'X1 (Ω/km)', type: 'number', example: 0.112},
 r0: { label: 'R0 (Ω/km)', type: 'number', example: 0.375},
 x0: { label: 'X0 (Ω/km)', type: 'number', example: 0.336},
 route_length_km: { label: 'Cable Length (km)', type: 'number', example: 5 },
 relay_burden_va: { label: 'Relay Burden Sr (VA)', type: 'number', example: 0.02 },
 lead_resistance: { label: 'Lead Resistance Rl (Ω)', type: 'number', example: 0.47 },
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
 ct_ratio_primary: { label: 'CT Primary (A)', type: 'number', example: 1200 },
 ct_ratio_secondary: { label: 'CT Secondary (A)', type: 'number', example: 1 },
 accuracy_class: { label: 'Accuracy Class', type: 'string', example: 'PX' },
 rct: { label: 'CT Winding Resistance (Ω)',type: 'number', example: 3.0 },
 vk_available: { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 600 },
 io_at_vk: { label: 'Io at Vk (mA)', type: 'number', example: 50 },
 },
 sheet2: {
 frequency: { label: 'Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage_kv: { label: 'Bus Voltage (kV)', type: 'number', example: 132 },
 max_bus_fault_mva: { label: 'Max Fault Level (MVA)', type: 'number', example: 2500 },
 r1: { label: 'R1 (Ω/km)', type: 'number', example: 0.08 },
 x1: { label: 'X1 (Ω/km)', type: 'number', example: 0.1 },
 r0: { label: 'R0 (Ω/km)', type: 'number', example: 0.24 },
 x0: { label: 'X0 (Ω/km)', type: 'number', example: 0.3 },
 route_length_km: { label: 'Cable Length (km)', type: 'number', example: 0.1 },
 relay_burden_va: { label: 'Relay Burden Sr (VA)', type: 'number', example: 0.05 },
 lead_resistance: { label: 'Lead Resistance Rl (Ω)', type: 'number', example: 0.3 },
 },
 },
 outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
 },
 {
 name: 'REF615 – Feeder Differential (Line)',
 description: 'ABB REF615 feeder protection with differential element for cable feeders.',
 iedType: 'tpl-ref615',
 formula: 'ct-adequacy:tpl-ref615',
 inputSchema: {
 sheet1: {
 ct_ratio_primary: { label: 'CT Primary (A)', type: 'number', example: 400 },
 ct_ratio_secondary: { label: 'CT Secondary (A)', type: 'number', example: 1 },
 accuracy_class: { label: 'Accuracy Class', type: 'string', example: 'PX' },
 rct: { label: 'CT Winding Resistance (Ω)',type: 'number', example: 1.8 },
 vk_available: { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 300 },
 io_at_vk: { label: 'Io at Vk (mA)', type: 'number', example: 25 },
 },
 sheet2: {
 frequency: { label: 'Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage_kv: { label: 'Bus Voltage (kV)', type: 'number', example: 33 },
 max_bus_fault_mva: { label: 'Max Fault Level (MVA)', type: 'number', example: 750 },
 r1: { label: 'R1 (Ω/km)', type: 'number', example: 0.125},
 x1: { label: 'X1 (Ω/km)', type: 'number', example: 0.112},
 r0: { label: 'R0 (Ω/km)', type: 'number', example: 0.375},
 x0: { label: 'X0 (Ω/km)', type: 'number', example: 0.336},
 route_length_km: { label: 'Cable Length (km)', type: 'number', example: 8 },
 relay_burden_va: { label: 'Relay Burden Sr (VA)', type: 'number', example: 0.02 },
 lead_resistance: { label: 'Lead Resistance Rl (Ω)', type: 'number', example: 0.47 },
 },
 },
 outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
 },

 // ── SIEMENS 7SJ85 Multi-function Protection ────────────────────────────────
 {
 name: 'SIEMENS 7SJ85 – Multi-function Protection Relay',
 description: 'Siemens 7SJ85 differential, distance, and overcurrent protection relay with CT/VT adequacy calculations per Engineering standards .',
 iedType: 'tpl-siemens-7sj85',
 formula: 'ct-adequacy:tpl-siemens-7sj85',
 inputSchema: {
 ct_wiring: {
 conductor_cross_section: { label: 'CT Conductor Cross Section (mm²)', type: 'number', example: 6.00 },
 resistance_w_km_20c: { label: 'Resistance W/km at 20°C (Ω/km)', type: 'number', example: 3.69 },
 specific_resistance_20c: { label: 'Specific Resistance at 20°C (/K⁻¹)', type: 'number', example: 0.00393 },
 conductor_length_m: { label: 'Conductor Length CT to Relay (m)', type: 'number', example: 120 }
 },
 vt_wiring: {
 conductor_cross_section: { label: 'VT Conductor Cross Section (mm²)', type: 'number', example: 2.50 },
 resistance_w_km_20c: { label: 'VT Resistance W/km at 20°C (Ω/km)', type: 'number', example: 8.87 },
 specific_resistance_20c: { label: 'VT Specific Resistance at 20°C (/K⁻¹)', type: 'number', example: 0.00393 },
 conductor_length_m: { label: 'VT Conductor Length to Relay (m)', type: 'number', example: 120 },
 primary_voltage: { label: 'VT Primary Voltage (kV)', type: 'number', example: 132 },
 secondary_voltage: { label: 'VT Secondary Voltage (kV)', type: 'number', example: 0.11 }
 },
 system: {
 system_frequency: { label: 'System Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage_level: { label: 'Bus Voltage Level (kV)', type: 'number', example: 132 },
 max_bus_fault_level: { label: 'Max Bus Fault Level (kA)', type: 'number', example: 50 },
 xr_ratio: { label: 'X/R Ratio', type: 'number', example: 15 },
 mv_bus_voltage_level: { label: 'MV Bus Voltage Level (kV)', type: 'number', example: 132 },
 mv_max_bus_fault_rating: { label: 'MV Max Bus Fault Rating (kA)', type: 'number', example: 40 }
 },
 power_line: {
 assumed_cable: { label: 'Number of Cables', type: 'number', example: 3 },
 cable_type: { label: 'Cable Type', type: 'string', example: 'CU HDPE' },
 cable_mm2: { label: 'Cable Cross Section (mm²)', type: 'number', example: 240 },
 cables_per_phase: { label: 'Cables per Phase', type: 'number', example: 1 },
 positive_seq_resistance_r1: { label: 'Positive Seq. Resistance R1 (Ω/km)', type: 'number', example: 0.0221 },
 positive_seq_reactance_x1: { label: 'Positive Seq. Reactance X1 (Ω/km)', type: 'number', example: 0.1600 },
 zero_seq_resistance_r0: { label: 'Zero Seq. Resistance R0 (Ω/km)', type: 'number', example: 0.1300 },
 zero_seq_reactance_x0: { label: 'Zero Seq. Reactance X0 (Ω/km)', type: 'number', example: 0.0600 },
 route_length: { label: 'Route Length (km)', type: 'number', example: 1.74 }
 },
 ct_core: {
 ct_ratio_primary: { label: 'CT Ratio Primary (A)', type: 'number', example: 3150 },
 ct_ratio_secondary: { label: 'CT Ratio Secondary (A)', type: 'number', example: 1 },
 class_of_accuracy: { label: 'Class of Accuracy', type: 'string', example: '5P 20' },
 ct_resistance: { label: 'CT Resistance Rct (Ω)', type: 'number', example: 9 },
 rated_burden: { label: 'CT Rated Burden PN (VA)', type: 'number', example: 7.5 }
 },
 connected_devices: {
 device_7sj85: { label: '7SJ85 Burden (VA)', type: 'number', example: 0.02 },
 device_sel751: { label: 'SEL751 Burden (VA)', type: 'number', example: 0.02 },
 device_fms: { label: 'FMS Burden (VA)', type: 'number', example: 0.06 },
 device_avr: { label: 'AVR Burden (VA)', type: 'number', example: 0.20 }
 }
 },
 outputSchema: { 
 final_verdict: 'string', 
 required_kssc: 'number', 
 available_kssc: 'number', 
 ct_calculations: 'object',
 vt_calculations: 'object',
 fault_calculations: 'object',
 burden_calculations: 'object',
 adequacy_check: 'object'
 },
 },

 // ── Distance protection ───────────────────────────────────────────────────
 {
 name: 'SEL-421 – Distance Protection (Line)',
 description: 'SEL-421 distance relay for transmission line protection. Zone 1/2/3 reach check.',
 iedType: 'tpl-distance',
 formula: 'ct-adequacy:tpl-distance',
 inputSchema: {
 sheet1: {
 ct_ratio_primary: { label: 'CT Primary (A)', type: 'number', example: 600 },
 ct_ratio_secondary: { label: 'CT Secondary (A)', type: 'number', example: 1 },
 accuracy_class: { label: 'Accuracy Class', type: 'string', example: 'PX' },
 rct: { label: 'CT Winding Resistance (Ω)',type: 'number', example: 2.5 },
 vk_available: { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 500 },
 io_at_vk: { label: 'Io at Vk (mA)', type: 'number', example: 30 },
 },
 sheet2: {
 frequency: { label: 'Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage_kv: { label: 'Bus Voltage (kV)', type: 'number', example: 132 },
 max_bus_fault_mva: { label: 'Max Fault Level (MVA)', type: 'number', example: 2500 },
 r1: { label: 'R1 (Ω/km)', type: 'number', example: 0.08 },
 x1: { label: 'X1 (Ω/km)', type: 'number', example: 0.4 },
 r0: { label: 'R0 (Ω/km)', type: 'number', example: 0.24 },
 x0: { label: 'X0 (Ω/km)', type: 'number', example: 1.2 },
 route_length_km: { label: 'Line Length (km)', type: 'number', example: 50 },
 relay_burden_va: { label: 'Relay Burden Sr (VA)', type: 'number', example: 0.05 },
 lead_resistance: { label: 'Lead Resistance Rl (Ω)', type: 'number', example: 0.5 },
 },
 },
 outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
 },
 {
 name: 'REL670 – Distance Protection (Transmission)',
 description: 'ABB REL670 distance relay for 132kV/220kV transmission lines.',
 iedType: 'tpl-rel670',
 formula: 'ct-adequacy:tpl-rel670',
 inputSchema: {
 sheet1: {
 ct_ratio_primary: { label: 'CT Primary (A)', type: 'number', example: 1000 },
 ct_ratio_secondary: { label: 'CT Secondary (A)', type: 'number', example: 1 },
 accuracy_class: { label: 'Accuracy Class', type: 'string', example: 'PX' },
 rct: { label: 'CT Winding Resistance (Ω)',type: 'number', example: 4.0 },
 vk_available: { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 800 },
 io_at_vk: { label: 'Io at Vk (mA)', type: 'number', example: 60 },
 },
 sheet2: {
 frequency: { label: 'Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage_kv: { label: 'Bus Voltage (kV)', type: 'number', example: 220 },
 max_bus_fault_mva: { label: 'Max Fault Level (MVA)', type: 'number', example: 5000 },
 r1: { label: 'R1 (Ω/km)', type: 'number', example: 0.05 },
 x1: { label: 'X1 (Ω/km)', type: 'number', example: 0.35 },
 r0: { label: 'R0 (Ω/km)', type: 'number', example: 0.15 },
 x0: { label: 'X0 (Ω/km)', type: 'number', example: 1.05 },
 route_length_km: { label: 'Line Length (km)', type: 'number', example: 100 },
 relay_burden_va: { label: 'Relay Burden Sr (VA)', type: 'number', example: 0.05 },
 lead_resistance: { label: 'Lead Resistance Rl (Ω)', type: 'number', example: 0.6 },
 },
 },
 outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
 },

 // ── Breaker Failure protection ────────────────────────────────────────────
 {
 name: 'REQ650 – Breaker Failure Protection',
 description: 'ABB REQ650 breaker failure relay as shown in engineering documents.',
 iedType: 'tpl-req650',
 formula: 'ct-adequacy:tpl-req650',
 inputSchema: {
 sheet1: {
 ct_ratio_primary: { label: 'CT Primary (A)', type: 'number', example: 600 },
 ct_ratio_secondary: { label: 'CT Secondary (A)', type: 'number', example: 1 },
 accuracy_class: { label: 'Accuracy Class', type: 'string', example: 'PX' },
 rct: { label: 'CT Winding Resistance (Ω)',type: 'number', example: 2.5 },
 vk_available: { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 400 },
 io_at_vk: { label: 'Io at Vk (mA)', type: 'number', example: 30 },
 },
 sheet2: {
 frequency: { label: 'Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage_kv: { label: 'Bus Voltage (kV)', type: 'number', example: 33 },
 max_bus_fault_mva: { label: 'Max Fault Level (MVA)', type: 'number', example: 750 },
 r1: { label: 'R1 (Ω/km)', type: 'number', example: 0.125},
 x1: { label: 'X1 (Ω/km)', type: 'number', example: 0.112},
 r0: { label: 'R0 (Ω/km)', type: 'number', example: 0.375},
 x0: { label: 'X0 (Ω/km)', type: 'number', example: 0.336},
 route_length_km: { label: 'Cable Length (km)', type: 'number', example: 5 },
 relay_burden_va: { label: 'Relay Burden Sr (VA)', type: 'number', example: 0.02 },
 lead_resistance: { label: 'Lead Resistance Rl (Ω)', type: 'number', example: 0.47 },
 },
 },
 outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
 },
 {
 name: 'REB500 – Breaker Failure (Busbar)',
 description: 'ABB REB500 busbar + breaker failure protection for 132kV substations.',
 iedType: 'tpl-breaker-failure',
 formula: 'ct-adequacy:tpl-breaker-failure',
 inputSchema: {
 sheet1: {
 ct_ratio_primary: { label: 'CT Primary (A)', type: 'number', example: 1200 },
 ct_ratio_secondary: { label: 'CT Secondary (A)', type: 'number', example: 1 },
 accuracy_class: { label: 'Accuracy Class', type: 'string', example: 'PX' },
 rct: { label: 'CT Winding Resistance (Ω)',type: 'number', example: 3.5 },
 vk_available: { label: 'Knee Point Voltage Vk (V)',type: 'number', example: 700 },
 io_at_vk: { label: 'Io at Vk (mA)', type: 'number', example: 50 },
 },
 sheet2: {
 frequency: { label: 'Frequency (Hz)', type: 'number', example: 50 },
 bus_voltage_kv: { label: 'Bus Voltage (kV)', type: 'number', example: 132 },
 max_bus_fault_mva: { label: 'Max Fault Level (MVA)', type: 'number', example: 2500 },
 r1: { label: 'R1 (Ω/km)', type: 'number', example: 0.08 },
 x1: { label: 'X1 (Ω/km)', type: 'number', example: 0.1 },
 r0: { label: 'R0 (Ω/km)', type: 'number', example: 0.24 },
 x0: { label: 'X0 (Ω/km)', type: 'number', example: 0.3 },
 route_length_km: { label: 'Cable Length (km)', type: 'number', example: 0.5 },
 relay_burden_va: { label: 'Relay Burden Sr (VA)', type: 'number', example: 0.05 },
 lead_resistance: { label: 'Lead Resistance Rl (Ω)', type: 'number', example: 0.4 },
 },
 },
 outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
 },
];

async function main() {
 console.log('Seeding IED templates...');

 // Create a seed org + admin user if none exist
 let org = await prisma.organization.findFirst();
 if (!org) {
 org = await prisma.organization.create({
 data: { name: 'Enterprise Power', ownerId: 'placeholder', settings: {} },
 });
 }

 let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
 if (!adminUser) {
 adminUser = await prisma.user.create({
 data: {
 email: 'admin@ct-adequacy.app',
 passwordHash: await hash('Admin@1234', 10),
 name: 'System Admin',
 role: 'ADMIN',
 organizationId: org.id,
 },
 });
 await prisma.organization.update({
 where: { id: org.id },
 data: { ownerId: adminUser.id },
 });
 }

 // Create default workspace if none
 let workspace = await prisma.workspace.findFirst({
 where: { organizationId: org.id },
 });
 if (!workspace) {
 workspace = await prisma.workspace.create({
 data: {
 organizationId: org.id,
 name: '2026 Substation – CT/VT Adequacy',
 description: 'CT/VT Adequacy Check for 33kV Cable Feeders',
 ownerId: adminUser.id,
 },
 });
 }

 // Upsert each IED template (match by name + workspaceId)
 for (const tpl of IED_TEMPLATES) {
 const existing = await prisma.template.findFirst({
 where: { name: tpl.name, workspaceId: workspace.id },
 });
 if (existing) {
 console.log(` skip (exists): ${tpl.name}`);
 continue;
 }
 await prisma.template.create({
 data: {
 workspaceId: workspace.id,
 name: tpl.name,
 description: tpl.description,
 iedType: tpl.iedType,
 formula: tpl.formula,
 inputSchema: tpl.inputSchema,
 outputSchema: tpl.outputSchema,
 createdById: adminUser.id,
 },
 });
 console.log(` created: ${tpl.name}`);
 }

 console.log('Seed complete.');
 console.log(`\nDefault admin login:\n email: admin@ct-adequacy.app\n password: Admin@1234`);
}

main()
 .catch(e => { console.error(e); process.exit(1); })
 .finally(() => prisma.$disconnect());
