/**
 * Validation Test Suite
 * Verifies that calculations match exact expected test case outputs
 */

import { Siemens7SJ85Calculator } from './lib/services/siemens-7sj85-calculations';
import { RED670Calculator } from './lib/services/red670-calculations';

// Test Cases from user
const test7SJ85 = [
  {
    name: '7SJ85 Test Case 1',
    inputs: {
      ct_ratio: '600/1',
      ct_ratio_primary: 600,
      ct_ratio_secondary: 1,
      accuracy_class: '5P20',
      ct_resistance: 8,
      rated_burden: 7.5,
      alf: 20,
      frequency: 50,
      bus_voltage_kv: 33,
      max_bus_fault_kA: 31.5,
      x_r_ratio: 40,
      r1: 0.0221,
      x1: 0.16,
      r0: 0.1300,
      x0: 0.06,
      route_length_km: 0.20,
      conductor_cross_section: 2.50,
      resistance_20c: 7.41,
      specific_resistance: 0.00393,
      conductor_length_m: 150,
    },
    expected: {
      available_kssc: 28.91,
      required_kssc: 52.50,
      verdict: 'UNDER DIMENSIONED',
    }
  },
  {
    name: '7SJ85 Test Case 2',
    inputs: {
      ct_ratio: '1200/1',
      ct_ratio_primary: 1200,
      ct_ratio_secondary: 1,
      accuracy_class: '5P20',
      ct_resistance: 10,
      rated_burden: 15,
      alf: 20,
      frequency: 50,
      bus_voltage_kv: 33,
      max_bus_fault_kA: 31.5,
      x_r_ratio: 40,
      r1: 0.0221,
      x1: 0.16,
      r0: 0.1300,
      x0: 0.06,
      route_length_km: 0.20,
      conductor_cross_section: 2.50,
      resistance_20c: 7.41,
      specific_resistance: 0.00393,
      conductor_length_m: 150,
    },
    expected: {
      available_kssc: 39.30,
      required_kssc: 26.25,
      verdict: 'SUITABLY DIMENSIONED',
    }
  },
  {
    name: '7SJ85 Test Case 3',
    inputs: {
      ct_ratio: '2000/1',
      ct_ratio_primary: 2000,
      ct_ratio_secondary: 1,
      accuracy_class: '5P20',
      ct_resistance: 20,
      rated_burden: 7.5,
      alf: 20,
      frequency: 50,
      bus_voltage_kv: 33,
      max_bus_fault_kA: 31.5,
      x_r_ratio: 40,
      r1: 0.0221,
      x1: 0.16,
      r0: 0.1300,
      x0: 0.06,
      route_length_km: 0.20,
      conductor_cross_section: 2.50,
      resistance_20c: 7.41,
      specific_resistance: 0.00393,
      conductor_length_m: 150,
    },
    expected: {
      available_kssc: 24.20,
      required_kssc: 15.75,
      verdict: 'SUITABLY DIMENSIONED',
    }
  },
];

const testRED670 = [
  {
    name: 'RED670 Test Case 1',
    inputs: {
      ct_ratio: '800/1',
      ct_ratio_primary: 800,
      ct_ratio_secondary: 1,
      accuracy_class: 'PX',
      ct_resistance: 3.5,
      vk: 540,
      i0_magnetizing_current: 20,
      frequency: 50,
      bus_voltage_kv: 33,
      max_bus_fault_kA: 31.5,
      x_r_ratio: 40,
      r1: 0.0221,
      x1: 0.16,
      r0: 0.1300,
      x0: 0.06,
      route_length_km: 0.20,
      conductor_cross_section: 2.50,
      resistance_20c: 7.41,
      specific_resistance: 0.00393,
      conductor_length_m: 150,
    },
    expected: {
      eal_req_value: 713.275,
      vk_value: 570.62,
      verdict: 'UNDER DIMENSIONED',
    }
  },
  {
    name: 'RED670 Test Case 2',
    inputs: {
      ct_ratio: '1000/1',
      ct_ratio_primary: 1000,
      ct_ratio_secondary: 1,
      accuracy_class: 'PX',
      ct_resistance: 5,
      vk: 600,
      i0_magnetizing_current: 30,
      frequency: 50,
      bus_voltage_kv: 33,
      max_bus_fault_kA: 31.5,
      x_r_ratio: 40,
      r1: 0.0221,
      x1: 0.16,
      r0: 0.1300,
      x0: 0.06,
      route_length_km: 0.20,
      conductor_cross_section: 2.50,
      resistance_20c: 7.41,
      specific_resistance: 0.00393,
      conductor_length_m: 150,
    },
    expected: {
      eal_req_value: 707.711,
      vk_value: 566.17,
      verdict: 'SUITABLY DIMENSIONED',
    }
  },
  {
    name: 'RED670 Test Case 3',
    inputs: {
      ct_ratio: '2500/1',
      ct_ratio_primary: 2500,
      ct_ratio_secondary: 1,
      accuracy_class: 'PX',
      ct_resistance: 5,
      vk: 3750,
      i0_magnetizing_current: 60,
      frequency: 50,
      bus_voltage_kv: 33,
      max_bus_fault_kA: 31.5,
      x_r_ratio: 40,
      r1: 0.0221,
      x1: 0.16,
      r0: 0.1300,
      x0: 0.06,
      route_length_km: 0.20,
      conductor_cross_section: 2.50,
      resistance_20c: 7.41,
      specific_resistance: 0.00393,
      conductor_length_m: 150,
    },
    expected: {
      eal_req_value: 283.08,
      vk_value: 226.47,
      verdict: 'SUITABLY DIMENSIONED',
    }
  },
];

// Run validation tests
console.log('[v0] Starting validation tests...\n');

let passed = 0;
let failed = 0;

console.log('========== 7SJ85 KSSC METHOD TESTS ==========\n');
for (const test of test7SJ85) {
  console.log(`Testing: ${test.name}`);
  try {
    // Create mock device object for 7SJ85 calculator
    const device = {
      device_name: test.name,
      device_type: 'SIEMENS_7SJ85',
      ct_ratio: `${test.inputs.ct_ratio_primary}/${test.inputs.ct_ratio_secondary}`,
      accuracy_class: test.inputs.accuracy_class,
      rated_burden_va: test.inputs.rated_burden,
      ct_core: {
        ct_ratio_primary: test.inputs.ct_ratio_primary,
        ct_ratio_secondary: test.inputs.ct_ratio_secondary,
        ct_resistance: test.inputs.ct_resistance,
      },
      accuracy_limit_factor: test.inputs.alf,
      ct_wiring: {
        ct_resistance_w_km_20c: test.inputs.resistance_20c,
        ct_conductor_length_m: test.inputs.conductor_length_m,
      },
      system: {
        frequency: test.inputs.frequency,
        bus_voltage_kv: test.inputs.bus_voltage_kv,
        max_bus_fault_kA: test.inputs.max_bus_fault_kA,
        x_r_ratio: test.inputs.x_r_ratio,
      },
      protection: {
        wiring_burden_va: 5,  // Example, may vary
      },
    };

    const calc = new Siemens7SJ85Calculator();
    const result = calc.calculate(device);

    console.log(`  Available Kssc: ${result.available_kssc} (expected: ${test.expected.available_kssc})`);
    console.log(`  Required Kssc: ${result.required_kssc} (expected: ${test.expected.required_kssc})`);
    console.log(`  Verdict: ${result.verdict} (expected: ${test.expected.verdict})`);

    // Check with tolerance for floating point
    const tolerance = 0.1;
    const ksscAvailableMatch = Math.abs(result.available_kssc - test.expected.available_kssc) < tolerance;
    const ksscRequiredMatch = Math.abs(result.required_kssc - test.expected.required_kssc) < tolerance;
    const verdictMatch = result.verdict.includes(test.expected.verdict);

    if (ksscAvailableMatch && ksscRequiredMatch && verdictMatch) {
      console.log('  ✓ PASSED\n');
      passed++;
    } else {
      console.log('  ✗ FAILED\n');
      failed++;
    }
  } catch (err) {
    console.log(`  ✗ ERROR: ${err}\n`);
    failed++;
  }
}

console.log('\n========== RED670 VK METHOD TESTS ==========\n');
for (const test of testRED670) {
  console.log(`Testing: ${test.name}`);
  try {
    // Create mock device object for RED670 calculator
    const device = {
      device_name: test.name,
      device_type: 'ABB_RED670',
      ct_ratio: `${test.inputs.ct_ratio_primary}/${test.inputs.ct_ratio_secondary}`,
      accuracy_class: test.inputs.accuracy_class,
      vk: test.inputs.vk,
      i0_magnetizing_current: test.inputs.i0_magnetizing_current,
      ct_core: {
        ct_ratio_primary: test.inputs.ct_ratio_primary,
        ct_ratio_secondary: test.inputs.ct_ratio_secondary,
        ct_resistance: test.inputs.ct_resistance,
      },
      ct_wiring: {
        ct_resistance_w_km_20c: test.inputs.resistance_20c,
        ct_conductor_length_m: test.inputs.conductor_length_m,
      },
      system: {
        frequency: test.inputs.frequency,
        bus_voltage_kv: test.inputs.bus_voltage_kv,
        max_bus_fault_kA: test.inputs.max_bus_fault_kA,
        x_r_ratio: test.inputs.x_r_ratio,
      },
    };

    const calc = new RED670Calculator();
    const result = calc.calculate(device);

    console.log(`  Eal Req Value: ${result.ealreq_max} (expected: ${test.expected.eal_req_value})`);
    console.log(`  Vk Value: ${result.vk_required} (expected: ${test.expected.vk_value})`);
    console.log(`  Verdict: ${result.verdict} (expected: ${test.expected.verdict})`);

    // Check with tolerance for floating point
    const tolerance = 1.0;
    const ealReqMatch = Math.abs(result.ealreq_max - test.expected.eal_req_value) < tolerance;
    const vkMatch = Math.abs(result.vk_required - test.expected.vk_value) < tolerance;
    const verdictMatch = result.verdict.includes(test.expected.verdict);

    if (ealReqMatch && vkMatch && verdictMatch) {
      console.log('  ✓ PASSED\n');
      passed++;
    } else {
      console.log('  ✗ FAILED\n');
      failed++;
    }
  } catch (err) {
    console.log(`  ✗ ERROR: ${err}\n`);
    failed++;
  }
}

console.log(`\n========== SUMMARY ==========`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
