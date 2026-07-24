/**
 * SIEMENS 7SJ85 CALCULATION VERIFICATION TEST
 * 
 * This file performs manual step-by-step calculations
 * based on Hitachi N-19957 2-DF4W standard formulas.
 * 
 * Run with: node verify-calculations.js
 */

// ============================================================
// TEST INPUT VALUES
// ============================================================

const TEST_INPUT = {
  ct_wiring: {
    ct_conductor_cross_section: 2.5,      // mm²
    ct_resistance_w_km_20c: 7.41,         // Ω/km
    ct_specific_resistance_20c: 0.00393,  // /K
    ct_conductor_length_m: 50,            // m
    relay_rated_current: 1                // A
  },
  system: {
    system_frequency: 50,                 // Hz
    bus_voltage_level: 33,                // kV
    max_bus_fault_level: 12.5,            // kA
    xr_ratio: 15,                         // X/R ratio
    max_hv_busbar_fault_current: 12500,   // A
    hv_rating_of_busbar: 33000            // V
  },
  ct_core: {
    ct_ratio_primary: 600,                // A
    ct_ratio_secondary: 1,                // A
    class_of_accuracy: "5P20",
    ct_resistance: 3.5,                   // Ω
    rated_burden: 15,                     // VA
    CT_Accuracy_Limit_Factor: 20          // ALF (n)
  },
  connected_devices: [
    { device_name: "SIEMENS 7SJ85", burden_va: 0.02 },
    { device_name: "Energy Meter", burden_va: 0.02 }
  ],
  accuracy_limit_factor: 20
};

// ============================================================
// EXPECTED OUTPUT VALUES
// ============================================================

const EXPECTED_OUTPUT = {
  resistance_at_75c: 9.0117,              // Ω/km
  lead_resistance: 0.450585,              // Ω
  loop_resistance: 0.901170,              // Ω
  va_consumption: 0.901170,               // VA
  internal_burden_PE: 3.50,               // VA
  devices_burden: 0.04,                   // VA
  total_burden: 0.941170,                 // VA
  rated_burden_PN: 15,                    // VA
  required_kssc: 20.833333,               // 12500 / 600
  available_kssc: 83.311411,              // 20 × ((3.5 + 15) / (3.5 + 0.94117))
  vk_required: 72.916667,                 // 20.833333 × 3.5
  vk_available: 400,                      // From CT nameplate
  ealreq_max: 72.916667,                  // Same as Vk Required
  verdict: "SUITABLY DIMENSIONED"
};

// ============================================================
// MANUAL CALCULATION FUNCTIONS
// ============================================================

function manuallyCalculateResults(input) {
  console.log("\n" + "=".repeat(70));
  console.log("MANUAL STEP-BY-STEP CALCULATION");
  console.log("=".repeat(70) + "\n");
  
  const results = {};
  
  // Step 1: Resistance at 75°C
  console.log("STEP 1: Resistance at 75°C");
  console.log("Formula: R(75°C) = R20 × [1 + a(t - 20)]");
  const temp_coefficient = 0.00393;
  const temp_factor = 1 + temp_coefficient * (75 - 20);
  console.log(`  R(75°C) = ${input.ct_wiring.ct_resistance_w_km_20c} × ${temp_factor.toFixed(5)}`);
  results.resistance_at_75c = input.ct_wiring.ct_resistance_w_km_20c * temp_factor;
  console.log(`  R(75°C) = ${results.resistance_at_75c.toFixed(4)} Ω/km ✓\n`);
  
  // Step 2: Lead Resistance (CRITICAL: Convert meters to km)
  console.log("STEP 2: Lead Resistance (one-way)");
  console.log("Formula: RL = R(75°C) × length_km");
  const length_km = input.ct_wiring.ct_conductor_length_m / 1000;
  results.lead_resistance = results.resistance_at_75c * length_km;
  console.log(`  RL = ${results.resistance_at_75c.toFixed(4)} × (${input.ct_wiring.ct_conductor_length_m}m / 1000)`);
  console.log(`  RL = ${results.resistance_at_75c.toFixed(4)} × ${length_km.toFixed(3)}`);
  console.log(`  RL = ${results.lead_resistance.toFixed(6)} Ω ✓\n`);
  
  // Step 3: Loop Resistance (go + return)
  console.log("STEP 3: Loop Resistance (go + return path)");
  console.log("Formula: 2RL = 2 × R(75°C) × length_km");
  results.loop_resistance = 2 * results.resistance_at_75c * length_km;
  console.log(`  2RL = 2 × ${results.resistance_at_75c.toFixed(4)} × ${length_km.toFixed(3)}`);
  console.log(`  2RL = ${results.loop_resistance.toFixed(6)} Ω = ${results.loop_resistance.toFixed(6)} VA ✓\n`);
  results.wiring_burden = results.loop_resistance;
  
  // Step 4: Internal Burden (PE)
  console.log("STEP 4: Internal Burden (PE)");
  console.log("Formula: PE = In² × Rct");
  const In = input.ct_core.ct_ratio_secondary;
  results.internal_burden_PE = Math.pow(In, 2) * input.ct_core.ct_resistance;
  console.log(`  PE = ${In}² × ${input.ct_core.ct_resistance}`);
  console.log(`  PE = ${results.internal_burden_PE.toFixed(2)} VA ✓\n`);
  
  // Step 5: Connected Devices Burden
  console.log("STEP 5: Connected Devices Burden");
  console.log("Formula: Sum all device burdens");
  results.devices_burden = input.connected_devices.reduce((sum, d) => sum + d.burden_va, 0);
  console.log(`  Devices: ${input.connected_devices.map(d => `${d.device_name}(${d.burden_va}VA)`).join(" + ")}`);
  console.log(`  Total = ${results.devices_burden.toFixed(2)} VA ✓\n`);
  
  // Step 6: Total Load Burden (PL)
  console.log("STEP 6: Total Load Burden (PL)");
  console.log("Formula: PL = PL_wiring + PL_devices");
  results.total_burden = results.wiring_burden + results.devices_burden;
  console.log(`  PL = ${results.wiring_burden.toFixed(6)} + ${results.devices_burden.toFixed(2)}`);
  console.log(`  PL = ${results.total_burden.toFixed(6)} VA ✓\n`);
  
  // Step 7: Required Kssc
  console.log("STEP 7: Required Kssc");
  console.log("Formula: Required Kssc = Itkmax / Ipn");
  const Itkmax = input.system.max_hv_busbar_fault_current;
  const Ipn = input.ct_core.ct_ratio_primary;
  results.required_kssc = Itkmax / Ipn;
  console.log(`  Required Kssc = ${Itkmax} / ${Ipn}`);
  console.log(`  Required Kssc = ${results.required_kssc.toFixed(6)} ✓\n`);
  
  // Step 8: Available Kssc (CORE FORMULA)
  console.log("STEP 8: Available Kssc (CORE FORMULA FROM HITACHI)");
  console.log("Formula: Available Kssc = n × ((PE + PN) / (PE + PL))");
  const n = input.accuracy_limit_factor;
  const PE = results.internal_burden_PE;
  const PN = input.ct_core.rated_burden;
  const PL = results.total_burden;
  const numerator = PE + PN;
  const denominator = PE + PL;
  results.available_kssc = n * (numerator / denominator);
  console.log(`  Available Kssc = ${n} × ((${PE.toFixed(2)} + ${PN}) / (${PE.toFixed(2)} + ${PL.toFixed(6)}))`);
  console.log(`  Available Kssc = ${n} × (${numerator.toFixed(2)} / ${denominator.toFixed(6)})`);
  console.log(`  Available Kssc = ${n} × ${(numerator / denominator).toFixed(6)}`);
  console.log(`  Available Kssc = ${results.available_kssc.toFixed(6)} ✓\n`);
  
  // Step 9: CT Suitability
  console.log("STEP 9: CT Suitability Check");
  console.log(`  IF Available Kssc (${results.available_kssc.toFixed(6)}) > Required Kssc (${results.required_kssc.toFixed(6)})`);
  results.suitable = results.available_kssc > results.required_kssc;
  results.verdict = results.suitable ? "SUITABLY DIMENSIONED" : "UNDER DIMENSIONED";
  console.log(`  ${results.available_kssc.toFixed(6)} > ${results.required_kssc.toFixed(6)} = ${results.suitable}`);
  console.log(`  Verdict: ${results.verdict} ✓\n`);
  
  // Step 10: Vk Required
  console.log("STEP 10: Vk Required");
  console.log("Formula: Vk Required = Required Kssc × Rct");
  results.vk_required = results.required_kssc * input.ct_core.ct_resistance;
  console.log(`  Vk Required = ${results.required_kssc.toFixed(6)} × ${input.ct_core.ct_resistance}`);
  console.log(`  Vk Required = ${results.vk_required.toFixed(6)} V ✓\n`);
  
  // Step 11: Vk Available
  console.log("STEP 11: Vk Available (from CT nameplate)");
  results.vk_available = 400;
  console.log(`  Vk Available = 400 V (from CT datasheet) ✓\n`);
  
  // Step 12: Ealreq Max
  console.log("STEP 12: Ealreq Max");
  console.log("Formula: Ealreq Max = Vk Required (highest through fault)");
  results.ealreq_max = results.vk_required;
  console.log(`  Ealreq Max = ${results.ealreq_max.toFixed(6)} V ✓\n`);
  
  return results;
}

// ============================================================
// COMPARISON FUNCTION
// ============================================================

function compareResults(calculated, expected) {
  console.log("\n" + "=".repeat(70));
  console.log("COMPARISON: CALCULATED vs EXPECTED");
  console.log("=".repeat(70) + "\n");
  
  const comparisons = [
    { label: "Resistance @ 75°C (Ω/km)", calc: calculated.resistance_at_75c, exp: expected.resistance_at_75c, decimals: 4 },
    { label: "Lead Resistance (Ω)", calc: calculated.lead_resistance, exp: expected.lead_resistance, decimals: 6 },
    { label: "Loop Resistance (Ω)", calc: calculated.loop_resistance, exp: expected.loop_resistance, decimals: 6 },
    { label: "Wiring Burden (VA)", calc: calculated.wiring_burden, exp: expected.va_consumption, decimals: 6 },
    { label: "Internal Burden PE (VA)", calc: calculated.internal_burden_PE, exp: expected.internal_burden_PE, decimals: 2 },
    { label: "Devices Burden (VA)", calc: calculated.devices_burden, exp: expected.devices_burden, decimals: 2 },
    { label: "Total Burden PL (VA)", calc: calculated.total_burden, exp: expected.total_burden, decimals: 6 },
    { label: "Required Kssc", calc: calculated.required_kssc, exp: expected.required_kssc, decimals: 6 },
    { label: "Available Kssc", calc: calculated.available_kssc, exp: expected.available_kssc, decimals: 6 },
    { label: "Vk Required (V)", calc: calculated.vk_required, exp: expected.vk_required, decimals: 6 },
    { label: "Vk Available (V)", calc: calculated.vk_available, exp: expected.vk_available, decimals: 1 },
    { label: "Ealreq Max (V)", calc: calculated.ealreq_max, exp: expected.ealreq_max, decimals: 6 }
  ];
  
  let allMatch = true;
  let matchCount = 0;
  let mismatchCount = 0;
  
  console.log(
    `${"Value".padEnd(35)} | ${"Calculated".padEnd(15)} | ${"Expected".padEnd(15)} | Status | Diff %`
  );
  console.log("-".repeat(100));
  
  comparisons.forEach(comp => {
    const calcRounded = parseFloat(comp.calc.toFixed(comp.decimals));
    const expRounded = parseFloat(comp.exp.toFixed(comp.decimals));
    
    const diff = Math.abs(calcRounded - expRounded);
    const percentDiff = expRounded !== 0 ? (diff / expRounded) * 100 : 0;
    
    const matches = percentDiff < 0.001;
    
    if (!matches) allMatch = false;
    if (matches) matchCount++;
    else mismatchCount++;
    
    const status = matches ? "✓ PASS" : "✗ FAIL";
    const diffStr = percentDiff.toFixed(4) + "%";
    
    console.log(
      `${comp.label.padEnd(35)} | ${calcRounded.toString().padEnd(15)} | ${expRounded.toString().padEnd(15)} | ${status.padEnd(6)} | ${diffStr}`
    );
  });
  
  console.log("-".repeat(100));
  console.log(`\nVerdict Comparison:`);
  console.log(`  Calculated: ${calculated.verdict}`);
  console.log(`  Expected:   ${expected.verdict}`);
  console.log(`  Match: ${calculated.verdict === expected.verdict ? "✓ YES" : "✗ NO"}\n`);
  
  console.log("=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`Passed: ${matchCount}/${comparisons.length + 1}`);
  console.log(`Failed: ${mismatchCount}/${comparisons.length + 1}`);
  
  if (allMatch && calculated.verdict === expected.verdict) {
    console.log("\n✅ ALL TESTS PASSED WITH 0.0000% DIFFERENCE! Calculations are 100% accurate!\n");
    return true;
  } else {
    console.log("\n❌ SOME TESTS FAILED! Check differences above.\n");
    return false;
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

console.log("\n");
console.log("╔" + "═".repeat(68) + "╗");
console.log("║" + " SIEMENS 7SJ85 CALCULATION VERIFICATION TEST ".padStart(70) + "║");
console.log("║" + " Based on Hitachi N-19957 2-DF4W Standard ".padStart(70) + "║");
console.log("╚" + "═".repeat(68) + "╝");

console.log("\n" + "=".repeat(70));
console.log("INPUT VALUES");
console.log("=".repeat(70) + "\n");

console.log("CT Parameters:");
console.log(`  Primary: ${TEST_INPUT.ct_core.ct_ratio_primary} A`);
console.log(`  Secondary: ${TEST_INPUT.ct_core.ct_ratio_secondary} A`);
console.log(`  Class: ${TEST_INPUT.ct_core.class_of_accuracy}`);
console.log(`  Rct: ${TEST_INPUT.ct_core.ct_resistance} Ω`);
console.log(`  Rated Burden: ${TEST_INPUT.ct_core.rated_burden} VA`);
console.log(`  ALF: ${TEST_INPUT.ct_core.CT_Accuracy_Limit_Factor}`);
console.log(`  Vk Available: 400 V`);

console.log("\nWiring Parameters:");
console.log(`  Conductor: ${TEST_INPUT.ct_wiring.ct_conductor_cross_section} mm²`);
console.log(`  R @ 20°C: ${TEST_INPUT.ct_wiring.ct_resistance_w_km_20c} Ω/km`);
console.log(`  Cable Length: ${TEST_INPUT.ct_wiring.ct_conductor_length_m} m`);
console.log(`  Temp Coeff: ${TEST_INPUT.ct_wiring.ct_specific_resistance_20c}`);

console.log("\nSystem Parameters:");
console.log(`  Frequency: ${TEST_INPUT.system.system_frequency} Hz`);
console.log(`  Bus Voltage: ${TEST_INPUT.system.bus_voltage_level} kV`);
console.log(`  Max Fault: ${TEST_INPUT.system.max_bus_fault_level} kA`);
console.log(`  X/R Ratio: ${TEST_INPUT.system.xr_ratio}`);

console.log("\nConnected Devices:");
TEST_INPUT.connected_devices.forEach(d => {
  console.log(`  ${d.device_name}: ${d.burden_va} VA`);
});

// Run manual calculations
const calculatedResults = manuallyCalculateResults(TEST_INPUT);

// Compare with expected
const testPassed = compareResults(calculatedResults, EXPECTED_OUTPUT);

if (testPassed) {
  process.exit(0);
} else {
  process.exit(1);
}
