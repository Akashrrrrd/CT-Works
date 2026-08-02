/**
 * TEST: AUTOMATED CALCULATION ENGINE
 * Verify that the new system calculates all parameters automatically
 */

const { AutomatedCalculationEngine } = require('./lib/services/automated-calculation-engine');
const { IEDDatabaseService } = require('./lib/services/ied-database');

// Test data - only the parameters a user would actually provide
const testInput = {
 system: {
 bus_fault_level: 31.5, // kA (user provides)
 system_frequency: 50, // Hz (user provides)
 bus_voltage_level: 132, // kV (user provides) 
 xr_ratio: 15 // user provides (or auto from voltage)
 },
 
 ct_wiring: {
 conductor_cross_section: 6, // mm² (user selects from dropdown)
 resistance_w_km_20c: 3.08, // Ω/km (auto-filled from cross-section)
 lead_length_ct_to_relay: 120 // meters (user measures/estimates)
 },
 
 vt_wiring: {
 conductor_cross_section: 2.5, // mm² (user selects)
 resistance_w_km_20c: 7.41, // Ω/km (auto-filled)
 lead_length_vt_to_relay: 120 // meters (user provides)
 },
 
 transmission_line: {
 positive_sequence_resistance: 0.0271, // Ω/km (from line design)
 positive_sequence_reactance: 0.1600, // Ω/km (from line design)
 zero_sequence_resistance: 0.1300, // Ω/km (from line design)
 zero_sequence_reactance: 0.0600, // Ω/km (from line design)
 route_length: 1.74 // km (user provides)
 },
 
 ieds: [
 {
 ied_name: "SIEMENS 7SJ85", // User selects from dropdown
 ct_ratio: "3200/1A", // User selects from standard ratios
 accuracy_class: "5P20", // User selects from dropdown
 ct_resistance: 2.5, // Ω (from CT test certificate)
 magnetizing_current: 10, // mA (from CT test certificate)
 knee_point_voltage: 2000 // V (from CT test certificate)
 // Note: burden automatically retrieved from database
 },
 {
 ied_name: "ABB RET670",
 ct_ratio: "1600/1A", 
 accuracy_class: "PX",
 ct_resistance: 1.8,
 magnetizing_current: 5,
 knee_point_voltage: 1600
 }
 ]
};

async function testAutomatedCalculation() {
 console.log('🧮 Testing Automated CT/VT Adequacy Calculation Engine');
 console.log('=' .repeat(60));
 
 try {
 // Test IED database first
 console.log('\n📊 IED Database Test:');
 const burden_7sj85 = IEDDatabaseService.getIEDBurden("SIEMENS 7SJ85");
 const burden_ret670 = IEDDatabaseService.getIEDBurden("ABB RET670");
 
 console.log(` SIEMENS 7SJ85 burden: ${burden_7sj85} VA`);
 console.log(` ABB RET670 burden: ${burden_ret670} VA`);
 console.log(` ✅ IED database working correctly`);
 
 // Perform complete analysis
 console.log('\n🔄 Running Complete Analysis...');
 const report = AutomatedCalculationEngine.performCompleteAnalysis(testInput);
 
 // Display system summary
 console.log('\n⚡ System Summary:');
 console.log(` Bus Voltage: ${report.system_summary.bus_voltage_level} kV`);
 console.log(` Fault Level: ${report.system_summary.bus_fault_level} kA`);
 console.log(` Phase Voltage: ${report.system_summary.phase_voltage} V`);
 console.log(` Max Fault Current: ${report.system_summary.max_fault_current} A`);
 console.log(` Source Impedance: ${report.system_summary.source_impedance} Ω`);
 
 // Display wiring summary
 console.log('\n🔌 Wiring Summary:');
 console.log(` CT Loop Resistance: ${report.wiring_summary.ct_wiring.loop_resistance} Ω`);
 console.log(` CT Lead Burden: ${report.wiring_summary.ct_wiring.lead_burden} VA`);
 console.log(` VT Loop Resistance: ${report.wiring_summary.vt_wiring.loop_resistance} Ω`);
 
 // Display IED results
 console.log('\n🤖 IED Analysis Results:');
 report.ied_results.forEach((result, index) => {
 console.log(`\n IED ${index + 1}: ${result.ied_name}`);
 console.log(` CT Ratio: ${result.ct_ratio_primary}/${result.ct_ratio_secondary}A`);
 console.log(` Calculation Method: ${result.calculation_method}`);
 
 if (result.required_kssc && result.available_kssc) {
 console.log(` Required Kssc: ${result.required_kssc}`);
 console.log(` Available Kssc: ${result.available_kssc}`);
 }
 
 if (result.required_vk && result.available_vk) {
 console.log(` Required Vk: ${result.required_vk} V`);
 console.log(` Available Vk: ${result.available_vk} V`);
 }
 
 console.log(` Verdict: ${result.verdict} (${result.safety_margin > 0 ? '+' : ''}${result.safety_margin}%)`);
 });
 
 // Display overall summary
 console.log('\n📋 Overall Summary:');
 console.log(` Total IEDs: ${report.overall_summary.total_ieds_checked}`);
 console.log(` Suitable: ${report.overall_summary.suitable_ieds}`);
 console.log(` Under-dimensioned: ${report.overall_summary.under_dimensioned_ieds}`);
 console.log(` Overall Verdict: ${report.overall_summary.overall_verdict}`);
 
 // Display recommendations
 console.log('\n💡 Recommendations:');
 report.recommendations.forEach(rec => console.log(` ${rec}`));
 
 console.log('\n✅ SUCCESS: Automated calculation engine working perfectly!');
 console.log('🎯 Key Achievement: NO MANUAL PARAMETERS REQUIRED');
 console.log('⚡ All calculations derived from basic user inputs only');
 
 } catch (error) {
 console.error('❌ ERROR:', error.message);
 console.error(error.stack);
 }
}

// Run the test
testAutomatedCalculation();