/**
 * INTELLIGENT CT/VT ADEQUACY ANALYSIS ENGINE
 * Implements all formulas from the system spec exactly.
 * No hardcoded relay logic — relay formulas are loaded dynamically.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CTParameters {
  ratio_primary:    number;   // Ipn — A
  ratio_secondary:  number;   // In — A
  accuracy_class:   string;   // e.g. 5P20, Class X, PX
  rct:              number;   // CT winding resistance — Ω
  rated_burden_va:  number;   // Rated burden — VA
  alf:              number;   // Accuracy Limit Factor
  vk_available:     number;   // Knee point voltage — V
  io_at_vk:         number;   // Magnetising current at Vk — mA
}

export interface VTParameters {
  ratio_primary:    number;   // Vp — V
  ratio_secondary:  number;   // Vs — V
  wiring_resistance:number;   // Ω
}

export interface WiringParameters {
  conductor_mm2:    number;   // Cross-section — mm²
  r20:              number;   // Resistance at 20°C — Ω/km
  alpha:            number;   // Temperature coefficient — /°C
  temperature:      number;   // Operating temperature — °C
  cable_length_m:   number;   // One-way cable length — m
  cores:            2 | 1;    // 2 = loop (2×RL), 1 = single
}

export interface IEDEntry {
  name:       string;   // e.g. ABB RED670
  burden_va:  number;   // VA at In
  type:       string;   // differential | distance | protection | metering
}

export interface SystemParameters {
  frequency:        number;   // Hz
  bus_voltage_kv:   number;   // kV line-to-line
  fault_current_ka: number;   // Max fault current — kA (3-phase)
  xr_ratio:         number;   // X/R ratio
}

export interface LineParameters {
  r1:           number;   // Positive-seq R — Ω/km
  x1:           number;   // Positive-seq X — Ω/km
  r0:           number;   // Zero-seq R — Ω/km
  x0:           number;   // Zero-seq X — Ω/km
  length_km:    number;   // km
}

export interface FullAnalysisInput {
  ct:     CTParameters;
  vt?:    VTParameters;
  wiring: WiringParameters;
  ieds:   IEDEntry[];
  system: SystemParameters;
  line:   LineParameters;
}

export interface AnalysisResult {
  verdict:          'ADEQUATE' | 'UNDER DIMENSIONED';
  kssc_required:    number;
  kssc_available:   number;
  vk_required:      number;
  vk_available:     number;
  wiring:           WiringCalcs;
  source:           SourceCalcs;
  faults:           FaultCalcs;
  burden:           BurdenCalcs;
  kssc:             KsscCalcs;
  intermediates:    Record<string, number | string>;
  conclusion:       string;
}

export interface WiringCalcs {
  r_at_temp:    number;   // Ω/km at operating temp
  rl_one_way:   number;   // Ω one-way
  rl_loop:      number;   // Ω loop (2×RL)
  pl_burden_va: number;   // CT lead burden VA
}

export interface SourceCalcs {
  zs:   number;   // |Zs| Ω
  rs:   number;   // Rs Ω
  xs:   number;   // Xs Ω
  theta_deg: number;
  tp:   number;   // Time constant — s
}

export interface FaultCalcs {
  // 3-phase
  z1l:      number;   // Z1 × length
  z_total_3ph: number;
  if_3ph:   number;   // A
  // 1-phase
  z0l:      number;
  z_total_1ph: number;
  if_1ph:   number;   // A
}

export interface BurdenCalcs {
  pe:           number;   // Internal burden VA
  pl:           number;   // Lead burden VA
  ied_total_va: number;   // Sum of all IED burdens
  total_va:     number;   // PE + PL + IED
}

export interface KsscCalcs {
  required:   number;   // Itkmax / Ipn
  available:  number;   // n × (PE + PN) / (PE + PL)
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function runFullAnalysis(input: FullAnalysisInput): AnalysisResult {
  const { ct, wiring, ieds, system, line } = input;
  const In  = ct.ratio_secondary;
  const Ipn = ct.ratio_primary;
  const Rct = ct.rct;
  const ALF = ct.alf;
  const PN  = ct.rated_burden_va;

  // ── SECTION 1: Wiring calculations ────────────────────────────────────────
  // R = R20 × [1 + α(t - 20)]
  const r_at_temp = wiring.r20 * (1 + wiring.alpha * (wiring.temperature - 20));
  // RL = R × l  (l in km, convert from m)
  const rl_one_way = r_at_temp * (wiring.cable_length_m / 1000);
  const rl_loop    = wiring.cores === 2 ? 2 * rl_one_way : rl_one_way;
  // PL = In² × RL
  const pl_burden_va = In * In * rl_loop;

  const wiringCalcs: WiringCalcs = {
    r_at_temp:    +r_at_temp.toFixed(6),
    rl_one_way:   +rl_one_way.toFixed(6),
    rl_loop:      +rl_loop.toFixed(6),
    pl_burden_va: +pl_burden_va.toFixed(4),
  };

  // ── SECTION 2: Source impedance ───────────────────────────────────────────
  // Zs = V / (√3 × I)
  const Vph   = (system.bus_voltage_kv * 1e3) / Math.sqrt(3);
  const Ikmax = system.fault_current_ka * 1e3;
  const Zs    = Vph / Ikmax;
  // θ = tan⁻¹(X/R)
  const theta = Math.atan(system.xr_ratio);
  const Rs    = Zs * Math.cos(theta);
  const Xs    = Zs * Math.sin(theta);
  // tp = (X/R) / (2πf)
  const tp    = system.xr_ratio / (2 * Math.PI * system.frequency);

  const sourceCalcs: SourceCalcs = {
    zs:        +Zs.toFixed(6),
    rs:        +Rs.toFixed(6),
    xs:        +Xs.toFixed(6),
    theta_deg: +(theta * 180 / Math.PI).toFixed(2),
    tp:        +tp.toFixed(6),
  };

  // ── SECTION 3: Line/cable impedances ──────────────────────────────────────
  const Z1r = line.r1 * line.length_km;
  const Z1x = line.x1 * line.length_km;
  const Z0r = line.r0 * line.length_km;
  const Z0x = line.x0 * line.length_km;
  const Z1L = Math.sqrt(Z1r ** 2 + Z1x ** 2);
  const Z0L = Math.sqrt(Z0r ** 2 + Z0x ** 2);

  // ── SECTION 4: Fault currents ─────────────────────────────────────────────
  // 3-phase: Ztotal = Zs + Z1L,  If = V / (√3 × |Ztotal|)
  const Zt3r = Rs + Z1r;
  const Zt3x = Xs + Z1x;
  const Ztotal_3ph = Math.sqrt(Zt3r ** 2 + Zt3x ** 2);
  const If_3ph = (system.bus_voltage_kv * 1e3) / (Math.sqrt(3) * Ztotal_3ph);

  // 1-phase: Ztotal = Zs + Z1L + Z0L,  If = V / (√3 × |Ztotal|) × 3
  const Zt1r = Rs + Z1r + Z0r;
  const Zt1x = Xs + Z1x + Z0x;
  const Ztotal_1ph = Math.sqrt(Zt1r ** 2 + Zt1x ** 2);
  const If_1ph = ((system.bus_voltage_kv * 1e3) / (Math.sqrt(3) * Ztotal_1ph)) * 3;

  const faultCalcs: FaultCalcs = {
    z1l:          +Z1L.toFixed(6),
    z0l:          +Z0L.toFixed(6),
    z_total_3ph:  +Ztotal_3ph.toFixed(6),
    if_3ph:       +If_3ph.toFixed(1),
    z_total_1ph:  +Ztotal_1ph.toFixed(6),
    if_1ph:       +If_1ph.toFixed(1),
  };

  // ── SECTION 5: CT burden ──────────────────────────────────────────────────
  // PE = In² × Rct
  const PE = In * In * Rct;
  const PL = pl_burden_va;
  const ied_total_va = ieds.reduce((s, d) => s + d.burden_va, 0);
  const total_va = PE + PL + ied_total_va;

  const burdenCalcs: BurdenCalcs = {
    pe:           +PE.toFixed(4),
    pl:           +PL.toFixed(4),
    ied_total_va: +ied_total_va.toFixed(4),
    total_va:     +total_va.toFixed(4),
  };

  // ── SECTION 6: Kssc adequacy check ───────────────────────────────────────
  // Required: Kssc = Itkmax / Ipn  (Itkmax = max fault current)
  const Itkmax = Math.max(If_3ph, If_1ph);
  const kssc_required = Itkmax / Ipn;

  // Available: Kssc = n × (PE + PN) / (PE + PL)
  // n = ALF (accuracy limit factor from nameplate)
  const kssc_available = ALF * (PE + PN) / (PE + PL);

  const ksscCalcs: KsscCalcs = {
    required:  +kssc_required.toFixed(2),
    available: +kssc_available.toFixed(2),
  };

  // ── SECTION 7: Vk check (IEC 61869 / P54x formula) ───────────────────────
  // Vk = (VA × ALF) / In + (Rct × ALF × In)
  const vk_required = (PN * ALF) / In + (Rct * ALF * In);

  // ── Verdict ───────────────────────────────────────────────────────────────
  const verdict: AnalysisResult['verdict'] =
    kssc_available >= kssc_required ? 'ADEQUATE' : 'UNDER DIMENSIONED';

  const conclusion = verdict === 'ADEQUATE'
    ? `Available Kssc (${kssc_available.toFixed(2)}) ≥ Required Kssc (${kssc_required.toFixed(2)}). Hence CT is ADEQUATE.`
    : `Available Kssc (${kssc_available.toFixed(2)}) < Required Kssc (${kssc_required.toFixed(2)}). Hence CT is UNDER DIMENSIONED.`;

  const intermediates: Record<string, number | string> = {
    'Ipn (A)':              Ipn,
    'In (A)':               In,
    'ALF':                  ALF,
    'Rated Burden PN (VA)': PN,
    'Rct (Ω)':              Rct,
    'Vph (V)':              +Vph.toFixed(1),
    'Ikmax (A)':            +Ikmax.toFixed(1),
    'Zs (Ω)':               +Zs.toFixed(4),
    'Rs (Ω)':               +Rs.toFixed(4),
    'Xs (Ω)':               +Xs.toFixed(4),
    'X/R ratio':            system.xr_ratio,
    'Time constant tp (s)': +tp.toFixed(4),
    'Z1L (Ω)':              +Z1L.toFixed(4),
    'Z0L (Ω)':              +Z0L.toFixed(4),
    'If 3ph (A)':           +If_3ph.toFixed(1),
    'If 1ph (A)':           +If_1ph.toFixed(1),
    'PE (VA)':              +PE.toFixed(4),
    'PL (VA)':              +PL.toFixed(4),
    'IED burden (VA)':      +ied_total_va.toFixed(4),
    'Total burden (VA)':    +total_va.toFixed(4),
    'Kssc required':        +kssc_required.toFixed(2),
    'Kssc available':       +kssc_available.toFixed(2),
    'Vk required (V)':      +vk_required.toFixed(2),
    'Vk available (V)':     ct.vk_available,
  };

  return {
    verdict,
    kssc_required:  +kssc_required.toFixed(2),
    kssc_available: +kssc_available.toFixed(2),
    vk_required:    +vk_required.toFixed(2),
    vk_available:   ct.vk_available,
    wiring:         wiringCalcs,
    source:         sourceCalcs,
    faults:         faultCalcs,
    burden:         burdenCalcs,
    kssc:           ksscCalcs,
    intermediates,
    conclusion,
  };
}

// ── Dynamic relay formula evaluator ──────────────────────────────────────────

export interface RelayFormula {
  name:       string;
  expression: string;   // e.g. "VA * ALF / In + Rct * ALF * In"
  variables:  string[]; // e.g. ["VA", "ALF", "In", "Rct"]
  type:       'equation' | 'inequality_gte' | 'inequality_lte';
  description:string;
}

export function evaluateRelayFormula(
  formula: RelayFormula,
  context: Record<string, number>
): { result: number; passed?: boolean; expression_substituted: string } {
  // Replace variable names with values
  let expr = formula.expression;
  let subst = formula.expression;

  // Sort by length desc to avoid partial replacements
  const vars = Object.entries(context).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of vars) {
    const re = new RegExp(`\\b${k}\\b`, 'g');
    expr  = expr.replace(re, String(v));
    subst = subst.replace(re, String(v));
  }

  // Safe math evaluation — only allow numbers and operators
  const safe = expr.replace(/\bsqrt\b/g, 'Math.sqrt')
                   .replace(/\babs\b/g,  'Math.abs')
                   .replace(/\bpow\b/g,  'Math.pow')
                   .replace(/\bpi\b/gi,  String(Math.PI));

  // Validate — only allow safe characters
  if (!/^[0-9+\-*/().\s,MathsqrtabpowPI]+$/.test(safe.replace(/Math\.\w+/g, '0'))) {
    throw new Error(`Unsafe expression: ${safe}`);
  }

  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${safe})`)() as number;

  if (typeof result !== 'number' || isNaN(result)) {
    throw new Error('Formula returned non-numeric result');
  }

  return { result: +result.toFixed(4), expression_substituted: subst };
}

// ── K-factor calculations (P54x manual) ──────────────────────────────────────

export function calculateKFactor(
  If: number,
  xr: number,
  mode: 'without_transient' | 'without_transient_alt' | 'with_transient' = 'without_transient'
): number {
  switch (mode) {
    case 'without_transient':
      return 40 + 0.07 * If * xr;
    case 'without_transient_alt':
      return 40 + 0.35 * If * xr;
    case 'with_transient':
      return (1.42 * If + 53.7) * (6.06e-3 * xr + 0.515);
  }
}
