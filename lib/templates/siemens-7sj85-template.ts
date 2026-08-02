/**
 * SIEMENS 7SJ85 IED TEMPLATE CONFIGURATION
 * Based on Standard Engineering Technical Documentation 
 * CT/VT ADEQUACY CHECK for 132/33kV Substation at Al Dhafra Area
 */

export const SIEMENS_7SJ85_TEMPLATE = {
 name: 'SIEMENS 7SJ85 - Multi-function Protection Relay',
 description: 'Siemens 7SJ85 differential, distance, and overcurrent protection relay with CT/VT adequacy calculations per Standard Engineering standards.',
 manufacturer: 'SIEMENS',
 model: '7SJ85',
 iedType: 'tpl-siemens-7sj85',
 formula: 'ct-adequacy:tpl-siemens-7sj85',
 type: 'PROTECTION',
 functions: [
 'DIFFERENTIAL PROTECTION',
 'DISTANCE PROTECTION', 
 'OVERCURRENT PROTECTION',
 'EARTH FAULT PROTECTION',
 'BREAKER FAILURE PROTECTION',
 'TRANSFORMER PROTECTION'
 ],
 
 // Input schema matching exact Standard Engineering document parameters
 inputSchema: {
 // CT Wiring Parameters (Page 1)
 ct_wiring: {
 conductor_cross_section: { 
 label: 'CT Conductor Cross Section (mm²)', 
 type: 'number', 
 example: 6.00,
 description: 'Conductor cross section for CT wiring'
 },
 resistance_w_km_20c: { 
 label: 'Resistance W/km at 20°C (Ω/km)', 
 type: 'number', 
 example: 3.69,
 description: 'Conductor resistance per kilometer at 20°C'
 },
 specific_resistance_20c: { 
 label: 'Specific Resistance at 20°C (/K⁻¹)', 
 type: 'number', 
 example: 0.00393,
 description: 'Temperature coefficient of resistance'
 },
 conductor_length_m: { 
 label: 'Conductor Length CT to Relay (m)', 
 type: 'number', 
 example: 120,
 description: 'One-way cable length from CT to relay'
 }
 },

 // VT Wiring Parameters (Page 1) 
 vt_wiring: {
 conductor_cross_section: { 
 label: 'VT Conductor Cross Section (mm²)', 
 type: 'number', 
 example: 2.50,
 description: 'Conductor cross section for VT wiring'
 },
 resistance_w_km_20c: { 
 label: 'VT Resistance W/km at 20°C (Ω/km)', 
 type: 'number', 
 example: 8.87,
 description: 'VT conductor resistance per kilometer at 20°C'
 },
 specific_resistance_20c: { 
 label: 'VT Specific Resistance at 20°C (/K⁻¹)', 
 type: 'number', 
 example: 0.00393,
 description: 'VT temperature coefficient of resistance'
 },
 conductor_length_m: { 
 label: 'VT Conductor Length to Relay (m)', 
 type: 'number', 
 example: 120,
 description: 'One-way cable length from VT to relay'
 },
 primary_voltage: { 
 label: 'VT Primary Voltage (kV)', 
 type: 'number', 
 example: 132,
 description: 'VT primary side voltage (line to neutral)'
 },
 secondary_voltage: { 
 label: 'VT Secondary Voltage (kV)', 
 type: 'number', 
 example: 0.11,
 description: 'VT secondary side voltage (line to neutral)'
 }
 },
 // System Parameters (Page 2)
 system: {
 system_frequency: { 
 label: 'System Frequency (Hz)', 
 type: 'number', 
 example: 50,
 description: 'Power system frequency'
 },
 bus_voltage_level: { 
 label: 'Bus Voltage Level (kV)', 
 type: 'number', 
 example: 132,
 description: 'System bus voltage level'
 },
 max_bus_fault_level: { 
 label: 'Max Bus Fault Level (kA)', 
 type: 'number', 
 example: 50,
 description: 'Maximum bus fault current level'
 },
 xr_ratio: { 
 label: 'X/R Ratio', 
 type: 'number', 
 example: 15,
 description: 'System reactance to resistance ratio'
 },
 mv_bus_voltage_level: { 
 label: 'MV Bus Voltage Level (kV)', 
 type: 'number', 
 example: 132,
 description: 'Medium voltage bus level'
 },
 mv_max_bus_fault_rating: { 
 label: 'MV Max Bus Fault Rating (kA)', 
 type: 'number', 
 example: 40,
 description: 'MV maximum bus fault rating'
 }
 },

 // Power Line Parameters (Page 2)
 power_line: {
 assumed_cable: { 
 label: 'Number of Cables', 
 type: 'number', 
 example: 3,
 description: 'Number of cables in the power line'
 },
 cable_type: { 
 label: 'Cable Type', 
 type: 'string', 
 example: 'CU HDPE',
 description: 'Cable material and insulation type'
 },
 cable_mm2: { 
 label: 'Cable Cross Section (mm²)', 
 type: 'number', 
 example: 240,
 description: 'Cable conductor cross-sectional area'
 },
 cables_per_phase: { 
 label: 'Cables per Phase', 
 type: 'number', 
 example: 1,
 description: 'Number of cables per phase'
 },
 positive_seq_resistance_r1: { 
 label: 'Positive Seq. Resistance R1 (Ω/km)', 
 type: 'number', 
 example: 0.0221,
 description: 'Positive sequence resistance'
 },
 positive_seq_reactance_x1: { 
 label: 'Positive Seq. Reactance X1 (Ω/km)', 
 type: 'number', 
 example: 0.1600,
 description: 'Positive sequence reactance'
 },
 zero_seq_resistance_r0: { 
 label: 'Zero Seq. Resistance R0 (Ω/km)', 
 type: 'number', 
 example: 0.1300,
 description: 'Zero sequence resistance'
 },
 zero_seq_reactance_x0: { 
 label: 'Zero Seq. Reactance X0 (Ω/km)', 
 type: 'number', 
 example: 0.0600,
 description: 'Zero sequence reactance'
 },
 route_length: { 
 label: 'Route Length (km)', 
 type: 'number', 
 example: 1.74,
 description: 'Total route length of power line'
 }
 },
 // CT Core Parameters (Page 4-5)
 ct_core: {
 ct_ratio_primary: { 
 label: 'CT Ratio Primary (A)', 
 type: 'number', 
 example: 3150,
 description: 'CT primary current rating'
 },
 ct_ratio_secondary: { 
 label: 'CT Ratio Secondary (A)', 
 type: 'number', 
 example: 1,
 description: 'CT secondary current rating'
 },
 class_of_accuracy: { 
 label: 'Class of Accuracy', 
 type: 'string', 
 example: '5P 20',
 description: 'CT accuracy class and limiting factor'
 },
 ct_resistance: { 
 label: 'CT Resistance Rct (Ω)', 
 type: 'number', 
 example: 9,
 description: 'CT winding resistance'
 },
 rated_burden: { 
 label: 'CT Rated Burden PN (VA)', 
 type: 'number', 
 example: 7.5,
 description: 'CT rated burden'
 }
 },

 // Connected Devices Burden (Page 5)
 connected_devices: {
 device_7sj85: { 
 label: '7SJ85 Burden (VA)', 
 type: 'number', 
 example: 0.02,
 description: 'Siemens 7SJ85 relay burden'
 },
 device_sel751: { 
 label: 'SEL751 Burden (VA)', 
 type: 'number', 
 example: 0.02,
 description: 'SEL 751 relay burden'
 },
 device_fms: { 
 label: 'FMS Burden (VA)', 
 type: 'number', 
 example: 0.06,
 description: 'Fault monitoring system burden'
 },
 device_avr: { 
 label: 'AVR Burden (VA)', 
 type: 'number', 
 example: 0.20,
 description: 'Automatic voltage regulator burden'
 }
 }
 },

 // Output schema for results
 outputSchema: {
 final_verdict: { 
 type: 'string', 
 description: 'Final CT adequacy verdict' 
 },
 required_kssc: { 
 type: 'number', 
 description: 'Required short-circuit factor' 
 },
 available_kssc: { 
 type: 'number', 
 description: 'Available short-circuit factor' 
 },
 ct_calculations: { 
 type: 'object', 
 description: 'CT wiring calculation results' 
 },
 vt_calculations: { 
 type: 'object', 
 description: 'VT wiring calculation results' 
 },
 fault_calculations: { 
 type: 'object', 
 description: 'Fault current calculation results' 
 },
 burden_calculations: { 
 type: 'object', 
 description: 'Burden calculation results' 
 },
 adequacy_check: { 
 type: 'object', 
 description: 'CT adequacy check results' 
 }
 },

 // Specifications from Standard Engineering document
 specifications: {
 rated_voltage: '132kV/33kV',
 rated_current: '3150/1A',
 frequency: '50Hz',
 accuracy_class: '5P 20',
 burden: '7.5VA',
 protection_functions: [
 'Differential Protection (87)',
 'Distance Protection (21)', 
 'Overcurrent Protection (50/51)',
 'Earth Fault Protection (50N/51N)',
 'Breaker Failure Protection (50BF)'
 ],
 communication: ['IEC 61850', 'DNP3', 'Modbus'],
 manufacturer: 'Siemens',
 model: '7SJ85'
 },

 // Document reference
 datasheet: {
 title: 'CT/VT ADEQUACY CHECK - 132/33kV SUBSTATION AT AL DHAFRA AREA',
 document_no: '',
 date: '4/22/2026',
 contractor: 'STANDARD',
 revision: 'A'
 }
};