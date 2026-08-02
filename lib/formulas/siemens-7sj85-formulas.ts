/**
 * SIEMENS 7SJ85 CALCULATION FORMULAS
 * Exact formulas from Standard Engineering Technical Documentation 
 */

export const SIEMENS_7SJ85_FORMULAS = [
 // CT Wiring Formulas (Page 1)
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'ct_resistance_at_temperature',
 expression: 'R20 * (1 + a * (t - 20))',
 variables: [
 { name: 'R20', description: 'Resistance at 20°C (Ω/km)', unit: 'Ω/km' },
 { name: 'a', description: 'Temperature coefficient (/K)', unit: '/K' },
 { name: 't', description: 'Operating temperature (°C)', unit: '°C' }
 ],
 type: 'equation',
 description: 'Calculate conductor resistance at operating temperature',
 category: 'ct_wiring'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'ct_lead_resistance',
 expression: 'R * l / 1000',
 variables: [
 { name: 'R', description: 'Resistance per km (Ω/km)', unit: 'Ω/km' },
 { name: 'l', description: 'Cable length (m)', unit: 'm' }
 ],
 type: 'equation',
 description: 'Calculate lead resistance from CT to relay',
 category: 'ct_wiring'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'ct_loop_resistance',
 expression: '2 * RL',
 variables: [
 { name: 'RL', description: 'Lead resistance (Ω)', unit: 'Ω' }
 ],
 type: 'equation', 
 description: 'Calculate total loop resistance (2RL = 2 × R × l)',
 category: 'ct_wiring'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'ct_va_consumption',
 expression: 'In^2 * RL',
 variables: [
 { name: 'In', description: 'Secondary current (A)', unit: 'A' },
 { name: 'RL', description: 'Lead resistance (Ω)', unit: 'Ω' }
 ],
 type: 'equation',
 description: 'Calculate VA consumption of connecting leads (Pl = In² × RL)',
 category: 'ct_wiring'
 },

 // VT Wiring Formulas (Page 1)
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'vt_lead_resistance',
 expression: 'R * l / 1000',
 variables: [
 { name: 'R', description: 'VT resistance per km (Ω/km)', unit: 'Ω/km' },
 { name: 'l', description: 'VT cable length (m)', unit: 'm' }
 ],
 type: 'equation',
 description: 'Calculate VT lead resistance',
 category: 'vt_wiring'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'vt_loop_resistance', 
 expression: '2 * RL',
 variables: [
 { name: 'RL', description: 'VT lead resistance (Ω)', unit: 'Ω' }
 ],
 type: 'equation',
 description: 'Calculate VT total loop resistance (2RL = 2 × R × l)',
 category: 'vt_wiring'
 },
 // Fault Current Calculations (Pages 3-4)
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'system_time_constant',
 expression: 'XR / (2 * PI * f)',
 variables: [
 { name: 'XR', description: 'X/R ratio', unit: '' },
 { name: 'f', description: 'System frequency (Hz)', unit: 'Hz' },
 { name: 'PI', description: 'Pi constant', unit: '', value: 3.14159 }
 ],
 type: 'equation',
 description: 'Calculate system time constant tp = X/R / (2 × π × f)',
 category: 'fault_calculations'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'fault_impedance_magnitude',
 expression: 'sqrt(R^2 + X^2)',
 variables: [
 { name: 'R', description: 'Real part of impedance (Ω)', unit: 'Ω' },
 { name: 'X', description: 'Imaginary part of impedance (Ω)', unit: 'Ω' }
 ],
 type: 'equation',
 description: 'Calculate fault impedance magnitude',
 category: 'fault_calculations'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'one_phase_fault_current',
 expression: '(V * multiplier * 3) / (Z * sqrt(3))',
 variables: [
 { name: 'V', description: 'System voltage (V)', unit: 'V' },
 { name: 'multiplier', description: 'Multiplier factor', unit: '' },
 { name: 'Z', description: 'Fault impedance (Ω)', unit: 'Ω' }
 ],
 type: 'equation',
 description: 'Calculate 1-phase fault current: (132000 × 1.0 × 3) / (5.2589 × √3)',
 category: 'fault_calculations'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'three_phase_endzone1_current',
 expression: '132000 / (Zimpedance * sqrt(3))',
 variables: [
 { name: 'Zimpedance', description: 'Endzone-1 impedance (Ω)', unit: 'Ω' }
 ],
 type: 'equation',
 description: 'Calculate 3-phase fault current Endzone-1 (80%)',
 category: 'fault_calculations'
 },

 // Burden Calculations (Pages 5-6)
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'internal_burden',
 expression: 'In * In * Rct',
 variables: [
 { name: 'In', description: 'Secondary current (A)', unit: 'A' },
 { name: 'Rct', description: 'CT resistance (Ω)', unit: 'Ω' }
 ],
 type: 'equation',
 description: 'Calculate internal burden: PE = In × In × Rct',
 category: 'burden_calculations'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'required_kssc',
 expression: 'Itkmax / Ipn',
 variables: [
 { name: 'Itkmax', description: 'Max through fault current (A)', unit: 'A' },
 { name: 'Ipn', description: 'CT primary current (A)', unit: 'A' }
 ],
 type: 'equation',
 description: 'Calculate Required Kssc = Itkmax / Ipn',
 category: 'adequacy_check'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'available_kssc',
 expression: 'n * ((PE + PN) / (PE + PL))',
 variables: [
 { name: 'n', description: 'CT Accuracy Limiting Factor', unit: '' },
 { name: 'PE', description: 'Internal burden (VA)', unit: 'VA' },
 { name: 'PN', description: 'Rated burden (VA)', unit: 'VA' },
 { name: 'PL', description: 'Lead burden (VA)', unit: 'VA' }
 ],
 type: 'equation',
 description: 'Calculate Available Kssc = n × ((PE + PN)/(PE + PL))',
 category: 'adequacy_check'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'ct_suitability_check',
 expression: 'Available_Kssc > Required_Kssc',
 variables: [
 { name: 'Available_Kssc', description: 'Available Kssc', unit: '' },
 { name: 'Required_Kssc', description: 'Required Kssc', unit: '' }
 ],
 type: 'inequality',
 description: 'CT suitability check: Available Kssc > Required Kssc',
 category: 'adequacy_check'
 },

 // Complex Impedance Calculations (Page 3)
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'cable_positive_impedance',
 expression: '0.0221 + j * 0.1600',
 variables: [
 { name: 'j', description: 'Imaginary unit', unit: '', value: 'complex' }
 ],
 type: 'equation',
 description: 'Cable +Ve seq. impedance Z1 = 0.0221 + j 0.1600 Ω/Km',
 category: 'impedance_calculations'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'cable_zero_impedance',
 expression: '0.1300 + j * 0.0600',
 variables: [
 { name: 'j', description: 'Imaginary unit', unit: '', value: 'complex' }
 ],
 type: 'equation',
 description: 'Cable Zero seq. impedance Z0 = 0.1300 + j 0.0600 Ω/Km',
 category: 'impedance_calculations'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'total_positive_impedance',
 expression: '0.0385 + j * 0.2784',
 variables: [
 { name: 'j', description: 'Imaginary unit', unit: '', value: 'complex' }
 ],
 type: 'equation',
 description: 'Total cable +Ve seq. impedance Z1L = 0.0385 + j 0.2784 Ω',
 category: 'impedance_calculations'
 },
 {
 relayName: 'SIEMENS 7SJ85',
 name: 'total_zero_impedance',
 expression: '0.2262 + j * 0.1044',
 variables: [
 { name: 'j', description: 'Imaginary unit', unit: '', value: 'complex' }
 ],
 type: 'equation',
 description: 'Total cable Zero seq. impedance Z0L = 0.2262 + j 0.1044 Ω',
 category: 'impedance_calculations'
 }
];