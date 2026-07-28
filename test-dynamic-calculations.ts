/**
 * DYNAMIC CALCULATION VERIFICATION TEST
 * 
 * This script verifies that ALL output values are computed dynamically from user inputs,
 * not hardcoded. It tests with multiple input sets to ensure outputs change appropriately.
 */

import { Siemens7SJ85Calculator } from './lib/services/siemens-7sj85-calculations';

// Test Case 1: SIEMENS 7SJ85 - Scenario A
console.log('\n=== TEST 1: SIEMENS 7SJ85 - Scenario A ===');
const input1 = {
  ct_wiring: {
    ct_conductor_cross_section: 6,      // mm²
    ct_resistance_w_km_20c: 3.08,       // Ω/km
    ct_specific_resistance_20c: 0.00393,
    ct_conductor_length_m: 100,         // 100 meters
    relay_rated_current: 1
  },
  vt_wiring: undefined,
  system: {
    system_frequency: 50,               // Hz
    bus_voltage_level: 132,             // kV
    max_bus_fault_level: 25,            // kA
    xr_ratio: 30
  },
  power_line: {
    positive_seq_resistance_r1: 0.027,
    positive_seq_reactance_x1: 0.16,
    zero_seq_resistance_r0: 0.13,
    zero_seq_reactance_x0: 0.06,
    route_length: 1.74
  },
  ct_core: {
    ct_ratio_primary: 3200,             // 3200/1A
    ct_ratio_secondary: 1,
    class_of_accuracy: '5P20',
    ct_resistance: 0.54,                // Ω
    rated_burden: 1.08,                 // VA
    CT_Accuracy_Limit_Factor: 20        // ALF = n
  },
  connected_devices: [
    { device_name: 'Relay 1', burden_va: 0.5 },
    { device_name: 'Relay 2', burden_va: 0.3 }
  ],
  accuracy_limit_factor: 20
};

const result1 = Siemens7SJ85Calculator.performCompleteCalculation(input1);
console.log('Required Kssc:', result1.required_kssc);
console.log('Available Kssc:', result1.available_kssc);
console.log('Verdict:', result1.final_verdict);
console.log('Intermediates keys:', Object.keys(result1.intermediates || {}));

// Test Case 2: SIEMENS 7SJ85 - Scenario B (Different inputs)
console.log('\n=== TEST 2: SIEMENS 7SJ85 - Scenario B (Different Inputs) ===');
const input2 = {
  ct_wiring: {
    ct_conductor_cross_section: 10,     // DIFFERENT: 10 mm² instead of 6
    ct_resistance_w_km_20c: 1.83,       // AUTO-ADJUSTED: 1.83 Ω/km for 10mm²
    ct_specific_resistance_20c: 0.00393,
    ct_conductor_length_m: 200,         // DIFFERENT: 200 meters instead of 100
    relay_rated_current: 1
  },
  vt_wiring: undefined,
  system: {
    system_frequency: 50,
    bus_voltage_level: 220,             // DIFFERENT: 220 kV instead of 132
    max_bus_fault_level: 40,            // DIFFERENT: 40 kA instead of 25
    xr_ratio: 40
  },
  power_line: {
    positive_seq_resistance_r1: 0.027,
    positive_seq_reactance_x1: 0.16,
    zero_seq_resistance_r0: 0.13,
    zero_seq_reactance_x0: 0.06,
    route_length: 1.74
  },
  ct_core: {
    ct_ratio_primary: 2000,             // DIFFERENT: 2000/1A instead of 3200/1A
    ct_ratio_secondary: 1,
    class_of_accuracy: '5P20',
    ct_resistance: 0.42,                // DIFFERENT: 0.42 Ω instead of 0.54
    rated_burden: 0.84,                 // DIFFERENT: 0.84 VA instead of 1.08
    CT_Accuracy_Limit_Factor: 20
  },
  connected_devices: [
    { device_name: 'Relay 1', burden_va: 0.8 },
    { device_name: 'Relay 2', burden_va: 0.6 }
  ],
  accuracy_limit_factor: 20
};

const result2 = Siemens7SJ85Calculator.performCompleteCalculation(input2);
console.log('Required Kssc:', result2.required_kssc);
console.log('Available Kssc:', result2.available_kssc);
console.log('Verdict:', result2.final_verdict);

// Verification: Check that outputs are different
console.log('\n=== DYNAMIC CALCULATION VERIFICATION ===');
const outputsAreDifferent = 
  result1.required_kssc !== result2.required_kssc ||
  result1.available_kssc !== result2.available_kssc;

if (outputsAreDifferent) {
  console.log('✓ PASS: Outputs ARE different when inputs change');
  console.log('  Test 1 -> Required:', result1.required_kssc, 'Available:', result1.available_kssc);
  console.log('  Test 2 -> Required:', result2.required_kssc, 'Available:', result2.available_kssc);
} else {
  console.log('✗ FAIL: Outputs are IDENTICAL despite different inputs (suggests hardcoding)');
  console.log('  This indicates values might be hardcoded and not computed dynamically!');
}

// Verify intermediates are populated
console.log('\n=== INTERMEDIATES VERIFICATION ===');
const hasIntermediates = result1.intermediates && Object.keys(result1.intermediates).length > 0;
if (hasIntermediates) {
  console.log('✓ PASS: Intermediates are populated');
  console.log('  Number of intermediate values:', Object.keys(result1.intermediates).length);
  console.log('  Sample values:', Object.entries(result1.intermediates).slice(0, 5).map(([k,v]) => `${k}: ${v}`));
} else {
  console.log('✗ FAIL: Intermediates are empty');
}

console.log('\n=== TEST COMPLETE ===');
