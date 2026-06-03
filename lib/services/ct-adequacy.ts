// CT Adequacy Calculation Engine
// Per-device calculation: each device is evaluated independently
// Based on IEC 61869-2, IEEE C37.110, and relay manufacturer application guides

export interface SystemParameters {
  // 17 Standard Parameters (fixed for all users)
  bus_fault_level:                    string;   // e.g. "31.5kA/3sec"
  system_frequency:                   string;   // e.g. "50"
  bus_voltage_level:                  string;   // e.g. "33kV"
  xr_ratio:                           string;
  ct_wiring_conductor_cross_section_1?: string;
  resistance_w_km_20c_1?:             string;
  specific_resistance_20c_1?:         string;
  lead_length_vt_to_relay_1?:         string;
  ct_wiring_conductor_cross_section_2?: string;
  resistance_w_km_20c_2?:             string;
  specific_resistance_20c_2?:         string;
  lead_length_vt_to_relay_2?:         string;
  route_length:                       string;
  positive_seq_resistance_r1:         string;
  positive_seq_reactance_z1:          string;
  negative_seq_resistance_r0:         string;
  negative_seq_reactance_z0:          string;
  // Transformer parameters
  power_rating?:                      string;
  impedance?:                         string;
  rated_voltage?:                     string;
}

export interface DeviceInput {
  device_name:            string;   // e.g. "DISTANCE +DIFFERENTIAL PROTECTION"
  core?:                  string;   // e.g. "Core 1"
  ct_core_used_for?:      string;
  ct_ratio?:              string;   // e.g. "800/1A"
  accuracy_class?:        string;   // e.g. "PX", "0.5"
  ct_resistance?:         string;   // Ω
  vk_knee_point_voltage?: string;   // V
  burden?:                string;   // VA
  magnetizing_current?:   string;   // mA
}

// Per-device calculation result
export interface DeviceResult {
  device_name:    string;
  device_index:   number;
  device_type:    DeviceType;
  verdict:        'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED' | 'NOT APPLICABLE';
  vk_available:   number;
  vk_required:    number;
  ealreq_max:     number;
  vk_breakdown:   VkBreakdownEntry[];
  intermediates:  Record<string, number | string>;
  inputs: {
    ct_ratio_primary:   number;
    ct_ratio_secondary: number;
    accuracy_class:     string;
    rct:                number;
    lead_resistance:    number;
    relay_burden_va:    number;
    frequency:          number;
    bus_voltage_kv:     number;
    max_bus_fault_kA:   number;
    r1:                 number;
    x1:                 number;
    r0:                 number;
    x0:                 number;
    route_length_km:    number;
  };
}

export interface VkBreakdownEntry {
  label:          string;
  formula:        string;
  ealreq:         number;
  vk:             number;
  isMax:          boolean;
}

export type DeviceType =
  | 'DISTANCE_DIFFERENTIAL'
  | 'OVERCURRENT_PROTECTION'
  | 'METERING'
  | 'BUSBAR_BREAKER_FAILURE'
  | 'DIFFERENTIAL'
  | 'DISTANCE'
  | 'BREAKER_FAILURE'
  | 'GENERIC';

// Detect device type from name
export function detectDeviceType(name: string): DeviceType {
  const n = name.toUpperCase();
  if ((n.includes('DISTANCE') || n.includes('DIST')) && (n.includes('DIFFERENTIAL') || n.includes('DIFF'))) {
    return 'DISTANCE_DIFFERENTIAL';
  }
  if (n.includes('DISTANCE') || n.includes('DIST')) return 'DISTANCE';
  if (n.includes('DIFFERENTIAL') || n.includes('DIFF')) return 'DIFFERENTIAL';
  if (n.includes('BB') || n.includes('BF') || n.includes('BUSBAR') || n.includes('BREAKER FAIL')) {
    return 'BUSBAR_BREAKER_FAILURE';
  }
  if (n.includes('BCPU') || n.includes('OC') || n.includes('EF') || n.includes('OVERCURRENT')) {
    return 'OVERCURRENT_PROTECTION';
  }
  if (n.includes('AMMETER') || n.includes('METER') || n.includes('FRER')) {
    return 'METERING';
  }
  return 'GENERIC';
}

function parseNum(val: string | undefined): number {
  if (!val || val === 'N/A' || val === '-') return 0;
  // Match the FIRST numeric token only (handles "31.5kA/3sec" → 31.5, "33kV" → 33, "0.20" → 0.2)
  const match = val.match(/^[^0-9]*([+-]?\d+\.?\d*)/);
  if (!match) return 0;
  const n = parseFloat(match[1]);
  return isNaN(n) ? 0 : n;
}

// Calculate lead resistance from system parameters
// Excel stores lead length in METRES; resistance in Ω/km
function calcLeadResistance(sys: SystemParameters): number {
  let rl = 0;

  const len1m  = parseNum(sys.lead_length_vt_to_relay_1);  // metres
  const res1   = parseNum(sys.resistance_w_km_20c_1);       // Ω/km
  if (len1m > 0 && res1 > 0) {
    rl += (len1m / 1000) * res1;   // convert m → km then × Ω/km
  }

  const len2m  = parseNum(sys.lead_length_vt_to_relay_2);
  const res2   = parseNum(sys.resistance_w_km_20c_2);
  if (len2m > 0 && res2 > 0) {
    rl += (len2m / 1000) * res2;
  }

  // Fallback only when NOTHING is available
  return rl > 0 ? rl : 0.1;
}

// Main per-device calculation function
export function calculateDeviceCTAdequacy(
  device: DeviceInput,
  deviceIndex: number,
  sys: SystemParameters
): DeviceResult {
  const deviceType = detectDeviceType(device.device_name);

  // --- Parse CT parameters from device — use EXACTLY what Excel provided ---
  const ctRatioStr = (device.ct_ratio && device.ct_ratio !== 'N/A') ? device.ct_ratio : null;
  let Ipn = 0, Isn = 0;
  if (ctRatioStr) {
    const ctParts = ctRatioStr.replace(/A$/i, '').split('/');
    if (ctParts.length === 2) {
      Ipn = parseNum(ctParts[0]);
      Isn = parseNum(ctParts[1]);
    }
  }
  const Rct = parseNum(device.ct_resistance);
  const Vk  = parseNum(device.vk_knee_point_voltage);
  const Sr  = parseNum(device.burden);
  const Io  = parseNum(device.magnetizing_current) / 1000; // mA → A

  // --- Parse system parameters ---
  const freq     = parseNum(sys.system_frequency) || 50;
  const Vbus     = parseNum(sys.bus_voltage_level) || 33;  // kV

  // Parse bus fault level — handles "31.5kA/3sec", "31500A", "31.5" etc.
  // parseNum already takes the FIRST number, so "31.5kA/3sec" → 31.5
  const faultRaw = sys.bus_fault_level || '';
  const faultNum = parseNum(faultRaw);
  // If value looks like it's in kA (< 500), multiply ×1000 to get Amperes
  const Ikmax_kA = faultNum < 500 ? faultNum : faultNum / 1000;
  const Ikmax    = Ikmax_kA * 1000;   // always in Amperes for calculation

  const r1       = parseNum(sys.positive_seq_resistance_r1);
  const x1       = parseNum(sys.positive_seq_reactance_z1);
  const r0       = parseNum(sys.negative_seq_resistance_r0);
  const x0       = parseNum(sys.negative_seq_reactance_z0);
  const routeLen = parseNum(sys.route_length);             // km
  const Rl       = calcLeadResistance(sys);

  // Phase voltage
  const Vph = (Vbus * 1e3) / Math.sqrt(3);

  // Source impedance
  const Zs = Ikmax > 0 ? Vph / Ikmax : 0.001;

  // X/R ratio (standard values by voltage level)
  const xr = Vbus >= 110 ? 40 : Vbus >= 33 ? 15 : 10;
  const Rs = Zs / Math.sqrt(1 + xr * xr);
  const Xs = Rs * xr;

  // Cable impedances
  const Z1r = r1 * routeLen;
  const Z1x = x1 * routeLen;
  const Z0r = r0 * routeLen;
  const Z0x = x0 * routeLen;

  // Zone 1 endzone fault currents (80% reach)
  const reach = 0.8;
  const Z1z_r = Rs + reach * Z1r;
  const Z1z_x = Xs + reach * Z1x;
  const Z0z_r = Rs + reach * Z0r;
  const Z0z_x = Xs + reach * Z0x;

  const Zthr_3ph   = Math.sqrt((Rs + Z1r) ** 2 + (Xs + Z1x) ** 2);
  const Itmax_3ph  = Vph / Zthr_3ph;

  const Z1z   = Math.sqrt(Z1z_r ** 2 + Z1z_x ** 2);
  const Ik_z1_3ph = Vph / Z1z;

  // 1-phase fault (sequence network)
  const Zseq_r = Z1z_r + Z1z_r + Z0z_r; // Z1 + Z2 + Z0 (Z1=Z2)
  const Zseq_x = Z1z_x + Z1z_x + Z0z_x;
  const Zseq   = Math.sqrt(Zseq_r ** 2 + Zseq_x ** 2);
  const Ik_z1_1ph = Zseq > 0 ? (3 * Vph) / Zseq : 0;

  // ratio — guard against division by zero if CT ratio wasn't in Excel
  const ratio = (Ipn > 0 && Isn > 0) ? Isn / Ipn : 0;

  // If critical inputs are missing, return a clear error result
  if (Ipn === 0 || Isn === 0) {
    return {
      device_name:  device.device_name,
      device_index: deviceIndex,
      device_type:  deviceType,
      verdict:      'NOT APPLICABLE',
      vk_available: Vk,
      vk_required:  0,
      ealreq_max:   0,
      vk_breakdown: [],
      intermediates: { 'ERROR': `CT Ratio missing or invalid ("${device.ct_ratio}"). Cannot calculate.` },
      inputs: {
        ct_ratio_primary: Ipn, ct_ratio_secondary: Isn, accuracy_class: device.accuracy_class || 'N/A',
        rct: Rct, lead_resistance: 0, relay_burden_va: Sr,
        frequency: freq, bus_voltage_kv: Vbus, max_bus_fault_kA: Ikmax_kA,
        r1, x1, r0, x0, route_length_km: routeLen,
      },
    };
  }

  // Burden calculation
  const Rb     = Isn > 0 ? Sr / (Isn * Isn) : 0;
  const burden = Rct + Rl + Rb;

  const intermediates: Record<string, number | string> = {
    'CT Ratio (Ipn/Isn)':               `${Ipn}/${Isn}`,
    'Rct (Ω)':                          Rct,
    'Rl - Lead Resistance (Ω)':         +Rl.toFixed(4),
    'Sr - Relay Burden (VA)':           Sr,
    'Sr/Isn² = Rb (Ω)':                +Rb.toFixed(4),
    'Total Burden (Rct+Rl+Rb) (Ω)':    +burden.toFixed(4),
    'Isn/Ipn ratio':                    +ratio.toFixed(6),
    'Vbus (kV)':                        Vbus,
    'Ikmax at bus (A)':                 +Ikmax.toFixed(1),
    'X/R ratio':                        xr,
    'Rs (Ω)':                           +Rs.toFixed(4),
    'Xs (Ω)':                           +Xs.toFixed(4),
    'Route length (km)':                routeLen,
    'Ik zone1 3ph (A)':                 +Ik_z1_3ph.toFixed(1),
    'Ik zone1 1ph (A)':                 +Ik_z1_1ph.toFixed(1),
  };

  const vk_breakdown: VkBreakdownEntry[] = [];

  // ── Device-type-specific formulas ──────────────────────────────────────────

  if (deviceType === 'DISTANCE_DIFFERENTIAL') {
    // Distance formulas
    const eal_ci   = Ikmax     * ratio * burden;
    const eal_e3ph = Ik_z1_3ph * ratio * burden;
    const eal_e1ph = Ik_z1_1ph * ratio * burden;
    vk_breakdown.push(
      {
        label: 'Distance - Close-in fault',
        formula: `Ikmax × (Isn/Ipn) × (Rct+Rl+Rb) = ${Ikmax.toFixed(0)} × ${ratio.toFixed(6)} × ${burden.toFixed(4)}`,
        ealreq: +eal_ci.toFixed(2), vk: +(eal_ci * 0.8).toFixed(2), isMax: false
      },
      {
        label: 'Distance - Endzone 3-phase fault',
        formula: `Ik_z1_3ph × (Isn/Ipn) × (Rct+Rl+Rb) = ${Ik_z1_3ph.toFixed(0)} × ${ratio.toFixed(6)} × ${burden.toFixed(4)}`,
        ealreq: +eal_e3ph.toFixed(2), vk: +(eal_e3ph * 0.8).toFixed(2), isMax: false
      },
      {
        label: 'Distance - Endzone 1-phase fault',
        formula: `Ik_z1_1ph × (Isn/Ipn) × (Rct+Rl+Rb) = ${Ik_z1_1ph.toFixed(0)} × ${ratio.toFixed(6)} × ${burden.toFixed(4)}`,
        ealreq: +eal_e1ph.toFixed(2), vk: +(eal_e1ph * 0.8).toFixed(2), isMax: false
      },
    );
    // Differential formulas
    const eal_diff_ci = Ikmax * ratio * burden;
    const eal_diff_th = 2 * Ikmax * ratio * burden;
    vk_breakdown.push(
      {
        label: 'Differential - Close-in (k=1)',
        formula: `Ikmax × (Isn/Ipn) × (Rct+Rl+Rb) = ${Ikmax.toFixed(0)} × ${ratio.toFixed(6)} × ${burden.toFixed(4)}`,
        ealreq: +eal_diff_ci.toFixed(2), vk: +(eal_diff_ci * 0.8).toFixed(2), isMax: false
      },
      {
        label: 'Differential - Through fault (k=2)',
        formula: `2 × Ikmax × (Isn/Ipn) × (Rct+Rl+Rb) = 2 × ${Ikmax.toFixed(0)} × ${ratio.toFixed(6)} × ${burden.toFixed(4)}`,
        ealreq: +eal_diff_th.toFixed(2), vk: +(eal_diff_th * 0.8).toFixed(2), isMax: false
      },
    );

  } else if (deviceType === 'DISTANCE') {
    const eal_ci   = Ikmax     * ratio * burden;
    const eal_e3ph = Ik_z1_3ph * ratio * burden;
    const eal_e1ph = Ik_z1_1ph * ratio * burden;
    vk_breakdown.push(
      { label: 'Close-in fault', formula: `Ikmax × (Isn/Ipn) × burden`, ealreq: +eal_ci.toFixed(2), vk: +(eal_ci * 0.8).toFixed(2), isMax: false },
      { label: 'Endzone 3-phase fault', formula: `Ik_z1_3ph × (Isn/Ipn) × burden`, ealreq: +eal_e3ph.toFixed(2), vk: +(eal_e3ph * 0.8).toFixed(2), isMax: false },
      { label: 'Endzone 1-phase fault', formula: `Ik_z1_1ph × (Isn/Ipn) × burden`, ealreq: +eal_e1ph.toFixed(2), vk: +(eal_e1ph * 0.8).toFixed(2), isMax: false },
    );

  } else if (deviceType === 'DIFFERENTIAL') {
    const eal_ci = Ikmax * ratio * burden;
    const eal_th = 2 * Ikmax * ratio * burden;
    vk_breakdown.push(
      { label: 'Close-in fault (k=1)', formula: `Ikmax × (Isn/Ipn) × burden`, ealreq: +eal_ci.toFixed(2), vk: +(eal_ci * 0.8).toFixed(2), isMax: false },
      { label: 'Through fault (k=2)',  formula: `2 × Ikmax × (Isn/Ipn) × burden`, ealreq: +eal_th.toFixed(2), vk: +(eal_th * 0.8).toFixed(2), isMax: false },
    );

  } else if (deviceType === 'BUSBAR_BREAKER_FAILURE') {
    const eal_bf = 5 * Ikmax * ratio * burden;
    vk_breakdown.push(
      {
        label: 'Breaker Failure (k=5)',
        formula: `5 × Ikmax × (Isn/Ipn) × (Rct+Rl+Rb) = 5 × ${Ikmax.toFixed(0)} × ${ratio.toFixed(6)} × ${burden.toFixed(4)}`,
        ealreq: +eal_bf.toFixed(2), vk: +(eal_bf * 0.8).toFixed(2), isMax: false
      },
    );
    intermediates['Iop (A)'] = +Ikmax.toFixed(1);

  } else if (deviceType === 'OVERCURRENT_PROTECTION') {
    // OC/EF relay - uses close-in and endzone formulas
    const eal_ci   = Ikmax     * ratio * burden;
    const eal_e3ph = Ik_z1_3ph * ratio * burden;
    vk_breakdown.push(
      { label: 'Close-in fault (OC)', formula: `Ikmax × (Isn/Ipn) × burden`, ealreq: +eal_ci.toFixed(2), vk: +(eal_ci * 0.8).toFixed(2), isMax: false },
      { label: 'Endzone 3ph (EF)',    formula: `Ik_z1_3ph × (Isn/Ipn) × burden`, ealreq: +eal_e3ph.toFixed(2), vk: +(eal_e3ph * 0.8).toFixed(2), isMax: false },
    );

  } else if (deviceType === 'METERING') {
    // Metering devices use accuracy class, not knee point voltage
    // For metering class CTs, adequacy is based on accuracy class compliance
    const eal_ci = Ikmax * ratio * burden;
    vk_breakdown.push(
      {
        label: 'Metering accuracy check',
        formula: `Ikmax × (Isn/Ipn) × burden (Accuracy Class: ${device.accuracy_class || 'N/A'})`,
        ealreq: +eal_ci.toFixed(2), vk: +(eal_ci * 0.8).toFixed(2), isMax: true
      },
    );

  } else {
    // GENERIC - apply standard distance formula
    const eal_ci = Ikmax * ratio * burden;
    vk_breakdown.push(
      { label: 'Generic - Close-in fault', formula: `Ikmax × (Isn/Ipn) × burden`, ealreq: +eal_ci.toFixed(2), vk: +(eal_ci * 0.8).toFixed(2), isMax: false },
    );
  }

  // Mark the entry with highest ealreq
  const ealreq_max = vk_breakdown.length > 0
    ? Math.max(...vk_breakdown.map(v => v.ealreq))
    : 0;
  vk_breakdown.forEach(v => { v.isMax = v.ealreq === ealreq_max; });

  intermediates['Ealreq max (V)'] = +ealreq_max.toFixed(2);

  // Vk required = Ealreq_max × 0.8 (safety factor)
  const vk_required = +(ealreq_max * 0.8).toFixed(2);

  // Verdict
  let verdict: DeviceResult['verdict'];
  if (deviceType === 'METERING') {
    // Metering CTs don't use Vk — not applicable
    verdict = Vk > 0 ? (Vk >= vk_required ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED') : 'NOT APPLICABLE';
  } else {
    verdict = Vk > 0
      ? (Vk >= vk_required ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED')
      : 'NOT APPLICABLE';
  }

  return {
    device_name:   device.device_name,
    device_index:  deviceIndex,
    device_type:   deviceType,
    verdict,
    vk_available:  Vk,
    vk_required,
    ealreq_max:    +ealreq_max.toFixed(2),
    vk_breakdown,
    intermediates,
    inputs: {
      ct_ratio_primary:   Ipn,
      ct_ratio_secondary: Isn,
      accuracy_class:     device.accuracy_class || 'N/A',
      rct:                Rct,
      lead_resistance:    +Rl.toFixed(4),
      relay_burden_va:    Sr,
      frequency:          freq,
      bus_voltage_kv:     Vbus,
      max_bus_fault_kA:   Ikmax_kA,
      r1, x1, r0, x0,
      route_length_km:    routeLen,
    },
  };
}

// Run calculations for ALL devices from Excel
export function calculateAllDevices(
  devices: DeviceInput[],
  sys: SystemParameters
): DeviceResult[] {
  return devices.map((device, index) =>
    calculateDeviceCTAdequacy(device, index, sys)
  );
}

// Legacy compatibility — kept so existing computation pages don't break
export interface Sheet1Inputs {
  ct_ratio_primary: number; ct_ratio_secondary: number; accuracy_class: string;
  rct: number; vk_available: number; io_at_vk: number;
  ct_type?: 'wound' | 'bar' | 'window'; insulation_level?: number; temperature_rise?: number;
}
export interface Sheet2Inputs {
  frequency: number; bus_voltage_kv: number; max_bus_fault_mva: number;
  r1: number; x1: number; r0: number; x0: number;
  route_length_km: number; relay_burden_va: number; lead_resistance: number;
  standard?: 'IEC' | 'IEEE' | 'ANSI'; safety_factor?: number; ambient_temp?: number; altitude?: number;
}
export interface CTAdequacyResult {
  verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  ealreq_max: number; vk_required: number; vk_available: number;
  vk_breakdown: { label: string; ealreq: number; vk: number; isMax: boolean; ealreq_ikmax?: number; }[];
  intermediates: Record<string, number | string>;
}
export function calculateCTAdequacy(iedType: string, s1: Sheet1Inputs, s2: Sheet2Inputs): CTAdequacyResult {
  const device: DeviceInput = {
    device_name: iedType,
    ct_ratio: `${s1.ct_ratio_primary}/${s1.ct_ratio_secondary}A`,
    accuracy_class: s1.accuracy_class,
    ct_resistance: String(s1.rct),
    vk_knee_point_voltage: String(s1.vk_available),
    magnetizing_current: String(s1.io_at_vk * 1000),
    burden: String(s2.relay_burden_va),
  };
  const sys: SystemParameters = {
    bus_fault_level: String(s2.max_bus_fault_mva / (Math.sqrt(3) * s2.bus_voltage_kv) * 1000),
    system_frequency: String(s2.frequency),
    bus_voltage_level: `${s2.bus_voltage_kv}kV`,
    xr_ratio: 'N/A',
    route_length: String(s2.route_length_km),
    positive_seq_resistance_r1: String(s2.r1),
    positive_seq_reactance_z1: String(s2.x1),
    negative_seq_resistance_r0: String(s2.r0),
    negative_seq_reactance_z0: String(s2.x0),
    lead_length_vt_to_relay_1: String(s2.lead_resistance * 1000),
    resistance_w_km_20c_1: '1',
  };
  const res = calculateDeviceCTAdequacy(device, 0, sys);
  return {
    verdict: res.verdict === 'NOT APPLICABLE' ? 'UNDER DIMENSIONED' : res.verdict,
    ealreq_max: res.ealreq_max,
    vk_required: res.vk_required,
    vk_available: res.vk_available,
    vk_breakdown: res.vk_breakdown.map(v => ({ ...v, ealreq_ikmax: undefined })),
    intermediates: res.intermediates,
  };
}
