import { evaluateBay } from './lib/engine/calc-engine';
import { SystemParams, Bay, CtWiring, VtWiring, IedInstance } from './lib/engine/model';

// Based on the RED670 worked example mentioned in the implementation plan
// Hitachi N-19957 worked example (tap2/1800A case)

const system: SystemParams = {
  frequencyHz: 50,
  busVoltageKV: 132,
  maxFaultKA: 31.5,
  xrRatio: 10,
  r1: 0.0221,
  x1: 0.1600,
  r0: 0.1300,
  x0: 0.0600,
  routeLengthKm: 0.2
};

const ct: CtWiring = {
  relayRatedCurrentA: 1,
  secondaryCurrentA: 1,
  r20: 3.69,
  alpha: 0.00393,
  tempC: 75,
  lengthM: 50,
  areaMm2: 6 // added
};

const vt: VtWiring = {
  r20: 8.87,
  alpha: 0.00393,
  tempC: 75,
  lengthM: 50,
  areaMm2: 2.5, // added
  primaryKV: 132, // added
  secondaryKV: 0.11 // added
};

const red670: IedInstance = {
  id: "ied-1",
  bayId: "bay-1",
  templateId: "RED670",
  name: "RED670 Protection",
  params: {
    ctPrimaryA: 1800, // Tap-2 case
    ctSecondaryA: 1,
    rctOhm: 9.8,
    availableVk: 2000,
    bfOperateCurrentA: 31500, // heuristic
    magCurrentMa: 10
  }
};

const bay: Bay = {
  id: "bay-1",
  projectId: "proj-1",
  name: "Bay 1",
  voltageClass: "132 kV",
  ct,
  vt,
  ieds: [red670]
};

const result = evaluateBay(system, bay);

console.log(JSON.stringify(result, null, 2));

console.log('--- RED670 VERIFICATION ---');
const adequacy = result.ieds[0]?.adequacy;
if (!adequacy) {
  console.error("Adequacy calculation failed!");
  process.exit(1);
}

const diffCloseIn = adequacy.functions.find((f: any) => f.key === 'diff-close')?.ealReq;
const distZone1ph = adequacy.functions.find((f: any) => f.key === 'dist-zone-1ph')?.ealReq;

console.log(`Diff close-in Ealreq: ${diffCloseIn?.toFixed(2)} V (Expected ≈ 186.58 V)`);
console.log(`Distance endzone-1 1ph Ealreq: ${distZone1ph?.toFixed(2)} V (Expected ≈ 499.84 V)`);
console.log(`Required Vk: ${adequacy.requiredVk?.toFixed(2)} V (Expected ≈ 399.87 V)`);
console.log(`Available Vk: ${adequacy.availableVk?.toFixed(2)} V`);
console.log(`Verdict: ${adequacy.verdict} (Expected suitable)`);

// 7SJ85 Validation
const sj85: IedInstance = {
  id: "ied-2",
  bayId: "bay-1",
  templateId: "7SJ85",
  name: "7SJ85 Protection",
  params: {
    ctPrimaryA: 1800,
    ctSecondaryA: 1,
    rctOhm: 9.8,
    ratedBurdenVA: 7.5,
    alf: 20,
    maxThroughFaultA: 31500
  }
};

bay.ieds = [sj85];
const sj85Result = evaluateBay(system, bay);

console.log('\n--- 7SJ85 VERIFICATION ---');
const sj85Adequacy = sj85Result.ieds[0]?.adequacy;

console.log(`Required Kssc: ${sj85Adequacy?.requiredVk?.toFixed(2)}`);
console.log(`Available Kssc: ${sj85Adequacy?.availableVk?.toFixed(2)}`);
console.log(`Verdict: ${sj85Adequacy?.verdict}`);

