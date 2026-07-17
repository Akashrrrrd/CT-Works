/**
 * AUTOMATED CT/VT ADEQUACY CALCULATION ENGINE
 * Calculates ALL derived parameters from basic inputs
 * Eliminates manual parameter entry requirements
 */

import type { 
  CTVTAdequacyInput, 
  CalculatedSystemParameters, 
  CalculatedWiringParameters,
  IEDAdequacyResult,
  CTVTAdequacyReport,
  CalculationStep,
  BasicSystemParameters,
  TransmissionLineParameters,
  CTWiringParameters,
  VTWiringParameters,
  IEDParameters
} from '@/lib/types/ct-vt-adequacy-types';

import { 
  IEDDatabaseService, 
  COPPER_TEMP_COEFFICIENT, 
  STANDARD_TEMPERATURES, 
  getAccuracyLimitFactor 
} from './ied-database';

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PARAMETER CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export class SystemCalculations {
  
  /**
   * Calculate all system parameters from basic inputs
   */
  static calculateSystemParameters(
    system: BasicSystemParameters, 
    line: TransmissionLineParameters
  ): CalculatedSystemParameters {
    
    const steps: CalculationStep[] = [];
    
    // 1. Phase voltage calculation
    const phase_voltage = (system.bus_voltage_level * 1000) / Math.sqrt(3);
    steps.push({
      step_name: "Phase Voltage",
      formula: "Vph = VLL / √3",
      inputs: { VLL: system.bus_voltage_level },
      result: phase_voltage,
      unit: "V",
      description: "Line-to-neutral voltage"
    });
    
    // 2. Maximum fault current
    const max_fault_current = system.bus_fault_level * 1000;
    steps.push({
      step_name: "Maximum Fault Current", 
      formula: "Ifmax = Fault_Level × 1000",
      inputs: { Fault_Level: system.bus_fault_level },
      result: max_fault_current,
      unit: "A",
      description: "3-phase fault current at bus"
    });
    
    // 3. Source impedance
    const source_impedance = phase_voltage / max_fault_current;
    steps.push({
      step_name: "Source Impedance",
      formula: "Zs = Vph / Ifmax", 
      inputs: { Vph: phase_voltage, Ifmax: max_fault_current },
      result: source_impedance,
      unit: "Ω",
      description: "Thevenin source impedance"
    });
    
    // 4. Source R and X components
    const theta_rad = Math.atan(system.xr_ratio);
    const source_resistance = source_impedance * Math.cos(theta_rad);
    const source_reactance = source_impedance * Math.sin(theta_rad);
    
    steps.push({
      step_name: "Source Resistance",
      formula: "Rs = Zs × cos(arctan(X/R))",
      inputs: { Zs: source_impedance, XR: system.xr_ratio },
      result: source_resistance,
      unit: "Ω", 
      description: "Source resistance component"
    });
    
    // 5. Time constant
    const time_constant = system.xr_ratio / (2 * Math.PI * system.system_frequency);
    steps.push({
      step_name: "DC Time Constant",
      formula: "tp = (X/R) / (2πf)",
      inputs: { XR: system.xr_ratio, f: system.system_frequency },
      result: time_constant,
      unit: "s",
      description: "DC offset decay time constant"
    });
    
    // 6. Line impedances
    const z1_total = Math.sqrt(
      Math.pow(line.positive_sequence_resistance * line.route_length, 2) +
      Math.pow(line.positive_sequence_reactance * line.route_length, 2)
    );
    
    const z0_total = Math.sqrt(
      Math.pow(line.zero_sequence_resistance * line.route_length, 2) +
      Math.pow(line.zero_sequence_reactance * line.route_length, 2)  
    );
    
    // 7. Zone 1 reach (80% of line)
    const zone1_reach = 0.8;
    const zone1_r = source_resistance + (zone1_reach * line.positive_sequence_resistance * line.route_length);
    const zone1_x = source_reactance + (zone1_reach * line.positive_sequence_reactance * line.route_length);
    const zone1_reach_impedance = Math.sqrt(zone1_r * zone1_r + zone1_x * zone1_x);
    
    // 8. Fault currents at zone 1
    const zone1_fault_current_3ph = phase_voltage / zone1_reach_impedance;
    
    // For 1-phase fault: I1ph = 3 × Vph / (Zs + Z1 + Z0)
    const fault_impedance_1ph = Math.sqrt(
      Math.pow(source_resistance + z1_total + z0_total, 2) +
      Math.pow(source_reactance, 2)
    );
    const max_fault_current_1ph = (3 * phase_voltage) / fault_impedance_1ph;
    const zone1_fault_current_1ph = (3 * phase_voltage) / (zone1_reach_impedance + z0_total);
    
    return {
      source_impedance: +source_impedance.toFixed(6),
      source_resistance: +source_resistance.toFixed(6), 
      source_reactance: +source_reactance.toFixed(6),
      time_constant: +time_constant.toFixed(6),
      phase_voltage: +phase_voltage.toFixed(1),
      max_fault_current: +max_fault_current.toFixed(1),
      max_fault_current_1ph: +max_fault_current_1ph.toFixed(1),
      zone1_reach_impedance: +zone1_reach_impedance.toFixed(6),
      zone1_fault_current_3ph: +zone1_fault_current_3ph.toFixed(1),
      zone1_fault_current_1ph: +zone1_fault_current_1ph.toFixed(1)
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIRING PARAMETER CALCULATIONS  
// ═══════════════════════════════════════════════════════════════════════════════

export class WiringCalculations {
  
  /**
   * Calculate all wiring parameters automatically
   */
  static calculateWiringParameters(
    ct_wiring: CTWiringParameters,
    vt_wiring: VTWiringParameters
  ): CalculatedWiringParameters {
    
    // Operating temperature (conservative estimate for outdoor applications)
    const operating_temp = STANDARD_TEMPERATURES.OUTDOOR_SWITCHGEAR;
    
    // CT wiring calculations
    const ct_resistance_at_temp = ct_wiring.resistance_w_km_20c * 
      (1 + COPPER_TEMP_COEFFICIENT * (operating_temp - 20));
    
    const ct_lead_resistance = (ct_wiring.lead_length_ct_to_relay / 1000) * ct_resistance_at_temp;
    const ct_loop_resistance = 2 * ct_lead_resistance; // Go and return path
    
    // Lead burden depends on CT secondary current (will be calculated per IED)
    const ct_lead_burden = 0; // Calculated in IED-specific function
    
    // VT wiring calculations  
    const vt_resistance_at_temp = vt_wiring.resistance_w_km_20c *
      (1 + COPPER_TEMP_COEFFICIENT * (operating_temp - 20));
    
    const vt_lead_resistance = (vt_wiring.lead_length_vt_to_relay / 1000) * vt_resistance_at_temp;
    const vt_loop_resistance = 2 * vt_lead_resistance;
    const vt_lead_burden = 0; // Usually negligible for VT circuits
    
    return {
      ct_wiring: {
        loop_resistance: +ct_loop_resistance.toFixed(6),
        lead_burden: ct_lead_burden,
        resistance_at_temp: +ct_resistance_at_temp.toFixed(6)
      },
      vt_wiring: {
        loop_resistance: +vt_loop_resistance.toFixed(6),
        lead_burden: vt_lead_burden, 
        resistance_at_temp: +vt_resistance_at_temp.toFixed(6)
      }
    };
  }
  
  /**
   * Calculate CT lead burden for specific secondary current
   */
  static calculateCTLeadBurden(
    loop_resistance: number,
    secondary_current: number
  ): number {
    return Math.pow(secondary_current, 2) * loop_resistance;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IED-SPECIFIC ADEQUACY CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export class IEDCalculations {
  
  /**
   * Calculate CT adequacy for a specific IED using appropriate method
   */
  static calculateIEDAdequacy(
    ied: IEDParameters,
    system_calc: CalculatedSystemParameters,
    wiring_calc: CalculatedWiringParameters
  ): IEDAdequacyResult {
    
    // Parse CT ratio
    const ct_ratio_match = ied.ct_ratio.match(/(\d+)\/(\d+)/);
    if (!ct_ratio_match) {
      throw new Error(`Invalid CT ratio format: ${ied.ct_ratio}`);
    }
    
    const ct_ratio_primary = parseInt(ct_ratio_match[1]);
    const ct_ratio_secondary = parseInt(ct_ratio_match[2]); 
    const ratio = ct_ratio_secondary / ct_ratio_primary;
    
    // Get IED specifications
    const ied_spec = IEDDatabaseService.getIEDSpecification(ied.ied_name);
    const ied_burden = IEDDatabaseService.getIEDBurden(ied.ied_name);
    const calculation_method = IEDDatabaseService.getCalculationMethod(ied.ied_name);
    
    // Calculate burdens
    const ct_internal_burden = Math.pow(ct_ratio_secondary, 2) * ied.ct_resistance;
    const lead_burden = WiringCalculations.calculateCTLeadBurden(
      wiring_calc.ct_wiring.loop_resistance,
      ct_ratio_secondary
    );
    const total_burden = ct_internal_burden + lead_burden + ied_burden;
    
    const calculation_steps: CalculationStep[] = [];
    
    // Add burden calculation steps
    calculation_steps.push({
      step_name: "CT Internal Burden",
      formula: "PE = In² × Rct", 
      inputs: { In: ct_ratio_secondary, Rct: ied.ct_resistance },
      result: ct_internal_burden,
      unit: "VA",
      description: "CT winding losses"
    });
    
    calculation_steps.push({
      step_name: "Lead Burden",
      formula: "PL = In² × RL",
      inputs: { In: ct_ratio_secondary, RL: wiring_calc.ct_wiring.loop_resistance },
      result: lead_burden, 
      unit: "VA",
      description: "Cable resistance losses"
    });
    
    let verdict: 'SUITABLE' | 'UNDER_DIMENSIONED' | 'NOT_APPLICABLE' = 'NOT_APPLICABLE';
    let safety_margin = 0;
    let required_kssc: number | undefined;
    let available_kssc: number | undefined; 
    let required_vk: number | undefined;
    let available_vk: number | undefined;
    
    // Choose calculation method based on IED type
    if (calculation_method === 'KSSC' || calculation_method === 'BOTH') {
      // KSSC Method (for protection relays)
      const max_fault_current = Math.max(
        system_calc.max_fault_current,
        system_calc.zone1_fault_current_3ph,
        system_calc.zone1_fault_current_1ph
      );
      
      required_kssc = max_fault_current / ct_ratio_primary;
      
      const alf = getAccuracyLimitFactor(ied.accuracy_class);
      const rated_burden = 10; // Typical rated burden for protection CTs
      
      available_kssc = alf * (ct_internal_burden + rated_burden) / (ct_internal_burden + lead_burden);
      
      calculation_steps.push({
        step_name: "Required Kssc",
        formula: "Kssc_req = Ifmax / Ipn",
        inputs: { Ifmax: max_fault_current, Ipn: ct_ratio_primary },
        result: required_kssc,
        unit: "",
        description: "Required accuracy limit factor"
      });
      
      calculation_steps.push({
        step_name: "Available Kssc", 
        formula: "Kssc_avail = ALF × (PE + PN) / (PE + PL)",
        inputs: { ALF: alf, PE: ct_internal_burden, PN: rated_burden, PL: lead_burden },
        result: available_kssc,
        unit: "",
        description: "Available accuracy limit factor"
      });
      
      if (available_kssc >= required_kssc) {
        verdict = 'SUITABLE';
        safety_margin = ((available_kssc - required_kssc) / required_kssc) * 100;
      } else {
        verdict = 'UNDER_DIMENSIONED';
        safety_margin = ((available_kssc - required_kssc) / required_kssc) * 100; // Negative
      }
    }
    
    if (calculation_method === 'VK_METHOD' || calculation_method === 'BOTH') {
      // Vk Method (universal method)
      const max_secondary_current = Math.max(
        system_calc.max_fault_current * ratio,
        system_calc.zone1_fault_current_3ph * ratio,
        system_calc.zone1_fault_current_1ph * ratio
      );
      
      required_vk = max_secondary_current * (ied.ct_resistance + wiring_calc.ct_wiring.loop_resistance + (ied_burden / Math.pow(ct_ratio_secondary, 2)));
      available_vk = ied.knee_point_voltage;
      
      calculation_steps.push({
        step_name: "Required Vk",
        formula: "Vk_req = Is_max × (Rct + RL + Rb)",
        inputs: { 
          Is_max: max_secondary_current, 
          Rct: ied.ct_resistance,
          RL: wiring_calc.ct_wiring.loop_resistance,
          Rb: ied_burden / Math.pow(ct_ratio_secondary, 2)
        },
        result: required_vk,
        unit: "V",
        description: "Required knee point voltage"
      });
      
      if (available_vk >= required_vk) {
        verdict = 'SUITABLE';
        safety_margin = ((available_vk - required_vk) / required_vk) * 100;
      } else {
        verdict = 'UNDER_DIMENSIONED'; 
        safety_margin = ((available_vk - required_vk) / required_vk) * 100; // Negative
      }
    }
    
    return {
      ied_name: ied.ied_name,
      ied_type: ied_spec?.type || 'PROTECTION',
      ct_ratio_primary,
      ct_ratio_secondary,
      accuracy_class: ied.accuracy_class,
      ct_internal_burden: +ct_internal_burden.toFixed(4),
      lead_burden: +lead_burden.toFixed(4),
      ied_burden,
      total_burden: +total_burden.toFixed(4),
      calculation_method,
      required_kssc,
      available_kssc,
      required_vk,
      available_vk,
      verdict,
      safety_margin: +safety_margin.toFixed(2),
      calculation_steps
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN AUTOMATED CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class AutomatedCalculationEngine {
  
  /**
   * Complete CT/VT adequacy analysis from basic inputs only
   * NO MANUAL PARAMETERS REQUIRED
   */
  static performCompleteAnalysis(input: CTVTAdequacyInput): CTVTAdequacyReport {
    
    // 1. Calculate all system parameters automatically  
    const system_calc = SystemCalculations.calculateSystemParameters(
      input.system,
      input.transmission_line
    );
    
    // 2. Calculate all wiring parameters automatically
    const wiring_calc = WiringCalculations.calculateWiringParameters(
      input.ct_wiring,
      input.vt_wiring  
    );
    
    // 3. Calculate adequacy for each IED
    const ied_results: IEDAdequacyResult[] = input.ieds.map(ied => 
      IEDCalculations.calculateIEDAdequacy(ied, system_calc, wiring_calc)
    );
    
    // 4. Generate overall summary
    const total_ieds = ied_results.length;
    const suitable_ieds = ied_results.filter(r => r.verdict === 'SUITABLE').length;
    const under_dimensioned_ieds = ied_results.filter(r => r.verdict === 'UNDER_DIMENSIONED').length;
    const not_applicable_ieds = ied_results.filter(r => r.verdict === 'NOT_APPLICABLE').length;
    
    let overall_verdict: 'ALL_SUITABLE' | 'SOME_ISSUES' | 'MAJOR_ISSUES';
    if (suitable_ieds === total_ieds) {
      overall_verdict = 'ALL_SUITABLE';
    } else if (under_dimensioned_ieds === 0) {
      overall_verdict = 'SOME_ISSUES';
    } else {
      overall_verdict = 'MAJOR_ISSUES';
    }
    
    // 5. Generate recommendations
    const recommendations: string[] = [];
    
    if (under_dimensioned_ieds > 0) {
      recommendations.push("⚠️ Some IEDs are under-dimensioned. Consider upgrading CT specifications or reducing lead lengths.");
    }
    
    if (ied_results.some(r => r.safety_margin < 20)) {
      recommendations.push("⚠️ Some IEDs have low safety margins (<20%). Consider design review.");
    }
    
    if (ied_results.some(r => r.lead_burden > 5)) {
      recommendations.push("💡 High lead burdens detected. Consider larger cable cross-sections or shorter routes.");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("✅ All IEDs are adequately protected. Design meets requirements.");
    }
    
    return {
      project_info: {
        project_name: "CT/VT Adequacy Analysis",
        substation: `${input.system.bus_voltage_level}kV Substation`,
        voltage_level: `${input.system.bus_voltage_level}kV`,
        date_calculated: new Date().toISOString().split('T')[0],
        engineer: "Automated Calculation Engine"
      },
      
      system_summary: { ...input.system, ...system_calc },
      wiring_summary: wiring_calc,
      ied_results,
      
      overall_summary: {
        total_ieds_checked: total_ieds,
        suitable_ieds,
        under_dimensioned_ieds,
        not_applicable_ieds,
        overall_verdict
      },
      
      recommendations,
      
      calculation_standards: [
        "IEC 61869-2: Current Transformers",
        "IEEE C37.110: Application Guide for Current Transformers",
        "IEC 60044-1: Current Transformers (Legacy)",
        "IEEE C57.13: Requirements for Instrument Transformers"
      ]
    };
  }
  
  /**
   * Quick adequacy check for single IED
   */
  static quickIEDCheck(
    ied: IEDParameters,
    system: BasicSystemParameters,
    ct_wiring: CTWiringParameters,
    transmission_line: TransmissionLineParameters
  ): IEDAdequacyResult {
    
    const full_input: CTVTAdequacyInput = {
      system,
      ct_wiring,
      vt_wiring: {
        conductor_cross_section: 2.5,
        resistance_w_km_20c: 7.41,
        lead_length_vt_to_relay: 100
      },
      transmission_line,
      ieds: [ied]
    };
    
    const report = this.performCompleteAnalysis(full_input);
    return report.ied_results[0];
  }
}