/**
 * SIEMENS 7SJ85 CALCULATION VERIFICATION TEST
 * Tests against exact values from Hitachi Document N-19957 2-DF4W
 */

import { Siemens7SJ85Calculator } from '../lib/services/siemens-7sj85-calculations';

// Exact input values from Hitachi document
const HITACHI_TEST_DATA = {
  ct_wiring: {
    conductor_cross_section: 6.00,      // mm² (from document)
    resistance_w_km_20c: 3.69,          // Ω/km (from document)
    specific_resistance_20c: 0.00393,   // /K⁻¹ (from document)
    conductor_length_m: 120             // m (from document)
  },
  vt_wiring: {
    conductor_cross_section: 2.50,      // mm² (from document)
    resistance_w_km_20c: 8.87,          // Ω/km (from document) 
    specific_resistance_20c: 0.00393,   // /K⁻¹ (from document)
    conductor_length_m: 120,            // m (from document)
    primary_voltage: 132,               // kV (from document)
    secondary_voltage: 0.11             // kV (from document)
  },
  system: {
    system_frequency: 50,               // Hz (from document)
    bus_voltage_level: 132,             // kV (from document)
    max_bus_fault_level: 50,            // kA (from document)
    xr_ratio: 15,                       // X/R ratio (from document)
    mv_bus_voltage_level: 132,          // kV (from document)
    mv_max_bus_fault_rating: 40         // kA (from document)
  },
  power_line: {
    assumed_cable: 3,                   // Number of cables (from document)
    cable_type: 'CU HDPE',              // Cable type (from document)
    cable_mm2: 240,                     // mm² (from document)
    cables_per_phase: 1,                // Cables per phase (from document)
    positive_seq_resistance_r1: 0.0221, // Ω/km (from document)
    positive_seq_reactance_x1: 0.1600,  // Ω/km (from document)
    zero_seq_resistance_r0: 0.1300,     // Ω/km (from document)
    zero_seq_reactance_x0: 0.0600,      // Ω/km (from document)
    route_length: 1.74                  // km (from document)
  },
  ct_core: {
    ct_ratio_primary: 3150,             // A (from document)
    ct_ratio_secondary: 1,              // A (from document)
    class_of_accuracy: '5P 20',         // Class (from document)
    ct_resistance: 9,                   // Ω (from document)
    rated_burden: 7.5                   // VA (from document)
  },
  connected_devices: {
    device_7sj85: 0.02,                 // VA (from document)
    device_sel751: 0.02,                // VA (from document)
    device_fms: 0.06,                   // VA (from document)
    device_avr: 0.20                    // VA (from document)
  }
};

// Expected results from Hitachi document
const EXPECTED_RESULTS = {
  // CT Calculations (Page 1)
  ct_resistance_at_75c: 4.48759,       // Ω/km (from document)
  ct_lead_resistance: 0.54,            // Ω (from document)
  ct_loop_resistance: 1.08,            // Ω (from document) 
  ct_va_consumption: 1.08,             // VA (from document)

  // VT Calculations (Page 1)
  vt_resistance_at_75c: 10.7873,       // Ω/km (from document)
  vt_lead_resistance: 1.29,            // Ω (from document)
  vt_loop_resistance: 2.59,            // Ω (from document)

  // Fault Calculations (Pages 3-4)
  system_tp_ms: 40.94,                 // ms (from document)
  through_fault_current_a: 43475,      // A (from document)
  endzone1_fault_current_a: 43585,     // A (from document)
  xr_ratio_through: 8.60,              // X/R ratio (from document)
  xr_ratio_endzone1: 13.19,            // X/R ratio (from document)

  // CT Adequacy Check (Pages 5-6)
  internal_burden_va: 9.00,            // VA (PE = In × In × Rct = 1² × 9)
  required_kssc: 10.00,                // Kssc' = 31500 / 3150
  available_kssc: 31.81,               // Kssc (from document calculation)
  final_verdict: 'SUITABLY DIMENSIONED' // Final result (from document)
};

/**
 * Run verification test against Hitachi document values
 */
export function runVerificationTest(): { 
  success: boolean; 
  results: any; 
  errors: string[]; 
  summary: string 
} {
  const errors: string[] = [];
  
  console.log('🧪 Running SIEMENS 7SJ85 Verification Test');
  console.log('📋 Testing against Hitachi Document N-19957 2-DF4W');
  console.log('=' .repeat(60));

  // Run the calculation
  const results = Siemens7SJ85Calculator.performCompleteCalculation(HITACHI_TEST_DATA);

  // Tolerance for floating-point comparisons
  const tolerance = 0.01; // 1% tolerance

  function compareValues(actual: number, expected: number, name: string): boolean {
    const diff = Math.abs(actual - expected);
    const percentDiff = (diff / expected) * 100;
    
    if (percentDiff <= tolerance) {
      console.log(`✅ ${name}: ${actual.toFixed(5)} (Expected: ${expected}) - MATCH`);
      return true;
    } else {
      const error = `❌ ${name}: ${actual.toFixed(5)} (Expected: ${expected}) - MISMATCH (${percentDiff.toFixed(2)}% difference)`;
      console.log(error);
      errors.push(error);
      return false;
    }
  }

  console.log('\n📊 CT Wiring Calculations:');
  compareValues(results.ct_calculations.resistance_at_75c, EXPECTED_RESULTS.ct_resistance_at_75c, 'CT Resistance at 75°C');
  compareValues(results.ct_calculations.lead_resistance, EXPECTED_RESULTS.ct_lead_resistance, 'CT Lead Resistance');
  compareValues(results.ct_calculations.loop_resistance, EXPECTED_RESULTS.ct_loop_resistance, 'CT Loop Resistance');
  compareValues(results.ct_calculations.va_consumption, EXPECTED_RESULTS.ct_va_consumption, 'CT VA Consumption');

  console.log('\n📊 VT Wiring Calculations:');
  if (results.vt_calculations) {
    compareValues(results.vt_calculations.resistance_at_75c, EXPECTED_RESULTS.vt_resistance_at_75c, 'VT Resistance at 75°C');
    compareValues(results.vt_calculations.lead_resistance, EXPECTED_RESULTS.vt_lead_resistance, 'VT Lead Resistance');
    compareValues(results.vt_calculations.loop_resistance, EXPECTED_RESULTS.vt_loop_resistance, 'VT Loop Resistance');
  }

  console.log('\n📊 Fault Current Calculations:');
  compareValues(results.fault_calculations.system_tp_ms, EXPECTED_RESULTS.system_tp_ms, 'System Time Constant');
  compareValues(results.fault_calculations.through_fault_current_a, EXPECTED_RESULTS.through_fault_current_a, 'Through Fault Current');
  compareValues(results.fault_calculations.endzone1_fault_current_a, EXPECTED_RESULTS.endzone1_fault_current_a, 'Endzone-1 Fault Current');

  console.log('\n📊 CT Adequacy Check:');
  compareValues(results.burden_calculations.internal_burden_va, EXPECTED_RESULTS.internal_burden_va, 'Internal Burden');
  compareValues(results.adequacy_check.required_kssc, EXPECTED_RESULTS.required_kssc, 'Required Kssc');
  compareValues(results.adequacy_check.available_kssc, EXPECTED_RESULTS.available_kssc, 'Available Kssc');

  console.log('\n📊 Final Verdict:');
  if (results.final_verdict === EXPECTED_RESULTS.final_verdict) {
    console.log(`✅ Final Verdict: ${results.final_verdict} - MATCH`);
  } else {
    const error = `❌ Final Verdict: ${results.final_verdict} (Expected: ${EXPECTED_RESULTS.final_verdict}) - MISMATCH`;
    console.log(error);
    errors.push(error);
  }

  console.log('\n' + '='.repeat(60));
  
  const success = errors.length === 0;
  const summary = success 
    ? `🎉 ALL TESTS PASSED! Implementation matches Hitachi document exactly.`
    : `❌ ${errors.length} test(s) failed. See details above.`;
    
  console.log(summary);

  return { success, results, errors, summary };
}

// Export for use in other files
export { HITACHI_TEST_DATA, EXPECTED_RESULTS };