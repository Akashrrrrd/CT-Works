/**
 * CT/VT ADEQUACY CHECK - COMPLETE TYPE DEFINITIONS
 * Based on standard electrical engineering practice
 * Only requires parameters that clients/users actually provide
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. BASIC SYSTEM PARAMETERS (Client Always Provides These)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BasicSystemParameters {
  // The 4 core parameters every client provides
  bus_fault_level: number;        // kA (e.g., 31.5)
  system_frequency: number;       // Hz (50 or 60)
  bus_voltage_level: number;      // kV (e.g., 132, 33, 11)
  xr_ratio: number;               // X/R ratio (typically 10-40)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. WIRING PARAMETERS (Client Provides for CT and VT separately)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CTWiringParameters {
  conductor_cross_section: number;    // mm² (e.g., 6, 10, 16)
  resistance_w_km_20c: number;        // Ω/km at 20°C
  lead_length_ct_to_relay: number;    // meters (actual physical distance)
}

export interface VTWiringParameters {
  conductor_cross_section: number;    // mm²
  resistance_w_km_20c: number;        // Ω/km at 20°C  
  lead_length_vt_to_relay: number;    // meters
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TRANSMISSION LINE PARAMETERS (Client Provides These)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TransmissionLineParameters {
  positive_sequence_resistance: number;  // R1 (Ω/km)
  positive_sequence_reactance: number;   // X1 (Ω/km)  
  zero_sequence_resistance: number;      // R0 (Ω/km)
  zero_sequence_reactance: number;       // X0 (Ω/km)
  route_length: number;                  // km (total route length)
  source_impedance_zs: number;           // pu (per unit) - Source Impedance
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. IED-SPECIFIC PARAMETERS (Client Provides for Each IED)
// ═══════════════════════════════════════════════════════════════════════════════

export interface IEDParameters {
  ied_name: string;              // e.g., "SIEMENS 7SJ85", "ABB RET670"
  ct_ratio: string;              // e.g., "3200/1A", "1600/5A"
  accuracy_class: string;        // e.g., "5P20", "PX", "0.5"
  ct_resistance: number;         // Ω (measured or from datasheet)
  magnetizing_current: number;   // mA at Vk
  knee_point_voltage: number;    // V (Vk from CT test certificate)
  accuracy_limit_factor: number; // CT Accuracy Limit Factor (user input)
  // Note: burden will be calculated from known IED specifications
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. COMPLETE INPUT STRUCTURE (What Web Interface Collects)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CTVTAdequacyInput {
  system: BasicSystemParameters;
  ct_wiring: CTWiringParameters;
  vt_wiring: VTWiringParameters;
  transmission_line: TransmissionLineParameters;
  ieds: IEDParameters[];  // Array of IEDs to check
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CALCULATED PARAMETERS (System Calculates These Automatically)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalculatedSystemParameters {
  // Source impedance calculations
  source_impedance: number;           // Zs (Ω)
  source_resistance: number;          // Rs (Ω) 
  source_reactance: number;           // Xs (Ω)
  time_constant: number;              // tp (s)
  
  // Phase voltages and currents
  phase_voltage: number;              // V (line-to-neutral)
  max_fault_current: number;          // A (3-phase fault)
  max_fault_current_1ph: number;      // A (1-phase fault)
  
  // Distance protection zones
  zone1_reach_impedance: number;      // 80% reach impedance
  zone1_fault_current_3ph: number;    // 3-phase fault at zone 1
  zone1_fault_current_1ph: number;    // 1-phase fault at zone 1
}

export interface CalculatedWiringParameters {
  ct_wiring: {
    loop_resistance: number;          // Ω (total CT loop)
    lead_burden: number;              // VA (I²R losses)
    resistance_at_temp: number;       // Ω/km at operating temperature
  };
  vt_wiring: {
    loop_resistance: number;          // Ω (total VT loop)  
    lead_burden: number;              // VA
    resistance_at_temp: number;       // Ω/km at operating temperature
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. IED BURDEN DATABASE (Built into System)
// ═══════════════════════════════════════════════════════════════════════════════

export interface StandardIEDBurdens {
  // Protection IEDs
  "SIEMENS 7SJ85": number;      // VA
  "ABB RET670": number;         // VA
  "ABB RED670": number;         // VA
  "SEL 751": number;            // VA
  "GE F650": number;            // VA
  
  // Metering IEDs  
  "ABB REB500": number;         // VA
  "SCHNEIDER ION7650": number;  // VA
  "SOCOMEC DIRIS": number;      // VA
  
  // Control IEDs
  "ABB REC650": number;         // VA
  "SCHNEIDER P142": number;     // VA
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. ADEQUACY CHECK RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface IEDAdequacyResult {
  ied_name: string;
  ied_type: 'PROTECTION' | 'METERING' | 'CONTROL';
  
  // Input summary
  ct_ratio_primary: number;
  ct_ratio_secondary: number;
  accuracy_class: string;
  
  // Calculated burdens
  ct_internal_burden: number;     // PE (VA)
  lead_burden: number;            // PL (VA) 
  ied_burden: number;             // IED consumption (VA)
  total_burden: number;           // Total (VA)
  
  // Adequacy calculations
  calculation_method: 'KSSC' | 'VK_METHOD';
  
  // For KSSC method (protection relays)
  required_kssc?: number;
  available_kssc?: number;
  
  // For Vk method (all types)
  required_vk?: number;
  available_vk?: number;
  
  // Final verdict
  verdict: 'SUITABLE' | 'UNDER_DIMENSIONED' | 'NOT_APPLICABLE';
  safety_margin: number;          // %
  
  // Detailed breakdown
  calculation_steps: CalculationStep[];
}

export interface CalculationStep {
  step_name: string;
  formula: string;
  inputs: Record<string, number>;
  result: number;
  unit: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. COMPLETE ADEQUACY REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CTVTAdequacyReport {
  project_info: {
    project_name: string;
    substation: string;
    voltage_level: string;
    date_calculated: string;
    engineer: string;
  };
  
  system_summary: BasicSystemParameters & CalculatedSystemParameters;
  wiring_summary: CalculatedWiringParameters;
  
  ied_results: IEDAdequacyResult[];
  
  overall_summary: {
    total_ieds_checked: number;
    suitable_ieds: number;
    under_dimensioned_ieds: number;
    not_applicable_ieds: number;
    overall_verdict: 'ALL_SUITABLE' | 'SOME_ISSUES' | 'MAJOR_ISSUES';
  };
  
  recommendations: string[];
  calculation_standards: string[];
}