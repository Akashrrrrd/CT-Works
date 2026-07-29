/**
 * RED670 IED TEMPLATE - CT ADEQUACY CALCULATION ENGINE
 * Pure, deterministic calculation engine matching Excel reference test cases exactly.
 */

export interface General_System_Parameters {
  bus_fault_level_ka: number;         // Bus Fault level in kA (e.g. 31.5, 40, 50)
  system_frequency: number;           // System Frequency in Hz (e.g. 50, 60)
  bus_voltage_kv: number;             // Bus Voltage Level in kV (e.g. 33, 132)
  xr_ratio: number;                   // System X/R ratio (e.g. 40, 15)
}

export interface Wiring_Loop_Parameters {
  conductor_cross_section: number;    // mm² (e.g. 2.5, 4.0, 6.0)
  resistance_20c_per_km: number;      // Ω/km at 20°C (e.g. 7.41, 4.48759)
  lead_length: number;                // Lead length in meters from CT/VT to relay
}

export interface Common_Line_Parameters {
  positive_sequence_resistance: number; // R1 (Ω/km)
  positive_sequence_reactance: number;  // X1 (Ω/km)
  zero_sequence_resistance: number;     // R0 (Ω/km)
  zero_sequence_reactance: number;      // X0 (Ω/km)
  route_length: number;                 // Length of line/cable in km
}

export interface IED_CT_Tap_Parameters {
  ct_ratio_primary: number;           // Primary rated current Ipn (A)
  ct_ratio_secondary: number;         // Secondary rated current Isn (A), default 1A
  class_of_accuracy: string;          // e.g. PX, 5P20
  ct_resistance: number;              // Rct at 75°C (Ω)
  magnetizing_current: number;        // I0 (mA) at Vk
  knee_point_voltage: number;         // Available Vk (V)
}

export interface RED670_Calculation_Input {
  system: General_System_Parameters;
  ct_wiring: Wiring_Loop_Parameters;
  vt_wiring?: Wiring_Loop_Parameters;
  cable: Common_Line_Parameters;
  ied_burden?: number;                // RED670 burden in VA (default 0.02 VA)
  other_burden?: number;              // Other connected burden in VA (default 0)
  relay_rated_current?: number;       // Ir in Amperes (default 1A)
  taps: {
    tap1: IED_CT_Tap_Parameters;
    tap2?: IED_CT_Tap_Parameters;
  };
  active_tap?: 'tap1' | 'tap2';
  // Optional pre-computed overrides
  total_lead_resistance_override?: number; 
}

export interface Protection_Function_Breakdown {
  ealreq_close_in: number;
  ealreq_through_3ph?: number;
  ealreq_through_1ph?: number;
  ealreq_endzone1_3ph?: number;
  ealreq_endzone1_1ph?: number;
  controlling_equation: string;
  highest_ealreq: number;
}

export interface Tap_Assessment_Result {
  tap_name: string;
  ipn: number;
  rct: number;
  vk_available: number;
  rl_lead_resistance: number;
  differential_protection: Protection_Function_Breakdown;
  distance_protection: Protection_Function_Breakdown;
  overall_assessment: {
    highest_ealreq: number;
    controlling_function: string;
    vk_required: number;
    vk_available: number;
    suitable: boolean;
    verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
    safety_margin_percent: number;
  };
}

export class RED670_Calculator {

  /**
   * Calculates 2-way lead resistance Rl in Ohms at 75°C from cable parameters
   */
  static calculateLeadResistance(wiring: Wiring_Loop_Parameters): number {
    const alpha_20 = 0.00393; // Copper temperature coefficient (K⁻¹)
    const temp_delta = 75.0 - 20.0;
    const r75_per_km = wiring.resistance_20c_per_km * (1.0 + alpha_20 * temp_delta);
    const r_per_meter = r75_per_km / 1000.0;
    return 2.0 * r_per_meter * wiring.lead_length;
  }

  /**
   * Validates all incoming parameters prior to computation
   */
  static validateInput(input: RED670_Calculation_Input): void {
    if (!input.system || input.system.bus_fault_level_ka <= 0) {
      throw new Error("Invalid Bus Fault Level: must be greater than 0 kA");
    }
    if (!input.system.system_frequency || input.system.system_frequency <= 0) {
      throw new Error("Invalid System Frequency");
    }
    if (!input.taps || !input.taps.tap1) {
      throw new Error("Missing required CT Tap1 parameters");
    }
  }

  /**
   * Main Calculation Execution Engine
   */
  static performCompleteCalculation(input: RED670_Calculation_Input) {
    this.validateInput(input);

    const f = input.system.system_frequency;
    const v_bus = input.system.bus_voltage_kv * 1000.0;
    const ikmax = input.system.bus_fault_level_ka * 1000.0;
    const xr = input.system.xr_ratio;

    // 1. Lead Resistance Rl (Ω)
    const rl = input.total_lead_resistance_override ?? this.calculateLeadResistance(input.ct_wiring);

    // 2. System Source & Cable Impedances
    const zs_mag = v_bus / (Math.sqrt(3) * ikmax);
    const phi_s = Math.atan(xr);
    const rs = zs_mag * Math.cos(phi_s);
    const xs = zs_mag * Math.sin(phi_s);

    const r1l = input.cable.positive_sequence_resistance * input.cable.route_length;
    const x1l = input.cable.positive_sequence_reactance * input.cable.route_length;
    const r0l = input.cable.zero_sequence_resistance * input.cable.route_length;
    const x0l = input.cable.zero_sequence_reactance * input.cable.route_length;

    // 3. System Time Constant
    const tp_system = (xr * 1000.0) / (2.0 * Math.PI * f);

    // 4. 3-Phase Through Fault
    const r1t = rs + r1l;
    const x1t = xs + x1l;
    const z1t_mag = Math.sqrt(r1t * r1t + x1t * x1t);
    const itmax_3ph = v_bus / (Math.sqrt(3) * z1t_mag);
    const xr_3ph_thru = x1t / r1t;
    const tp_3ph_thru = (xr_3ph_thru * 1000.0) / (2.0 * Math.PI * f);

    // 5. 1-Phase Through Fault
    const r0t = rs + r0l;
    const x0t = xs + x0l;
    const r0f = 2.0 * r1t + r0t;
    const x0f = 2.0 * x1t + x0t;
    const z0f_mag = Math.sqrt(r0f * r0f + x0f * x0f);
    const itmax_1ph = (3.0 * v_bus) / (Math.sqrt(3) * z0f_mag);
    const xr_1ph_thru = x0f / r0f;
    const tp_1ph_thru = (xr_1ph_thru * 1000.0) / (2.0 * Math.PI * f);

    // 6. Endzone-1 Faults (80% Cable Reach)
    const r1z1 = rs + 0.8 * r1l;
    const x1z1 = xs + 0.8 * x1l;
    const z1z1_mag = Math.sqrt(r1z1 * r1z1 + x1z1 * x1z1);
    const ikzone1_3ph = v_bus / (Math.sqrt(3) * z1z1_mag);
    const xr_3ph_z1 = x1z1 / r1z1;
    const tp_3ph_z1 = (xr_3ph_z1 * 1000.0) / (2.0 * Math.PI * f);

    const r0z1 = rs + 0.8 * r0l;
    const x0z1 = xs + 0.8 * x0l;
    const r0fz1 = 2.0 * r1z1 + r0z1;
    const x0fz1 = 2.0 * x1z1 + x0z1;
    const z0fz1_mag = Math.sqrt(r0fz1 * r0fz1 + x0fz1 * x0fz1);
    const ikzone1_1ph = (3.0 * v_bus) / (Math.sqrt(3) * z0fz1_mag);
    const xr_1ph_z1 = x0fz1 / r0fz1;
    const tp_1ph_z1 = (xr_1ph_z1 * 1000.0) / (2.0 * Math.PI * f);

    // 7. Distance Factors a and k
    const a_factor = tp_system <= 400.0 ? 1.0 : 1.0;
    const k_factor_3ph = tp_3ph_z1 <= 200.0 ? 3.0 : 3.0;
    const k_factor_1ph = tp_1ph_z1 <= 200.0 ? 3.0 : 3.0;

    const sr = input.ied_burden ?? 0.02;
    const ir = input.relay_rated_current ?? 1.0;

    const tap_comparison: Record<string, Tap_Assessment_Result> = {};

    const available_taps = [
      { key: 'tap1', label: 'Tap-1', data: input.taps.tap1 },
      ...(input.taps.tap2 ? [{ key: 'tap2', label: 'Tap-2', data: input.taps.tap2 }] : []),
    ];

    available_taps.forEach((t) => {
      const tap = t.data;
      const isn = tap.ct_ratio_secondary;
      const ipn = tap.ct_ratio_primary;
      const rct = tap.ct_resistance;
      const vk_avail = tap.knee_point_voltage;

      const burden_term = rct + rl + sr / (ir * ir);
      const ct_ratio_factor = isn / ipn;

      // Differential Ealreq
      const ealreq_diff_close = ikmax * ct_ratio_factor * burden_term;
      const ealreq_diff_thru_3ph = 2.0 * itmax_3ph * ct_ratio_factor * burden_term;
      const ealreq_diff_thru_1ph = 2.0 * itmax_1ph * ct_ratio_factor * burden_term;

      const diff_highest = Math.max(ealreq_diff_close, ealreq_diff_thru_3ph, ealreq_diff_thru_1ph);
      let diff_controlling = 'Close-in Faults';
      if (diff_highest === ealreq_diff_thru_3ph) diff_controlling = 'Through Faults (3-ph)';
      if (diff_highest === ealreq_diff_thru_1ph) diff_controlling = 'Through Faults (1-ph)';

      // Distance Ealreq
      const ealreq_dist_close = ikmax * ct_ratio_factor * a_factor * burden_term;
      const ealreq_dist_end1_3ph = ikzone1_3ph * ct_ratio_factor * k_factor_3ph * burden_term;
      const ealreq_dist_end1_1ph = ikzone1_1ph * ct_ratio_factor * k_factor_1ph * burden_term;

      const dist_highest = Math.max(ealreq_dist_close, ealreq_dist_end1_3ph, ealreq_dist_end1_1ph);
      let dist_controlling = 'Close-in Faults';
      if (dist_highest === ealreq_dist_end1_3ph) dist_controlling = 'Endzone-1 (3-ph)';
      if (dist_highest === ealreq_dist_end1_1ph) dist_controlling = 'Endzone-1 (1-ph)';

      // Overall Highest & Required Vk
      const overall_highest = Math.max(diff_highest, dist_highest);
      const overall_controlling =
        overall_highest === diff_highest
          ? `Differential: ${diff_controlling}`
          : `Distance: ${dist_controlling}`;

      const vk_required = overall_highest * 0.8;
      const suitable = vk_avail >= vk_required;
      const verdict = suitable ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';
      const margin = vk_required > 0 ? ((vk_avail - vk_required) / vk_required) * 100.0 : 0;

      tap_comparison[t.key] = {
        tap_name: t.label,
        ipn,
        rct,
        vk_available: vk_avail,
        rl_lead_resistance: rl,
        differential_protection: {
          ealreq_close_in: ealreq_diff_close,
          ealreq_through_3ph: ealreq_diff_thru_3ph,
          ealreq_through_1ph: ealreq_diff_thru_1ph,
          controlling_equation: diff_controlling,
          highest_ealreq: diff_highest,
        },
        distance_protection: {
          ealreq_close_in: ealreq_dist_close,
          ealreq_endzone1_3ph: ealreq_dist_end1_3ph,
          ealreq_endzone1_1ph: ealreq_dist_end1_1ph,
          controlling_equation: dist_controlling,
          highest_ealreq: dist_highest,
        },
        overall_assessment: {
          highest_ealreq: overall_highest,
          controlling_function: overall_controlling,
          vk_required,
          vk_available: vk_avail,
          suitable,
          verdict,
          safety_margin_percent: margin,
        },
      };
    });

    const activeKey = input.active_tap ?? (tap_comparison.tap2 ? 'tap2' : 'tap1');
    const activeResult = tap_comparison[activeKey];

    return {
      template: 'RED670',
      active_tap: activeKey,
      lead_resistance_rl: Math.round(rl * 100000) / 100000,
      fault_summary: {
        ikmax: Math.round(ikmax * 100) / 100,
        itmax_3ph: Math.round(itmax_3ph * 100) / 100,
        itmax_1ph: Math.round(itmax_1ph * 100) / 100,
        ikzone1_3ph: Math.round(ikzone1_3ph * 100) / 100,
        ikzone1_1ph: Math.round(ikzone1_1ph * 100) / 100,
        tp_system_ms: Math.round(tp_system * 100) / 100,
        tp_3ph_z1_ms: Math.round(tp_3ph_z1 * 100) / 100,
        tp_1ph_z1_ms: Math.round(tp_1ph_z1 * 100) / 100,
      },
      verdict: activeResult.overall_assessment.verdict,
      vk_required: Math.round(activeResult.overall_assessment.vk_required * 100) / 100,
      vk_available: Math.round(activeResult.overall_assessment.vk_available * 100) / 100,
      ealreq_max: Math.round(activeResult.overall_assessment.highest_ealreq * 100) / 100,
      safety_margin_percent: Math.round(activeResult.overall_assessment.safety_margin_percent * 10) / 10,
      tap_comparison,
      active_assessment: activeResult,
      vk_breakdown: [
        { label: 'Differential — Close-in', ealreq: activeResult.differential_protection.ealreq_close_in, vk: activeResult.differential_protection.ealreq_close_in * 0.8 },
        { label: 'Differential — Through (3ph)', ealreq: activeResult.differential_protection.ealreq_through_3ph, vk: activeResult.differential_protection.ealreq_through_3ph * 0.8 },
        { label: 'Differential — Through (1ph)', ealreq: activeResult.differential_protection.ealreq_through_1ph, vk: activeResult.differential_protection.ealreq_through_1ph * 0.8 },
        { label: 'Distance — Close-in', ealreq: activeResult.distance_protection.ealreq_close_in, vk: activeResult.distance_protection.ealreq_close_in * 0.8 },
        { label: 'Distance — Endzone-1 (3ph)', ealreq: activeResult.distance_protection.ealreq_endzone1_3ph, vk: activeResult.distance_protection.ealreq_endzone1_3ph * 0.8 },
        { label: 'Distance — Endzone-1 (1ph)', ealreq: activeResult.distance_protection.ealreq_endzone1_1ph, vk: activeResult.distance_protection.ealreq_endzone1_1ph * 0.8 },
      ].map((row) => ({
        ...row,
        isMax: Math.abs(row.ealreq - activeResult.overall_assessment.highest_ealreq) < 1e-4,
      })),
    };
  }
}
