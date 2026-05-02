/**
 * Seed script — run once to populate MongoDB with demo users + IED templates.
 * Usage:  node scripts/seed.mjs
 *
 * Requires DATABASE_URL in .env
 */

import { MongoClient } from 'mongodb';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env manually (no dotenv dependency needed) ─────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');
try {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
} catch { /* .env not found, rely on process.env */ }

const URI     = process.env.DATABASE_URL;
const DB_NAME = process.env.DB_NAME || 'ct-adequacy';

if (!URI) { console.error('DATABASE_URL not set'); process.exit(1); }

// ── bcrypt-compatible hash using Node crypto (no extra deps) ─────────────────
// We use bcryptjs at runtime; for seeding we import it dynamically
async function hashPassword(pw) {
  const bcrypt = await import('bcryptjs');
  const hashFn = bcrypt.hash ?? bcrypt.default?.hash;
  return hashFn(pw, 10);
}

// ── IED Templates ─────────────────────────────────────────────────────────────
const IED_TEMPLATES = [
  {
    name: 'RED670 – Transformer Differential',
    description: 'ABB RED670 biased differential protection. IEC 61869 PX class.',
    iedType: 'tpl-differential',
    formula: 'ct-adequacy:tpl-differential',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',           type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',          type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',            type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)', type: 'number', example: 2.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)', type: 'number', example: 400  },
        io_at_vk:           { label: 'Io at Vk (mA)',             type: 'number', example: 30   },
      },
      sheet2: {
        frequency:         { label: 'Frequency (Hz)',            type: 'number', example: 50    },
        bus_voltage_kv:    { label: 'Bus Voltage (kV)',          type: 'number', example: 33    },
        max_bus_fault_mva: { label: 'Max Fault Level (MVA)',     type: 'number', example: 750   },
        r1:                { label: 'R1 (Ω/km)',                 type: 'number', example: 0.125 },
        x1:                { label: 'X1 (Ω/km)',                 type: 'number', example: 0.112 },
        r0:                { label: 'R0 (Ω/km)',                 type: 'number', example: 0.375 },
        x0:                { label: 'X0 (Ω/km)',                 type: 'number', example: 0.336 },
        route_length_km:   { label: 'Cable Length (km)',          type: 'number', example: 5     },
        relay_burden_va:   { label: 'Relay Burden Sr (VA)',       type: 'number', example: 0.02  },
        lead_resistance:   { label: 'Lead Resistance Rl (Ω)',    type: 'number', example: 0.47  },
      },
    },
  },
  {
    name: 'REB670 – Busbar Differential',
    description: 'ABB REB670 busbar protection. Low-impedance biased differential.',
    iedType: 'tpl-differential',
    formula: 'ct-adequacy:tpl-differential',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',           type: 'number', example: 1200 },
        ct_ratio_secondary: { label: 'CT Secondary (A)',          type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',            type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)', type: 'number', example: 3.0  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)', type: 'number', example: 600  },
        io_at_vk:           { label: 'Io at Vk (mA)',             type: 'number', example: 50   },
      },
      sheet2: {
        frequency:         { label: 'Frequency (Hz)',            type: 'number', example: 50   },
        bus_voltage_kv:    { label: 'Bus Voltage (kV)',          type: 'number', example: 132  },
        max_bus_fault_mva: { label: 'Max Fault Level (MVA)',     type: 'number', example: 2500 },
        r1:                { label: 'R1 (Ω/km)',                 type: 'number', example: 0.08 },
        x1:                { label: 'X1 (Ω/km)',                 type: 'number', example: 0.1  },
        r0:                { label: 'R0 (Ω/km)',                 type: 'number', example: 0.24 },
        x0:                { label: 'X0 (Ω/km)',                 type: 'number', example: 0.3  },
        route_length_km:   { label: 'Cable Length (km)',          type: 'number', example: 0.1  },
        relay_burden_va:   { label: 'Relay Burden Sr (VA)',       type: 'number', example: 0.05 },
        lead_resistance:   { label: 'Lead Resistance Rl (Ω)',    type: 'number', example: 0.3  },
      },
    },
  },
  {
    name: 'REF615 – Feeder Differential',
    description: 'ABB REF615 feeder protection with differential element for cable feeders.',
    iedType: 'tpl-differential',
    formula: 'ct-adequacy:tpl-differential',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',           type: 'number', example: 400  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',          type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',            type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)', type: 'number', example: 1.8  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)', type: 'number', example: 300  },
        io_at_vk:           { label: 'Io at Vk (mA)',             type: 'number', example: 25   },
      },
      sheet2: {
        frequency:         { label: 'Frequency (Hz)',            type: 'number', example: 50    },
        bus_voltage_kv:    { label: 'Bus Voltage (kV)',          type: 'number', example: 33    },
        max_bus_fault_mva: { label: 'Max Fault Level (MVA)',     type: 'number', example: 750   },
        r1:                { label: 'R1 (Ω/km)',                 type: 'number', example: 0.125 },
        x1:                { label: 'X1 (Ω/km)',                 type: 'number', example: 0.112 },
        r0:                { label: 'R0 (Ω/km)',                 type: 'number', example: 0.375 },
        x0:                { label: 'X0 (Ω/km)',                 type: 'number', example: 0.336 },
        route_length_km:   { label: 'Cable Length (km)',          type: 'number', example: 8     },
        relay_burden_va:   { label: 'Relay Burden Sr (VA)',       type: 'number', example: 0.02  },
        lead_resistance:   { label: 'Lead Resistance Rl (Ω)',    type: 'number', example: 0.47  },
      },
    },
  },
  {
    name: 'SEL-421 – Distance Protection',
    description: 'SEL-421 distance relay for transmission line protection. Zone 1/2/3 reach.',
    iedType: 'tpl-distance',
    formula: 'ct-adequacy:tpl-distance',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',           type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',          type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',            type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)', type: 'number', example: 2.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)', type: 'number', example: 500  },
        io_at_vk:           { label: 'Io at Vk (mA)',             type: 'number', example: 30   },
      },
      sheet2: {
        frequency:         { label: 'Frequency (Hz)',            type: 'number', example: 50   },
        bus_voltage_kv:    { label: 'Bus Voltage (kV)',          type: 'number', example: 132  },
        max_bus_fault_mva: { label: 'Max Fault Level (MVA)',     type: 'number', example: 2500 },
        r1:                { label: 'R1 (Ω/km)',                 type: 'number', example: 0.08 },
        x1:                { label: 'X1 (Ω/km)',                 type: 'number', example: 0.4  },
        r0:                { label: 'R0 (Ω/km)',                 type: 'number', example: 0.24 },
        x0:                { label: 'X0 (Ω/km)',                 type: 'number', example: 1.2  },
        route_length_km:   { label: 'Line Length (km)',           type: 'number', example: 50   },
        relay_burden_va:   { label: 'Relay Burden Sr (VA)',       type: 'number', example: 0.05 },
        lead_resistance:   { label: 'Lead Resistance Rl (Ω)',    type: 'number', example: 0.5  },
      },
    },
  },
  {
    name: 'REL670 – Distance Protection (132kV)',
    description: 'ABB REL670 distance relay for 132kV/220kV transmission lines.',
    iedType: 'tpl-distance',
    formula: 'ct-adequacy:tpl-distance',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',           type: 'number', example: 1000 },
        ct_ratio_secondary: { label: 'CT Secondary (A)',          type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',            type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)', type: 'number', example: 4.0  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)', type: 'number', example: 800  },
        io_at_vk:           { label: 'Io at Vk (mA)',             type: 'number', example: 60   },
      },
      sheet2: {
        frequency:         { label: 'Frequency (Hz)',            type: 'number', example: 50   },
        bus_voltage_kv:    { label: 'Bus Voltage (kV)',          type: 'number', example: 220  },
        max_bus_fault_mva: { label: 'Max Fault Level (MVA)',     type: 'number', example: 5000 },
        r1:                { label: 'R1 (Ω/km)',                 type: 'number', example: 0.05 },
        x1:                { label: 'X1 (Ω/km)',                 type: 'number', example: 0.35 },
        r0:                { label: 'R0 (Ω/km)',                 type: 'number', example: 0.15 },
        x0:                { label: 'X0 (Ω/km)',                 type: 'number', example: 1.05 },
        route_length_km:   { label: 'Line Length (km)',           type: 'number', example: 100  },
        relay_burden_va:   { label: 'Relay Burden Sr (VA)',       type: 'number', example: 0.05 },
        lead_resistance:   { label: 'Lead Resistance Rl (Ω)',    type: 'number', example: 0.6  },
      },
    },
  },
  {
    name: 'REQ650 – Breaker Failure Protection',
    description: 'ABB REQ650 breaker failure relay. 5× Iop factor per IEC 61869.',
    iedType: 'tpl-breaker-failure',
    formula: 'ct-adequacy:tpl-breaker-failure',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',           type: 'number', example: 600  },
        ct_ratio_secondary: { label: 'CT Secondary (A)',          type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',            type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)', type: 'number', example: 2.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)', type: 'number', example: 400  },
        io_at_vk:           { label: 'Io at Vk (mA)',             type: 'number', example: 30   },
      },
      sheet2: {
        frequency:         { label: 'Frequency (Hz)',            type: 'number', example: 50    },
        bus_voltage_kv:    { label: 'Bus Voltage (kV)',          type: 'number', example: 33    },
        max_bus_fault_mva: { label: 'Max Fault Level (MVA)',     type: 'number', example: 750   },
        r1:                { label: 'R1 (Ω/km)',                 type: 'number', example: 0.125 },
        x1:                { label: 'X1 (Ω/km)',                 type: 'number', example: 0.112 },
        r0:                { label: 'R0 (Ω/km)',                 type: 'number', example: 0.375 },
        x0:                { label: 'X0 (Ω/km)',                 type: 'number', example: 0.336 },
        route_length_km:   { label: 'Cable Length (km)',          type: 'number', example: 5     },
        relay_burden_va:   { label: 'Relay Burden Sr (VA)',       type: 'number', example: 0.02  },
        lead_resistance:   { label: 'Lead Resistance Rl (Ω)',    type: 'number', example: 0.47  },
      },
    },
  },
  {
    name: 'REB500 – Breaker Failure (Busbar)',
    description: 'ABB REB500 busbar + breaker failure protection for 132kV substations.',
    iedType: 'tpl-breaker-failure',
    formula: 'ct-adequacy:tpl-breaker-failure',
    inputSchema: {
      sheet1: {
        ct_ratio_primary:   { label: 'CT Primary (A)',           type: 'number', example: 1200 },
        ct_ratio_secondary: { label: 'CT Secondary (A)',          type: 'number', example: 1    },
        accuracy_class:     { label: 'Accuracy Class',            type: 'string', example: 'PX' },
        rct:                { label: 'CT Winding Resistance (Ω)', type: 'number', example: 3.5  },
        vk_available:       { label: 'Knee Point Voltage Vk (V)', type: 'number', example: 700  },
        io_at_vk:           { label: 'Io at Vk (mA)',             type: 'number', example: 50   },
      },
      sheet2: {
        frequency:         { label: 'Frequency (Hz)',            type: 'number', example: 50   },
        bus_voltage_kv:    { label: 'Bus Voltage (kV)',          type: 'number', example: 132  },
        max_bus_fault_mva: { label: 'Max Fault Level (MVA)',     type: 'number', example: 2500 },
        r1:                { label: 'R1 (Ω/km)',                 type: 'number', example: 0.08 },
        x1:                { label: 'X1 (Ω/km)',                 type: 'number', example: 0.1  },
        r0:                { label: 'R0 (Ω/km)',                 type: 'number', example: 0.24 },
        x0:                { label: 'X0 (Ω/km)',                 type: 'number', example: 0.3  },
        route_length_km:   { label: 'Cable Length (km)',          type: 'number', example: 0.5  },
        relay_burden_va:   { label: 'Relay Burden Sr (VA)',       type: 'number', example: 0.05 },
        lead_resistance:   { label: 'Lead Resistance Rl (Ω)',    type: 'number', example: 0.4  },
      },
    },
  },
];

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db(DB_NAME);
  const users      = db.collection('users');
  const orgs       = db.collection('organizations');
  const workspaces = db.collection('workspaces');
  const templates  = db.collection('templates');

  const now = new Date();

  // ── Organisation ────────────────────────────────────────────────────────────
  let org = await orgs.findOne({ name: 'Hitachi Energy' });
  if (!org) {
    const r = await orgs.insertOne({ name: 'Hitachi Energy', ownerId: null, settings: {}, createdAt: now, updatedAt: now });
    org = await orgs.findOne({ _id: r.insertedId });
    console.log('Created org: Hitachi Energy');
  } else {
    console.log('Org exists, skipping');
  }

  // ── Seed users ───────────────────────────────────────────────────────────────
  const USERS = [
    { name: 'Aakash Rajendran',  email: 'engineer@ct-adequacy.app', role: 'ENGINEER' },
    { name: 'Rajesh Kumar',      email: 'admin@ct-adequacy.app',    role: 'ADMIN'    },
    { name: 'Priya Sharma',      email: 'manager@ct-adequacy.app',  role: 'MANAGER'  },
  ];

  let adminId = null;
  for (const u of USERS) {
    const existing = await users.findOne({ email: u.email });
    if (existing) {
      console.log(`User exists: ${u.email}`);
      if (u.role === 'ADMIN') adminId = existing._id;
      continue;
    }
    const passwordHash = await hashPassword('Password@123');
    const r = await users.insertOne({
      ...u, passwordHash,
      organizationId: org._id,
      createdAt: now, updatedAt: now,
    });
    if (u.role === 'ADMIN') adminId = r.insertedId;
    console.log(`Created user: ${u.email} (${u.role})`);
  }

  // Patch org owner
  if (adminId) {
    await orgs.updateOne({ _id: org._id }, { $set: { ownerId: adminId } });
  }

  // ── Workspace ────────────────────────────────────────────────────────────────
  let workspace = await workspaces.findOne({ organizationId: org._id });
  if (!workspace) {
    const r = await workspaces.insertOne({
      organizationId: org._id,
      name:        '33kV DF5W SS – CT/VT Adequacy',
      description: 'CT/VT Adequacy Check for 33kV Cable Feeders | Contract: N-19957.1-DF5W',
      ownerId:     adminId,
      members:     [],
      createdAt:   now,
      updatedAt:   now,
    });
    workspace = await workspaces.findOne({ _id: r.insertedId });
    console.log('Created workspace');
  } else {
    console.log('Workspace exists, skipping');
  }

  // ── IED Templates ─────────────────────────────────────────────────────────────
  for (const tpl of IED_TEMPLATES) {
    const existing = await templates.findOne({ name: tpl.name, workspaceId: workspace._id });
    if (existing) { console.log(`Template exists: ${tpl.name}`); continue; }
    await templates.insertOne({
      ...tpl,
      workspaceId:  workspace._id,
      outputSchema: { verdict: 'string', vk_required: 'number', vk_available: 'number', ealreq_max: 'number' },
      version:      1,
      createdById:  adminId,
      createdAt:    now,
      updatedAt:    now,
    });
    console.log(`Created template: ${tpl.name}`);
  }

  await client.close();

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────────────');
  console.log('Login credentials (password: Password@123)');
  console.log('  Engineer : engineer@ct-adequacy.app');
  console.log('  Admin    : admin@ct-adequacy.app');
  console.log('  Manager  : manager@ct-adequacy.app');
  console.log('─────────────────────────────────────────');
}

main().catch(e => { console.error(e); process.exit(1); });
