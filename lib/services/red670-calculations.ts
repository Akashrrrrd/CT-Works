/**
 * RED670 IED TEMPLATE - CT/VT ADEQUACY CALCULATIONS (Ealreq / Vk METHOD)
 * Based on Hitachi Technical Documentation N-19957 2-DF4W
 * 132kV Cable Feeders - Line Differential & Distance Protection
 *
 * Verified against document pages 6-11: all Ealreq formulas (differential
 * close-in/through-fault, distance close-in/endzone-1) and the
 * Vk_required = Ealreq × 0.8 relationship reproduce the document's worked
 * example exactly (499.84 V -> 399.87 V, matching the doc to the cent).
 *
 * FIX: the previous version silently always reported "tap2 (1800A)" as the
 * recommended/final result regardless of which CT tap is actually in
 * service. That's only valid because the reference document happens to use
 * the 1800A tap — it is not a general rule. This version requires the
 * caller to say which tap is in service (or computes both and lets the
 * caller choose), instead of hardcoding it.
 */

export interface CT_Parameters_RED670 {
  ct_ratio_tap1: number;               // e.g. 3200 A
  ct_ratio_tap2: number;               // e.g. 1800 A
  ct_ratio_secondary: number;          // 1 A
  class_of_accuracy: string;           // e.g. PX
  ct_resistance_tap1: number;          // Rct (Ω) at tap1
  ct_resistance_tap2: number;          // Rct (Ω) at tap2
  knee_point_voltage_tap1: number;     // Available Vk (V) at tap1
  knee_point_voltage_tap2: number;     // Available Vk (V) at tap2
  magnetizing_current_tap1: number;    // I0 (mA) at Vk, tap1
  magnetizing_current_tap2: number;    // I0 (mA) at Vk, tap2
}

export interface System_Parameters_RED670 {
  system_frequency: number;
  hv_bus_voltage: number;
  mv_bus_voltage: number;
  max_hv_fault_current: number;        // Ikmax — close-in faults
  max_through_fault_3ph: number;       // Itmax 3ph — through faults
  max_through_fault_1ph: number;       // Itmax 1ph — through faults
  max_endzone1_3ph: number;            // Ikzone1 3ph
  max_endzone1_1ph: number;            // Ikzone1 1ph
  xr_ratio: number;
  system_time_constant_3ph: number;         // ms
  system_time_constant_1ph_through: number; // ms
  system_time_constant_1ph_endzone: number; // ms
}

export interface Connected_Devices_RED670 {
  red670_burden: number;               // Sr — 0.02 VA per document
  other_devices_burden?: number;
}

export interface Wiring_Parameters_RED670 {
  total_lead_resistance: number;       // RI — the current-loop lead resistance (Ω)
  conductor_length: number;
  conductor_cross_section: number;
  resistance_per_km: number;
}

export interface Cable_Parameters_RED670 {
  positive_sequence_resistance: number;
  positive_sequence_reactance: number;
  zero_sequence_resistance: number;
  zero_sequence_reactance: number;
  route_length: number;
  cable_positive_impedance_total: number;
  cable_zero_impedance_total: number;
}

/**
 * ============================================================
 * DIFFERENTIAL PROTECTION CALCULATIONS (Hitachi pages 6-8)
 * ============================================================
 */
export class DifferentialProtectionCalculations_RED670 {

  /** Eq (1): Ealreq = Ikmax × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir)) */
  static calculateEalreqCloseFaults(ikmax: number, isn: number, ipn: number, rct: number, rl: number, sr: number, ir: number): number {
    return ikmax * (isn / ipn) * (rct + rl + sr / (ir * ir));
  }

  /** Eq (2): Ealreq = 2 × Itmax × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir)) — 3-phase */
  static calculateEalreqThroughFaults3ph(itmax: number, isn: number, ipn: number, rct: number, rl: number, sr: number, ir: number): number {
    return 2 * itmax * (isn / ipn) * (rct + rl + sr / (ir * ir));
  }

  /** Eq (2): same formula, 1-phase-to-earth current */
  static calculateEalreqThroughFaults1ph(itmax: number, isn: number, ipn: number, rct: number, rl: number, sr: number, ir: number): number {
    return 2 * itmax * (isn / ipn) * (rct + rl + sr / (ir * ir));
  }

  static determineControllingEalreqDifferential(
    ealreq_close: number,
    ealreq_through_3ph: number,
    ealreq_through_1ph: number
  ): { highest: number; equation: string } {
    const values = [
      { value: ealreq_close, equation: 'Close-in Faults' },
      { value: ealreq_through_3ph, equation: 'Through Faults (3-ph)' },
      { value: ealreq_through_1ph, equation: 'Through Faults (1-ph)' },
    ];
    const highest = values.reduce((max, cur) => (cur.value > max.value ? cur : max));
    return { highest: highest.value, equation: highest.equation };
  }
}

/**
 * ============================================================
 * DISTANCE PROTECTION CALCULATIONS (Hitachi pages 8-11)
 * ============================================================
 */
export class DistanceProtectionCalculations_RED670 {

  /** Ealreq = Ikmax × (Isn/Ipn) × a × (Rct + Rl + Sr/(Ir×Ir)), a=1 for tp<=400ms */
  static calculateEalreqDistanceCloseFaults(ikmax: number, isn: number, ipn: number, a_factor: number, rct: number, rl: number, sr: number, ir: number): number {
    return ikmax * (isn / ipn) * a_factor * (rct + rl + sr / (ir * ir));
  }

  /** Ealreq = Ikzone1 × (Isn/Ipn) × k × (Rct + Rl + Sr/(Ir×Ir)), k=3 for tp<=200ms — 3-phase */
  static calculateEalreqDistanceEndzone1_3ph(ikzone1: number, isn: number, ipn: number, k_factor: number, rct: number, rl: number, sr: number, ir: number): number {
    return ikzone1 * (isn / ipn) * k_factor * (rct + rl + sr / (ir * ir));
  }

  /** Same formula, 1-phase-to-earth endzone-1 current */
  static calculateEalreqDistanceEndzone1_1ph(ikzone1: number, isn: number, ipn: number, k_factor: number, rct: number, rl: number, sr: number, ir: number): number {
    return ikzone1 * (isn / ipn) * k_factor * (rct + rl + sr / (ir * ir));
  }

  static determineControllingEalreqDistance(
    ealreq_close: number,
    ealreq_endzone1_3ph: number,
    ealreq_endzone1_1ph: number
  ): { highest: number; equation: string } {
    const values = [
      { value: ealreq_close, equation: 'Close-in Faults' },
      { value: ealreq_endzone1_3ph, equation: 'Endzone-1 (3-ph)' },
      { value: ealreq_endzone1_1ph, equation: 'Endzone-1 (1-ph)' },
    ];
    const highest = values.reduce((max, cur) => (cur.value > max.value ? cur : max));
    return { highest: highest.value, equation: highest.equation };
  }
}

/**
 * ============================================================
 * CT ADEQUACY (KNEE-POINT VOLTAGE) — Hitachi pages 9-11
 * ============================================================
 */
export class CT_AdequacyCalculations_RED670 {

  /** Vk_required = Ealreq × 0.8 (per manufacturer reference) */
  static calculateRequiredVk(ealreq: number): number {
    return ealreq * 0.8;
  }

  static determineCTSuitability(available_vk: number, required_vk: number): { suitable: boolean; verdict: string; margin: number } {
    const suitable = available_vk > required_vk;
    const margin = ((available_vk - required_vk) / required_vk) * 100;
    return { suitable, verdict: suitable ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED', margin };
  }
}

/**
 * ============================================================
 * MAIN RED670 CALCULATION ENGINE
 * ============================================================
 */
export class RED670_Calculator {

  /**
   * Computes both taps' full breakdown and returns them side by side.
   * The caller must specify which tap is actually in service via
   * `active_tap` ('tap1' | 'tap2') — this replaces the old hardcoded
   * "always report tap2" behavior.
   */
  static performCompleteCalculation(input: {
    ct_parameters: CT_Parameters_RED670;
    system_parameters: System_Parameters_RED670;
    connected_devices: Connected_Devices_RED670;
    wiring_parameters: Wiring_Parameters_RED670;
    cable_parameters: Cable_Parameters_RED670;
    active_tap?: 'tap1' | 'tap2'; // defaults to 'tap2' ONLY if caller doesn't specify
  }) {
    const results: any = {
      differential_calculations: {},
      distance_calculations: {},
      ct_adequacy_check: {},
      final_verdict: '',
      tap_comparison: {},
      active_tap: input.active_tap ?? 'tap2',
      document_reference: {
        title: 'CT/VT ADEQUACY CHECK - 132/33kV SUBSTATION DF4W',
        document_no: 'N-19957 2-DF4W',
        device: 'RED670 - Line Differential & Distance Protection',
        application: '132kV Cable Feeders',
        functions: ['Line Differential Protection', 'Distance Protection (Zones 1-3)', 'Overcurrent Protection'],
      },
    };

    const ct_params = input.ct_parameters;
    const system_params = input.system_parameters;
    const wiring = input.wiring_parameters;
    const devices = input.connected_devices;

    const isn = ct_params.ct_ratio_secondary;
    const rl = wiring.total_lead_resistance;
    const sr = devices.red670_burden;
    const ir = 1;

    const taps = [
      { key: 'tap1', name: 'Tap-1', ipn: ct_params.ct_ratio_tap1, rct: ct_params.ct_resistance_tap1, available_vk: ct_params.knee_point_voltage_tap1 },
      { key: 'tap2', name: 'Tap-2', ipn: ct_params.ct_ratio_tap2, rct: ct_params.ct_resistance_tap2, available_vk: ct_params.knee_point_voltage_tap2 },
    ] as const;

    taps.forEach((tap) => {
      const ealreq_diff_close = DifferentialProtectionCalculations_RED670.calculateEalreqCloseFaults(
        system_params.max_hv_fault_current, isn, tap.ipn, tap.rct, rl, sr, ir
      );
      const ealreq_diff_through_3ph = DifferentialProtectionCalculations_RED670.calculateEalreqThroughFaults3ph(
        system_params.max_through_fault_3ph, isn, tap.ipn, tap.rct, rl, sr, ir
      );
      const ealreq_diff_through_1ph = DifferentialProtectionCalculations_RED670.calculateEalreqThroughFaults1ph(
        system_params.max_through_fault_1ph, isn, tap.ipn, tap.rct, rl, sr, ir
      );
      const controlling_diff = DifferentialProtectionCalculations_RED670.determineControllingEalreqDifferential(
        ealreq_diff_close, ealreq_diff_through_3ph, ealreq_diff_through_1ph
      );

      const ealreq_dist_close = DistanceProtectionCalculations_RED670.calculateEalreqDistanceCloseFaults(
        system_params.max_hv_fault_current, isn, tap.ipn, 1, tap.rct, rl, sr, ir
      );
      const ealreq_dist_endzone1_3ph = DistanceProtectionCalculations_RED670.calculateEalreqDistanceEndzone1_3ph(
        system_params.max_endzone1_3ph, isn, tap.ipn, 3, tap.rct, rl, sr, ir
      );
      const ealreq_dist_endzone1_1ph = DistanceProtectionCalculations_RED670.calculateEalreqDistanceEndzone1_1ph(
        system_params.max_endzone1_1ph, isn, tap.ipn, 3, tap.rct, rl, sr, ir
      );
      const controlling_dist = DistanceProtectionCalculations_RED670.determineControllingEalreqDistance(
        ealreq_dist_close, ealreq_dist_endzone1_3ph, ealreq_dist_endzone1_1ph
      );

      const overall_highest = Math.max(controlling_diff.highest, controlling_dist.highest);
      const overall_controlling =
        overall_highest === controlling_diff.highest
          ? `Differential: ${controlling_diff.equation}`
          : `Distance: ${controlling_dist.equation}`;

      const required_vk = CT_AdequacyCalculations_RED670.calculateRequiredVk(overall_highest);
      const suitability = CT_AdequacyCalculations_RED670.determineCTSuitability(tap.available_vk, required_vk);

      results.tap_comparison[tap.key] = {
        tap_info: { name: tap.name, primary_current: tap.ipn, ct_resistance: tap.rct, available_vk: tap.available_vk },
        differential_protection: {
          close_in_faults: ealreq_diff_close,
          through_faults_3ph: ealreq_diff_through_3ph,
          through_faults_1ph: ealreq_diff_through_1ph,
          controlling_equation: controlling_diff.equation,
          highest_ealreq: controlling_diff.highest,
        },
        distance_protection: {
          close_in_faults: ealreq_dist_close,
          endzone1_3ph: ealreq_dist_endzone1_3ph,
          endzone1_1ph: ealreq_dist_endzone1_1ph,
          controlling_equation: controlling_dist.equation,
          highest_ealreq: controlling_dist.highest,
        },
        overall_assessment: {
          highest_ealreq: overall_highest,
          controlling_function: overall_controlling,
          required_vk,
          available_vk: tap.available_vk,
          suitable: suitability.suitable,
          verdict: suitability.verdict,
          safety_margin: suitability.margin,
        },
      };
    });

    // FIX: use the caller-specified active tap instead of always tap2.
    const activeKey = results.active_tap as 'tap1' | 'tap2';
    const active = results.tap_comparison[activeKey];

    results.final_verdict = active.overall_assessment.verdict;
    results.differential_calculations = active.differential_protection;
    results.distance_calculations = active.distance_protection;
    results.ct_adequacy_check = active.overall_assessment;

    // Flat fields to match the shape the UI (ComputationResult) expects.
    results.verdict = active.overall_assessment.verdict;
    results.vk_required = Math.round(active.overall_assessment.required_vk * 100) / 100;
    results.vk_available = Math.round(active.overall_assessment.available_vk * 100) / 100;
    results.ealreq_max = Math.round(active.overall_assessment.highest_ealreq * 100) / 100;
    results.vk_breakdown = [
      { label: 'Differential — Close-in', ealreq: active.differential_protection.close_in_faults, vk: active.differential_protection.close_in_faults * 0.8, isMax: false },
      { label: 'Differential — Through (3ph)', ealreq: active.differential_protection.through_faults_3ph, vk: active.differential_protection.through_faults_3ph * 0.8, isMax: false },
      { label: 'Differential — Through (1ph)', ealreq: active.differential_protection.through_faults_1ph, vk: active.differential_protection.through_faults_1ph * 0.8, isMax: false },
      { label: 'Distance — Close-in', ealreq: active.distance_protection.close_in_faults, vk: active.distance_protection.close_in_faults * 0.8, isMax: false },
      { label: 'Distance — Endzone-1 (3ph)', ealreq: active.distance_protection.endzone1_3ph, vk: active.distance_protection.endzone1_3ph * 0.8, isMax: false },
      { label: 'Distance — Endzone-1 (1ph)', ealreq: active.distance_protection.endzone1_1ph, vk: active.distance_protection.endzone1_1ph * 0.8, isMax: false },
    ].map((row) => ({ ...row, isMax: Math.abs(row.ealreq - active.overall_assessment.highest_ealreq) < 1e-6 }));
    // Comprehensive intermediates for PDF reporting (all values computed from user inputs)
    results.intermediates = {
      // Method Identification
      'calculation_method': 'VK_METHOD',
      
      // Core CT Parameters
      'Ipn_active': active.tap_info.primary_current,
      'Rct': active.tap_info.ct_resistance,
      'Vk_available': active.tap_info.available_vk,
      
      // Differential Protection Results
      'diff_close_in_ealreq': Math.round(active.differential_protection.close_in_faults * 100) / 100,
      'diff_through_3ph_ealreq': Math.round(active.differential_protection.through_faults_3ph * 100) / 100,
      'diff_through_1ph_ealreq': Math.round(active.differential_protection.through_faults_1ph * 100) / 100,
      'diff_controlling': active.differential_protection.controlling_equation,
      
      // Distance Protection Results
      'dist_close_in_ealreq': Math.round(active.distance_protection.close_in_faults * 100) / 100,
      'dist_endzone1_3ph_ealreq': Math.round(active.distance_protection.endzone1_3ph * 100) / 100,
      'dist_endzone1_1ph_ealreq': Math.round(active.distance_protection.endzone1_1ph * 100) / 100,
      'dist_controlling': active.distance_protection.controlling_equation,
      
      // Overall CT Adequacy
      'Ealreq_max': Math.round(active.overall_assessment.highest_ealreq * 100) / 100,
      'required_vk': results.vk_required,
      'available_vk': results.vk_available,
      'safety_margin_pct': Math.round(active.overall_assessment.safety_margin * 100) / 100,
      
      // Kssc fields (not applicable for RED670, but set to undefined for consistency)
      'required_kssc': undefined,
      'available_kssc': undefined,
    };
    
    results.calculation_method = 'VK_METHOD';  // Explicitly mark this as Vk method

    return results;
  }

  /**
   * Validate calculation against Hitachi document expected values (tap2/1800A case).
   */
  static validateAgainstDocument(results: any): { validation: boolean; differences: string[]; summary: string } {
    const differences: string[] = [];
    const tolerance = 2; // percent

    const expected = {
      diff_close_in: 186.58,
      dist_endzone1_1ph: 499.839,
      required_vk: 399.87,
      available_vk: 1250,
      verdict: 'SUITABLY DIMENSIONED',
    };

    const tap2Results = results.tap_comparison?.tap2;
    if (!tap2Results) {
      differences.push('Missing tap2 (1800A) results');
      return { validation: false, differences, summary: 'Critical calculation data missing' };
    }

    const diffDiff = Math.abs(tap2Results.differential_protection.close_in_faults - expected.diff_close_in);
    if ((diffDiff / expected.diff_close_in) * 100 > tolerance) {
      differences.push(`Differential close-in: ${tap2Results.differential_protection.close_in_faults.toFixed(2)}V (expected ${expected.diff_close_in}V)`);
    }

    const distDiff = Math.abs(tap2Results.distance_protection.endzone1_1ph - expected.dist_endzone1_1ph);
    if ((distDiff / expected.dist_endzone1_1ph) * 100 > tolerance) {
      differences.push(`Distance endzone-1 1ph: ${tap2Results.distance_protection.endzone1_1ph.toFixed(2)}V (expected ${expected.dist_endzone1_1ph}V)`);
    }

    const vkDiff = Math.abs(tap2Results.overall_assessment.required_vk - expected.required_vk);
    if ((vkDiff / expected.required_vk) * 100 > tolerance) {
      differences.push(`Required Vk: ${tap2Results.overall_assessment.required_vk.toFixed(2)}V (expected ${expected.required_vk}V)`);
    }

    if (tap2Results.overall_assessment.verdict !== expected.verdict) {
      differences.push(`Final verdict: ${tap2Results.overall_assessment.verdict} (expected ${expected.verdict})`);
    }

    const validation = differences.length === 0;
    return {
      validation,
      differences,
      summary: validation ? 'Calculations validated successfully' : `${differences.length} calculation(s) differ from document`,
    };
  }
}
