/**
 * ============================================================================
 * RED670 CT ADEQUACY CALCULATION ENGINE
 * ----------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH: the customer Excel template
 *   Sheets used:  "CT-VT Burdens"            -> lead / burden resistance
 *                 "Parameters & Fault Cal."  -> Zs, fault currents, time consts
 *                 "IFP1-RED670"              -> Ealreq + Vk per CT tap
 *
 * Every formula below is transcribed cell-for-cell from those sheets. The
 * Excel cell reference is quoted next to each step so any result can be
 * traced back to the workbook. NOTHING is hardcoded: every numeric input
 * (fault level, X/R, CT ratio, Rct, Vk, burden, lead length, cable data...)
 * flows in through the input object, so changing any input re-derives the
 * whole chain.
 *
 * NOTE ON PI: the Excel template computes the primary time constant with
 * (22/7) as pi, NOT Math.PI  ->  'Parameters & Fault Cal.'!Q59
 *   Q59 = (X/R * 1000) / (2 * (22/7) * f)
 * Using Math.PI would break Excel parity, so 22/7 is preserved and exposed
 * as a documented constant.
 * ============================================================================
 */

/* ============================== CONSTANTS ================================= */

/** Constants that are literals inside the Excel sheets (documented, overridable). */
export const RED670_EXCEL_CONSTANTS = {
  /** 'CT-VT Burdens'!S12 - temperature coefficient of copper (K^-1) */
  COPPER_ALPHA_PER_K: 0.00393,
  /** 'CT-VT Burdens'!S15 - reference temperature of the quoted R20 (deg C) */
  REFERENCE_TEMPERATURE_C: 20,
  /** 'CT-VT Burdens'!S15 - operating temperature used for the hot resistance (deg C) */
  OPERATING_TEMPERATURE_C: 75,
  /** 'Parameters & Fault Cal.'!Q59 - the template uses 22/7 for pi */
  PI_AS_USED_IN_EXCEL: 22 / 7,
  /** 'Parameters & Fault Cal.'!M104 / M120 - zone-1 reach used for endzone faults */
  ENDZONE1_REACH_PU: 0.8,
  /** 'Parameters & Fault Cal.'!S89 - numerator factor 3 for 1-ph-to-earth current (3*V / (|Z1+Z2+Z0| * sqrt3)) */
  EARTH_FAULT_NUMERATOR_FACTOR: 3,
  /** 'IFP1-RED670'!T118 - Vk = Ealreq x 0.8 as per relay manufacturer */
  VK_FROM_EALREQ_FACTOR: 0.8,
  /** 'IFP1-RED670'!I88 - threshold on tp for the distance close-in 'a' factor (ms) */
  A_FACTOR_TP_THRESHOLD_MS: 400,
  /** 'IFP1-RED670'!I92 - threshold on tp for the endzone-1 'k' factor (ms) */
  K_FACTOR_TP_THRESHOLD_MS: 200,
  /** 'IFP1-RED670'!Q88 - a = 1 when tp <= 400 ms */
  A_FACTOR_WITHIN_THRESHOLD: 1,
  /** 'IFP1-RED670'!Q92 - k = 3 when tp <= 200 ms */
  K_FACTOR_WITHIN_THRESHOLD: 3,
} as const

/* ================================ TYPES ================================== */

/** The four system quantities received from the client. */
export interface RED670SystemInput {
  /** Max. bus fault level (kA)  -> 'Parameters & Fault Cal.'!Q10 */
  bus_fault_level_ka: number
  /** System frequency (Hz)      -> Q8 */
  system_frequency_hz: number
  /** Bus voltage level (kV)     -> Q9 */
  bus_voltage_kv: number
  /** System X/R ratio           -> Q11 */
  xr_ratio: number
  /** Voltage considered for the fault condition (pu) -> Q37, template value 1 */
  voltage_pu?: number
}

/** CT (or VT) wiring inputs - three parameters, taken separately per loop. */
export interface RED670WiringInput {
  /** Conductor cross section (mm2) -> 'CT-VT Burdens'!S10 / S28 (informative) */
  conductor_cross_section_mm2: number
  /** Resistance in ohm/km at 20 deg C -> S11 / S29 */
  resistance_per_km_at_20c: number
  /** Lead length of the loop, CT->relay or VT->relay (m) -> S19 / S37 */
  lead_length_m: number
  /** Optional operating temperature override (deg C) */
  operating_temperature_c?: number
  /** Optional conductor temperature coefficient override (K^-1) */
  alpha_per_k?: number
}

/** Line / cable data (common to all IEDs). */
export interface RED670LineInput {
  /** Positive sequence resistance R1 (ohm/km) -> Q20 */
  positive_sequence_resistance: number
  /** Positive sequence reactance X1 (ohm/km)  -> Q21 */
  positive_sequence_reactance: number
  /** Zero sequence resistance R0 (ohm/km)     -> Q22 */
  zero_sequence_resistance: number
  /** Zero sequence reactance X0 (ohm/km)      -> Q23 */
  zero_sequence_reactance: number
  /** Route length (km)                        -> Q24 */
  route_length_km: number
  /** Cables per phase (divides the per-km impedance) -> N17, template value 1 */
  cables_per_phase?: number
}

/** One CT tap as declared on the RED670 sheet (Tap-1 / Tap-2 / Tap-3 ...). */
export interface RED670CTTapInput {
  /** Label, e.g. "Tap-1" */
  name?: string
  /** CT primary rated current Ipn (A) -> H10 / J129 / L249 */
  ct_ratio_primary: number
  /** CT secondary rated current Isn (A) -> O10 */
  ct_ratio_secondary: number
  /** Class of accuracy, e.g. "PX-A" -> H11 (informative) */
  class_of_accuracy?: string
  /** CT secondary winding resistance Rct (ohm) -> H12 / J131 */
  ct_resistance_ohm: number
  /** Knee point voltage available (V) -> H13 / J132 */
  knee_point_voltage_v: number
  /** Magnetizing current at Vk (mA) -> H14 / J133 (informative) */
  magnetizing_current_ma?: number
}

/** Any device sharing the CT core. The RED670 itself is one of these. */
export interface RED670DeviceBurdenInput {
  name: string
  /** Burden at rated secondary current (VA) -> 'CT-VT Burdens'!Q48 = 0.02 for 670 series */
  burden_va: number
  /** Marks the relay whose Sr is used inside the Ealreq bracket -> J18 */
  is_protected_relay?: boolean
}

/** Optional DC-component factors. Only the <=threshold values exist in Excel. */
export interface RED670DCFactorOverrides {
  a_within_threshold?: number
  a_beyond_threshold?: number
  k_within_threshold?: number
  k_beyond_threshold?: number
}

export interface RED670Input {
  system: RED670SystemInput
  line: RED670LineInput
  ct_wiring: RED670WiringInput
  vt_wiring?: RED670WiringInput
  /** Relay rated current Ir (A) -> 'CT-VT Burdens'!S18 */
  relay_rated_current: number
  ct_taps: RED670CTTapInput[]
  device_burdens: RED670DeviceBurdenInput[]
  dc_factors?: RED670DCFactorOverrides
}

export interface TraceStep {
  label: string
  reference: string
  formula: string
  substitution: string
  value: number
  unit: string
}

export interface RED670ValidationError {
  path: string
  message: string
}

/* ============================ SMALL HELPERS ============================== */

interface Complex {
  re: number
  im: number
}

const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
const cScale = (a: Complex, k: number): Complex => ({ re: a.re * k, im: a.im * k })
const cAbs = (a: Complex): number => Math.sqrt(a.re * a.re + a.im * a.im)
const cAngleDeg = (a: Complex): number => (Math.atan(a.im / a.re) * 180) / Math.PI
const cXR = (a: Complex): number => a.im / a.re
const fmt = (n: number, d = 6): string => (Number.isFinite(n) ? Number(n.toFixed(d)).toString() : String(n))
const SQRT3 = Math.sqrt(3)

/* ========================= 1. WIRING / LEAD BURDEN ======================= */

export interface WiringResult {
  resistance_per_km_at_operating_temp: number
  resistance_per_m_at_operating_temp: number
  single_lead_resistance_ohm: number
  loop_lead_resistance_ohm: number
  lead_va_consumption: number
  trace: TraceStep[]
}

/**
 * 'CT-VT Burdens' rows 10-22 (CT loop) and rows 28-39 (VT loop).
 *   S15 = R20 * (1 + alpha * (t - 20))
 *   S16 = S15 / 1000
 *   S20 = S16 * l
 *   S21 = 2 * S16 * l
 *   S22 = Is^2 * S21
 */
export function calculateWiringResistance(
  wiring: RED670WiringInput,
  secondary_current: number,
  loopLabel: "CT" | "VT",
): WiringResult {
  const alpha = wiring.alpha_per_k ?? RED670_EXCEL_CONSTANTS.COPPER_ALPHA_PER_K
  const tRef = RED670_EXCEL_CONSTANTS.REFERENCE_TEMPERATURE_C
  const tOp = wiring.operating_temperature_c ?? RED670_EXCEL_CONSTANTS.OPERATING_TEMPERATURE_C

  const rPerKmHot = wiring.resistance_per_km_at_20c * (1 + alpha * (tOp - tRef))
  const rPerMHot = rPerKmHot / 1000
  const singleLead = rPerMHot * wiring.lead_length_m
  const loopLead = 2 * rPerMHot * wiring.lead_length_m
  const leadVa = secondary_current * secondary_current * loopLead

  const trace: TraceStep[] = [
    {
      label: `${loopLabel} lead resistance at ${tOp} deg C`,
      reference: "'CT-VT Burdens'!S15",
      formula: "R20 * (1 + alpha * (t - 20))",
      substitution: `${wiring.resistance_per_km_at_20c} * (1 + ${alpha} * (${tOp} - ${tRef}))`,
      value: rPerKmHot,
      unit: "ohm/km",
    },
    {
      label: `${loopLabel} lead resistance per metre`,
      reference: "'CT-VT Burdens'!S16",
      formula: "R(ohm/km) / 1000",
      substitution: `${fmt(rPerKmHot)} / 1000`,
      value: rPerMHot,
      unit: "ohm/m",
    },
    {
      label: `Single lead resistance (${loopLabel} to relay)`,
      reference: "'CT-VT Burdens'!S20",
      formula: "RL = R x l",
      substitution: `${fmt(rPerMHot, 10)} x ${wiring.lead_length_m}`,
      value: singleLead,
      unit: "ohm",
    },
    {
      label: `Loop lead resistance (${loopLabel} to relay, 2 way)`,
      reference: "'CT-VT Burdens'!S21",
      formula: "2RL = 2 x R x l",
      substitution: `2 x ${fmt(rPerMHot, 10)} x ${wiring.lead_length_m}`,
      value: loopLead,
      unit: "ohm",
    },
    {
      label: "VA consumption of the connecting leads",
      reference: "'CT-VT Burdens'!S22",
      formula: "Pl = Is^2 x 2RL",
      substitution: `${secondary_current}^2 x ${fmt(loopLead)}`,
      value: leadVa,
      unit: "VA",
    },
  ]

  return {
    resistance_per_km_at_operating_temp: rPerKmHot,
    resistance_per_m_at_operating_temp: rPerMHot,
    single_lead_resistance_ohm: singleLead,
    loop_lead_resistance_ohm: loopLead,
    lead_va_consumption: leadVa,
    trace,
  }
}

export interface BurdenResult {
  lead_va: number
  device_va_total: number
  total_burden_va: number
  /** Rl used inside the Ealreq bracket */
  rl_ohm: number
  relay_burden_sr_va: number
  trace: TraceStep[]
}

/**
 * 'IFP1-RED670' rows 18-22:
 *   J22 (Sl) = SUM(relay burden, other device burdens, lead VA)
 *   P21 (Rl) = Sl / (Isn x Isn)
 * The template deliberately carries the relay burden BOTH in Sl (and hence in
 * Rl) and separately as Sr inside the bracket - reproduced exactly here.
 */
export function calculateBurdens(
  leadVa: number,
  devices: RED670DeviceBurdenInput[],
  secondary_current: number,
): BurdenResult {
  const deviceTotal = devices.reduce((sum, d) => sum + d.burden_va, 0)
  const totalBurden = deviceTotal + leadVa
  const rl = totalBurden / (secondary_current * secondary_current)
  const relay = devices.find((d) => d.is_protected_relay) ?? devices[0]

  return {
    lead_va: leadVa,
    device_va_total: deviceTotal,
    total_burden_va: totalBurden,
    rl_ohm: rl,
    relay_burden_sr_va: relay ? relay.burden_va : 0,
    trace: [
      {
        label: "Total lead + other burden Sl",
        reference: "'IFP1-RED670'!J22",
        formula: "Sl = Sr' + other device burdens + lead VA",
        substitution: `${devices.map((d) => `${d.burden_va}`).join(" + ")} + ${fmt(leadVa)}`,
        value: totalBurden,
        unit: "VA",
      },
      {
        label: "Lead + other resistance connected Rl",
        reference: "'IFP1-RED670'!P21",
        formula: "Rl = Sl / (Isn x Isn)",
        substitution: `${fmt(totalBurden)} / (${secondary_current} x ${secondary_current})`,
        value: rl,
        unit: "ohm",
      },
    ],
  }
}

/* ===================== 2. SYSTEM / FAULT CALCULATIONS ==================== */

export interface FaultCase {
  key: string
  label: string
  /** Series impedance actually used for this fault */
  impedance: Complex
  impedance_magnitude: number
  impedance_angle_deg: number
  xr_ratio: number
  current_a: number
  time_constant_ms: number
  trace: TraceStep[]
}

export interface SystemFaultResult {
  bus_voltage_v: number
  max_bus_fault_current_a: number
  source_impedance_magnitude: number
  source_impedance: Complex
  impedance_angle_deg: number
  system_time_constant_ms: number
  z1_per_km: Complex
  z0_per_km: Complex
  z1_line_total: Complex
  z0_line_total: Complex
  sir: number
  faults: {
    through_3ph: FaultCase
    through_1ph: FaultCase
    endzone1_3ph: FaultCase
    endzone1_1ph: FaultCase
  }
  trace: TraceStep[]
}

/** tp(ms) = (X/R x 1000) / (2 x (22/7) x f)   -> 'Parameters & Fault Cal.'!Q59 */
export function calculateTimeConstantMs(xr: number, frequency: number): number {
  return (xr * 1000) / (2 * RED670_EXCEL_CONSTANTS.PI_AS_USED_IN_EXCEL * frequency)
}

export function calculateSystemAndFaults(system: RED670SystemInput, line: RED670LineInput): SystemFaultResult {
  const pu = system.voltage_pu ?? 1
  const n = line.cables_per_phase ?? 1
  const f = system.system_frequency_hz
  const reach = RED670_EXCEL_CONSTANTS.ENDZONE1_REACH_PU
  const earthFactor = RED670_EXCEL_CONSTANTS.EARTH_FAULT_NUMERATOR_FACTOR

  // Q32 / Q33
  const ikmax = system.bus_fault_level_ka * 1000
  const busV = system.bus_voltage_kv * 1000

  // Q38 : Zs = (V x pu) / (sqrt3 x I)
  const zsMag = (busV * pu) / (SQRT3 * ikmax)
  // Q43 / Q44 : phi = atan(X/R)
  const phi = Math.atan(system.xr_ratio)
  const phiDeg = (phi * 180) / Math.PI
  // Q46 / Q47 : Rs = Zs cos(phi), Xs = Zs sin(phi)
  const zs: Complex = { re: zsMag * Math.cos(phi), im: zsMag * Math.sin(phi) }

  // L26/O26, L27/O27 : per-km impedance divided by cables per phase
  const z1PerKm: Complex = { re: line.positive_sequence_resistance / n, im: line.positive_sequence_reactance / n }
  const z0PerKm: Complex = { re: line.zero_sequence_resistance / n, im: line.zero_sequence_reactance / n }
  // L28/O28, L29/O29 : total line impedance
  const z1L = cScale(z1PerKm, line.route_length_km)
  const z0L = cScale(z0PerKm, line.route_length_km)

  // Q59 : system time constant from the declared X/R
  const systemTp = calculateTimeConstantMs(system.xr_ratio, f)

  // E52 : SIR = Zs / (0.8 * |Z1L|)
  const z1LMag = cAbs(z1L)
  const sir = zsMag / (reach * z1LMag)

  /** Builds a 3-phase style fault case: I = V x pu / (|Z| x sqrt3) */
  const build3ph = (key: string, label: string, z: Complex, ref: string): FaultCase => {
    const mag = cAbs(z)
    const current = (busV * pu) / (mag * SQRT3)
    const xr = cXR(z)
    const tp = calculateTimeConstantMs(xr, f)
    return {
      key,
      label,
      impedance: z,
      impedance_magnitude: mag,
      impedance_angle_deg: cAngleDeg(z),
      xr_ratio: xr,
      current_a: current,
      time_constant_ms: tp,
      trace: [
        {
          label: `${label} - series impedance magnitude`,
          reference: ref,
          formula: "|Z| = sqrt(R^2 + X^2)",
          substitution: `sqrt(${fmt(z.re)}^2 + ${fmt(z.im)}^2)`,
          value: mag,
          unit: "ohm",
        },
        {
          label: `${label} - X/R ratio`,
          reference: ref,
          formula: "X/R = X / R",
          substitution: `${fmt(z.im)} / ${fmt(z.re)}`,
          value: xr,
          unit: "-",
        },
        {
          label: `${label} - fault current`,
          reference: ref,
          formula: "I = (V x pu) / (|Z| x sqrt3)",
          substitution: `(${busV} x ${pu}) / (${fmt(mag)} x ${fmt(SQRT3)})`,
          value: current,
          unit: "A",
        },
        {
          label: `${label} - primary time constant`,
          reference: "'Parameters & Fault Cal.'!Q76/Q116",
          formula: "tp = (X/R x 1000) / (2 x (22/7) x f)",
          substitution: `(${fmt(xr)} x 1000) / (2 x ${fmt(RED670_EXCEL_CONSTANTS.PI_AS_USED_IN_EXCEL)} x ${f})`,
          value: tp,
          unit: "ms",
        },
      ],
    }
  }

  /** Builds a 1-ph-to-earth case: I = (3 x V x pu) / (|Z1 + Z2 + Z0| x sqrt3) */
  const build1ph = (key: string, label: string, z1: Complex, z0: Complex, ref: string): FaultCase => {
    const z0f = cAdd(cAdd(z1, z1), z0) // Z1t + Z2t + Z0t  (Z2t = Z1t)
    const mag = cAbs(z0f)
    const current = (busV * pu * earthFactor) / (mag * SQRT3)
    const xr = cXR(z0f)
    const tp = calculateTimeConstantMs(xr, f)
    return {
      key,
      label,
      impedance: z0f,
      impedance_magnitude: mag,
      impedance_angle_deg: cAngleDeg(z0f),
      xr_ratio: xr,
      current_a: current,
      time_constant_ms: tp,
      trace: [
        {
          label: `${label} - Z1 + Z2 + Z0`,
          reference: ref,
          formula: "Z0f = Z1t + Z2t + Z0t   (Z2t = Z1t)",
          substitution: `2 x (${fmt(z1.re)} + j${fmt(z1.im)}) + (${fmt(z0.re)} + j${fmt(z0.im)})`,
          value: mag,
          unit: "ohm",
        },
        {
          label: `${label} - X/R ratio`,
          reference: ref,
          formula: "X/R = X / R",
          substitution: `${fmt(z0f.im)} / ${fmt(z0f.re)}`,
          value: xr,
          unit: "-",
        },
        {
          label: `${label} - fault current`,
          reference: ref,
          formula: "I = (V x pu x 3) / (|Z0f| x sqrt3)",
          substitution: `(${busV} x ${pu} x ${earthFactor}) / (${fmt(mag)} x ${fmt(SQRT3)})`,
          value: current,
          unit: "A",
        },
        {
          label: `${label} - primary time constant`,
          reference: "'Parameters & Fault Cal.'!Q100/Q139",
          formula: "tp = (X/R x 1000) / (2 x (22/7) x f)",
          substitution: `(${fmt(xr)} x 1000) / (2 x ${fmt(RED670_EXCEL_CONSTANTS.PI_AS_USED_IN_EXCEL)} x ${f})`,
          value: tp,
          unit: "ms",
        },
      ],
    }
  }

  // Z1t = Zs + Z1L                          (rows 62-70)
  const z1t = cAdd(zs, z1L)
  // Z0t = Zs + Z0L                          (rows 79-91)
  const z0t = cAdd(zs, z0L)
  // Z1zone1 = Zs + 0.8 x Z1L                (rows 103-110)
  const z1z = cAdd(zs, cScale(z1L, reach))
  // Z0zone1 = Zs + 0.8 x Z0L                (rows 119-131)
  const z0z = cAdd(zs, cScale(z0L, reach))

  const faults = {
    through_3ph: build3ph("through_3ph", "3-ph through fault", z1t, "'Parameters & Fault Cal.'!M70"),
    through_1ph: build1ph("through_1ph", "1-ph to earth through fault", z1t, z0t, "'Parameters & Fault Cal.'!M91"),
    endzone1_3ph: build3ph("endzone1_3ph", "3-ph endzone-1 fault (80%)", z1z, "'Parameters & Fault Cal.'!M110"),
    endzone1_1ph: build1ph(
      "endzone1_1ph",
      "1-ph to earth endzone-1 fault (80%)",
      z1z,
      z0z,
      "'Parameters & Fault Cal.'!M131",
    ),
  }

  const trace: TraceStep[] = [
    {
      label: "Maximum bus fault current Ikmax",
      reference: "'Parameters & Fault Cal.'!Q32",
      formula: "Ikmax = bus fault level(kA) x 1000",
      substitution: `${system.bus_fault_level_ka} x 1000`,
      value: ikmax,
      unit: "A",
    },
    {
      label: "Bus rated voltage",
      reference: "'Parameters & Fault Cal.'!Q33",
      formula: "V = bus voltage(kV) x 1000",
      substitution: `${system.bus_voltage_kv} x 1000`,
      value: busV,
      unit: "V",
    },
    {
      label: "Source impedance Zs",
      reference: "'Parameters & Fault Cal.'!Q38",
      formula: "Zs = (V x pu) / (sqrt3 x Ikmax)",
      substitution: `(${busV} x ${pu}) / (${fmt(SQRT3)} x ${ikmax})`,
      value: zsMag,
      unit: "ohm",
    },
    {
      label: "Impedance angle",
      reference: "'Parameters & Fault Cal.'!Q44",
      formula: "phi = atan(X/R)",
      substitution: `atan(${system.xr_ratio})`,
      value: phiDeg,
      unit: "deg",
    },
    {
      label: "System resistance Rs",
      reference: "'Parameters & Fault Cal.'!Q46",
      formula: "Rs = Zs x cos(phi)",
      substitution: `${fmt(zsMag)} x cos(${fmt(phi)})`,
      value: zs.re,
      unit: "ohm",
    },
    {
      label: "System reactance Xs",
      reference: "'Parameters & Fault Cal.'!Q47",
      formula: "Xs = Zs x sin(phi)",
      substitution: `${fmt(zsMag)} x sin(${fmt(phi)})`,
      value: zs.im,
      unit: "ohm",
    },
    {
      label: "Total line positive sequence impedance |Z1L|",
      reference: "'Parameters & Fault Cal.'!P50",
      formula: "|Z1L| = sqrt(R1L^2 + X1L^2),  R1L = (R1/n) x length",
      substitution: `sqrt(${fmt(z1L.re)}^2 + ${fmt(z1L.im)}^2)`,
      value: z1LMag,
      unit: "ohm",
    },
    {
      label: "Source impedance ratio SIR",
      reference: "'Parameters & Fault Cal.'!E52",
      formula: "SIR = Zs / (0.8 x |Z1L|)",
      substitution: `${fmt(zsMag)} / (0.8 x ${fmt(z1LMag)})`,
      value: sir,
      unit: "-",
    },
    {
      label: "System primary time constant tp",
      reference: "'Parameters & Fault Cal.'!Q59",
      formula: "tp = (X/R x 1000) / (2 x (22/7) x f)",
      substitution: `(${system.xr_ratio} x 1000) / (2 x ${fmt(RED670_EXCEL_CONSTANTS.PI_AS_USED_IN_EXCEL)} x ${f})`,
      value: systemTp,
      unit: "ms",
    },
  ]

  return {
    bus_voltage_v: busV,
    max_bus_fault_current_a: ikmax,
    source_impedance_magnitude: zsMag,
    source_impedance: zs,
    impedance_angle_deg: phiDeg,
    system_time_constant_ms: systemTp,
    z1_per_km: z1PerKm,
    z0_per_km: z0PerKm,
    z1_line_total: z1L,
    z0_line_total: z0L,
    sir,
    faults,
    trace,
  }
}

/* ======================== 3. Ealreq PER CT TAP =========================== */

export interface EalreqCheck {
  key: string
  function_group: "Differential" | "Distance"
  label: string
  /** Fault current used (A) */
  current_a: number
  /** Multiplier in front of the current: 1 for close-in, 2 for through faults */
  current_multiplier: number
  /** DC component factor: a for close-in distance, k for endzone-1 */
  dc_factor: number
  /** tp that selected the dc factor (ms), undefined where not applicable */
  time_constant_ms?: number
  ealreq_v: number
  trace: TraceStep
}

export interface TapResult {
  name: string
  ct_ratio_primary: number
  ct_ratio_secondary: number
  class_of_accuracy?: string
  ct_resistance_ohm: number
  magnetizing_current_ma?: number
  knee_point_voltage_available_v: number
  relay_rated_current: number
  rl_ohm: number
  relay_burden_sr_va: number
  /** Rct + Rl + Sr/(Ir x Ir) */
  total_secondary_burden_ohm: number
  checks: EalreqCheck[]
  differential: { highest_ealreq_v: number; controlling: string }
  distance: { highest_ealreq_v: number; controlling: string }
  highest_ealreq_v: number
  controlling_case: string
  knee_point_voltage_required_v: number
  suitable: boolean
  verdict: "Suitably Dimensioned" | "Under Dimensioned"
  margin_percent: number
  remarks: string[]
  trace: TraceStep[]
}

/** Rct + Rl + Sr / (Ir x Ir)  -> the bracket of equations (1) and (2) */
export function calculateSecondaryBurdenOhm(rct: number, rl: number, sr: number, ir: number): number {
  return rct + rl + sr / (ir * ir)
}

/**
 * Ealreq = multiplier x I x (Isn / Ipn) x dcFactor x (Rct + Rl + Sr/(Ir x Ir))
 * multiplier = 1 (close-in) or 2 (through faults) ; dcFactor = 1 / a / k
 */
export function calculateEalreq(
  current: number,
  isn: number,
  ipn: number,
  bracketOhm: number,
  multiplier = 1,
  dcFactor = 1,
): number {
  return multiplier * current * (isn / ipn) * dcFactor * bracketOhm
}

/** Vk = Ealreq x 0.8  -> 'IFP1-RED670'!Q120 */
export function calculateRequiredVk(ealreq: number, factor = RED670_EXCEL_CONSTANTS.VK_FROM_EALREQ_FACTOR): number {
  return ealreq * factor
}

function resolveDcFactor(
  tp: number,
  threshold: number,
  within: number,
  beyond: number | undefined,
  symbol: "a" | "k",
  remarks: string[],
): number {
  if (tp <= threshold) return within
  if (typeof beyond === "number") {
    remarks.push(
      `Primary time constant tp = ${tp.toFixed(2)} ms exceeds the ${threshold} ms row of the template, so the supplied ${symbol} factor ${beyond} was used.`,
    )
    return beyond
  }
  remarks.push(
    `Primary time constant tp = ${tp.toFixed(2)} ms exceeds the ${threshold} ms row of the template. The reference sheet leaves that row blank, so ${symbol} = ${within} (the <= ${threshold} ms value) was retained. Supply dc_factors.${symbol}_beyond_threshold to override.`,
  )
  return within
}

export function calculateTap(
  tap: RED670CTTapInput,
  index: number,
  sys: SystemFaultResult,
  burdens: BurdenResult,
  relay_rated_current: number,
  dc?: RED670DCFactorOverrides,
): TapResult {
  const name = tap.name ?? `Tap-${index + 1}`
  const isn = tap.ct_ratio_secondary
  const ipn = tap.ct_ratio_primary
  const ir = relay_rated_current
  const rct = tap.ct_resistance_ohm
  const rl = burdens.rl_ohm
  const sr = burdens.relay_burden_sr_va
  const remarks: string[] = []

  const bracket = calculateSecondaryBurdenOhm(rct, rl, sr, ir)

  const aWithin = dc?.a_within_threshold ?? RED670_EXCEL_CONSTANTS.A_FACTOR_WITHIN_THRESHOLD
  const kWithin = dc?.k_within_threshold ?? RED670_EXCEL_CONSTANTS.K_FACTOR_WITHIN_THRESHOLD

  const aFactor = resolveDcFactor(
    sys.system_time_constant_ms,
    RED670_EXCEL_CONSTANTS.A_FACTOR_TP_THRESHOLD_MS,
    aWithin,
    dc?.a_beyond_threshold,
    "a",
    remarks,
  )
  const k3 = resolveDcFactor(
    sys.faults.endzone1_3ph.time_constant_ms,
    RED670_EXCEL_CONSTANTS.K_FACTOR_TP_THRESHOLD_MS,
    kWithin,
    dc?.k_beyond_threshold,
    "k",
    remarks,
  )
  const k1 = resolveDcFactor(
    sys.faults.endzone1_1ph.time_constant_ms,
    RED670_EXCEL_CONSTANTS.K_FACTOR_TP_THRESHOLD_MS,
    kWithin,
    dc?.k_beyond_threshold,
    "k",
    remarks,
  )

  const mk = (
    key: string,
    group: "Differential" | "Distance",
    label: string,
    reference: string,
    current: number,
    multiplier: number,
    dcFactor: number,
    tp?: number,
  ): EalreqCheck => {
    const value = calculateEalreq(current, isn, ipn, bracket, multiplier, dcFactor)
    return {
      key,
      function_group: group,
      label,
      current_a: current,
      current_multiplier: multiplier,
      dc_factor: dcFactor,
      time_constant_ms: tp,
      ealreq_v: value,
      trace: {
        label: `${group} - ${label}`,
        reference,
        formula: `Ealreq = ${multiplier === 2 ? "2 x " : ""}I x (Isn/Ipn)${dcFactor !== 1 ? " x factor" : ""} x (Rct + Rl + Sr/(Ir x Ir))`,
        substitution: `${multiplier === 2 ? "2 x " : ""}${fmt(current, 4)} x (${isn}/${ipn})${dcFactor !== 1 ? ` x ${dcFactor}` : ""} x (${rct} + ${fmt(rl)} + ${sr}/(${ir} x ${ir}))`,
        value,
        unit: "V",
      },
    }
  }

  const checks: EalreqCheck[] = [
    mk(
      "diff_close_in",
      "Differential",
      "Close-in faults - eq.(1)",
      "'IFP1-RED670'!D50",
      sys.max_bus_fault_current_a,
      1,
      1,
    ),
    mk(
      "diff_through_3ph",
      "Differential",
      "Through faults 3-ph - eq.(2)",
      "'IFP1-RED670'!D56",
      sys.faults.through_3ph.current_a,
      2,
      1,
      sys.faults.through_3ph.time_constant_ms,
    ),
    mk(
      "diff_through_1ph",
      "Differential",
      "Through faults 1-ph - eq.(2)",
      "'IFP1-RED670'!D62",
      sys.faults.through_1ph.current_a,
      2,
      1,
      sys.faults.through_1ph.time_constant_ms,
    ),
    mk(
      "dist_close_in",
      "Distance",
      "Close-in faults - eq.(1), factor a",
      "'IFP1-RED670'!D99",
      sys.max_bus_fault_current_a,
      1,
      aFactor,
      sys.system_time_constant_ms,
    ),
    mk(
      "dist_endzone1_3ph",
      "Distance",
      "Endzone-1 3-ph faults - eq.(2), factor k",
      "'IFP1-RED670'!D106",
      sys.faults.endzone1_3ph.current_a,
      1,
      k3,
      sys.faults.endzone1_3ph.time_constant_ms,
    ),
    mk(
      "dist_endzone1_1ph",
      "Distance",
      "Endzone-1 1-ph faults - eq.(2), factor k",
      "'IFP1-RED670'!D113",
      sys.faults.endzone1_1ph.current_a,
      1,
      k1,
      sys.faults.endzone1_1ph.time_constant_ms,
    ),
  ]

  const pickHighest = (list: EalreqCheck[]) =>
    list.reduce((best, cur) => (cur.ealreq_v > best.ealreq_v ? cur : best), list[0])

  const diffChecks = checks.filter((c) => c.function_group === "Differential")
  const distChecks = checks.filter((c) => c.function_group === "Distance")
  const diffTop = pickHighest(diffChecks)
  const distTop = pickHighest(distChecks)
  const overallTop = pickHighest(checks)

  const vkRequired = calculateRequiredVk(overallTop.ealreq_v)
  const vkAvailable = tap.knee_point_voltage_v
  const suitable = vkAvailable > vkRequired // 'IFP1-RED670'!H123 : IF(available > required, ...)
  const margin = vkRequired === 0 ? 0 : ((vkAvailable - vkRequired) / vkRequired) * 100

  remarks.push(
    suitable
      ? `Available Vk (${vkAvailable} V) exceeds the required ${vkRequired.toFixed(2)} V by ${margin.toFixed(1)} %.`
      : `Available Vk (${vkAvailable} V) is below the required ${vkRequired.toFixed(2)} V by ${Math.abs(margin).toFixed(1)} %.`,
  )
  remarks.push(`Controlling condition: ${overallTop.function_group} - ${overallTop.label}.`)

  return {
    name,
    ct_ratio_primary: ipn,
    ct_ratio_secondary: isn,
    class_of_accuracy: tap.class_of_accuracy,
    ct_resistance_ohm: rct,
    magnetizing_current_ma: tap.magnetizing_current_ma,
    knee_point_voltage_available_v: vkAvailable,
    relay_rated_current: ir,
    rl_ohm: rl,
    relay_burden_sr_va: sr,
    total_secondary_burden_ohm: bracket,
    checks,
    differential: { highest_ealreq_v: diffTop.ealreq_v, controlling: diffTop.label },
    distance: { highest_ealreq_v: distTop.ealreq_v, controlling: distTop.label },
    highest_ealreq_v: overallTop.ealreq_v,
    controlling_case: `${overallTop.function_group} - ${overallTop.label}`,
    knee_point_voltage_required_v: vkRequired,
    suitable,
    verdict: suitable ? "Suitably Dimensioned" : "Under Dimensioned",
    margin_percent: margin,
    remarks,
    trace: [
      {
        label: "Total secondary burden seen by the CT",
        reference: "'IFP1-RED670'!M47+O47+Q47",
        formula: "Rct + Rl + Sr / (Ir x Ir)",
        substitution: `${rct} + ${fmt(rl)} + ${sr} / (${ir} x ${ir})`,
        value: bracket,
        unit: "ohm",
      },
      ...checks.map((c) => c.trace),
      {
        label: `Highest Ealreq at ${ipn} A tap`,
        reference: "'IFP1-RED670'!Q115",
        formula: "MAX(all six Ealreq values)",
        substitution: checks.map((c) => fmt(c.ealreq_v, 3)).join(", "),
        value: overallTop.ealreq_v,
        unit: "V",
      },
      {
        label: "Required knee point voltage",
        reference: "'IFP1-RED670'!Q120",
        formula: "Vk = Ealreq x 0.8",
        substitution: `${fmt(overallTop.ealreq_v)} x ${RED670_EXCEL_CONSTANTS.VK_FROM_EALREQ_FACTOR}`,
        value: vkRequired,
        unit: "V",
      },
    ],
  }
}

/* ============================= 4. VALIDATION ============================= */

export function validateRED670Input(input: RED670Input): RED670ValidationError[] {
  const errors: RED670ValidationError[] = []
  const pos = (v: unknown, path: string, allowZero = false) => {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors.push({ path, message: "must be a finite number" })
      return
    }
    if (v < 0 || (!allowZero && v === 0)) {
      errors.push({ path, message: allowZero ? "must be >= 0" : "must be greater than 0" })
    }
  }

  if (!input || typeof input !== "object") {
    return [{ path: "input", message: "payload missing" }]
  }
  if (!input.system) errors.push({ path: "system", message: "missing" })
  else {
    pos(input.system.bus_fault_level_ka, "system.bus_fault_level_ka")
    pos(input.system.system_frequency_hz, "system.system_frequency_hz")
    pos(input.system.bus_voltage_kv, "system.bus_voltage_kv")
    pos(input.system.xr_ratio, "system.xr_ratio")
    if (input.system.voltage_pu !== undefined) pos(input.system.voltage_pu, "system.voltage_pu")
  }

  if (!input.line) errors.push({ path: "line", message: "missing" })
  else {
    pos(input.line.positive_sequence_resistance, "line.positive_sequence_resistance")
    pos(input.line.positive_sequence_reactance, "line.positive_sequence_reactance")
    pos(input.line.zero_sequence_resistance, "line.zero_sequence_resistance")
    pos(input.line.zero_sequence_reactance, "line.zero_sequence_reactance")
    pos(input.line.route_length_km, "line.route_length_km")
    if (input.line.cables_per_phase !== undefined) pos(input.line.cables_per_phase, "line.cables_per_phase")
  }

  const checkWiring = (w: RED670WiringInput | undefined, prefix: string, required: boolean) => {
    if (!w) {
      if (required) errors.push({ path: prefix, message: "missing" })
      return
    }
    pos(w.conductor_cross_section_mm2, `${prefix}.conductor_cross_section_mm2`)
    pos(w.resistance_per_km_at_20c, `${prefix}.resistance_per_km_at_20c`)
    pos(w.lead_length_m, `${prefix}.lead_length_m`)
  }
  checkWiring(input.ct_wiring, "ct_wiring", true)
  checkWiring(input.vt_wiring, "vt_wiring", false)

  pos(input.relay_rated_current, "relay_rated_current")

  if (!Array.isArray(input.ct_taps) || input.ct_taps.length === 0) {
    errors.push({ path: "ct_taps", message: "at least one CT tap is required" })
  } else {
    input.ct_taps.forEach((t, i) => {
      pos(t.ct_ratio_primary, `ct_taps[${i}].ct_ratio_primary`)
      pos(t.ct_ratio_secondary, `ct_taps[${i}].ct_ratio_secondary`)
      pos(t.ct_resistance_ohm, `ct_taps[${i}].ct_resistance_ohm`, true)
      pos(t.knee_point_voltage_v, `ct_taps[${i}].knee_point_voltage_v`)
    })
  }

  if (!Array.isArray(input.device_burdens) || input.device_burdens.length === 0) {
    errors.push({ path: "device_burdens", message: "at least the RED670 burden is required" })
  } else {
    input.device_burdens.forEach((d, i) => pos(d.burden_va, `device_burdens[${i}].burden_va`, true))
  }

  return errors
}

/* =========================== 5. MAIN ENGINE ============================== */

export interface RED670Result {
  template: "RED670"
  ct_wiring: WiringResult
  vt_wiring: WiringResult | null
  burdens: BurdenResult
  system: SystemFaultResult
  taps: TapResult[]
  /** Tap with the largest Vk headroom among the suitable ones (else the closest) */
  recommended_tap: string | null
  /** Worst verdict across all taps that were submitted */
  final_verdict: "Suitably Dimensioned" | "Under Dimensioned"
  summary: {
    ikmax_a: number
    through_fault_3ph_a: number
    through_fault_1ph_a: number
    endzone1_3ph_a: number
    endzone1_1ph_a: number
    system_time_constant_ms: number
    sir: number
    rl_ohm: number
  }
  remarks: string[]
  units: Record<string, string>
}

export class RED670Engine {
  static calculate(input: RED670Input): RED670Result {
    const errors = validateRED670Input(input)
    if (errors.length > 0) {
      throw new RED670ValidationException(errors)
    }

    // Isn is a CT property; the template uses the same secondary for every tap.
    const isn = input.ct_taps[0].ct_ratio_secondary

    const ctWiring = calculateWiringResistance(input.ct_wiring, isn, "CT")
    const vtWiring = input.vt_wiring ? calculateWiringResistance(input.vt_wiring, isn, "VT") : null
    const burdens = calculateBurdens(ctWiring.lead_va_consumption, input.device_burdens, isn)
    const system = calculateSystemAndFaults(input.system, input.line)

    const taps = input.ct_taps.map((tap, i) =>
      calculateTap(tap, i, system, burdens, input.relay_rated_current, input.dc_factors),
    )

    const suitable = taps.filter((t) => t.suitable)
    const recommended =
      suitable.length > 0
        ? suitable.reduce((best, cur) => (cur.margin_percent < best.margin_percent ? cur : best)).name
        : taps.length > 0
          ? taps.reduce((best, cur) => (cur.margin_percent > best.margin_percent ? cur : best)).name
          : null

    const allSuitable = taps.every((t) => t.suitable)

    const remarks: string[] = []
    remarks.push(
      allSuitable
        ? "All submitted CT taps satisfy Vk(available) > Vk(required)."
        : `${taps.length - suitable.length} of ${taps.length} submitted CT tap(s) do not satisfy Vk(available) > Vk(required).`,
    )
    if (recommended) {
      remarks.push(
        suitable.length > 0
          ? `Recommended tap: ${recommended} - lowest adequate knee point voltage margin, i.e. the most economical adequate tap.`
          : `Closest tap: ${recommended} - still under dimensioned, increase Vk or reduce lead resistance.`,
      )
    }
    taps.forEach((t) => t.remarks.forEach((r) => remarks.push(`${t.name}: ${r}`)))

    return {
      template: "RED670",
      ct_wiring: ctWiring,
      vt_wiring: vtWiring,
      burdens,
      system,
      taps,
      recommended_tap: recommended,
      final_verdict: allSuitable ? "Suitably Dimensioned" : "Under Dimensioned",
      summary: {
        ikmax_a: system.max_bus_fault_current_a,
        through_fault_3ph_a: system.faults.through_3ph.current_a,
        through_fault_1ph_a: system.faults.through_1ph.current_a,
        endzone1_3ph_a: system.faults.endzone1_3ph.current_a,
        endzone1_1ph_a: system.faults.endzone1_1ph.current_a,
        system_time_constant_ms: system.system_time_constant_ms,
        sir: system.sir,
        rl_ohm: burdens.rl_ohm,
      },
      remarks,
      units: {
        ealreq: "V",
        knee_point_voltage: "V",
        fault_current: "A",
        resistance: "ohm",
        burden: "VA",
        time_constant: "ms",
      },
    }
  }
}

export class RED670ValidationException extends Error {
  errors: RED670ValidationError[]
  constructor(errors: RED670ValidationError[]) {
    super(`RED670 input validation failed: ${errors.map((e) => `${e.path} ${e.message}`).join("; ")}`)
    this.name = "RED670ValidationException"
    this.errors = errors
  }
}

/** Convenience functional wrapper. */
export function calculateRED670(input: RED670Input): RED670Result {
  return RED670Engine.calculate(input)
}

/* =========================================================================
 * ==============  TEMPLATE 2 : 7SJ85 (BCU + OC, 5P CLASS CT)  =============
 * =========================================================================
 *
 * Source sheets: "BCU+OC-5P SEL751+7SJ85" and "BCU+OC-5P SEL751+7SJ85 (2)"
 * of TEST CASE 1-5, cross-checked against 'CT-VT Burdens' and
 * 'Parameters & Fault Cal. (4)'.
 *
 * This is a COMPLETELY DIFFERENT method from the RED670 template. The RED670
 * sheet is a transient-dimensioning check on knee point voltage (Ealreq / Vk).
 * The 7SJ85 sheet is a steady-state ACCURACY LIMIT FACTOR check per
 * IEC 61869-2 for protection class CTs (5P20 etc.). No knee point voltage,
 * no DC time constants, no sequence impedances are involved.
 *
 * Per CT tap (three blocks in the sheet at rows 7-42, 48-83, 89-123):
 *
 *   PE   = In x In x Rct                        internal burden        (P22)
 *   Pl   = Is^2 x 2RL                           lead burden           (S22)
 *   PL   = SUM(device burdens) + Pl             external burden       (J22)
 *   Kssc_required  = Itkmax / Ipn                                     (G34)
 *   Kssc_available = n x ((PE + PN) / (PE + PL))                      (G38)
 *   verdict        = Kssc_available > Kssc_required                   (G40/G42)
 *
 * Note the verdict test is a STRICT greater-than, so an exact tie counts as
 * under dimensioned - this reproduces IF(D41>G41,">","<") verbatim.
 */

export const SJ85_EXCEL_CONSTANTS = {
  /** S24 = 'Parameters & Fault Cal. (4)'!Q10 * 1000 */
  KA_TO_A: 1000,
  /** IF(D41>G41,...) - strict inequality, ties fail */
  VERDICT_IS_STRICT: true,
} as const

export interface SJ85CTTapInput {
  name?: string
  /** H10 / J51 / L92 - CT primary current Ipn */
  ct_ratio_primary: number
  /** O10 / O51 / O92 - CT secondary current In (= Is) */
  ct_ratio_secondary: number
  /** H12 / J53 / L94 - CT secondary winding resistance Rct */
  ct_resistance_ohm: number
  /** H13 / J54 / L95 - CT rated burden PN in VA */
  rated_burden_va: number
  /** I11 / K52 / M93 - accuracy limiting factor n (the "20" of 5P20) */
  accuracy_limiting_factor: number
  /** H11 - e.g. "5P" (documentation only, not used in arithmetic) */
  class_of_accuracy?: string
  /** Core / feeder label, e.g. "Core3" */
  core?: string
}

export interface SJ85DeviceBurdenInput {
  name: string
  /** 'CT-VT Burdens'!Q48..Q92 - burden at rated 1 A, in VA */
  burden_va: number
}

export interface SJ85Input {
  /** S24 - max through fault current at close-in fault, in A. */
  itkmax_a?: number
  /** Alternative to itkmax_a: bus fault level in kA (x1000 as per S24). */
  bus_fault_level_ka?: number
  /** 'CT-VT Burdens' rows 10-22 */
  ct_wiring: RED670WiringInput
  /** Rows 17-20 - every device sharing the CT core */
  device_burdens: SJ85DeviceBurdenInput[]
  /** Up to three taps in the sheet, but any number is accepted here. */
  ct_taps: SJ85CTTapInput[]
  /** Optional labels carried through to the output */
  feeder?: string
  description?: string
}

export interface SJ85TapResult {
  name: string
  core: string | null
  class_label: string
  ct_ratio: string
  ipn_a: number
  in_a: number
  rct_ohm: number
  /** PE = In^2 x Rct */
  pe_va: number
  /** PN, the CT rated burden */
  pn_va: number
  /** PL = devices + leads */
  pl_va: number
  alf_n: number
  kssc_required: number
  kssc_available: number
  /** ">" or "<" exactly as cell F40 renders it */
  comparison: ">" | "<"
  suitable: boolean
  verdict: "Suitably Dimensioned" | "Under Dimensioned"
  /** (available - required) / required x 100 */
  margin_percent: number
  /** Largest Itkmax the tap could still cope with, at this burden */
  max_withstand_fault_current_a: number
  /** Highest Rct that would still pass, all else equal (null if any Rct passes) */
  max_permissible_rct_ohm: number | null
  remarks: string[]
  trace: TraceStep[]
}

/** P22 : PE = In x In x Rct */
export function calculateInternalBurden(inA: number, rct: number): number {
  return inA * inA * rct
}

/** G38 : Kssc' = n x ((PE + PN) / (PE + PL)) */
export function calculateAvailableKssc(n: number, pe: number, pn: number, pl: number): number {
  return n * ((pe + pn) / (pe + pl))
}

/** G34 : Kssc' required = Itkmax / Ipn */
export function calculateRequiredKssc(itkmax: number, ipn: number): number {
  return itkmax / ipn
}

export interface SJ85BurdenResult {
  lead_va: number
  device_va_total: number
  /** PL as summed in J22 */
  total_external_burden_va: number
  trace: TraceStep[]
}

/** J17:J21 -> J22 : PL = SUM(device burdens, lead burden) */
export function calculateSJ85Burdens(leadVa: number, devices: SJ85DeviceBurdenInput[]): SJ85BurdenResult {
  const deviceTotal = devices.reduce((s, d) => s + d.burden_va, 0)
  const total = deviceTotal + leadVa

  const trace: TraceStep[] = [
    ...devices.map((d, i) => ({
      label: `Burden of ${d.name}`,
      reference: `'BCU+OC-5P SEL751+7SJ85'!J${17 + i}`,
      formula: "device burden at rated 1 A",
      substitution: `${d.name} = ${d.burden_va} VA`,
      value: d.burden_va,
      unit: "VA",
    })),
    {
      label: "Total lead burden",
      reference: "'BCU+OC-5P SEL751+7SJ85'!J21",
      formula: "Pl = Is^2 x 2RL",
      substitution: `from 'CT-VT Burdens'!S22 = ${fmt(leadVa)}`,
      value: leadVa,
      unit: "VA",
    },
    {
      label: "Total lead + other burden (PL)",
      reference: "'BCU+OC-5P SEL751+7SJ85'!J22",
      formula: "PL = SUM(device burdens) + lead burden",
      substitution: `${devices.map((d) => d.burden_va).join(" + ")}${devices.length ? " + " : ""}${fmt(leadVa)}`,
      value: total,
      unit: "VA",
    },
  ]

  return { lead_va: leadVa, device_va_total: deviceTotal, total_external_burden_va: total, trace }
}

export function calculateSJ85Tap(
  tap: SJ85CTTapInput,
  index: number,
  itkmax: number,
  burdens: SJ85BurdenResult,
): SJ85TapResult {
  const name = tap.name ?? `Tap-${index + 1}`
  const inA = tap.ct_ratio_secondary
  const ipn = tap.ct_ratio_primary
  const rct = tap.ct_resistance_ohm
  const pn = tap.rated_burden_va
  const n = tap.accuracy_limiting_factor
  const pl = burdens.total_external_burden_va

  const pe = calculateInternalBurden(inA, rct)
  const required = calculateRequiredKssc(itkmax, ipn)
  const available = calculateAvailableKssc(n, pe, pn, pl)

  const suitable = available > required
  const comparison: ">" | "<" = suitable ? ">" : "<"
  const margin = required === 0 ? Number.POSITIVE_INFINITY : ((available - required) / required) * 100

  // Rearranged G38 >= G34 : the largest fault current this tap can serve.
  const maxWithstand = available * ipn

  // Solve n x ((PE + PN)/(PE + PL)) = required for PE, with PE = In^2 x Rct.
  // PE (n - required) = required x PL - n x PN
  let maxRct: number | null = null
  const denom = n - required
  if (denom > 0) {
    const peLimit = (required * pl - n * pn) / denom
    maxRct = peLimit > 0 ? peLimit / (inA * inA) : null
  }

  const remarks: string[] = []
  if (!suitable) {
    remarks.push(
      `Kssc available (${fmt(available, 4)}) does not exceed Kssc required (${fmt(required, 4)}). ` +
        `Increase the CT ratio, increase the rated burden PN, reduce Rct, or reduce the connected/lead burden.`,
    )
    if (maxRct !== null) {
      remarks.push(`At this burden the CT would need Rct <= ${fmt(maxRct, 4)} ohm to pass.`)
    } else {
      remarks.push(`No value of Rct alone can satisfy this tap - PN or the CT ratio must change.`)
    }
  }
  if (suitable && margin < 10) {
    remarks.push(`Only ${fmt(margin, 2)} % margin above the required Kssc - little headroom for burden growth.`)
  }
  if (Math.abs(available - required) < 1e-9) {
    remarks.push(
      "Kssc available exactly equals Kssc required; the template uses a strict > test, so this counts as under dimensioned.",
    )
  }

  const trace: TraceStep[] = [
    {
      label: "Max through fault current at close-in fault (Itkmax)",
      reference: "'BCU+OC-5P SEL751+7SJ85'!S24",
      formula: "Itkmax = bus fault level x 1000",
      substitution: `${fmt(itkmax / SJ85_EXCEL_CONSTANTS.KA_TO_A)} kA x 1000`,
      value: itkmax,
      unit: "A",
    },
    {
      label: "CT primary current (Ipn)",
      reference: "'BCU+OC-5P SEL751+7SJ85'!S25",
      formula: "Ipn from the CT ratio",
      substitution: `${ipn} / ${inA} A`,
      value: ipn,
      unit: "A",
    },
    {
      label: "Internal burden (PE)",
      reference: "'BCU+OC-5P SEL751+7SJ85'!P22",
      formula: "PE = In x In x Rct",
      substitution: `${inA} x ${inA} x ${rct}`,
      value: pe,
      unit: "VA",
    },
    {
      label: "Burden of CT leads and connected devices (PL)",
      reference: "'BCU+OC-5P SEL751+7SJ85'!S27",
      formula: "PL = SUM(device burdens) + lead burden",
      substitution: `${fmt(burdens.device_va_total)} + ${fmt(burdens.lead_va)}`,
      value: pl,
      unit: "VA",
    },
    {
      label: "CT rated burden (PN)",
      reference: "'BCU+OC-5P SEL751+7SJ85'!S30",
      formula: "PN as declared on the CT nameplate",
      substitution: `${pn} VA`,
      value: pn,
      unit: "VA",
    },
    {
      label: "CT accuracy limiting factor (n)",
      reference: "'BCU+OC-5P SEL751+7SJ85'!S29",
      formula: "n from the CT class, e.g. the 20 of 5P20",
      substitution: `${n}`,
      value: n,
      unit: "-",
    },
    {
      label: "Required Kssc'",
      reference: "'BCU+OC-5P SEL751+7SJ85'!G34",
      formula: "Kssc required = Itkmax / Ipn",
      substitution: `${fmt(itkmax)} / ${ipn}`,
      value: required,
      unit: "-",
    },
    {
      label: "Available (effective) Kssc'",
      reference: "'BCU+OC-5P SEL751+7SJ85'!G38",
      formula: "Kssc available = n x ((PE + PN) / (PE + PL))",
      substitution: `${n} x ((${fmt(pe)} + ${pn}) / (${fmt(pe)} + ${fmt(pl)}))`,
      value: available,
      unit: "-",
    },
    {
      label: "Max through fault current this tap can serve",
      reference: "derived from G38 >= G34",
      formula: "Itkmax(max) = Kssc available x Ipn",
      substitution: `${fmt(available)} x ${ipn}`,
      value: maxWithstand,
      unit: "A",
    },
  ]

  return {
    name,
    core: tap.core ?? null,
    class_label: `${tap.class_of_accuracy ?? "5P"}${n}`,
    ct_ratio: `${ipn}/${inA} A`,
    ipn_a: ipn,
    in_a: inA,
    rct_ohm: rct,
    pe_va: pe,
    pn_va: pn,
    pl_va: pl,
    alf_n: n,
    kssc_required: required,
    kssc_available: available,
    comparison,
    suitable,
    verdict: suitable ? "Suitably Dimensioned" : "Under Dimensioned",
    margin_percent: margin,
    max_withstand_fault_current_a: maxWithstand,
    max_permissible_rct_ohm: maxRct,
    remarks,
    trace,
  }
}

export function validateSJ85Input(input: SJ85Input): RED670ValidationError[] {
  const errors: RED670ValidationError[] = []
  const pos = (v: unknown, path: string, allowZero = false) => {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors.push({ path, message: "must be a finite number" })
      return
    }
    if (v < 0 || (!allowZero && v === 0)) {
      errors.push({ path, message: allowZero ? "must be >= 0" : "must be greater than 0" })
    }
  }

  if (!input || typeof input !== "object") {
    return [{ path: "input", message: "payload missing" }]
  }

  if (input.itkmax_a === undefined && input.bus_fault_level_ka === undefined) {
    errors.push({ path: "itkmax_a", message: "provide either itkmax_a (A) or bus_fault_level_ka (kA)" })
  }
  if (input.itkmax_a !== undefined) pos(input.itkmax_a, "itkmax_a")
  if (input.bus_fault_level_ka !== undefined) pos(input.bus_fault_level_ka, "bus_fault_level_ka")

  if (!input.ct_wiring) {
    errors.push({ path: "ct_wiring", message: "missing" })
  } else {
    pos(input.ct_wiring.conductor_cross_section_mm2, "ct_wiring.conductor_cross_section_mm2")
    pos(input.ct_wiring.resistance_per_km_at_20c, "ct_wiring.resistance_per_km_at_20c")
    pos(input.ct_wiring.lead_length_m, "ct_wiring.lead_length_m")
  }

  if (!Array.isArray(input.device_burdens) || input.device_burdens.length === 0) {
    errors.push({ path: "device_burdens", message: "at least the 7SJ85 burden is required" })
  } else {
    input.device_burdens.forEach((d, i) => pos(d.burden_va, `device_burdens[${i}].burden_va`, true))
  }

  if (!Array.isArray(input.ct_taps) || input.ct_taps.length === 0) {
    errors.push({ path: "ct_taps", message: "at least one CT tap is required" })
  } else {
    input.ct_taps.forEach((t, i) => {
      pos(t.ct_ratio_primary, `ct_taps[${i}].ct_ratio_primary`)
      pos(t.ct_ratio_secondary, `ct_taps[${i}].ct_ratio_secondary`)
      pos(t.ct_resistance_ohm, `ct_taps[${i}].ct_resistance_ohm`, true)
      pos(t.rated_burden_va, `ct_taps[${i}].rated_burden_va`)
      pos(t.accuracy_limiting_factor, `ct_taps[${i}].accuracy_limiting_factor`)
    })
  }

  return errors
}

export interface SJ85Result {
  template: "7SJ85"
  feeder: string | null
  description: string | null
  itkmax_a: number
  ct_wiring: WiringResult
  burdens: SJ85BurdenResult
  taps: SJ85TapResult[]
  recommended_tap: string | null
  final_verdict: "Suitably Dimensioned" | "Under Dimensioned"
  summary: {
    itkmax_a: number
    loop_lead_resistance_ohm: number
    lead_burden_va: number
    device_burden_va: number
    total_external_burden_va: number
  }
  /** Mirrors the "Recommended CT Parameters for Manufacturing" table, rows 134-140 */
  manufacturing_table: {
    tap: string
    core: string | null
    ratio: string
    ct_cable: string
    class: string
    rct_ohm_at_75c: number
    rated_burden_va: number
    devices: string
    suitability: string
  }[]
  remarks: string[]
  units: Record<string, string>
}

export class SJ85Engine {
  static calculate(input: SJ85Input): SJ85Result {
    const errors = validateSJ85Input(input)
    if (errors.length > 0) {
      throw new SJ85ValidationException(errors)
    }

    const itkmax = input.itkmax_a ?? (input.bus_fault_level_ka as number) * SJ85_EXCEL_CONSTANTS.KA_TO_A

    // Is for the lead burden is the CT secondary current (S17), taken from the taps.
    const isn = input.ct_taps[0].ct_ratio_secondary
    const ctWiring = calculateWiringResistance(input.ct_wiring, isn, "CT")
    const burdens = calculateSJ85Burdens(ctWiring.lead_va_consumption, input.device_burdens)

    const taps = input.ct_taps.map((tap, i) => calculateSJ85Tap(tap, i, itkmax, burdens))

    const suitable = taps.filter((t) => t.suitable)
    // Most economical adequate tap = smallest margin among those that pass.
    const recommended =
      suitable.length > 0
        ? suitable.reduce((best, cur) => (cur.margin_percent < best.margin_percent ? cur : best)).name
        : taps.length > 0
          ? taps.reduce((best, cur) => (cur.margin_percent > best.margin_percent ? cur : best)).name
          : null

    const allSuitable = taps.length > 0 && taps.every((t) => t.suitable)

    const deviceList = input.device_burdens.map((d) => d.name).join(" ")

    const remarks: string[] = []
    remarks.push(
      allSuitable
        ? "All submitted CT taps satisfy Kssc available > Kssc required."
        : `${taps.length - suitable.length} of ${taps.length} submitted CT tap(s) do not satisfy Kssc available > Kssc required.`,
    )
    if (recommended) {
      remarks.push(
        suitable.length > 0
          ? `Recommended tap: ${recommended} - lowest adequate Kssc margin, i.e. the most economical adequate tap.`
          : `Closest tap: ${recommended} - still under dimensioned.`,
      )
    }
    taps.forEach((t) => t.remarks.forEach((r) => remarks.push(`${t.name}: ${r}`)))

    return {
      template: "7SJ85",
      feeder: input.feeder ?? null,
      description: input.description ?? null,
      itkmax_a: itkmax,
      ct_wiring: ctWiring,
      burdens,
      taps,
      recommended_tap: recommended,
      final_verdict: allSuitable ? "Suitably Dimensioned" : "Under Dimensioned",
      summary: {
        itkmax_a: itkmax,
        loop_lead_resistance_ohm: ctWiring.loop_lead_resistance_ohm,
        lead_burden_va: burdens.lead_va,
        device_burden_va: burdens.device_va_total,
        total_external_burden_va: burdens.total_external_burden_va,
      },
      manufacturing_table: taps.map((t) => ({
        tap: t.name,
        core: t.core,
        ratio: t.ct_ratio,
        ct_cable: `${input.ct_wiring.lead_length_m} m / ${input.ct_wiring.conductor_cross_section_mm2} mm2`,
        class: t.class_label,
        rct_ohm_at_75c: t.rct_ohm,
        rated_burden_va: t.pn_va,
        devices: deviceList,
        suitability: t.verdict,
      })),
      remarks,
      units: {
        kssc: "-",
        burden: "VA",
        fault_current: "A",
        resistance: "ohm",
      },
    }
  }
}

export class SJ85ValidationException extends Error {
  errors: RED670ValidationError[]
  constructor(errors: RED670ValidationError[]) {
    super(`7SJ85 input validation failed: ${errors.map((e) => `${e.path} ${e.message}`).join("; ")}`)
    this.name = "SJ85ValidationException"
    this.errors = errors
  }
}

/** Convenience functional wrapper. */
export function calculate7SJ85(input: SJ85Input): SJ85Result {
  return SJ85Engine.calculate(input)
}
