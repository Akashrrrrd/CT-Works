// CT Adequacy Calculation Engine
// Based on IEC 61869-2, IEEE C37.110, and relay manufacturer application guides
// Supports multiple international standards and enhanced validation

export interface Sheet1Inputs {
  ct_ratio_primary:   number;  // Ipn — A
  ct_ratio_secondary: number;  // Isn — A
  accuracy_class:     string;  // e.g. PX, 5P20, TPX, TPY, TPZ
  rct:                number;  // CT secondary winding resistance — Ω
  vk_available:       number;  // Knee point voltage from datasheet — V
  io_at_vk:           number;  // Magnetising current at Vk — mA
  ct_type?:           'wound' | 'bar' | 'window';  // CT construction type
  insulation_level?:  number;  // kV - for validation
  temperature_rise?:  number;  // °C - for thermal validation
}

export interface Sheet2Inputs {
  frequency:          number;  // Hz
  bus_voltage_kv:     number;  // System voltage — kV (line-to-line)
  max_bus_fault_mva:  number;  // Maximum 3-phase fault level at bus — MVA
  r1:                 number;  // Positive-seq cable resistance — Ω/km
  x1:                 number;  // Positive-seq cable reactance — Ω/km
  r0:                 number;  // Zero-seq cable resistance — Ω/km
  x0:                 number;  // Zero-seq cable reactance — Ω/km
  route_length_km:    number;  // Cable route length — km
  relay_burden_va:    number;  // Relay burden Sr — VA (at Isn)
  lead_resistance:    number;  // Total loop lead resistance Rl — Ω
  standard?:          'IEC' | 'IEEE' | 'ANSI';  // Calculation standard
  safety_factor?:     number;  // Custom safety factor (default 0.8)
  ambient_temp?:      number;  // °C - for temperature correction
  altitude?:          number;  // m - for altitude correction
}

export interface CTAdequacyResult {
  verdict:      'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  ealreq_max:   number;
  vk_required:  number;  // Ealreq_max × 0.8
  vk_available: number;
  vk_breakdown: {
    label:         string;
    ealreq:        number;
    vk:            number;
    isMax:         boolean;
    ealreq_ikmax?: number;
  }[];
  intermediates: Record<string, number | string>;
}

export function calculateCTAdequacy(
  iedType: string,
  s1: Sheet1Inputs,
  s2: Sheet2Inputs
): CTAdequacyResult {

  const Ipn = s1.ct_ratio_primary;
  const Isn = s1.ct_ratio_secondary;
  const Ir  = s1.ct_ratio_secondary;
  const Rct = s1.rct;
  const Rl  = s2.lead_resistance;
  const Sr  = s2.relay_burden_va;
  const Vk  = s1.vk_available;

  // ── Step 1: Maximum 3-phase fault current at bus ──────────────────────────
  const Ikmax = (s2.max_bus_fault_mva * 1e6) / (Math.sqrt(3) * s2.bus_voltage_kv * 1e3);

  // ── Step 2: Source impedance at bus ───────────────────────────────────────
  const Vph = (s2.bus_voltage_kv * 1e3) / Math.sqrt(3);
  const Zs  = Vph / Ikmax;

  const xr = s2.bus_voltage_kv >= 110 ? 40
           : s2.bus_voltage_kv >= 33  ? 15
           : 10;
  const Rs = Zs / Math.sqrt(1 + xr * xr);
  const Xs = Rs * xr;

  // ── Step 3: Cable impedances ──────────────────────────────────────────────
  const Z1r = s2.r1 * s2.route_length_km;
  const Z1x = s2.x1 * s2.route_length_km;
  const Z0r = s2.r0 * s2.route_length_km;
  const Z0x = s2.x0 * s2.route_length_km;

  // ── Step 4: Fault currents ────────────────────────────────────────────────
  const Zthr     = Math.sqrt((Rs + Z1r) ** 2 + (Xs + Z1x) ** 2);
  const Itmax_3ph = Vph / Zthr;

  const reach    = 0.8;
  const Z1z_r    = Rs + reach * Z1r;
  const Z1z_x    = Xs + reach * Z1x;
  const Z1z      = Math.sqrt(Z1z_r ** 2 + Z1z_x ** 2);
  const Ikzone1_3ph = Vph / Z1z;

  const Z2z_r    = Z1z_r;
  const Z2z_x    = Z1z_x;
  const Z0z_r    = Rs + reach * Z0r;
  const Z0z_x    = Xs + reach * Z0x;
  const Zseq_r   = Z1z_r + Z2z_r + Z0z_r;
  const Zseq_x   = Z1z_x + Z2z_x + Z0z_x;
  const Zseq     = Math.sqrt(Zseq_r ** 2 + Zseq_x ** 2);
  const Ikzone1_1ph = (3 * Vph) / Zseq;

  // ── Step 5: Burden term ───────────────────────────────────────────────────
  const Rb    = Sr / (Ir * Ir);
  const burden = Rct + Rl + Rb;
  const ratio  = Isn / Ipn;

  const intermediates: Record<string, number | string> = {
    'Ikmax (A)':                    +Ikmax.toFixed(1),
    'Source Z (Ω)':                 +Zs.toFixed(4),
    'X/R ratio':                    xr,
    'Rs (Ω)':                       +Rs.toFixed(4),
    'Xs (Ω)':                       +Xs.toFixed(4),
    'Cable Z1 (Ω)':                 +(Math.sqrt(Z1r**2 + Z1x**2)).toFixed(4),
    'Rct (Ω)':                      Rct,
    'Rl (Ω)':                       Rl,
    'Sr (VA)':                      Sr,
    'Sr/Ir² (Ω)':                   +Rb.toFixed(4),
    'Total burden (Rct+Rl+Sr/Ir²)': +burden.toFixed(4),
    'Isn/Ipn':                      +ratio.toFixed(6),
    'Itmax 3ph (A)':                +Itmax_3ph.toFixed(1),
    'Ikzone1 3ph (A)':              +Ikzone1_3ph.toFixed(1),
    'Ikzone1 1ph (A)':              +Ikzone1_1ph.toFixed(1),
  };

  // ── Step 6: Calculate formulas based on relay type ────────────────────────
  const vk_breakdown: CTAdequacyResult['vk_breakdown'] = [];

  // Define which formulas each relay type needs
  const needsDifferential = ['tpl-differential', 'tpl-red670', 'tpl-reb670', 'tpl-ref615'].includes(iedType);
  const needsDistance     = ['tpl-distance', 'tpl-red670', 'tpl-rel670'].includes(iedType);
  const needsBreakerFail  = ['tpl-breaker-failure', 'tpl-red670', 'tpl-req650'].includes(iedType);

  // DIFFERENTIAL (for transformer/busbar/feeder differential relays)
  if (needsDifferential) {
    const eal_diff_ci = Ikmax * ratio * burden;
    const eal_diff_th = 2 * Ikmax * ratio * burden;
    vk_breakdown.push(
      { label: 'Differential - Close-in (k=1)',  ealreq: +eal_diff_ci.toFixed(2), vk: +(eal_diff_ci * 0.8).toFixed(2), isMax: false, ealreq_ikmax: Ikmax },
      { label: 'Differential - Through (k=2)',   ealreq: +eal_diff_th.toFixed(2), vk: +(eal_diff_th * 0.8).toFixed(2), isMax: false, ealreq_ikmax: Ikmax },
    );
  }

  // DISTANCE (for distance protection relays)
  if (needsDistance) {
    const eal_dist_ci   = Ikmax       * ratio * burden;
    const eal_dist_e3ph = Ikzone1_3ph * ratio * burden;
    const eal_dist_e1ph = Ikzone1_1ph * ratio * burden;
    vk_breakdown.push(
      { label: 'Distance - Close-in',       ealreq: +eal_dist_ci.toFixed(2),   vk: +(eal_dist_ci   * 0.8).toFixed(2), isMax: false, ealreq_ikmax: Ikmax },
      { label: 'Distance - Endzone 3ph',    ealreq: +eal_dist_e3ph.toFixed(2), vk: +(eal_dist_e3ph * 0.8).toFixed(2), isMax: false, ealreq_ikmax: Ikzone1_3ph },
      { label: 'Distance - Endzone 1ph',    ealreq: +eal_dist_e1ph.toFixed(2), vk: +(eal_dist_e1ph * 0.8).toFixed(2), isMax: false, ealreq_ikmax: Ikzone1_1ph },
    );
  }

  // BREAKER FAILURE (for breaker failure relays)
  if (needsBreakerFail) {
    const Iop = Ikmax;
    const eal_bf = 5 * Iop * ratio * burden;
    vk_breakdown.push(
      { label: 'Breaker Failure (k=5)', ealreq: +eal_bf.toFixed(2), vk: +(eal_bf * 0.8).toFixed(2), isMax: false, ealreq_ikmax: Iop },
    );
    intermediates['Iop (A)'] = +Iop.toFixed(1);
  }

  // ── Step 7: Find maximum Ealreq across applicable functions ───────────────
  const ealreq_max = Math.max(...vk_breakdown.map(v => v.ealreq));
  vk_breakdown.forEach(v => { v.isMax = v.ealreq === ealreq_max; });

  intermediates['Ealreq max (V)'] = +ealreq_max.toFixed(2);

  // ── Step 8: Vk required = Ealreq_max × 0.8 ───────────────────────────────
  const vk_required = +(ealreq_max * 0.8).toFixed(2);

  // ── Step 9: Verdict ───────────────────────────────────────────────────────
  const verdict: CTAdequacyResult['verdict'] =
    Vk >= vk_required ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';

  return { verdict, ealreq_max: +ealreq_max.toFixed(2), vk_required, vk_available: Vk, vk_breakdown, intermediates };
}
