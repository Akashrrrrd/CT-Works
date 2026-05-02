// CT Adequacy Calculation Engine
// Based on IEC 61869-2 and relay manufacturer application guides
// (ABB RED670, REL670, REQ650 / SEL-421)

export interface Sheet1Inputs {
  ct_ratio_primary:   number;  // Ipn — A
  ct_ratio_secondary: number;  // Isn — A
  accuracy_class:     string;  // e.g. PX, 5P20
  rct:                number;  // CT secondary winding resistance — Ω
  vk_available:       number;  // Knee point voltage from datasheet — V
  io_at_vk:           number;  // Magnetising current at Vk — mA
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
  const Ir  = s1.ct_ratio_secondary;   // rated secondary current
  const Rct = s1.rct;
  const Rl  = s2.lead_resistance;
  const Sr  = s2.relay_burden_va;
  const Vk  = s1.vk_available;

  // ── Step 1: Maximum 3-phase fault current at bus ──────────────────────────
  // Ikmax = S_fault / (√3 × Vbus)
  const Ikmax = (s2.max_bus_fault_mva * 1e6) / (Math.sqrt(3) * s2.bus_voltage_kv * 1e3);

  // ── Step 2: Source impedance at bus ───────────────────────────────────────
  // Zs = Vph / Ikmax  where Vph = Vbus / √3
  const Vph = (s2.bus_voltage_kv * 1e3) / Math.sqrt(3);
  const Zs  = Vph / Ikmax;

  // X/R ratio — IEC 60909 typical values:
  //   ≥ 110 kV → 40,  33–66 kV → 15,  < 33 kV → 10
  const xr = s2.bus_voltage_kv >= 110 ? 40
           : s2.bus_voltage_kv >= 33  ? 15
           : 10;
  const Rs = Zs / Math.sqrt(1 + xr * xr);
  const Xs = Rs * xr;

  // ── Step 3: Cable impedances (total, not per-km) ──────────────────────────
  const Z1r = s2.r1 * s2.route_length_km;  // positive-seq R
  const Z1x = s2.x1 * s2.route_length_km;  // positive-seq X
  const Z0r = s2.r0 * s2.route_length_km;  // zero-seq R
  const Z0x = s2.x0 * s2.route_length_km;  // zero-seq X

  // ── Step 4: Fault currents ────────────────────────────────────────────────

  // 4a. Through fault — 3-phase at remote end of cable (full length)
  //     Used for differential through-fault check
  const Zthr     = Math.sqrt((Rs + Z1r) ** 2 + (Xs + Z1x) ** 2);
  const Itmax_3ph = Vph / Zthr;

  // 4b. Endzone-1 fault — 3-phase at 80% of cable reach
  //     Used for distance protection zone-1 check
  const reach    = 0.8;
  const Z1z_r    = Rs + reach * Z1r;
  const Z1z_x    = Xs + reach * Z1x;
  const Z1z      = Math.sqrt(Z1z_r ** 2 + Z1z_x ** 2);
  const Ikzone1_3ph = Vph / Z1z;

  // 4c. Endzone-1 fault — single-phase-to-earth at 80% reach
  //     I_1ph = 3 × Vph / (Z1 + Z2 + Z0)   where Z2 = Z1 (cables)
  const Z2z_r    = Z1z_r;  // negative-seq = positive-seq for cables
  const Z2z_x    = Z1z_x;
  const Z0z_r    = Rs + reach * Z0r;
  const Z0z_x    = Xs + reach * Z0x;
  const Zseq_r   = Z1z_r + Z2z_r + Z0z_r;
  const Zseq_x   = Z1z_x + Z2z_x + Z0z_x;
  const Zseq     = Math.sqrt(Zseq_r ** 2 + Zseq_x ** 2);
  const Ikzone1_1ph = (3 * Vph) / Zseq;

  // ── Step 5: Burden term ───────────────────────────────────────────────────
  // Total secondary burden = Rct + Rl + Sr/Ir²
  const Rb    = Sr / (Ir * Ir);          // relay burden converted to Ω
  const burden = Rct + Rl + Rb;
  const ratio  = Isn / Ipn;             // CT turns ratio (secondary/primary)

  // ── Step 6: Ealreq per protection function ────────────────────────────────
  // General form: Ealreq = k × Ifault × (Isn/Ipn) × (Rct + Rl + Sr/Ir²)

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
  };

  let ealreq_max = 0;
  const vk_breakdown: CTAdequacyResult['vk_breakdown'] = [];

  // ── DIFFERENTIAL ──────────────────────────────────────────────────────────
  // Per IEC 61869-2 / ABB RED670 application guide:
  //   Close-in fault:  Ealreq = Ikmax × (Isn/Ipn) × burden
  //   Through fault:   Ealreq = 2 × Ikmax × (Isn/Ipn) × burden
  //   (factor 2 accounts for CT on both sides of transformer)
  if (iedType === 'tpl-differential') {
    const eal_ci = Ikmax * ratio * burden;
    const eal_th = 2 * Ikmax * ratio * burden;   // conservative: use Ikmax not Itmax
    ealreq_max   = Math.max(eal_ci, eal_th);

    vk_breakdown.push(
      { label: 'Close-in fault (k=1)',  ealreq: +eal_ci.toFixed(2), vk: +(eal_ci * 0.8).toFixed(2), isMax: eal_ci >= eal_th },
      { label: 'Through fault (k=2)',   ealreq: +eal_th.toFixed(2), vk: +(eal_th * 0.8).toFixed(2), isMax: eal_th > eal_ci  },
    );

    intermediates['Itmax 3ph far-end (A)'] = +Itmax_3ph.toFixed(1);
    intermediates['Ealreq close-in (V)']   = +eal_ci.toFixed(2);
    intermediates['Ealreq through (V)']    = +eal_th.toFixed(2);

  // ── DISTANCE ──────────────────────────────────────────────────────────────
  // Per IEC 61869-2 / ABB REL670 / SEL-421 application guide:
  //   Close-in fault:      Ealreq = Ikmax × (Isn/Ipn) × burden
  //   Endzone-1 (3-phase): Ealreq = Ikzone1_3ph × (Isn/Ipn) × burden
  //   Endzone-1 (1-phase): Ealreq = Ikzone1_1ph × (Isn/Ipn) × burden
  } else if (iedType === 'tpl-distance') {
    const eal_ci   = Ikmax       * ratio * burden;
    const eal_e3ph = Ikzone1_3ph * ratio * burden;
    const eal_e1ph = Ikzone1_1ph * ratio * burden;
    ealreq_max     = Math.max(eal_ci, eal_e3ph, eal_e1ph);

    vk_breakdown.push(
      { label: 'Close-in fault',       ealreq: +eal_ci.toFixed(2),   vk: +(eal_ci   * 0.8).toFixed(2), isMax: eal_ci   === ealreq_max },
      { label: 'Endzone-1 (3-phase)',  ealreq: +eal_e3ph.toFixed(2), vk: +(eal_e3ph * 0.8).toFixed(2), isMax: eal_e3ph === ealreq_max },
      { label: 'Endzone-1 (1-phase)',  ealreq: +eal_e1ph.toFixed(2), vk: +(eal_e1ph * 0.8).toFixed(2), isMax: eal_e1ph === ealreq_max },
    );

    intermediates['Ikzone1 3ph (A)']        = +Ikzone1_3ph.toFixed(1);
    intermediates['Ikzone1 1ph (A)']        = +Ikzone1_1ph.toFixed(1);
    intermediates['Ealreq close-in (V)']    = +eal_ci.toFixed(2);
    intermediates['Ealreq endzone 3ph (V)'] = +eal_e3ph.toFixed(2);
    intermediates['Ealreq endzone 1ph (V)'] = +eal_e1ph.toFixed(2);

  // ── BREAKER FAILURE ───────────────────────────────────────────────────────
  // Per IEC 61869-2 / ABB REQ650 application guide (Annexure-G):
  //   Ealreq = 5 × Iop × (Isn/Ipn) × burden
  //   Iop = Ikmax (maximum operating current = max fault current)
  //   Factor 5 accounts for DC offset and remanence
  } else if (iedType === 'tpl-breaker-failure') {
    const Iop  = Ikmax;
    ealreq_max = 5 * Iop * ratio * burden;

    vk_breakdown.push(
      { label: 'Breaker failure (k=5)', ealreq: +ealreq_max.toFixed(2), vk: +(ealreq_max * 0.8).toFixed(2), isMax: true },
    );

    intermediates['Iop (A)']    = +Iop.toFixed(1);
    intermediates['Ealreq (V)'] = +ealreq_max.toFixed(2);
  }

  intermediates['Ealreq max (V)'] = +ealreq_max.toFixed(2);

  // ── Step 7: Vk required = Ealreq_max × 0.8 ───────────────────────────────
  // Factor 0.8 per relay manufacturer requirement (Vk in terms of Eal)
  const vk_required = +(ealreq_max * 0.8).toFixed(2);
  ealreq_max        = +ealreq_max.toFixed(2);

  // ── Step 8: Verdict ───────────────────────────────────────────────────────
  const verdict: CTAdequacyResult['verdict'] =
    Vk >= vk_required ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';

  return { verdict, ealreq_max, vk_required, vk_available: Vk, vk_breakdown, intermediates };
}
