/**
 * Simple test runner for 7SJ85 verification
 * Run with: node test-7sj85.js
 */

const { Siemens7SJ85Calculator } = require('./lib/services/siemens-7sj85-calculations.js');

// Test data from Hitachi document
const testData = {
  ct_wiring: {
    conductor_cross_section: 6.00,
    resistance_w_km_20c: 3.69,
    specific_resistance_20c: 0.00393,
    conductor_length_m: 120
  },
  vt_wiring: {
    conductor_cross_section: 2.50,
    resistance_w_km_20c: 8.87,
    specific_resistance_20c: 0.00393,
    conductor_length_m: 120,
    primary_voltage: 132,
    secondary_voltage: 0.11
  },
  system: {
    system_frequency: 50,
    bus_voltage_level: 132,
    max_bus_fault_level: 50,
    xr_ratio: 15,
    mv_bus_voltage_level: 132,
    mv_max_bus_fault_rating: 40
  },
  power_line: {
    assumed_cable: 3,
    cable_type: 'CU HDPE',
    cable_mm2: 240,
    cables_per_phase: 1,
    positive_seq_resistance_r1: 0.0221,
    positive_seq_reactance_x1: 0.1600,
    zero_seq_resistance_r0: 0.1300,
    zero_seq_reactance_x0: 0.0600,
    route_length: 1.74
  },
  ct_core: {
    ct_ratio_primary: 3150,
    ct_ratio_secondary: 1,
    class_of_accuracy: '5P 20',
    ct_resistance: 9,
    rated_burden: 7.5
  },
  connected_devices: {
    device_7sj85: 0.02,
    device_sel751: 0.02,
    device_fms: 0.06,
    device_avr: 0.20
  }
};

console.log('🧪 Testing SIEMENS 7SJ85 Calculator...');
console.log('📋 Using Hitachi Document N-19957 2-DF4W test values');

try {
  const results = Siemens7SJ85Calculator.performCompleteCalculation(testData);
  
  console.log('\n✅ Calculation Results:');
  console.log('CT Resistance at 75°C:', results.ct_calculations.resistance_at_75c.toFixed(5), 'Ω/km');
  console.log('CT Lead Resistance:', results.ct_calculations.lead_resistance.toFixed(2), 'Ω');
  console.log('CT Loop Resistance:', results.ct_calculations.loop_resistance.toFixed(2), 'Ω');
  console.log('CT VA Consumption:', results.ct_calculations.va_consumption.toFixed(2), 'VA');
  
  if (results.vt_calculations) {
    console.log('VT Resistance at 75°C:', results.vt_calculations.resistance_at_75c.toFixed(5), 'Ω/km');
    console.log('VT Lead Resistance:', results.vt_calculations.lead_resistance.toFixed(2), 'Ω');
  }
  
  console.log('System Time Constant:', results.fault_calculations.system_tp_ms.toFixed(2), 'ms');
  console.log('Through Fault Current:', results.fault_calculations.through_fault_current_a.toFixed(0), 'A');
  console.log('Endzone-1 Fault Current:', results.fault_calculations.endzone1_fault_current_a.toFixed(0), 'A');
  
  console.log('Internal Burden:', results.burden_calculations.internal_burden_va.toFixed(2), 'VA');
  console.log('Required Kssc:', results.adequacy_check.required_kssc.toFixed(2));
  console.log('Available Kssc:', results.adequacy_check.available_kssc.toFixed(2));
  
  console.log('\n🎯 FINAL VERDICT:', results.final_verdict);
  
  console.log('\n📊 Expected vs Actual Comparison:');
  console.log('CT Resistance 75°C: Expected 4.48759, Got', results.ct_calculations.resistance_at_75c.toFixed(5));
  console.log('CT Lead Resistance: Expected 0.54, Got', results.ct_calculations.lead_resistance.toFixed(2));
  console.log('Available Kssc: Expected 31.81, Got', results.adequacy_check.available_kssc.toFixed(2));
  console.log('Final Verdict: Expected SUITABLY DIMENSIONED, Got', results.final_verdict);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}