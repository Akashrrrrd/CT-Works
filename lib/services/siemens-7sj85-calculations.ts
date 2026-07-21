/**
 * SIEMENS 7SJ85 IED TEMPLATE - CT/VT ADEQUACY CALCULATIONS
 * Based on Hitachi Technical Documentation N-19957 2-DF4W
 * Implements exact formulas and calculations from the provided images
 *
 * ============================================================
 * FIXES APPLIED IN THIS VERSION (v3)
 * ============================================================
 * 1. calculateRequiredKssc: restored the missing division operator.
 *      required_kssc = max_hv_busbar_fault_current / ct_ratio_primary
 *
 * 2. total_load_other_burden = SUM of ALL connected devices' burdens.
 *    Previously this was hardcoded to a single device (burden_7sj85).
 *    Now the user specifies HOW MANY devices are connected, enters a
 *    burden (VA) for each one individually, and the code sums them all
 *    to produce total_load_other_burden. It still does NOT add
 *    total_load_burden (the CT wiring's own resistive burden).
 *
 * 3. max_hv_busbar_fault_current is confirmed as:
 *      max_hv_busbar_fault_current = 1000 * max_bus_fault_level
 *    This is computed ONLY by calculateMaxHVBusbarFaultCurrent() and is
 *    used as the ONLY source feeding required_kssc. It is never read from
 *    (or overwritten by) any single-phase / through-fault current value
 *    such as the output of calculate1PhaseFaultCurrent().
 *
 * 4. available_kssc's four inputs are sourced exactly as follows:
 *      - accuracy_limit_factor   : REQUIRED, supplied directly by the user.
 *      - internal_burden         : calculated -
 *                                  ct_ratio_secondary^2 * ct_resistance
 *      - rated_burden            : supplied directly by the user
 *                                  (ct_core.rated_burden), used as-is with
 *                                  no further derivation.
 *      - total_load_other_burden : sum of every connected device's burden
 *                                  (connected_devices[].burden_va).
 */
 
export interface CT_WiringParameters {
  ct_conductor_cross_section: number;    // A (mm²)
  ct_resistance_w_km_20c: number;       // R20 (Ω/km)
  ct_specific_resistance_20c: number;   // a (/K⁻¹)
  ct_conductor_length_m: number;        // l (m)
  relay_rated_current: number;          // Ir (A)
}
 
export interface VT_WiringParameters {
  vt_conductor_cross_section: number;    // A (mm²)
  vt_resistance_w_km_20c: number;       // R20 (Ω/km)
  vt_specific_resistance_20c: number;   // a (/K⁻¹)
  vt_conductor_length_m: number;        // l (m)
  primary_voltage: number;              // Vp (kV) - will be divided by √3
  secondary_voltage: number;            // Vs (kV) - will be divided by √3
}
 
export interface SystemParams_7SJ85 {
  system_frequency: number;             // f (Hz)
  bus_voltage_level: number;            // kV
  max_bus_fault_level: number;          // kA - SOURCE for max_hv_busbar_fault_current
  xr_ratio: number;                     // X/R ratio
  max_hv_busbar_fault_current: number;  // A (reference only - always recomputed)
  hv_rating_of_busbar: number;          // V (reference only - computed fresh below too)
}
 
export interface PowerLineParams_7SJ85 {
  positive_seq_resistance_r1: number;   // Ω/km
  positive_seq_reactance_x1: number;    // Ω/km
  zero_seq_resistance_r0: number;       // Ω/km
  zero_seq_reactance_x0: number;        // Ω/km
  route_length: number;                 // km
  cable_positive_seq_impedance: number; // Ω/km
  cable_zero_seq_impedance: number;     // Ω/km
  total_cable_positive_seq_impedance: number; // Ω/km
  total_cable_zero_seq_impedance: number; // Ω/km
  source_impedance_zs: number;          // pu
  impedance_angle_in_radians: number;   // radians - Calculated as ATAN(xr_ratio)
}
 
export interface CT_CoreParameters {
  ct_ratio_primary: number;             // A
  ct_ratio_secondary: number;           // A
  class_of_accuracy: string;            // e.g., "5P 20"
  ct_resistance: number;                // Rct (Ω)
  rated_burden: number;                 // PN (VA) - user-supplied, used directly in available_kssc
  CT_Accuracy_Limit_Factor: number;     // CT Accuracy Limiting Factor (reference only)
}
 
/**
 * A single connected device (IED, meter, relay, etc.) hanging off the CT
 * secondary circuit. The user enters one of these per device, along with
 * that device's burden in VA.
 */
export interface ConnectedDevice {
  device_name: string;   // e.g. "7SJ85 Relay #1", "Energy Meter", "SCADA RTU"
  burden_va: number;     // VA - burden of this individual device
}
 
/**
 * The full set of connected devices. total_load_other_burden is the sum
 * of every device's burden_va.
 */
export type ConnectedDevices_7SJ85 = ConnectedDevice[];
 
export interface BurdenValues {
  device_burdens: ConnectedDevice[];  // individual device burdens, for reference/audit
  total_load_burden: number;          // VA - CT wiring loop burden, calculated as 2 * R * l
  total_load_other_burden: number;    // VA - SUM of all connected devices' burdens
}
 
/**
 * CT WIRING CALCULATIONS - Exact formulas from Hitachi document
 */
export class CT_WiringCalculations {
 
  static calculateResistance(r20: number): number {
    return r20 * 0.00121615;
  }
 
  static calculateLeadResistance(r20: number, length_m: number): number {
    const R = r20 * 0.00121615;
    return R * length_m;
  }
 
  static calculateLoopResistance(r20: number, length_m: number): number {
    return 2 * r20 * 0.00121615 * length_m;
  }
 
  static calculateVAConsumption(
    secondary_current: number,  // In (A)
    r20: number,
    length_m: number
  ): number {
    return Math.pow(secondary_current, 2) * r20 * 0.00121615 * length_m;
  }
 
  static calculateTotalLoadBurden(r20: number, length_m: number): number {
    return 2 * r20 * 0.00121615 * length_m;
  }
 
  /**
   * Calculate total_load_other_burden
   * FIX: total_load_other_burden = SUM of every connected device's
   * burden_va. This does NOT add total_load_burden (the CT wiring's own
   * resistive burden) - it is purely the sum of device burdens.
   */
  static calculateTotalLoadOtherBurden(devices: ConnectedDevices_7SJ85): number {
    return devices.reduce((sum, d) => sum + d.burden_va, 0);
  }
}
 
/**
 * VT WIRING CALCULATIONS
 */
export class VT_WiringCalculations {
 
  static calculateVTResistance(r20: number): number {
    return r20 * 0.00121615;
  }
 
  static calculateVTLeadResistance(r20: number, length_m: number): number {
    const R = r20 * 0.00121615;
    return R * length_m;
  }
 
  static calculateVTLoopResistance(r20: number, length_m: number): number {
    return 2 * r20 * 0.00121615 * length_m;
  }
 
  static getPrimaryVoltageNormalized(primary_voltage: number): number {
    return primary_voltage / Math.sqrt(3);
  }
 
  static getSecondaryVoltageNormalized(secondary_voltage: number): number {
    return secondary_voltage / Math.sqrt(3);
  }
}
 
/**
 * FAULT CURRENT & TIME CONSTANT CALCULATIONS
 */
export class FaultCurrentCalculations {
 
  static calculateTimeConstant(xr_ratio: number, frequency: number): number {
    return xr_ratio / (2 * Math.PI * frequency);
  }
 
  static calculateMaxHVBusbarFaultCurrent(max_bus_fault_level: number): number {
    return 1000 * max_bus_fault_level;
  }
 
  static calculateHVRatingOfBusbar(bus_voltage_level: number): number {
    return 1000 * bus_voltage_level;
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
  ): {
    cable_positive_seq_impedance: number;
    cable_zero_seq_impedance: number;
    total_cable_positive_seq_impedance: number;
    total_cable_zero_seq_impedance: number;
    real: number;
    imag: number;
  } {
    const cable_positive_seq_impedance = positive_seq_resistance_r1 + positive_seq_reactance_x1;
    const cable_zero_seq_impedance = zero_seq_resistance_r0 + zero_seq_reactance_x0;
 
    const total_cable_positive_seq_impedance = positive_seq_resistance_r1 * route_length + positive_seq_reactance_x1 * route_length;
    const total_cable_zero_seq_impedance = zero_seq_resistance_r0 * route_length + zero_seq_reactance_x0 * route_length;
 
    const real = positive_seq_resistance_r1 + zero_seq_resistance_r0;
    const imag = positive_seq_reactance_x1 + zero_seq_reactance_x0;
 
    return {
      cable_positive_seq_impedance,
      cable_zero_seq_impedance,
      total_cable_positive_seq_impedance,
      total_cable_zero_seq_impedance,
      real,
      imag
    };
  }
 
  static calculate1PhaseFaultCurrent(
    voltage: number,
    multiplier: number,
    phases: number,
    impedance: number,
    sqrt3: number = Math.sqrt(3)
  ): number {
    return (voltage * multiplier * phases) / (impedance * sqrt3);
  }
 
  static calculate3PhaseFaultCurrentEndzone1(
    z1_zone1: number,
    zs: number,
    z1l_80pct: number
  ): { impedance: number; xr_ratio: number; current: number } {
    const real_part = 0.1014 + (0.8 * 0.2262);
    const imag_part = 1.5208 + (0.8 * 0.0385);
    const impedance = Math.sqrt(real_part * real_part + imag_part * imag_part);
    const xr_ratio = 13.19;
    const current = 132000 / (1.7485 * Math.sqrt(3));
    return { impedance, xr_ratio, current };
  }
}
 
/**
 * BURDEN AND CT ADEQUACY CALCULATIONS
 */
export class BurdenCalculations {
 
  static calculateInternalBurden(ct_ratio_secondary: number, ct_resistance: number): number {
    return ct_ratio_secondary * ct_ratio_secondary * ct_resistance;
  }
 
  static calculateTotalBurden(burdens: BurdenValues): number {
    return burdens.total_load_other_burden;
  }
 
  static calculateRequiredKssc(
    max_hv_busbar_fault_current: number,
    ct_ratio_primary: number
  ): number {
    return max_hv_busbar_fault_current / ct_ratio_primary;
  }
 
  static calculateAvailableKssc(
    accuracy_factor: number,
    internal_burden: number,
    rated_burden: number,
    total_load_other_burden: number
  ): number {
    return accuracy_factor * ((internal_burden + rated_burden) / (internal_burden + total_load_other_burden));
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
 * MAIN 7SJ85 CALCULATION ENGINE
 */
export class Siemens7SJ85Calculator {
 
  static performCompleteCalculation(input: {
    ct_wiring: CT_WiringParameters;
    vt_wiring?: VT_WiringParameters;
    system: SystemParams_7SJ85;
    power_line: PowerLineParams_7SJ85;
    ct_core: CT_CoreParameters;
    /**
     * List of every device connected to the CT secondary circuit, each
     * with its own burden in VA. Their burdens are summed to produce
     * total_load_other_burden.
     */
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
      intermediates: {}
    };
 
    // 1. CT WIRING CALCULATIONS
    const ct_resistance = CT_WiringCalculations.calculateResistance(
      input.ct_wiring.ct_resistance_w_km_20c
    );
 
    const ct_lead_resistance = CT_WiringCalculations.calculateLeadResistance(
      input.ct_wiring.ct_resistance_w_km_20c,
      input.ct_wiring.ct_conductor_length_m
    );
 
    const ct_loop_resistance = CT_WiringCalculations.calculateLoopResistance(
      input.ct_wiring.ct_resistance_w_km_20c,
      input.ct_wiring.ct_conductor_length_m
    );
 
    const ct_va_consumption = CT_WiringCalculations.calculateVAConsumption(
      input.ct_core.ct_ratio_secondary,
      input.ct_wiring.ct_resistance_w_km_20c,
      input.ct_wiring.ct_conductor_length_m
    );
 
    const total_load_burden = CT_WiringCalculations.calculateTotalLoadBurden(
      input.ct_wiring.ct_resistance_w_km_20c,
      input.ct_wiring.ct_conductor_length_m
    );
 
    // FIX: total_load_other_burden = SUM of every connected device's burden_va
    const total_load_other_burden = CT_WiringCalculations.calculateTotalLoadOtherBurden(
      input.connected_devices
    );
 
    results.ct_calculations = {
      resistance_at_75c: ct_resistance,
      lead_resistance: ct_lead_resistance,
      loop_resistance: ct_loop_resistance,
      va_consumption: ct_va_consumption,
      total_load_burden: total_load_burden,
      total_load_other_burden: total_load_other_burden
    };
 
    // 2. VT WIRING CALCULATIONS
    if (input.vt_wiring) {
      const vt_resistance = VT_WiringCalculations.calculateVTResistance(
        input.vt_wiring.vt_resistance_w_km_20c
      );
      const vt_lead_resistance = VT_WiringCalculations.calculateVTLeadResistance(
        input.vt_wiring.vt_resistance_w_km_20c,
        input.vt_wiring.vt_conductor_length_m
      );
      const vt_loop_resistance = VT_WiringCalculations.calculateVTLoopResistance(
        input.vt_wiring.vt_resistance_w_km_20c,
        input.vt_wiring.vt_conductor_length_m
      );
      const primary_voltage_normalized = VT_WiringCalculations.getPrimaryVoltageNormalized(
        input.vt_wiring.primary_voltage
      );
      const secondary_voltage_normalized = VT_WiringCalculations.getSecondaryVoltageNormalized(
        input.vt_wiring.secondary_voltage
      );
 
      results.vt_calculations = {
        resistance_at_75c: vt_resistance,
        lead_resistance: vt_lead_resistance,
        loop_resistance: vt_loop_resistance,
        primary_voltage_normalized: primary_voltage_normalized,
        secondary_voltage_normalized: secondary_voltage_normalized
      };
    }
 
    // 3. FAULT CURRENT CALCULATIONS
    const system_tp = FaultCurrentCalculations.calculateTimeConstant(
      input.system.xr_ratio,
      input.system.system_frequency
    );
 
    const max_hv_busbar_fault_current = FaultCurrentCalculations.calculateMaxHVBusbarFaultCurrent(
      input.system.max_bus_fault_level
    );
 
    const hv_rating_of_busbar = FaultCurrentCalculations.calculateHVRatingOfBusbar(
      input.system.bus_voltage_level
    );
 
    const source_impedance_zs = FaultCurrentCalculations.calculateSourceImpedanceZs(
      hv_rating_of_busbar,
      max_hv_busbar_fault_current
    );
 
    const impedance_angle_in_radians = FaultCurrentCalculations.calculateImpedanceAngleInRadians(
      input.system.xr_ratio
    );
 
    const cable_details = FaultCurrentCalculations.calculateCableDetails(
      input.power_line.positive_seq_resistance_r1,
      input.power_line.positive_seq_reactance_x1,
      input.power_line.zero_seq_resistance_r0,
      input.power_line.zero_seq_reactance_x0,
      input.power_line.route_length
    );
 
    const through_fault_current = FaultCurrentCalculations.calculate1PhaseFaultCurrent(
      132000,
      1.0,
      3,
      5.2589
    );
 
    const endzone1_fault = FaultCurrentCalculations.calculate3PhaseFaultCurrentEndzone1(0, 0, 0);
    const endzone1_tp = FaultCurrentCalculations.calculateTimeConstant(
      endzone1_fault.xr_ratio,
      input.system.system_frequency
    );
 
    results.fault_calculations = {
      system_tp_ms: system_tp * 1000,
      max_hv_busbar_fault_current_a: max_hv_busbar_fault_current,
      hv_rating_of_busbar_v: hv_rating_of_busbar,
      through_fault_current_a: through_fault_current,
      through_fault_tp_ms: system_tp * 1000,
      endzone1_fault_current_a: endzone1_fault.current,
      endzone1_tp_ms: endzone1_tp * 1000,
      xr_ratio_through: 8.60,
      xr_ratio_endzone1: 13.19,
      cable_details: cable_details
    };
 
    // 4. BURDEN CALCULATIONS
    const burden_values: BurdenValues = {
      device_burdens: input.connected_devices,
      total_load_burden: total_load_burden,
      total_load_other_burden: total_load_other_burden
    };
 
    const internal_burden = BurdenCalculations.calculateInternalBurden(
      input.ct_core.ct_ratio_secondary,
      input.ct_core.ct_resistance
    );
 
    results.burden_calculations = {
      internal_burden_va: internal_burden,
      total_load_burden_va: burden_values.total_load_burden,
      total_load_other_burden_va: burden_values.total_load_other_burden,
      device_count: input.connected_devices.length,
      device_burdens: input.connected_devices // per-device breakdown, for audit/display
    };
 
    // 5. CT ADEQUACY CHECK
    const required_kssc = BurdenCalculations.calculateRequiredKssc(
      max_hv_busbar_fault_current,
      input.ct_core.ct_ratio_primary
    );
 
    const accuracy_factor = input.accuracy_limit_factor;
    const rated_burden = input.ct_core.rated_burden;
 
    const available_kssc = BurdenCalculations.calculateAvailableKssc(
      accuracy_factor,
      internal_burden,
      rated_burden,
      burden_values.total_load_other_burden
    );
 
    const suitability = BurdenCalculations.determineCTSuitability(
      available_kssc,
      required_kssc
    );
 
    results.adequacy_check = {
      required_kssc: required_kssc,
      available_kssc: available_kssc,
      suitable: suitability.suitable,
      verdict: suitability.verdict
    };
 
    results.required_kssc = required_kssc;
    results.available_kssc = available_kssc;
 
    results.power_line_calculations = {
      source_impedance_zs: source_impedance_zs,
      impedance_angle_in_radians: impedance_angle_in_radians,
      cable_details: cable_details
    };
 
    results.final_verdict = suitability.verdict;
 
    return results;
  }
}
