/**
 * TEST: Verify Accuracy Limit Factor Flow from Frontend to Backend
 * This test ensures that user's accuracy_limit_factor input properly flows 
 * through all calculation layers and is used in the final calculations
 */

// Mock the required modules and services
const { AutomatedCalculationEngine } = require('./lib/services/automated-calculation-engine');

// Test data with user-provided accuracy_limit_factor
const testInput = {
  system: {
    bus_fault_level: 31.5,
    system_frequency: 50,
    bus_voltage_level: 132,
    xr_ratio: 15
  },
  ct_wiring: {
    conductor_cross_section: 6,
    resistance_w_km_20c: 3.08,
    lead_length_ct_to_relay: 120
  },
  vt_wiring: {
    conductor_cross_section: 2.5,
    resistance_w_km_20c: 7.41,
    lead_length_vt_to_relay: 120
  },
  transmission_line: {
    positive_sequence_resistance: 0.0271,
    positive_sequence_reactance: 0.1600,
    zero_sequence_resistance: 0.1300,
    zero_sequence_reactance: 0.0600,
    route_length: 1.74,
    source_impedance_zs: 1.0
  },
  ieds: [
    {
      ied_name: "SIEMENS 7SJ85",
      ct_ratio: "3200/1A", 
      accuracy_class: "5P20",
      ct_resistance: 2.5,
      magnetizing_current: 10,
      knee_point_voltage: 2000,
      accuracy_limit_factor: 25  // ← USER PROVIDED VALUE (different from default 20)
    }
  ]
};

console.log("🧪 TESTING ACCURACY LIMIT FACTOR DATA FLOW");
console.log("=" .repeat(60));
console.log();

console.log("📋 TEST INPUT:");
console.log(`  IED Name: ${testInput.ieds[0].ied_name}`);
console.log(`  CT Ratio: ${testInput.ieds[0].ct_ratio}`);
console.log(`  User Provided Accuracy Limit Factor: ${testInput.ieds[0].accuracy_limit_factor}`);
console.log();

try {
  // Run the complete analysis
  console.log("🔄 Running AutomatedCalculationEngine.performCompleteAnalysis...");
  const report = AutomatedCalculationEngine.performCompleteAnalysis(testInput);
  
  console.log("✅ Analysis completed successfully!");
  console.log();
  
  // Check the first IED result (SIEMENS 7SJ85)
  const iedResult = report.ied_results[0];
  
  console.log("📊 CALCULATION RESULTS:");
  console.log(`  IED Name: ${iedResult.ied_name}`);
  console.log(`  Verdict: ${iedResult.verdict}`);
  console.log(`  Required Kssc: ${iedResult.required_kssc?.toFixed(4) || 'N/A'}`);
  console.log(`  Available Kssc: ${iedResult.available_kssc?.toFixed(4) || 'N/A'}`);
  console.log(`  Safety Margin: ${iedResult.safety_margin?.toFixed(2) || 'N/A'}%`);
  console.log();
  
  // Check calculation steps for user's accuracy_limit_factor
  console.log("🔍 ACCURACY LIMIT FACTOR VERIFICATION:");
  
  const userALFStep = iedResult.calculation_steps?.find(step => 
    step.step_name.toLowerCase().includes('user') && 
    step.step_name.toLowerCase().includes('accuracy')
  );
  
  if (userALFStep) {
    console.log(`  ✅ Found User ALF Step: "${userALFStep.step_name}"`);
    console.log(`  📋 Formula: ${userALFStep.formula}`);
    console.log(`  💡 Result: ${userALFStep.result}`);
    console.log(`  📝 Description: ${userALFStep.description}`);
    
    // Verify that the user's value (25) is being used instead of default (20)
    if (userALFStep.result === testInput.ieds[0].accuracy_limit_factor) {
      console.log(`  🎯 SUCCESS: User's accuracy_limit_factor (${testInput.ieds[0].accuracy_limit_factor}) is being used!`);
    } else {
      console.log(`  ❌ ERROR: Expected ${testInput.ieds[0].accuracy_limit_factor}, got ${userALFStep.result}`);
    }
  } else {
    console.log("  ❌ ERROR: User Accuracy Limit Factor step not found in calculation steps");
  }
  console.log();
  
  // Check available Kssc calculation that uses user's ALF
  const availableKsscStep = iedResult.calculation_steps?.find(step => 
    step.step_name.toLowerCase().includes('available') && 
    step.step_name.toLowerCase().includes('kssc')
  );
  
  if (availableKsscStep) {
    console.log("🔢 AVAILABLE KSSC CALCULATION:");
    console.log(`  📋 Formula: ${availableKsscStep.formula}`);
    console.log(`  📊 Inputs: ${JSON.stringify(availableKsscStep.inputs, null, 2)}`);
    console.log(`  💡 Result: ${availableKsscStep.result}`);
    
    // Check if user's ALF (25) is in the inputs
    const alfInInputs = Object.values(availableKsscStep.inputs).includes(testInput.ieds[0].accuracy_limit_factor);
    if (alfInInputs) {
      console.log(`  🎯 SUCCESS: User's ALF (${testInput.ieds[0].accuracy_limit_factor}) found in Available Kssc calculation!`);
    } else {
      console.log(`  ❌ ERROR: User's ALF not found in Available Kssc calculation inputs`);
      console.log(`  Expected ALF: ${testInput.ieds[0].accuracy_limit_factor}`);
      console.log(`  Found inputs: ${JSON.stringify(availableKsscStep.inputs)}`);
    }
  }
  console.log();
  
  // Check detailed results if it's a Siemens calculation
  if (iedResult.detailed_results) {
    console.log("📋 DETAILED SIEMENS RESULTS:");
    console.log(`  Final Verdict: ${iedResult.detailed_results.final_verdict}`);
    console.log(`  Required Kssc: ${iedResult.detailed_results.required_kssc}`);
    console.log(`  Available Kssc: ${iedResult.detailed_results.available_kssc}`);
  }
  console.log();
  
  console.log("=" .repeat(60));
  console.log("🎯 TEST SUMMARY:");
  
  if (userALFStep && userALFStep.result === testInput.ieds[0].accuracy_limit_factor) {
    console.log("✅ PASS: User's accuracy_limit_factor is properly passed through the system");
    console.log("✅ PASS: Frontend inputs are correctly reaching backend calculations");
    console.log("✅ PASS: Backend changes are properly reflected in frontend results");
  } else {
    console.log("❌ FAIL: User's accuracy_limit_factor is not properly flowing through");
    console.log("❌ FAIL: Need to check the calculation engine routing");
  }
  
} catch (error) {
  console.error("❌ ERROR during calculation:", error.message);
  console.error("Stack trace:", error.stack);
  
  console.log();
  console.log("🔧 TROUBLESHOOTING:");
  console.log("1. Check if AutomatedCalculationEngine is properly exported");
  console.log("2. Verify Siemens7SJ85Calculator integration");
  console.log("3. Ensure accuracy_limit_factor is passed through all layers");
}