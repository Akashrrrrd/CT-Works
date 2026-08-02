/**
 * MANUAL VERIFICATION CALCULATION
 * Using direct calculations to give you exact expected values for website testing
 */

// Test input data exactly as you should enter on the website
const testData = {
 // System Parameters (Step 2)
 bus_voltage_kv: 132,
 fault_level_ka: 31.5,
 frequency: 50,
 xr_ratio: 15,
 
 // Line Parameters (Step 4)
 r1: 0.0271, // Ω/km
 x1: 0.1600, // Ω/km
 r0: 0.1300, // Ω/km
 x0: 0.0600, // Ω/km
 route_length: 1.74, // km
 
 // CT Wiring (Step 3)
 ct_cable_size: 6, // mm²
 ct_resistance_20c: 3.08, // Ω/km
 ct_lead_length: 120, // meters
 
 // VT Wiring (Step 3)
 vt_cable_size: 2.5, // mm²
 vt_resistance_20c: 7.41, // Ω/km
 vt_lead_length: 120, // meters
 
 // IEDs (Step 5)
 ieds: [
 {
 name: "SIEMENS 7SJ85",
 ct_ratio_primary: 3200,
 ct_ratio_secondary: 1,
 accuracy_class: "5P20",
 ct_resistance: 2.5, // Ω
 knee_point_voltage: 2000, // V
 ied_burden: 0.5 // VA (from database)
 },
 {
 name: "ABB RET670", 
 ct_ratio_primary: 1600,
 ct_ratio_secondary: 1,
 accuracy_class: "PX",
 ct_resistance: 1.8, // Ω
 knee_point_voltage: 1600, // V
 ied_burden: 0.1 // VA (from database)
 },
 {
 name: "SEL 751",
 ct_ratio_primary: 1600,
 ct_ratio_secondary: 1,
 accuracy_class: "5P20",
 ct_resistance: 1.5, // Ω
 knee_point_voltage: 1200, // V
 ied_burden: 0.33 // VA (from database)
 }
 ]
};

function calculateExpectedResults() {
 console.log('🧪 MANUAL VERIFICATION - Expected Website Results');
 console.log('=' .repeat(65));
 
 // 1. System Calculations
 console.log('\n⚡ SYSTEM CALCULATIONS:');
 const phase_voltage = (testData.bus_voltage_kv * 1000) / Math.sqrt(3);
 const max_fault_current = testData.fault_level_ka * 1000;
 const source_impedance = phase_voltage / max_fault_current;
 
 const theta = Math.atan(testData.xr_ratio);
 const source_resistance = source_impedance * Math.cos(theta);
 const source_reactance = source_impedance * Math.sin(theta);
 const time_constant = testData.xr_ratio / (2 * Math.PI * testData.frequency);
 
 console.log(`✓ Phase Voltage: ${phase_voltage.toFixed(0)} V`);
 console.log(`✓ Max Fault Current: ${max_fault_current.toFixed(0)} A`);
 console.log(`✓ Source Impedance: ${source_impedance.toFixed(4)} Ω`);
 console.log(`✓ Source Resistance: ${source_resistance.toFixed(4)} Ω`);
 console.log(`✓ Source Reactance: ${source_reactance.toFixed(4)} Ω`);
 console.log(`✓ Time Constant: ${time_constant.toFixed(4)} s`);
 
 // 2. Wiring Calculations
 console.log('\n🔌 WIRING CALCULATIONS:');
 const operating_temp = 50; // Conservative outdoor temperature
 const temp_coeff = 0.00393; // Copper temperature coefficient
 
 // CT wiring
 const ct_resistance_temp = testData.ct_resistance_20c * (1 + temp_coeff * (operating_temp - 20));
 const ct_lead_resistance = (testData.ct_lead_length / 1000) * ct_resistance_temp;
 const ct_loop_resistance = 2 * ct_lead_resistance; // Go + return
 
 // VT wiring 
 const vt_resistance_temp = testData.vt_resistance_20c * (1 + temp_coeff * (operating_temp - 20));
 const vt_lead_resistance = (testData.vt_lead_length / 1000) * vt_resistance_temp;
 const vt_loop_resistance = 2 * vt_lead_resistance;
 
 console.log(`✓ CT Resistance @ ${operating_temp}°C: ${ct_resistance_temp.toFixed(4)} Ω/km`);
 console.log(`✓ CT Loop Resistance: ${ct_loop_resistance.toFixed(4)} Ω`);
 console.log(`✓ VT Resistance @ ${operating_temp}°C: ${vt_resistance_temp.toFixed(4)} Ω/km`);
 console.log(`✓ VT Loop Resistance: ${vt_loop_resistance.toFixed(4)} Ω`);
 
 // 3. Zone 1 Fault Calculations (80% reach)
 console.log('\n⚡ ZONE 1 FAULT CALCULATIONS:');
 const reach = 0.8;
 
 const z1_r = testData.r1 * testData.route_length;
 const z1_x = testData.x1 * testData.route_length;
 const z0_r = testData.r0 * testData.route_length;
 const z0_x = testData.x0 * testData.route_length;
 
 const zone1_r = source_resistance + (reach * z1_r);
 const zone1_x = source_reactance + (reach * z1_x);
 const zone1_impedance = Math.sqrt(zone1_r * zone1_r + zone1_x * zone1_x);
 
 const zone1_fault_3ph = phase_voltage / zone1_impedance;
 
 // 1-phase fault calculation
 const seq_r = zone1_r + zone1_r + (source_resistance + reach * z0_r);
 const seq_x = zone1_x + zone1_x + (source_reactance + reach * z0_x);
 const seq_impedance = Math.sqrt(seq_r * seq_r + seq_x * seq_x);
 const zone1_fault_1ph = (3 * phase_voltage) / seq_impedance;
 
 console.log(`✓ Zone 1 Impedance: ${zone1_impedance.toFixed(4)} Ω`);
 console.log(`✓ Zone 1 3-phase Fault: ${zone1_fault_3ph.toFixed(0)} A`);
 console.log(`✓ Zone 1 1-phase Fault: ${zone1_fault_1ph.toFixed(0)} A`);
 
 // 4. IED Calculations
 console.log('\n📊 IED ADEQUACY CALCULATIONS:');
 console.log('');
 
 testData.ieds.forEach((ied, index) => {
 console.log(`🤖 IED ${index + 1}: ${ied.name}`);
 
 // Basic parameters
 const ratio = ied.ct_ratio_secondary / ied.ct_ratio_primary;
 console.log(` CT Ratio: ${ied.ct_ratio_primary}/${ied.ct_ratio_secondary}A`);
 console.log(` Accuracy: ${ied.accuracy_class}`);
 console.log(` CT Resistance: ${ied.ct_resistance} Ω`);
 console.log(` Available Vk: ${ied.knee_point_voltage} V`);
 console.log(` IED Burden: ${ied.ied_burden} VA (from database)`);
 
 // Burden calculations
 const ct_internal_burden = Math.pow(ied.ct_ratio_secondary, 2) * ied.ct_resistance;
 const lead_burden = Math.pow(ied.ct_ratio_secondary, 2) * ct_loop_resistance;
 const total_burden = ct_internal_burden + lead_burden + ied.ied_burden;
 
 console.log(` \n Burden Analysis:`);
 console.log(` ├─ CT Internal Burden: ${ct_internal_burden.toFixed(3)} VA`);
 console.log(` ├─ Lead Burden: ${lead_burden.toFixed(3)} VA`);
 console.log(` ├─ IED Burden: ${ied.ied_burden} VA`);
 console.log(` └─ Total Burden: ${total_burden.toFixed(3)} VA`);
 
 // Adequacy calculations
 console.log(` \n Adequacy Check:`);
 
 // KSSC Method (for protection classes)
 if (ied.accuracy_class.includes('P')) {
 const required_kssc = max_fault_current / ied.ct_ratio_primary;
 
 // Extract ALF from accuracy class (e.g., "5P20" -> 20)
 const alf_match = ied.accuracy_class.match(/(\d+)P(\d+)/);
 const alf = alf_match ? parseInt(alf_match[2]) : 20;
 
 const rated_burden = 10; // Typical rated burden for protection CTs
 const available_kssc = alf * (ct_internal_burden + rated_burden) / (ct_internal_burden + lead_burden);
 
 const kssc_margin = ((available_kssc - required_kssc) / required_kssc) * 100;
 
 console.log(` ├─ KSSC Method (ALF=${alf}):`);
 console.log(` │ ├─ Required Kssc: ${required_kssc.toFixed(2)}`);
 console.log(` │ ├─ Available Kssc: ${available_kssc.toFixed(2)}`);
 console.log(` │ └─ Margin: ${kssc_margin > 0 ? '+' : ''}${kssc_margin.toFixed(0)}%`);
 }
 
 // Vk Method (universal)
 const max_secondary_fault = Math.max(
 max_fault_current * ratio,
 zone1_fault_3ph * ratio,
 zone1_fault_1ph * ratio
 );
 
 const burden_resistance = ied.ied_burden / Math.pow(ied.ct_ratio_secondary, 2);
 const required_vk = max_secondary_fault * (ied.ct_resistance + ct_loop_resistance + burden_resistance);
 const vk_margin = ((ied.knee_point_voltage - required_vk) / required_vk) * 100;
 
 console.log(` ├─ Vk Method:`);
 console.log(` │ ├─ Max Secondary Current: ${max_secondary_fault.toFixed(2)} A`);
 console.log(` │ ├─ Required Vk: ${required_vk.toFixed(1)} V`);
 console.log(` │ ├─ Available Vk: ${ied.knee_point_voltage} V`);
 console.log(` │ └─ Margin: ${vk_margin > 0 ? '+' : ''}${vk_margin.toFixed(0)}%`);
 
 // Final verdict
 const vk_suitable = ied.knee_point_voltage >= required_vk;
 const verdict = vk_suitable ? 'SUITABLE' : 'UNDER_DIMENSIONED';
 const verdictIcon = vk_suitable ? '✅' : '❌';
 
 console.log(` \n Final Result:`);
 console.log(` └─ ${verdictIcon} ${verdict} (${vk_margin > 0 ? '+' : ''}${vk_margin.toFixed(0)}% margin)`);
 console.log('');
 });
 
 console.log('🎯 OVERALL EXPECTED RESULT:');
 console.log('✅ ALL SUITABLE (All 3 IEDs should pass with excellent margins)');
 console.log('📊 3/3 IEDs suitably dimensioned');
 
 console.log('\n🧪 WEBSITE VERIFICATION CHECKLIST:');
 console.log('Enter these EXACT values on the website and check:');
 console.log('');
 console.log('📋 PROJECT INFO:');
 console.log(' Project Name: "Beta Substation CT/VT Check"');
 console.log(' Substation: "Beta Industrial Switching Station"');
 console.log(' Engineer: "Test Engineer"');
 console.log('');
 console.log('⚡ SYSTEM PARAMETERS:');
 console.log(` Bus Voltage Level: ${testData.bus_voltage_kv} kV`);
 console.log(` System Frequency: ${testData.frequency} Hz`);
 console.log(` Bus Fault Level: ${testData.fault_level_ka} kA`);
 console.log(` X/R Ratio: ${testData.xr_ratio}`);
 console.log('');
 console.log('🔌 WIRING CONFIG:');
 console.log(` CT Cable: ${testData.ct_cable_size} mm² → ${testData.ct_resistance_20c} Ω/km, ${testData.ct_lead_length}m`);
 console.log(` VT Cable: ${testData.vt_cable_size} mm² → ${testData.vt_resistance_20c} Ω/km, ${testData.vt_lead_length}m`);
 console.log('');
 console.log('🏗️ LINE PARAMETERS:');
 console.log(` R1: ${testData.r1} Ω/km, X1: ${testData.x1} Ω/km`);
 console.log(` R0: ${testData.r0} Ω/km, X0: ${testData.x0} Ω/km`);
 console.log(` Route Length: ${testData.route_length} km`);
 console.log('');
 console.log('🤖 IEDs:');
 testData.ieds.forEach((ied, i) => {
 console.log(` IED ${i+1}: ${ied.name}`);
 console.log(` CT Ratio: ${ied.ct_ratio_primary}/${ied.ct_ratio_secondary}A`);
 console.log(` Accuracy: ${ied.accuracy_class}`);
 console.log(` CT Resistance: ${ied.ct_resistance} Ω`);
 console.log(` Knee Point: ${ied.knee_point_voltage} V`);
 });
 console.log('');
 console.log('✅ EXPECTED RESULTS TO VERIFY:');
 console.log(`[ ] Phase Voltage ≈ ${phase_voltage.toFixed(0)} V`);
 console.log(`[ ] Max Fault Current = ${max_fault_current.toFixed(0)} A`);
 console.log(`[ ] Source Impedance ≈ ${source_impedance.toFixed(4)} Ω`);
 console.log(`[ ] CT Loop Resistance ≈ ${ct_loop_resistance.toFixed(4)} Ω`);
 console.log(`[ ] All 3 IEDs show SUITABLE verdict`);
 console.log(`[ ] All safety margins > +100%`);
 console.log(`[ ] Overall verdict: ALL SUITABLE`);
 
 console.log('\n🌐 Test at: http://localhost:3001/ct-vt-adequacy');
 console.log('⏱️ Should take <3 minutes to complete!');
}

// Run the manual calculation
calculateExpectedResults();