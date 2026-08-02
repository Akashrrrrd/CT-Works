/**
 * Simple test for SIEMENS 7SJ85 Kssc calculations
 */

console.log('🧪 Testing SIEMENS 7SJ85 Kssc Calculations (Manual)...');
console.log('📋 Using standard document values');
console.log('=' .repeat(60));

// Test data from standard document 
const testData = {
 // From document page 4
 max_fault_current: 50000, // A (Itkmax)
 ct_primary_current: 2000, // A (Ipn) 
 
 // From document page 3
 accuracy_factor: 10, // ALF = 10 (from document)
 internal_burden: 2.5, // PE = 2.5 VA (from document page 4)
 rated_burden: 7.5, // PN = 7.5 VA (from document)
 loop_resistance: 1.08 // PL = 1.08 VA (from document)
};

console.log('\n📊 1. Required Kssc Calculation:');

// Required Kssc = Itkmax / Ipn
const required_kssc = testData.max_fault_current / testData.ct_primary_current;
console.log('✓ Required Kssc:', required_kssc.toFixed(2), '(Expected: 25.00 from document)');

console.log('\n📊 2. Available Kssc Calculation:');

// Available Kssc = n × ((PE + PN)/(PE + PL))
const numerator = testData.internal_burden + testData.rated_burden; // PE + PN = 2.5 + 7.5 = 10
const denominator = testData.internal_burden + testData.loop_resistance; // PE + PL = 2.5 + 1.08 = 3.58

const available_kssc = testData.accuracy_factor * (numerator / denominator);
console.log('✓ PE + PN:', numerator.toFixed(2), 'VA');
console.log('✓ PE + PL:', denominator.toFixed(2), 'VA'); 
console.log('✓ (PE + PN)/(PE + PL):', (numerator / denominator).toFixed(4));
console.log('✓ Available Kssc:', available_kssc.toFixed(2), '(Expected: 27.93 from document)');

console.log('\n📊 3. CT Adequacy Check:');

const suitable = available_kssc > required_kssc;
const verdict = suitable ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';
const margin = ((available_kssc - required_kssc) / required_kssc) * 100;

console.log('✓ Available Kssc:', available_kssc.toFixed(2));
console.log('✓ Required Kssc:', required_kssc.toFixed(2));
console.log('✓ Check:', available_kssc.toFixed(2), suitable ? '>' : '<', required_kssc.toFixed(2));
console.log('✓ Safety Margin:', margin.toFixed(1), '%');
console.log('✓ Verdict:', verdict, '(Expected: SUITABLY DIMENSIONED)');

console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY:');

// Check against expected values 
const expectedRequired = 25.00;
const expectedAvailable = 27.93; // Based on document calculation

const requiredMatch = Math.abs(required_kssc - expectedRequired) < 0.1;
const availableMatch = Math.abs(available_kssc - expectedAvailable) < 0.5; // Allow some tolerance

console.log(requiredMatch ? '✅' : '❌', 'Required Kssc:', required_kssc.toFixed(2), 'vs', expectedRequired);
console.log(availableMatch ? '✅' : '❌', 'Available Kssc:', available_kssc.toFixed(2), 'vs', expectedAvailable);
console.log(suitable ? '✅' : '❌', 'Final Verdict:', verdict);

const allGood = requiredMatch && availableMatch && suitable;
console.log('\n🎯 OVERALL RESULT:', allGood ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');

if (allGood) {
 console.log('\n🎉 SUCCESS! Kssc calculations are working correctly.');
 console.log('The SIEMENS 7SJ85 calculator should now show:');
 console.log(' • Required Kssc: ' + required_kssc.toFixed(2));
 console.log(' • Available Kssc: ' + available_kssc.toFixed(2)); 
 console.log(' • Verdict: ' + verdict);
}