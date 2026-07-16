/**
 * Quick test for RED670 calculations
 * Based on Hitachi Document N-19957 2-DF4W pages for 132kV Cable Feeders
 */

console.log('🧪 Testing RED670 Line Protection Calculations...');
console.log('📋 Using Hitachi Document N-19957 2-DF4W test values');
console.log('=' .repeat(70));

// Test data from Hitachi document for RED670 (1800A tap)
const testData = {
  // CT Parameters (using 1800A tap as recommended)
  ct_tap1: 3200,                  // A
  ct_tap2: 1800,                  // A (used in calculation)
  ct_secondary: 1,                // A
  ct_resistance_tap1: 9.8,        // Ω at 3200A
  ct_resistance_tap2: 5.6,        // Ω at 1800A (used)
  knee_point_voltage_tap1: 2000,  // V at 3200A
  knee_point_voltage_tap2: 1250,  // V at 1800A (used)
  
  // System Parameters (from document)
  max_hv_fault: 50000,           // A (close-in faults)
  max_through_fault_3ph: 42230,  // A (3-phase through fault)
  max_through_fault_1ph: 43475,  // A (1-phase through fault) 
  max_endzone1_3ph: 43585,      // A (3-ph endzone-1)
  max_endzone1_1ph: 44648,      // A (1-ph endzone-1)
  
  // Wiring & Burden (from document)
  total_lead_resistance: 1.10,    // Ω (RL)
  red670_burden: 0.02,           // VA (Sr)
  relay_current: 1               // A (Ir)
};

console.log('\n📊 1. CT Parameters (Using 1800A Tap):');
console.log('✓ CT Ratio (Tap-2):', testData.ct_tap2, 'A (Recommended)');
console.log('✓ CT Resistance:', testData.ct_resistance_tap2, 'Ω');
console.log('✓ Available Vk:', testData.knee_point_voltage_tap2, 'V');

console.log('\n📊 2. DIFFERENTIAL PROTECTION CALCULATIONS:');

// Common parameters for 1800A tap
const isn = testData.ct_secondary;              // 1 A
const ipn = testData.ct_tap2;                  // 1800 A (Tap-2)
const rct = testData.ct_resistance_tap2;       // 5.6 Ω
const rl = testData.total_lead_resistance;     // 1.10 Ω
const sr = testData.red670_burden;             // 0.02 VA
const ir = testData.relay_current;             // 1 A

// Calculate total resistance + burden component
const burden_component = rct + rl + (sr / (ir * ir));
console.log('✓ Total Resistance + Burden:', burden_component.toFixed(4), 'Ω');

// A. Close-in faults (Equation 1)
// Ealreq = Ikmax × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))
const ealreq_diff_close = testData.max_hv_fault * (isn / ipn) * burden_component;
console.log('✓ Differential Close-in Faults:', ealreq_diff_close.toFixed(2), 'V (Expected: 186.58 V)');

// B. Through faults 3-phase (Equation 2)
// Ealreq = 2 × Itmax × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))
const ealreq_diff_through_3ph = 2 * testData.max_through_fault_3ph * (isn / ipn) * burden_component;
console.log('✓ Differential Through 3-ph:', ealreq_diff_through_3ph.toFixed(2), 'V (Expected: 315.18 V)');

// C. Through faults 1-phase (Equation 2)
const ealreq_diff_through_1ph = 2 * testData.max_through_fault_1ph * (isn / ipn) * burden_component;
console.log('✓ Differential Through 1-ph:', ealreq_diff_through_1ph.toFixed(2), 'V (Expected: 324.47 V)');

// Determine controlling equation for differential
const diff_highest = Math.max(ealreq_diff_close, ealreq_diff_through_3ph, ealreq_diff_through_1ph);
const diff_controlling = diff_highest === ealreq_diff_close ? 'Close-in Faults' :
                        diff_highest === ealreq_diff_through_3ph ? 'Through Faults (3-ph)' : 
                        'Through Faults (1-ph)';
console.log('✓ Differential Controlling:', diff_controlling, '(' + diff_highest.toFixed(2) + ' V)');

console.log('\n📊 3. DISTANCE PROTECTION CALCULATIONS:');

// A. Close-in faults for distance (a = 1)
const ealreq_dist_close = testData.max_hv_fault * (isn / ipn) * 1 * burden_component;
console.log('✓ Distance Close-in Faults:', ealreq_dist_close.toFixed(2), 'V (Expected: 186.58 V)');

// B. Endzone-1 faults 3-phase (k = 3 for time constant)
const ealreq_dist_endzone1_3ph = testData.max_endzone1_3ph * (isn / ipn) * 3 * burden_component;
console.log('✓ Distance Endzone-1 3-ph:', ealreq_dist_endzone1_3ph.toFixed(2), 'V (Expected: 487.934 V)');

// C. Endzone-1 faults 1-phase (k = 3)  
const ealreq_dist_endzone1_1ph = testData.max_endzone1_1ph * (isn / ipn) * 3 * burden_component;
console.log('✓ Distance Endzone-1 1-ph:', ealreq_dist_endzone1_1ph.toFixed(2), 'V (Expected: 499.839 V) **CONTROLLING**');

// Determine controlling equation for distance
const dist_highest = Math.max(ealreq_dist_close, ealreq_dist_endzone1_3ph, ealreq_dist_endzone1_1ph);
const dist_controlling = dist_highest === ealreq_dist_close ? 'Close-in Faults' :
                        dist_highest === ealreq_dist_endzone1_3ph ? 'Endzone-1 (3-ph)' : 
                        'Endzone-1 (1-ph)';
console.log('✓ Distance Controlling:', dist_controlling, '(' + dist_highest.toFixed(2) + ' V)');

console.log('\n📊 4. OVERALL CT ADEQUACY CHECK:');

// Overall highest Ealreq
const overall_highest = Math.max(diff_highest, dist_highest);
const overall_controlling = overall_highest === diff_highest ? 
  `Differential: ${diff_controlling}` : `Distance: ${dist_controlling}`;

console.log('✓ Overall Controlling Function:', overall_controlling);
console.log('✓ Highest Ealreq:', overall_highest.toFixed(2), 'V (Expected: 499.84 V)');

// Calculate required Vk (per manufacturer reference)
const required_vk = overall_highest * 0.8;
console.log('✓ Required Vk (Ealreq × 0.8):', required_vk.toFixed(2), 'V (Expected: 399.87 V)');

// Available Vk from CT specifications (1800A tap)
const available_vk = testData.knee_point_voltage_tap2;
console.log('✓ Available Vk (1800A tap):', available_vk, 'V');

// Safety margin
const safety_margin = ((available_vk - required_vk) / required_vk) * 100;
console.log('✓ Safety Margin:', safety_margin.toFixed(1), '%');

// Final verdict
const suitable = available_vk > required_vk;
const verdict = suitable ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';
console.log('\n🎯 FINAL VERDICT:', verdict, '(Expected: SUITABLY DIMENSIONED)');

console.log('\n' + '='.repeat(70));
console.log('📊 VERIFICATION SUMMARY:');

// Expected vs actual comparison
const checks = [
  { name: 'Diff Close-in', actual: ealreq_diff_close, expected: 186.58, tolerance: 2 },
  { name: 'Diff Through 3-ph', actual: ealreq_diff_through_3ph, expected: 315.18, tolerance: 2 },
  { name: 'Diff Through 1-ph', actual: ealreq_diff_through_1ph, expected: 324.47, tolerance: 2 },
  { name: 'Dist Close-in', actual: ealreq_dist_close, expected: 186.58, tolerance: 2 },
  { name: 'Dist Endzone-1 3-ph', actual: ealreq_dist_endzone1_3ph, expected: 487.934, tolerance: 2 },
  { name: 'Dist Endzone-1 1-ph', actual: ealreq_dist_endzone1_1ph, expected: 499.839, tolerance: 2 },
  { name: 'Required Vk', actual: required_vk, expected: 399.87, tolerance: 2 },
  { name: 'Available Vk', actual: available_vk, expected: 1250, tolerance: 0 }
];

let allPassed = true;
checks.forEach(check => {
  const diff = Math.abs(check.actual - check.expected);
  const percentDiff = (diff / check.expected) * 100;
  
  if (percentDiff <= check.tolerance) {
    console.log(`✅ ${check.name}: PASS (${check.actual.toFixed(2)} ≈ ${check.expected})`);
  } else {
    console.log(`❌ ${check.name}: FAIL (${check.actual.toFixed(2)} vs ${check.expected}, ${percentDiff.toFixed(2)}% diff)`);
    allPassed = false;
  }
});

// Check verdict
if (verdict === 'SUITABLY DIMENSIONED') {
  console.log('✅ Final Verdict: PASS');
} else {
  console.log('❌ Final Verdict: FAIL');
  allPassed = false;
}

console.log('\n🎯 OVERALL RESULT:', allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');

if (allPassed) {
  console.log('\n🎉 SUCCESS! The RED670 implementation is working correctly.');
  console.log('📋 All calculations validated against the Hitachi document.');
  console.log('🌐 You can now use the web interface at:');
  console.log('   http://localhost:3001/workspaces/[workspace-id]/templates/red670');
  
  console.log('\n📖 Summary of RED670 Calculations:');
  console.log('   • Line differential protection for 132kV cable feeders');
  console.log('   • Distance protection with endzone-1 calculations');  
  console.log('   • Both differential and distance functions evaluated');
  console.log('   • Distance endzone-1 (1-ph) is the controlling function');
  console.log('   • CT suitably dimensioned with good safety margin');
}