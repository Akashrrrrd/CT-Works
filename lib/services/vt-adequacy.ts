// VT Adequacy Calculation Engine
// Based on IEC 61869-3 and relay manufacturer application guides

export interface VTInputs {
  // VT nameplate
  vt_ratio_primary:   number;  // Vpn — V (line-to-line)
  vt_ratio_secondary: number;  // Vsn — V
  accuracy_class:     string;  // e.g. 3P, 6P
  burden_va:          number;  // Rated burden — VA
  // Connected burden
  relay_burden_va:    number;  // Relay burden — VA
  lead_burden_va:     number;  // Lead/cable burden — VA
  metering_burden_va: number;  // Metering burden — VA
  // System
  bus_voltage_kv:     number;  // System voltage — kV
  frequency:          number;  // Hz
}

export interface VTAdequacyResult {
  verdict:          'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  total_burden_va:  number;
  rated_burden_va:  number;
  burden_margin_va: number;
  burden_pct:       number;   // % of rated burden used
  vt_ratio:         number;   // actual ratio
  intermediates:    Record<string, number | string>;
}

export function calculateVTAdequacy(inputs: VTInputs): VTAdequacyResult {
  const {
    vt_ratio_primary, vt_ratio_secondary, burden_va,
    relay_burden_va, lead_burden_va, metering_burden_va,
  } = inputs;

  // Total connected burden
  const total_burden_va = relay_burden_va + lead_burden_va + metering_burden_va;

  // VT ratio
  const vt_ratio = vt_ratio_primary / vt_ratio_secondary;

  // Burden margin
  const burden_margin_va = burden_va - total_burden_va;
  const burden_pct       = +((total_burden_va / burden_va) * 100).toFixed(1);

  // Verdict — VT is adequate if total burden ≤ rated burden
  const verdict: VTAdequacyResult['verdict'] =
    total_burden_va <= burden_va ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';

  const intermediates: Record<string, number | string> = {
    'VT Ratio':                  `${vt_ratio_primary}/${vt_ratio_secondary}`,
    'Rated Burden (VA)':         burden_va,
    'Relay Burden (VA)':         relay_burden_va,
    'Lead Burden (VA)':          lead_burden_va,
    'Metering Burden (VA)':      metering_burden_va,
    'Total Connected Burden (VA)': +total_burden_va.toFixed(2),
    'Burden Margin (VA)':        +burden_margin_va.toFixed(2),
    'Burden Utilisation (%)':    burden_pct,
  };

  return { verdict, total_burden_va: +total_burden_va.toFixed(2), rated_burden_va: burden_va, burden_margin_va: +burden_margin_va.toFixed(2), burden_pct, vt_ratio, intermediates };
}
