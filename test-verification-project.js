/**
 * VERIFICATION TEST - Exact Results for Website Testing
 * Run this to get the precise values you should see on the website
 */

const { AutomatedCalculationEngine } = require('./lib/services/automated-calculation-engine');
const { IEDDatabaseService } = require('./lib/services/ied-database');

// EXACT test input data for website verification
const testInput = {
  system: {
    bus_fault_level: 31.5,        // kA
    system_frequency: 50,         // Hz
    bus_voltage_level: 132,       // kV
    xr_ratio: 15
  },
  
  ct_wiring: {
    conductor_cross_section: 6,    // mm²
    resistance_w_km_20c: 3.08,    // Ω/km (auto-filled)
    lead_length_ct_to_relay: 120  // meters
  },
  
  vt_wiring: {
    conductor_cross_section: 2.5,  // mm²
    resistance_w_km_20c: 7.41,    // Ω/km (auto-filled)
    lead_length_vt_to_relay: 120  // meters
  },
  
  transmission_line: {
    positive_sequence_resistance: 0.0271,   // Ω/km
    positive_sequence_reactance: 0.1600,    // Ω/km
    zero_sequence_resistance: 0.1300,       // Ω/km
    zero_sequence_reactance: 0.0600,        // Ω/km
    route_length: 1.74                      // km
  },
  
  ieds: [
    {
      ied_name: "SIEMENS 7SJ85",
      ct_ratio: "3200/1A",
      accuracy_class: "5P20",
      ct_resistance: 2.5,          // Ω
      magnetizing_current: 10,     // mA
      knee_point_voltage: 2000     // V
    },
    {
      ied_name: "ABB RET670",
      ct_ratio: "1600/1A",
      accuracy_class: "PX",
      ct_resistance: 1.8,          // Ω
      magnetizing_current: 5,      // mA
      knee_point_voltage: 1600     // V
    },
    {
      ied_name: "SEL 751",
      ct_ratio: "1600/1A",
      accuracy_class: "5P20",
      ct_resistance: 1.5,          // Ω
      magnetizing_current: 8,      // mA
      knee_point_voltage: 1200     // V
    }
  ]
};

function runVerificationTest() {
  console.log('🧪 VERIFICATION TEST - Expected Website Results');
  console.log('=' .repeat(60));
  console.log('\n📋 TEST PROJECT: "Beta Substation CT/VT Check"');
  
  try {
    // Run the exact calculation that should happen on the website
    const report = AutomatedCalculationEngine.performCompleteAnalysis(testInput);
    
    console.log('\n⚡ SYSTEM CALCULATIONS (Should match website):');
    console.log(`✓ Bus Voltage: ${testInput.system.bus_voltage_level} kV`);
    console.log(`✓ Fault Level: ${testInput.system.bus_fault_level} kA`);
    console.log(`✓ Frequency: ${testInput.system.system_frequency} Hz`);
    console.log(`✓ X/R Ratio: ${testInput.system.xr_ratio}`);
    console.log(`\n✓ Phase Voltage: ${report.system_summary.phase_voltage.toFixed(0)} V`);
    console.log(`✓ Max Fault Current: ${report.system_summary.max_fault_current.toFixed(0)} A`);
    console.log(`✓ Source Impedance: ${report.system_summary.source_impedance.toFixed(4)} Ω`);
    console.log(`✓ Source Resistance: ${report.system_summary.source_resistance.toFixed(4)} Ω`);
    console.log(`✓ Source Reactance: ${report.system_summary.source_reactance.toFixed(4)} Ω`);
    console.log(`✓ Time Constant: ${report.system_summary.time_constant.toFixed(4)} s`);
    
    console.log('\n🔌 WIRING CALCULATIONS (Should match website):');
    console.log(`✓ CT Loop Resistance: ${report.wiring_summary.ct_wiring.loop_resistance.toFixed(4)} Ω`);
    console.log(`✓ VT Loop Resistance: ${report.wiring_summary.vt_wiring.loop_resistance.toFixed(4)} Ω`);
    
    console.log('\n🎯 FAULT CURRENT CALCULATIONS (Should match website):');
    console.log(`✓ Zone 1 3ph Fault Current: ${report.system_summary.zone1_fault_current_3ph.toFixed(0)} A`);
    console.log(`✓ Zone 1 1ph Fault Current: ${report.system_summary.zone1_fault_current_1ph.toFixed(0)} A`);
    
    console.log('\n📊 IED RESULTS (Should exactly match website):');
    console.log('');
    
    report.ied_results.forEach((result, index) => {
      console.log(`🤖 IED ${index + 1}: ${result.ied_name}`);
      console.log(`   Input Data:`);
      console.log(`   ├─ CT Ratio: ${result.ct_ratio_primary}/${result.ct_ratio_secondary}A`);
      console.log(`   ├─ Accuracy Class: ${result.accuracy_class}`);
      console.log(`   ├─ CT Resistance: ${result.inputs.rct} Ω`);
      console.log(`   ├─ Knee Point Voltage: ${result.available_vk} V`);
      console.log(`   └─ IED Burden: ${result.ied_burden} VA (from database)`);
      
      console.log(`   \n   Calculated Burdens:`);
      console.log(`   ├─ CT Internal Burden: ${result.ct_internal_burden} VA`);
      console.log(`   ├─ Lead Burden: ${result.lead_burden} VA`);
      console.log(`   ├─ IED Burden: ${result.ied_burden} VA`);
      console.log(`   └─ Total Burden: ${result.total_burden} VA`);
      
      console.log(`   \n   Adequacy Check Results:`);
      if (result.calculation_method === 'KSSC' || result.calculation_method === 'BOTH') {
        console.log(`   ├─ KSSC Method:`);
        console.log(`   │  ├─ Required Kssc: ${result.required_kssc}`);
        console.log(`   │  └─ Available Kssc: ${result.available_kssc}`);
      }
      
      if (result.calculation_method === 'VK_METHOD' || result.calculation_method === 'BOTH') {
        console.log(`   ├─ Vk Method:`);
        console.log(`   │  ├─ Required Vk: ${result.required_vk} V`);
        console.log(`   │  └─ Available Vk: ${result.available_vk} V`);
      }
      
      const verdictIcon = result.verdict === 'SUITABLE' ? '✅' : '❌';
      const marginIcon = result.safety_margin > 0 ? '+' : '';
      console.log(`   \n   Final Result:`);
      console.log(`   └─ ${verdictIcon} ${result.verdict} (${marginIcon}${result.safety_margin}% safety margin)`);
      console.log('');
    });
    
    console.log('🎯 OVERALL SUMMARY (Should match website):');
    const overallIcon = report.overall_summary.overall_verdict === 'ALL_SUITABLE' ? '✅' : 
                       report.overall_summary.overall_verdict === 'MAJOR_ISSUES' ? '❌' : '⚠️';
    
    console.log(`${overallIcon} Overall Verdict: ${report.overall_summary.overall_verdict}`);
    console.log(`📊 Results: ${report.overall_summary.suitable_ieds}/${report.overall_summary.total_ieds_checked} IEDs suitable`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    console.log('\n🧪 VERIFICATION CHECKLIST:');
    console.log('Please check these exact values on the website:');
    console.log('');
    console.log(`[ ] Phase Voltage = ${report.system_summary.phase_voltage.toFixed(0)} V`);
    console.log(`[ ] Max Fault Current = ${report.system_summary.max_fault_current.toFixed(0)} A`);
    console.log(`[ ] Source Impedance = ${report.system_summary.source_impedance.toFixed(4)} Ω`);
    console.log(`[ ] CT Loop Resistance = ${report.wiring_summary.ct_wiring.loop_resistance.toFixed(4)} Ω`);
    console.log('');
    
    report.ied_results.forEach((result, index) => {
      console.log(`[ ] ${result.ied_name}:`);
      console.log(`    - Total Burden = ${result.total_burden} VA`);
      if (result.required_kssc) console.log(`    - Required Kssc = ${result.required_kssc}`);
      if (result.available_kssc) console.log(`    - Available Kssc = ${result.available_kssc}`);
      if (result.required_vk) console.log(`    - Required Vk = ${result.required_vk} V`);
      console.log(`    - Verdict = ${result.verdict}`);
      console.log(`    - Safety Margin = ${result.safety_margin > 0 ? '+' : ''}${result.safety_margin}%`);
      console.log('');
    });
    
    console.log(`[ ] Overall Verdict = ${report.overall_summary.overall_verdict}`);
    console.log(`[ ] Suitable IEDs = ${report.overall_summary.suitable_ieds}/${report.overall_summary.total_ieds_checked}`);
    
    console.log('\n✅ If all values match within ±2%, the system is working correctly!');
    console.log('🌐 Test URL: http://localhost:3001/ct-vt-adequacy');
    
    return report;
    
  } catch (error) {
    console.error('❌ ERROR during verification test:', error.message);
    console.error(error.stack);
  }
}

// Run the verification test
runVerificationTest();