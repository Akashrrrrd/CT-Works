// VT Adequacy Calculation Engine
// Based on IEC 61869-3 and voltage transformer burden analysis

export interface VTInputs {
  vt_ratio_primary: number;     // Primary voltage — V
  vt_ratio_secondary: number;   // Secondary voltage — V
  accuracy_class: string;       // e.g. 3P, 1, 0.5
  burden_va: number;            // Rated burden — VA
  relay_burden_va: number;      // Relay burden — VA
  lead_burden_va: number;       // Lead/cable burden — VA
  metering_burden_va: number;   // Metering burden — VA
  bus_voltage_kv: number;       // System voltage — kV
  frequency: number;            // System frequency — Hz
}

export interface VTAdequacyResult {
  verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  total_burden_va: number;
  rated_burden_va: number;
  burden_pct: number;
  burden_margin_va: number;
  intermediates: Record<string, number | string>;
}

export function calculateVTAdequacy(inputs: VTInputs): VTAdequacyResult {
  const {
    vt_ratio_primary,
    vt_ratio_secondary,
    accuracy_class,
    burden_va,
    relay_burden_va,
    lead_burden_va,
    metering_burden_va,
    bus_voltage_kv,
    frequency
  } = inputs;

  // ── Step 1: Calculate total connected burden ──────────────────────────────
  const total_burden_va = relay_burden_va + lead_burden_va + metering_burden_va;

  // ── Step 2: Determine rated burden from nameplate ────────────────────────
  const rated_burden_va = burden_va;

  // ── Step 3: Calculate burden utilization percentage ──────────────────────
  const burden_pct = Math.round((total_burden_va / rated_burden_va) * 100);

  // ── Step 4: Calculate burden margin ──────────────────────────────────────
  const burden_margin_va = rated_burden_va - total_burden_va;

  // ── Step 5: Determine adequacy verdict ───────────────────────────────────
  const verdict: VTAdequacyResult['verdict'] = 
    total_burden_va <= rated_burden_va ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';

  // ── Step 6: Calculate intermediate values ────────────────────────────────
  const vt_ratio = vt_ratio_primary / vt_ratio_secondary;
  const secondary_current_a = total_burden_va / vt_ratio_secondary;
  const power_factor = 0.8; // Typical power factor for VT burdens
  const impedance_secondary = Math.pow(vt_ratio_secondary, 2) / total_burden_va;

  // Accuracy class factor (simplified)
  let accuracy_factor = 1.0;
  switch (accuracy_class.toLowerCase()) {
    case '0.1': accuracy_factor = 0.1; break;
    case '0.2': accuracy_factor = 0.2; break;
    case '0.5': accuracy_factor = 0.5; break;
    case '1': accuracy_factor = 1.0; break;
    case '3p': accuracy_factor = 3.0; break;
    case '6p': accuracy_factor = 6.0; break;
    default: accuracy_factor = 1.0;
  }

  const intermediates: Record<string, number | string> = {
    'VT Ratio': `${vt_ratio_primary}:${vt_ratio_secondary}`,
    'VT Ratio (numeric)': +vt_ratio.toFixed(2),
    'Relay Burden (VA)': relay_burden_va,
    'Lead Burden (VA)': lead_burden_va,
    'Metering Burden (VA)': metering_burden_va,
    'Total Burden (VA)': +total_burden_va.toFixed(2),
    'Rated Burden (VA)': rated_burden_va,
    'Burden Utilization (%)': burden_pct,
    'Secondary Current (A)': +secondary_current_a.toFixed(3),
    'Secondary Impedance (Ω)': +impedance_secondary.toFixed(2),
    'Accuracy Class': accuracy_class,
    'Accuracy Factor (%)': accuracy_factor,
    'Power Factor': power_factor,
    'System Frequency (Hz)': frequency,
    'System Voltage (kV)': bus_voltage_kv
  };

  return {
    verdict,
    total_burden_va: +total_burden_va.toFixed(2),
    rated_burden_va,
    burden_pct,
    burden_margin_va: +burden_margin_va.toFixed(2),
    intermediates
  };
}

// Additional VT adequacy checks for specific applications
export function calculateVTAccuracyCheck(
  inputs: VTInputs,
  application: 'metering' | 'protection' | 'general'
): {
  accuracy_adequate: boolean;
  burden_adequate: boolean;
  overall_adequate: boolean;
  recommendations: string[];
} {
  const result = calculateVTAdequacy(inputs);
  const recommendations: string[] = [];

  // Check accuracy requirements based on application
  let accuracy_adequate = true;
  const accuracy_class = inputs.accuracy_class.toLowerCase();

  switch (application) {
    case 'metering':
      // Metering requires high accuracy (typically 0.1, 0.2, or 0.5)
      if (!['0.1', '0.2', '0.5'].includes(accuracy_class)) {
        accuracy_adequate = false;
        recommendations.push('Consider higher accuracy class VT for metering application (0.1, 0.2, or 0.5)');
      }
      break;
    
    case 'protection':
      // Protection can use lower accuracy (typically 3P or 6P)
      if (!['3p', '6p', '1', '0.5'].includes(accuracy_class)) {
        recommendations.push('Verify accuracy class is suitable for protection application');
      }
      break;
    
    case 'general':
      // General purpose - most accuracy classes acceptable
      break;
  }

  // Check burden adequacy
  const burden_adequate = result.verdict === 'SUITABLY DIMENSIONED';

  if (!burden_adequate) {
    recommendations.push('VT burden is exceeded - consider higher rated burden VT or reduce connected loads');
  }

  if (result.burden_pct > 80) {
    recommendations.push('VT burden utilization is high (>80%) - consider margin for future loads');
  }

  // Overall adequacy
  const overall_adequate = accuracy_adequate && burden_adequate;

  if (inputs.frequency !== 50 && inputs.frequency !== 60) {
    recommendations.push('Verify VT is rated for the system frequency');
  }

  return {
    accuracy_adequate,
    burden_adequate,
    overall_adequate,
    recommendations
  };
}

// VT thermal check (simplified)
export function calculateVTThermalCheck(
  inputs: VTInputs,
  ambient_temp_c: number = 40,
  altitude_m: number = 1000
): {
  thermal_adequate: boolean;
  temperature_rise_c: number;
  derating_factor: number;
  max_continuous_burden_va: number;
} {
  const base_result = calculateVTAdequacy(inputs);
  
  // Altitude derating (simplified)
  let altitude_derating = 1.0;
  if (altitude_m > 1000) {
    altitude_derating = 1.0 - ((altitude_m - 1000) / 10000) * 0.1; // 1% per 100m above 1000m
  }

  // Temperature derating (simplified)
  let temp_derating = 1.0;
  if (ambient_temp_c > 40) {
    temp_derating = 1.0 - ((ambient_temp_c - 40) / 100) * 0.2; // 2% per 10°C above 40°C
  }

  const derating_factor = altitude_derating * temp_derating;
  const max_continuous_burden_va = inputs.burden_va * derating_factor;

  // Estimate temperature rise (simplified)
  const load_factor = base_result.total_burden_va / max_continuous_burden_va;
  const temperature_rise_c = 65 * Math.pow(load_factor, 1.6); // Typical VT temperature rise curve

  const thermal_adequate = base_result.total_burden_va <= max_continuous_burden_va;

  return {
    thermal_adequate,
    temperature_rise_c: +temperature_rise_c.toFixed(1),
    derating_factor: +derating_factor.toFixed(3),
    max_continuous_burden_va: +max_continuous_burden_va.toFixed(2)
  };
}