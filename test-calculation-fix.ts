/**
 * TEST: Verify Siemens 7SJ85 Calculation Fix
 * Tests that accuracy_limit_factor is properly passed and calculations work correctly
 */

import { Siemens7SJ85Calculator } from '@/lib/services/siemens-7sj85-calculations';

// Test Case 1: Data from Standard Document ()
const testInput = {
 ct_wiring: {
 ct_conductor_cross_section: 6.00, // mm²
 ct_resistance_w_km_20c: 3.69, // Ω/km
 ct_specific_resistance_20c: 0.00393, // /K⁻¹
 ct_conductor_length_m: 120 // m
 },
 vt_wiring: {
 vt_conductor_cross_section: 2.50, // mm²
 vt_resistance_w_km_20c: 8.87, // Ω/km
 vt_specific_resistance_20c: 0.00393, // /K⁻¹
 vt_conductor_length_m: 120, // m
 primary_voltage: 132, // kV
 secondary_voltage: 0.11 // kV
 },
 system: {
 system_frequency: 50, // Hz
 bus_voltage_level: 132, // kV
 max_bus_fault_level: 50, // kA ← KEY: 1000 × 50 = 50,000 A
 xr_ratio: 15, // X/R ratio
 max_hv_busbar_fault_current: 50000, // A (reference only)
 hv_rating_of_busbar: 132000 // V (reference only)
 },
 power_line: {
 positive_seq_resistance_r1: 0.0221, // Ω/km
 positive_seq_reactance_x1: 0.1600, // Ω/km
 zero_seq_resistance_r0: 0.1300, // Ω/km
 zero_seq_reactance_x0: 0.0600, // Ω/km
 route_length: 1.74, // km
 cable_positive_seq_impedance: 0.1821, // Ω/km
 cable_zero_seq_impedance: 0.1900, // Ω/km
 total_cable_positive_seq_impedance: 0.0385, // Ω
 total_cable_zero_seq_impedance: 0.2262, // Ω
 source_impedance_zs: 0.05, // pu
 impedance_angle_in_radians: 1.5042 // radians
 },
 ct_core: {
 ct_ratio_primary: 3150, // A
 ct_ratio_secondary: 1, // A
 class_of_accuracy: '5P 20', // Class
 ct_resistance: 9, // Ω ← Internal resistance
 rated_burden: 7.5, // VA ← Rated burden
 CT_Accuracy_Limit_Factor: 20 // Reference only
 },
 connected_devices: {
 device_7sj85: 0.02 // VA ← Connected IED burden (REQUIRED by calculation)
 },
 // ✅ THIS IS THE FIX: accuracy_limit_factor at TOP-LEVEL
 accuracy_limit_factor: 20 // User-provided or default from CT test cert
};

console.log('========================================');
console.log('SIEMENS 7SJ85 CALCULATION TEST');
console.log('========================================\n');

console.log('INPUT DATA:');
console.log(` CT Ratio Primary: ${testInput.ct_core.ct_ratio_primary} A`);
console.log(` CT Resistance: ${testInput.ct_core.ct_resistance} Ω`);
console.log(` Rated Burden: ${testInput.ct_core.rated_burden} VA`);
console.log(` Device Burden (7SJ85): ${testInput.connected_devices.device_7sj85} VA`);
console.log(` Accuracy Limit Factor: ${testInput.accuracy_limit_factor}`);
console.log(` Max Bus Fault Level: ${testInput.system.max_bus_fault_level} kA`);
console.log(` CT Lead Length: ${testInput.ct_wiring.ct_conductor_length_m} m\n`);

try {
 const results = Siemens7SJ85Calculator.performCompleteCalculation(testInput);

 console.log('========== CALCULATION RESULTS ==========\n');

 // 1. CT CALCULATIONS
 console.log('1. CT WIRING CALCULATIONS:');
 console.log(` ✓ Resistance at 75°C: ${results.ct_calculations.resistance_at_75c?.toFixed(5)} Ω/km`);
 console.log(` ✓ Lead Resistance RL: ${results.ct_calculations.lead_resistance?.toFixed(2)} Ω`);
 console.log(` ✓ Loop Resistance 2RL: ${results.ct_calculations.loop_resistance?.toFixed(2)} Ω`);
 console.log(` ✓ VA Consumption Pl: ${results.ct_calculations.va_consumption?.toFixed(2)} VA`);
 console.log(` ✓ Total Load Burden: ${results.ct_calculations.total_load_burden?.toFixed(2)} VA`);
 console.log(` ✓ Total Load Other Burden: ${results.ct_calculations.total_load_other_burden?.toFixed(2)} VA\n`);

 // 2. FAULT CALCULATIONS
 console.log('2. FAULT CURRENT CALCULATIONS:');
 console.log(` ✓ System tp: ${results.fault_calculations.system_tp_ms?.toFixed(2)} ms`);
 console.log(` ✓ Max HV Busbar Fault Current: ${results.fault_calculations.max_hv_busbar_fault_current_a?.toFixed(0)} A`);
 console.log(` ✓ Through Fault Current: ${results.fault_calculations.through_fault_current_a?.toFixed(0)} A`);
 console.log(` ✓ Endzone-1 Fault Current: ${results.fault_calculations.endzone1_fault_current_a?.toFixed(0)} A\n`);

 // 3. BURDEN CALCULATIONS
 console.log('3. BURDEN CALCULATIONS:');
 console.log(` ✓ Internal Burden PE: ${results.burden_calculations.internal_burden_va?.toFixed(2)} VA`);
 console.log(` ✓ Total Load Burden: ${results.burden_calculations.total_load_burden_va?.toFixed(2)} VA`);
 console.log(` ✓ Total Load Other Burden: ${results.burden_calculations.total_load_other_burden_va?.toFixed(2)} VA\n`);

 // 4. CT ADEQUACY CHECK (THE CRITICAL PART)
 console.log('4. CT ADEQUACY CHECK:');
 console.log(` ✓ Required Kssc: ${results.required_kssc?.toFixed(2)}`);
 console.log(` ✓ Available Kssc: ${results.available_kssc?.toFixed(2)}`);
 
 // Check for NaN (which indicates the bug)
 if (isNaN(results.available_kssc)) {
 console.log(` ⚠️ ERROR: available_kssc is NaN (accuracy_limit_factor not passed correctly!)`);
 } else if (results.available_kssc > results.required_kssc) {
 console.log(` ✓ Adequacy: ${results.available_kssc?.toFixed(2)} > ${results.required_kssc?.toFixed(2)} ✅`);
 } else {
 console.log(` ✗ Adequacy: ${results.available_kssc?.toFixed(2)} < ${results.required_kssc?.toFixed(2)} ❌`);
 }
 console.log(` ✓ Verdict: ${results.final_verdict}\n`);

 // 5. VERIFICATION AGAINST EXPECTED VALUES
 console.log('========== VERIFICATION ==========\n');

 // Expected values from standard document
 const expectedResults = {
 required_kssc: 15.87, // 50000 / 3150
 available_kssc: 31.81, // 20 × ((9 + 7.5) / (9 + 0.02))
 internal_burden: 9.0, // 1² × 9
 loop_resistance: 1.08, // 2 × 0.54
 va_consumption: 1.08 // 1² × 0.54
 };

 console.log('EXPECTED vs ACTUAL:');
 const checks = [
 { name: 'Required Kssc', expected: expectedResults.required_kssc, actual: results.required_kssc, tolerance: 0.05 },
 { name: 'Available Kssc', expected: expectedResults.available_kssc, actual: results.available_kssc, tolerance: 0.5 },
 { name: 'Internal Burden', expected: expectedResults.internal_burden, actual: results.burden_calculations.internal_burden_va, tolerance: 0.1 },
 { name: 'Loop Resistance', expected: expectedResults.loop_resistance, actual: results.ct_calculations.loop_resistance, tolerance: 0.05 },
 { name: 'VA Consumption', expected: expectedResults.va_consumption, actual: results.ct_calculations.va_consumption, tolerance: 0.05 }
 ];

 let allPassed = true;
 checks.forEach(check => {
 const diff = Math.abs(check.expected - check.actual);
 const passed = diff <= check.tolerance;
 allPassed = allPassed && passed;
 const status = passed ? '✅' : '❌';
 console.log(` ${status} ${check.name.padEnd(20)} Expected: ${check.expected?.toFixed(2).padEnd(8)} Actual: ${check.actual?.toFixed(2).padEnd(8)} Diff: ${diff.toFixed(3)}`);
 });

 console.log('\n========================================');
 if (allPassed) {
 console.log('✅ ALL TESTS PASSED - Calculation Fix is Working!');
 } else {
 console.log('❌ SOME TESTS FAILED - Please review calculations');
 }
 console.log('========================================');

} catch (error) {
 console.error('\n❌ CALCULATION ERROR:');
 console.error(error instanceof Error ? error.message : String(error));
 console.error('\nThis indicates an issue with:');
 console.error(' 1. Input data structure');
 console.error(' 2. Missing parameters');
 console.error(' 3. Data type mismatches');
}
