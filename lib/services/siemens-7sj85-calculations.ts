/**
 * SIEMENS 7SJ85 IED TEMPLATE - CT ADEQUACY CALCULATIONS (Kssc METHOD)
 * Based on Hitachi Technical Documentation N-19957 2-DF4W
 * 33kV Side Trafo Feeder (100MVA) — pages 1-7
 *
 * NOTE ON METHOD: This document uses the Accuracy Limit Factor / Kssc
 * method (Required Kssc = Itkmax/Ipn vs. Available Kssc = n*(PE+PN)/(PE+PL)),
 * NOT the knee-point-voltage (Ealreq/Vk) method used for RED670 differential
 * & distance protection in the 132kV cable feeder document. This file no
 * longer fabricates vk_required / vk_available values — those concepts do
 * not exist in the Kssc method as documented. The suitability verdict here
 * is driven entirely by required_kssc vs. available_kssc.
 */

export interface CT_WiringParameters {
  ct_conductor_cross_section: number;    // A (mm²)
  ct_resistance_w_km_20c: number;        // R20 (Ω/km) @ 20°C
  ct_specific_resistance_20c: number;    // a (/K⁻¹) = 0.00393 for copper
  ct_conductor_length_m: number;         // l (m)
  relay_rated_current: number;           // Ir (A)
}

export interface VT_WiringParameters {
  vt_conductor_cross_section: number;
  vt_resistance_w_km_20c: number;
  vt_specific_resistance_20c: number;
  vt_conductor_length_m: number;
  primary_voltage: number;
  secondary_voltage: number;
}

export interface SystemParams_7SJ85 {
  system_frequency: number;
  bus_voltage_level: number;
  max_bus_fault_level: number;           // kA — used as Itkmax
  xr_ratio: number;
}

export interface PowerLineParams_7SJ85 {
  positive_seq_resistance_r1: number;
  positive_seq_reactance_x1: number;
  zero_seq_resistance_r0: number;
  zero_seq_reactance_x0: number;
  route_length: number;
}

export interface CT_CoreParameters {
  ct_ratio_primary: number;              // Ipn
  ct_ratio_secondary: number;            // In — CT/relay secondary rated current, usually 1A
  class_of_accuracy: string;
  ct_resistance: number;                 // Rct (Ω) — used to derive PE
  rated_burden: number;                  // PN (VA)
  CT_Accuracy_Limit_Factor: number;      // n (ALF)
}

export interface ConnectedDevice {
  device_name: string;
  burden_va: number;
}

export type ConnectedDevices_7SJ85 = ConnectedDevice[];

/**
 * ============================================================
 * CT WIRING CALCULATIONS - EXACT HITACHI FORMULAS (PAGE 1)
 * ============================================================
 */
export class CT_WiringCalculations {

  /** R(75°C) = R20 × [1 + a(75-20)] = R20 × 1.21615 for a=0.00393 */
  static calculateResistance(r20: number): number {
    return r20 * 1.21615;
  }

  /** One-way lead resistance: RL = R(75°C) × l(km) */
  static calculateLeadResistance(r20: number, length_km: number): number {
    return r20 * 1.21615 * length_km;
  }

  /** Loop resistance (go + return): 2RL = 2 × R(75°C) × l(km) */
  static calculateLoopResistance(r20: number, length_km: number): number {
    return 2 * r20 * 1.21615 * length_km;
  }

  /**
   * VA burden of the connecting leads: P = Is² × (loop resistance)
   * Uses loop resistance because current returns via the second lead —
   * this matches how "RI" (the lead-loop resistance) is subsequently used
   * as a burden term in the Ealreq/Kssc formulas elsewhere in the document.
   */
  static calculateVAConsumption(secondary_current: number, r20: number, length_km: number): number {
    const loopR = 2 * r20 * 1.21615 * length_km;
    return Math.pow(secondary_current, 2) * loopR;
  }

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
    return r20 * 1.21615 * length_m;
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

  static calculateMaxHVBusbarFaultCurrent(max_bus_fault_level_ka: number): number {
    return max_bus_fault_level_ka * 1000;
  }

  static calculateHVRatingOfBusbar(bus_voltage_level_kv: number): number {
    return bus_voltage_level_kv * 1000;
  }

  static calculateSourceImpedanceZs(hv_rating_of_busbar_v: number, max_hv_busbar_fault_current_a: number): number {
    return hv_rating_of_busbar_v / (Math.sqrt(3) * max_hv_busbar_fault_current_a);
  }

  static calculateImpedanceAngleInRadians(xr_ratio: number): number {
    return Math.atan(xr_ratio);
  }
}

/**
 * ============================================================
 * BURDEN & CT ADEQUACY CALCULATIONS (PAGES 5-6) — Kssc METHOD
 * ============================================================
 */
export class BurdenCalculations {

  /** Internal Burden: PE = In² × Rct */
  static calculateInternalBurden(ct_ratio_secondary: number, ct_resistance: number): number {
    return Math.pow(ct_ratio_secondary, 2) * ct_resistance;
  }

  /** Required Kssc = Itkmax / Ipn */
  static calculateRequiredKssc(max_hv_busbar_fault_current: number, ct_ratio_primary: number): number {
    if (ct_ratio_primary === 0) throw new Error('CT primary ratio cannot be zero');
    return max_hv_busbar_fault_current / ct_ratio_primary;
  }

  /** Available Kssc = n × ((PE + PN) / (PE + PL)) */
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

  static determineCTSuitability(available_kssc: number, required_kssc: number): { suitable: boolean; verdict: string } {
    const suitable = available_kssc > required_kssc;
    return { suitable, verdict: suitable ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED' };
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
      throw new Error('At least one connected device with a burden (VA) is required.');
    }

    const results: any = {
      ct_calculations: {},
      vt_calculations: {},
      fault_calculations: {},
      burden_calculations: {},
      adequacy_check: {},
      intermediates: {},
    };

    // ------------------------------------------------------------
    // 1. CT WIRING CALCULATIONS (HITACHI PAGE 1)
    // ------------------------------------------------------------
    const cable_length_km = input.ct_wiring.ct_conductor_length_m / 1000;
    const R_75C = input.ct_wiring.ct_resistance_w_km_20c * 1.21615;
    const RL = R_75C * cable_length_km;
    const loop_resistance_ohm = 2 * R_75C * cable_length_km;

    // FIX: burden must be in VA (I² × loop resistance), not raw Ω.
    const wiring_burden_va = Math.pow(input.ct_core.ct_ratio_secondary, 2) * loop_resistance_ohm;

    results.ct_calculations = {
      resistance_at_75c_ohm_per_km: R_75C,
      lead_resistance_ohm: RL,
      loop_resistance_ohm: loop_resistance_ohm,
      va_consumption: wiring_burden_va,
    };

    // ------------------------------------------------------------
    // 2. VT WIRING CALCULATIONS (optional)
    // ------------------------------------------------------------
    if (input.vt_wiring) {
      const VT_R_75C = input.vt_wiring.vt_resistance_w_km_20c * 1.21615;
      const vt_length_km = input.vt_wiring.vt_conductor_length_m / 1000;
      const VT_RL = VT_R_75C * vt_length_km;
      const VT_loop = 2 * VT_R_75C * vt_length_km;

      results.vt_calculations = {
        resistance_at_75c_ohm_per_km: VT_R_75C,
        lead_resistance_ohm: VT_RL,
        loop_resistance_ohm: VT_loop,
        primary_voltage_normalized: input.vt_wiring.primary_voltage / Math.sqrt(3),
        secondary_voltage_normalized: input.vt_wiring.secondary_voltage / Math.sqrt(3),
      };
    }

    // ------------------------------------------------------------
    // 3. FAULT CURRENT (HITACHI PAGES 2-4)
    // ------------------------------------------------------------
    const Itkmax = input.system.max_bus_fault_level * 1000; // kA -> A
    const Vbusbar = input.system.bus_voltage_level * 1000;  // kV -> V
    const Zs = Vbusbar / (Math.sqrt(3) * Itkmax);
    const tp = input.system.xr_ratio / (2 * Math.PI * input.system.system_frequency);

    results.fault_calculations = {
      max_hv_busbar_fault_current_a: Itkmax,
      hv_rating_of_busbar_v: Vbusbar,
      source_impedance_zs: Zs,
      tp_ms: tp * 1000,
      xr_ratio: input.system.xr_ratio,
      system_frequency: input.system.system_frequency,
    };

    // ------------------------------------------------------------
    // 4. BURDEN CALCULATIONS (HITACHI PAGE 5-6)
    // ------------------------------------------------------------
    const PE = BurdenCalculations.calculateInternalBurden(input.ct_core.ct_ratio_secondary, input.ct_core.ct_resistance);
    const PL_devices = CT_WiringCalculations.calculateTotalLoadOtherBurden(input.connected_devices);
    const PL_total = wiring_burden_va + PL_devices;
    const PN = input.ct_core.rated_burden;
    const n = input.accuracy_limit_factor;

    results.burden_calculations = {
      internal_burden_PE_va: PE,
      wiring_burden_va: wiring_burden_va,
      devices_burden_va: PL_devices,
      total_burden_va: PL_total,
      rated_burden_PN_va: PN,
      device_count: input.connected_devices.length,
      devices: input.connected_devices,
    };

    // ------------------------------------------------------------
    // 5. CT ADEQUACY CHECK (Kssc METHOD, HITACHI PAGE 5-6)
    // ------------------------------------------------------------
    const required_kssc = BurdenCalculations.calculateRequiredKssc(Itkmax, input.ct_core.ct_ratio_primary);
    const available_kssc = BurdenCalculations.calculateAvailableKssc(n, PE, PN, PL_total);
    const { suitable, verdict } = BurdenCalculations.determineCTSuitability(available_kssc, required_kssc);

    results.adequacy_check = { required_kssc, available_kssc, suitable, verdict };

    // ------------------------------------------------------------
    // 6. FINAL RESULTS
    // (No Vk / Ealreq fields — this method does not produce a knee-point
    //  voltage. If the UI needs a single pair of "required/available"
    //  numbers to render, use required_kssc / available_kssc directly
    //  and label them as such rather than as volts.)
    // ------------------------------------------------------------
    results.required_kssc = Math.round(required_kssc * 100) / 100;
    results.available_kssc = Math.round(available_kssc * 100) / 100;
    results.verdict = verdict;
    results.final_verdict = verdict;
    results.calculation_method = 'KSSC';  // Explicitly mark this as Kssc method
    
    // Comprehensive intermediates for PDF reporting (all values computed from user inputs)
    results.intermediates = {
      // Fault Current Parameters
      Itkmax: Itkmax,
      Ipn: input.ct_core.ct_ratio_primary,
      
      // CT Secondary Current
      In: input.ct_core.ct_ratio_secondary,
      Rct: input.ct_core.ct_resistance,
      
      // Burden Parameters
      PE: Math.round(PE * 100) / 100,  // Internal burden
      PN: PN,  // Rated burden
      'wiring_burden': Math.round(wiring_burden_va * 100) / 100,
      'devices_burden': Math.round(PL_devices * 100) / 100,
      PL: Math.round(PL_total * 100) / 100,  // Total lead burden
      
      // Accuracy & Method
      n: input.accuracy_limit_factor,
      'calculation_method': 'KSSC',
      
      // Final Results (computed from all above)
      required_kssc: results.required_kssc,
      available_kssc: results.available_kssc,
      
      // Wiring Details
      'cable_R20': input.ct_wiring.ct_resistance_w_km_20c,
      'cable_length_m': input.ct_wiring.ct_conductor_length_m,
      'R_75C': Math.round(R_75C * 100) / 100,
      'RL_one_way': Math.round(RL * 100) / 100,
      'loop_resistance': Math.round(loop_resistance_ohm * 100) / 100,
    };

    return results;
  }
}
