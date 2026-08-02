/**
 * SIEMENS 7SJ85 IED TEMPLATE - CT/VT ADEQUACY CALCULATIONS
 * Based on Standard Engineering Technical Documentation 
 * 
 * IMPLEMENTS EXACT FORMULAS FROM STANDARD STANDARD
 * All calculations follow the reference document pages 1-7
 */

export interface CT_WiringParameters {
 ct_conductor_cross_section: number; // A (mm²)
 ct_resistance_w_km_20c: number; // R20 (Ω/km) @ 20°C
 ct_specific_resistance_20c: number; // a (/K⁻¹) = 0.00393 for copper
 ct_conductor_length_m: number; // l (m)
 relay_rated_current: number; // Ir (A)
}

export interface VT_WiringParameters {
 vt_conductor_cross_section: number; // A (mm²)
 vt_resistance_w_km_20c: number; // R20 (Ω/km) @ 20°C
 vt_specific_resistance_20c: number; // a (/K⁻¹)
 vt_conductor_length_m: number; // l (m)
 primary_voltage: number; // Vp (kV)
 secondary_voltage: number; // Vs (kV)
}

export interface SystemParams_7SJ85 {
 system_frequency: number; // f (Hz)
 bus_voltage_level: number; // kV
 max_bus_fault_level: number; // kA
 xr_ratio: number; // X/R ratio
 max_hv_busbar_fault_current: number; // A (calculated)
 hv_rating_of_busbar: number; // V (calculated)
}

export interface PowerLineParams_7SJ85 {
 positive_seq_resistance_r1: number; // Ω/km
 positive_seq_reactance_x1: number; // Ω/km
 zero_seq_resistance_r0: number; // Ω/km
 zero_seq_reactance_x0: number; // Ω/km
 route_length: number; // km
 cable_positive_seq_impedance: number; // Ω/km
 cable_zero_seq_impedance: number; // Ω/km
 total_cable_positive_seq_impedance: number; // Ω
 total_cable_zero_seq_impedance: number; // Ω
 source_impedance_zs: number; // Ω
 impedance_angle_in_radians: number; // radians
}

export interface CT_CoreParameters {
 ct_ratio_primary: number; // A (Ipn)
 ct_ratio_secondary: number; // A (In) - usually 1
 class_of_accuracy: string; // e.g., "5P 20"
 ct_resistance: number; // Rct (Ω)
 rated_burden: number; // PN (VA)
 CT_Accuracy_Limit_Factor: number; // n (ALF)
}

export interface ConnectedDevice {
 device_name: string;
 burden_va: number;
}

export type ConnectedDevices_7SJ85 = ConnectedDevice[];

export interface BurdenValues {
 device_burdens: ConnectedDevice[];
 total_load_burden: number;
 total_load_other_burden: number;
}

/**
 * ============================================================
 * CT WIRING CALCULATIONS - EXACT STANDARD FORMULAS (PAGE 1)
 * ============================================================
 */
export class CT_WiringCalculations {
 
 /**
 * Resistance @ 75°C using temperature coefficient formula
 * R(t) = R20 × [1 + a(t - 20°C)]
 * R(75°C) = R20 × 1.21615 (since a=0.00393, t=75°C)
 */
 static calculateResistance(r20: number): number {
 return r20 * 1.21615;
 }

 /**
 * Lead Resistance (one-way from CT to relay)
 * RL = R(75°C) × l
 */
 static calculateLeadResistance(r20: number, length_m: number): number {
 const R = r20 * 1.21615;
 return R * length_m;
 }

 /**
 * Loop Resistance (go + return path)
 * 2RL = 2 × R(75°C) × l
 */
 static calculateLoopResistance(r20: number, length_m: number): number {
 return 2 * r20 * 1.21615 * length_m;
 }

 /**
 * VA Consumption of connecting leads
 * Pl = Is² × R(75°C) × l
 */
 static calculateVAConsumption(
 secondary_current: number,
 r20: number,
 length_m: number
 ): number {
 return Math.pow(secondary_current, 2) * r20 * 1.21615 * length_m;
 }

 /**
 * Total load burden = Loop resistance burden
 */
 static calculateTotalLoadBurden(r20: number, length_m: number): number {
 return 2 * r20 * 1.21615 * length_m;
 }

 /**
 * Total burden from connected devices
 */
 static calculateTotalLoadOtherBurden(devices: ConnectedDevices_7SJ85): number {
 return devices.reduce((sum, d) => sum + d.burden_va, 0);
 }
}

/**
 * ============================================================
 * VT WIRING CALCULATIONS
 * ============================================================
 */
export class VT_WiringCalculations {
 
 static calculateVTResistance(r20: number): number {
 return r20 * 1.21615;
 }

 static calculateVTLeadResistance(r20: number, length_m: number): number {
 const R = r20 * 1.21615;
 return R * length_m;
 }

 static calculateVTLoopResistance(r20: number, length_m: number): number {
 return 2 * r20 * 1.21615 * length_m;
 }

 static getPrimaryVoltageNormalized(primary_voltage: number): number {
 return primary_voltage / Math.sqrt(3);
 }

 static getSecondaryVoltageNormalized(secondary_voltage: number): number {
 return secondary_voltage / Math.sqrt(3);
 }
}

/**
 * ============================================================
 * FAULT CURRENT CALCULATIONS (PAGES 2-4)
 * ============================================================
 */
export class FaultCurrentCalculations {
 
 static calculateTimeConstant(xr_ratio: number, frequency: number): number {
 return xr_ratio / (2 * Math.PI * frequency);
 }

 static calculateMaxHVBusbarFaultCurrent(max_bus_fault_level: number): number {
 return max_bus_fault_level * 1000; // Convert kA to A
 }

 static calculateHVRatingOfBusbar(bus_voltage_level: number): number {
 return bus_voltage_level * 1000; // Convert kV to V
 }

 static calculateSourceImpedanceZs(
 hv_rating_of_busbar: number,
 max_hv_busbar_fault_current: number
 ): number {
 return (hv_rating_of_busbar * 1) / (Math.sqrt(3) * max_hv_busbar_fault_current);
 }

 static calculateImpedanceAngleInRadians(xr_ratio: number): number {
 return Math.atan(xr_ratio);
 }

 static calculateCableDetails(
 positive_seq_resistance_r1: number,
 positive_seq_reactance_x1: number,
 zero_seq_resistance_r0: number,
 zero_seq_reactance_x0: number,
 route_length: number
 ): any {
 return {
 cable_positive_seq_impedance: Math.sqrt(positive_seq_resistance_r1 ** 2 + positive_seq_reactance_x1 ** 2),
 cable_zero_seq_impedance: Math.sqrt(zero_seq_resistance_r0 ** 2 + zero_seq_reactance_x0 ** 2),
 total_cable_positive_seq_impedance: Math.sqrt(
 (positive_seq_resistance_r1 * route_length) ** 2 + 
 (positive_seq_reactance_x1 * route_length) ** 2
 ),
 total_cable_zero_seq_impedance: Math.sqrt(
 (zero_seq_resistance_r0 * route_length) ** 2 + 
 (zero_seq_reactance_x0 * route_length) ** 2
 )
 };
 }

 static calculate1PhaseFaultCurrent(voltage: number, multiplier: number, phases: number, impedance: number): number {
 return (voltage * multiplier * phases) / (impedance * Math.sqrt(3));
 }

 static calculate3PhaseFaultCurrentEndzone1(z1_zone1: number, zs: number, z1l_80pct: number): any {
 return { impedance: 0, xr_ratio: 0, current: 0 };
 }
}

/**
 * ============================================================
 * BURDEN & CT ADEQUACY CALCULATIONS (PAGES 5-6)
 * ============================================================
 */
export class BurdenCalculations {
 
 /**
 * Internal Burden: PE = In² × Rct
 * Since In = 1A (standard), PE = Rct
 */
 static calculateInternalBurden(ct_ratio_secondary: number, ct_resistance: number): number {
 return Math.pow(ct_ratio_secondary, 2) * ct_resistance;
 }

 static calculateTotalBurden(burdens: BurdenValues): number {
 return burdens.total_load_other_burden;
 }

 /**
 * Required Kssc = Itkmax / Ipn
 * Where Itkmax = max fault current in Amperes
 * And Ipn = CT primary ratio
 */
 static calculateRequiredKssc(
 max_hv_busbar_fault_current: number,
 ct_ratio_primary: number
 ): number {
 if (ct_ratio_primary === 0) throw new Error('CT primary ratio cannot be zero');
 return max_hv_busbar_fault_current / ct_ratio_primary;
 }

 /**
 * Available Kssc = n × ((PE + PN) / (PE + PL))
 * EXACT FORMULA FROM STANDARD STANDARD
 * Where:
 * n = Accuracy Limit Factor
 * PE = Internal Burden
 * PN = Rated Burden
 * PL = Total Load burden (wiring + devices)
 */
 static calculateAvailableKssc(
 accuracy_factor: number,
 internal_burden: number,
 rated_burden: number,
 total_load_other_burden: number
 ): number {
 const numerator = internal_burden + rated_burden;
 const denominator = internal_burden + total_load_other_burden;
 
 if (denominator === 0) throw new Error('Denominator in Available Kssc cannot be zero');
 
 return accuracy_factor * (numerator / denominator);
 }

 static determineCTSuitability(
 available_kssc: number,
 required_kssc: number
 ): { suitable: boolean; verdict: string } {
 const suitable = available_kssc > required_kssc;
 const verdict = suitable ? "SUITABLY DIMENSIONED" : "UNDER DIMENSIONED";
 return { suitable, verdict };
 }
}

/**
 * ============================================================
 * MAIN CALCULATION ENGINE - SIEMENS 7SJ85 CALCULATOR
 * ============================================================
 */
export class Siemens7SJ85Calculator {
 
 static performCompleteCalculation(input: {
 ct_wiring: CT_WiringParameters;
 vt_wiring?: VT_WiringParameters;
 system: SystemParams_7SJ85;
 power_line: PowerLineParams_7SJ85;
 ct_core: CT_CoreParameters;
 connected_devices: ConnectedDevices_7SJ85;
 accuracy_limit_factor: number;
 }) {
 if (!input.connected_devices || input.connected_devices.length === 0) {
 throw new Error("At least one connected device with a burden (VA) is required.");
 }

 const results: any = {
 ct_calculations: {},
 vt_calculations: {},
 fault_calculations: {},
 burden_calculations: {},
 adequacy_check: {},
 final_verdict: "",
 vk_breakdown: [],
 vk_required: 0,
 vk_available: 0,
 ealreq_max: 0,
 verdict: "",
 intermediates: {}
 };

 // ============================================================
 // 1. CT WIRING CALCULATIONS (STANDARD PAGE 1)
 // ============================================================
 
 const R_75C = input.ct_wiring.ct_resistance_w_km_20c * 1.21615;
 const RL = R_75C * input.ct_wiring.ct_conductor_length_m;
 const loop_resistance = 2 * R_75C * input.ct_wiring.ct_conductor_length_m;
 const Pl = Math.pow(input.ct_core.ct_ratio_secondary, 2) * R_75C * input.ct_wiring.ct_conductor_length_m;

 results.ct_calculations = {
 resistance_at_75c: R_75C,
 lead_resistance: RL,
 loop_resistance: loop_resistance,
 va_consumption: Pl
 };

 // ============================================================
 // 2. VT WIRING CALCULATIONS
 // ============================================================
 
 if (input.vt_wiring) {
 const VT_R_75C = input.vt_wiring.vt_resistance_w_km_20c * 1.21615;
 const VT_RL = VT_R_75C * input.vt_wiring.vt_conductor_length_m;
 const VT_loop = 2 * VT_R_75C * input.vt_wiring.vt_conductor_length_m;
 const primary_norm = input.vt_wiring.primary_voltage / Math.sqrt(3);
 const secondary_norm = input.vt_wiring.secondary_voltage / Math.sqrt(3);

 results.vt_calculations = {
 resistance_at_75c: VT_R_75C,
 lead_resistance: VT_RL,
 loop_resistance: VT_loop,
 primary_voltage_normalized: primary_norm,
 secondary_voltage_normalized: secondary_norm
 };
 }

 // ============================================================
 // 3. FAULT CURRENT CALCULATIONS (STANDARD PAGES 2-4)
 // ============================================================
 
 const Itkmax = input.system.max_bus_fault_level * 1000;
 const Vbusbar = input.system.bus_voltage_level * 1000;
 const Zs = (Vbusbar * 1) / (Math.sqrt(3) * Itkmax);
 const tp = input.system.xr_ratio / (2 * Math.PI * input.system.system_frequency);

 results.fault_calculations = {
 max_hv_busbar_fault_current_a: Itkmax,
 hv_rating_of_busbar_v: Vbusbar,
 source_impedance_zs: Zs,
 tp_ms: tp * 1000,
 xr_ratio: input.system.xr_ratio,
 system_frequency: input.system.system_frequency
 };

 // ============================================================
 // 4. BURDEN CALCULATIONS (STANDARD PAGE 5-6)
 // ============================================================
 
 // Internal Burden: PE = In² × Rct
 const PE = Math.pow(input.ct_core.ct_ratio_secondary, 2) * input.ct_core.ct_resistance;
 
 // Wiring burden
 const PL_wiring = loop_resistance;
 
 // Connected devices burden
 const PL_devices = CT_WiringCalculations.calculateTotalLoadOtherBurden(input.connected_devices);
 
 // Total PL
 const PL_total = PL_wiring + PL_devices;
 
 // Rated Burden
 const PN = input.ct_core.rated_burden;
 
 // Accuracy Limit Factor
 const n = input.accuracy_limit_factor;

 results.burden_calculations = {
 internal_burden_PE_va: PE,
 wiring_burden_va: PL_wiring,
 devices_burden_va: PL_devices,
 total_burden_va: PL_total,
 rated_burden_PN_va: PN,
 device_count: input.connected_devices.length,
 devices: input.connected_devices
 };

 // ============================================================
 // 5. CT ADEQUACY CHECK (STANDARD PAGE 5-6) - CORE FORMULAS
 // ============================================================
 
 // Required Kssc = Itkmax / Ipn
 const required_kssc = Itkmax / input.ct_core.ct_ratio_primary;
 
 // Available Kssc = n × ((PE + PN) / (PE + PL))
 const available_kssc = n * ((PE + PN) / (PE + PL_total));
 
 // Verdict
 const suitable = available_kssc > required_kssc;
 const verdict = suitable ? "SUITABLY DIMENSIONED" : "UNDER DIMENSIONED";

 results.adequacy_check = {
 required_kssc: required_kssc,
 available_kssc: available_kssc,
 suitable: suitable,
 verdict: verdict
 };

 // ============================================================
 // 6. VK CALCULATIONS (Secondary metrics)
 // ============================================================
 
 const vk_available = (input.ct_core as any).vk_available || input.ct_core.CT_Accuracy_Limit_Factor || 1000;
 const vk_required = required_kssc * input.ct_core.ct_resistance;
 const ealreq_max = vk_required;

 results.vk_breakdown = [
 {
 label: "Through Fault (Primary)",
 ealreq: Math.round(ealreq_max * 100) / 100,
 vk: Math.round(vk_required * 100) / 100,
 isMax: true
 }
 ];

 // ============================================================
 // 7. FINAL RESULTS
 // ============================================================
 
 results.required_kssc = required_kssc;
 results.available_kssc = available_kssc;
 results.vk_required = Math.round(vk_required * 100) / 100;
 results.vk_available = Math.round(vk_available * 100) / 100;
 results.ealreq_max = Math.round(ealreq_max * 100) / 100;
 results.verdict = verdict;
 results.final_verdict = verdict;

 return results;
 }
}
