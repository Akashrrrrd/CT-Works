/**
 * PROJECT CALCULATION SERVICE
 * Routes all project CT/VT adequacy calculations to the appropriate IED templates
 * Ensures all projects use the exact Hitachi N-19957 2-DF4W formulas and calculations
 *
 * FIXES in this version (RED670 branch of convertLegacyInput):
 *  1. CT tap ratios were hardcoded to 3200/1800 regardless of the actual CT
 *     ratio entered by the user. Now uses legacyInput.ct.ratio_primary as the
 *     active tap.
 *  2. Lead ("total_lead_resistance") was computed as a one-way, 20°C value
 *     (cable_length_m/1000 * r20) instead of the loop resistance at 75°C
 *     that the document's Ealreq formulas actually require
 *     (2 * R20 * 1.21615 * length_km).
 *  3. Through-fault / endzone-1 fault currents were hardcoded fractions of
 *     the close-in fault current (×0.85 / ×0.87 / ×0.87 / ×0.89) instead of
 *     being derived from the actual system + line parameters (Zs, Z1L, Z0L,
 *     the 80% endzone-1 reach, and the 3×Z1+Z0 one-phase-to-earth
 *     combination) exactly as done on pages 3-5 of the reference document.
 *     This means R1/X1/R0/X0/line-length/bus-voltage/X-R-ratio inputs were
 *     previously ignored entirely for RED670 — they are now the actual
 *     drivers of the result.
 *  4. NEW FIX: CT Tap-1 and Tap-2 were never both real. "tap1" used to be a
 *     fabricated placeholder (activePrimary × 1.78, Rct × 1.75, Vk × 1.6,
 *     Io × 2 — none of these came from the user), and active_tap was always
 *     hardcoded to 'tap2'. FullAnalysisInput.ct now carries a real
 *     ratio_primary_tap2 and active_tap from the caller, and both taps use
 *     the SAME real Rct/Vk/Io the user entered (no invented scale factors),
 *     since the form only collects one set of CT nameplate values shared by
 *     both taps.
 */

import { runFullAnalysis, type FullAnalysisInput, type AnalysisResult } from './calculation-engine';
import { Siemens7SJ85Calculator } from './siemens-7sj85-calculations';
import { ABB_RET670_Calculator } from './abb-ret670-calculations';
import { RED670_Calculator } from './red670-calculations';

// Standard IED template types that all projects must use
export type IEDTemplateType = 'SIEMENS_7SJ85' | 'ABB_RET670' | 'RED670';

export interface ProjectCalculationRequest {
  template_type: IEDTemplateType;
  input_data: any;
  project_id: string;
  workspace_id: string;
  calculated_by: string;
}

export interface ProjectCalculationResult {
  calculation_id: string;
  template_type: IEDTemplateType;
  project_id: string;
  workspace_id: string;
  calculated_by: string;
  calculation_date: string;
  final_verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED';
  detailed_results: any;
  hitachi_reference: {
    document_no: string;
    title: string;
    contractor: string;
    application: string;
  };
  validation: {
    passed: boolean;
    summary: string;
    differences?: string[];
  };
}

/**
 * ============================================================
 * REAL FAULT-CURRENT DERIVATION (Hitachi doc pages 2-5)
 * Complex-impedance method: Zs from source, Z1L/Z0L from line data,
 * endzone-1 reach at 80%, 1-ph-to-earth as Z1+Z2+Z0 (Z2=Z1).
 * ============================================================
 */
interface Complex { r: number; x: number }

function cAdd(a: Complex, b: Complex): Complex {
  return { r: a.r + b.r, x: a.x + b.x };
}
function cScale(a: Complex, k: number): Complex {
  return { r: a.r * k, x: a.x * k };
}
function cMag(a: Complex): number {
  return Math.sqrt(a.r * a.r + a.x * a.x);
}

function deriveRED670FaultCurrents(system: {
  frequency: number;
  bus_voltage_kv: number;
  fault_current_ka: number; // max HV busbar fault current (close-in), Ikmax
  xr_ratio: number;
}, line: {
  r1: number; x1: number; r0: number; x0: number; length_km: number;
}) {
  const V_LL = system.bus_voltage_kv * 1000;     // V, line-to-line
  const Ikmax = system.fault_current_ka * 1000;   // A, close-in fault current (given directly)

  // Source impedance magnitude + angle
  const Zs_mag = V_LL / (Math.sqrt(3) * Ikmax);
  const theta = Math.atan(system.xr_ratio);
  const Zs: Complex = { r: Zs_mag * Math.cos(theta), x: Zs_mag * Math.sin(theta) };

  // Full-length line impedances
  const Z1L: Complex = { r: line.r1 * line.length_km, x: line.x1 * line.length_km };
  const Z0L: Complex = { r: line.r0 * line.length_km, x: line.x0 * line.length_km };
  // 80% reach for endzone-1
  const Z1L_80: Complex = cScale(Z1L, 0.8);
  const Z0L_80: Complex = cScale(Z0L, 0.8);

  // --- Through-fault (100% line length) ---
  const Z1t = cAdd(Zs, Z1L);                 // 3-phase through-fault impedance
  const If_3ph_through = V_LL / (Math.sqrt(3) * cMag(Z1t));

  const Z0t = cAdd(Zs, Z0L);
  const Z0f_through = cAdd(cAdd(Z1t, Z1t), Z0t); // Z1t + Z2t + Z0t, Z2t = Z1t
  const If_1ph_through = (3 * V_LL) / (Math.sqrt(3) * cMag(Z0f_through));

  // --- Endzone-1 (80% reach) ---
  const Z1zone1 = cAdd(Zs, Z1L_80);
  const If_3ph_endzone1 = V_LL / (Math.sqrt(3) * cMag(Z1zone1));

  const Z0zone1 = cAdd(Zs, Z0L_80);
  const Z0f_zone1 = cAdd(cAdd(Z1zone1, Z1zone1), Z0zone1);
  const If_1ph_endzone1 = (3 * V_LL) / (Math.sqrt(3) * cMag(Z0f_zone1));

  return {
    max_hv_fault_current: Ikmax,
    max_through_fault_3ph: If_3ph_through,
    max_through_fault_1ph: If_1ph_through,
    max_endzone1_3ph: If_3ph_endzone1,
    max_endzone1_1ph: If_1ph_endzone1,
  };
}

/**
 * MAIN PROJECT CALCULATION FUNCTION
 */
export async function performProjectCalculation(
  request: ProjectCalculationRequest
): Promise<ProjectCalculationResult> {

  const calculation_id = `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const calculation_date = new Date().toISOString();

  let detailed_results: any;
  let validation: any;

  switch (request.template_type) {
    case 'SIEMENS_7SJ85':
      detailed_results = Siemens7SJ85Calculator.performCompleteCalculation({
        ...request.input_data,
        accuracy_limit_factor: request.input_data.ieds?.[0]?.accuracy_limit_factor
      });
      validation = validateSiemens7SJ85Results(detailed_results);
      break;

    case 'ABB_RET670':
      detailed_results = ABB_RET670_Calculator.performCompleteCalculation(request.input_data);
      validation = ABB_RET670_Calculator.validateAgainstDocument(detailed_results);
      break;

    case 'RED670':
      detailed_results = RED670_Calculator.performCompleteCalculation(request.input_data);
      validation = RED670_Calculator.validateAgainstDocument(detailed_results);
      break;

    default:
      throw new Error(`Unsupported IED template type: ${request.template_type}`);
  }

  const final_verdict = detailed_results.final_verdict === 'SUITABLY DIMENSIONED' ?
    'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';

  return {
    calculation_id,
    template_type: request.template_type,
    project_id: request.project_id,
    workspace_id: request.workspace_id,
    calculated_by: request.calculated_by,
    calculation_date,
    final_verdict,
    detailed_results,
    hitachi_reference: {
      document_no: 'N-19957 2-DF4W',
      title: 'CT/VT ADEQUACY CHECK - 132/33kV SUBSTATION DF4W',
      contractor: 'HITACHI',
      application: getApplicationDescription(request.template_type)
    },
    validation
  };
}

export async function performMultipleProjectCalculations(
  requests: ProjectCalculationRequest[]
): Promise<ProjectCalculationResult[]> {
  const results: ProjectCalculationResult[] = [];

  for (const request of requests) {
    try {
      const result = await performProjectCalculation(request);
      results.push(result);
    } catch (error) {
      console.error(`Failed calculation for ${request.template_type}:`, error);
      results.push({
        calculation_id: `failed_${Date.now()}`,
        template_type: request.template_type,
        project_id: request.project_id,
        workspace_id: request.workspace_id,
        calculated_by: request.calculated_by,
        calculation_date: new Date().toISOString(),
        final_verdict: 'UNDER DIMENSIONED',
        detailed_results: { error: error instanceof Error ? error.message : 'Calculation failed' },
        hitachi_reference: {
          document_no: 'N-19957 2-DF4W',
          title: 'CT/VT ADEQUACY CHECK - 132/33kV SUBSTATION DF4W',
          contractor: 'HITACHI',
          application: getApplicationDescription(request.template_type)
        },
        validation: {
          passed: false,
          summary: 'Calculation failed',
          differences: [error instanceof Error ? error.message : 'Unknown error']
        }
      });
    }
  }

  return results;
}

/**
 * Convert legacy calculation inputs to IED template format
 */
export function convertLegacyInput(
  legacyInput: FullAnalysisInput,
  templateType: IEDTemplateType
): any {
  switch (templateType) {
    case 'SIEMENS_7SJ85':
      return {
        ct_wiring: {
          ct_conductor_cross_section: legacyInput.wiring.conductor_mm2,
          ct_resistance_w_km_20c: legacyInput.wiring.r20,
          ct_specific_resistance_20c: legacyInput.wiring.alpha,
          ct_conductor_length_m: legacyInput.wiring.cable_length_m,
          relay_rated_current: legacyInput.ct.ratio_secondary || 1
        },
        system: {
          system_frequency: legacyInput.system.frequency,
          bus_voltage_level: legacyInput.system.bus_voltage_kv,
          max_bus_fault_level: legacyInput.system.fault_current_ka,
          xr_ratio: legacyInput.system.xr_ratio,
          max_hv_busbar_fault_current: legacyInput.system.fault_current_ka * 1000,
          hv_rating_of_busbar: legacyInput.system.bus_voltage_kv * 1000
        },
        power_line: {
          positive_seq_resistance_r1: legacyInput.line.r1,
          positive_seq_reactance_x1: legacyInput.line.x1,
          zero_seq_resistance_r0: legacyInput.line.r0,
          zero_seq_reactance_x0: legacyInput.line.x0,
          route_length: legacyInput.line.length_km,
        },
        ct_core: {
          ct_ratio_primary: legacyInput.ct.ratio_primary,
          ct_ratio_secondary: legacyInput.ct.ratio_secondary,
          class_of_accuracy: legacyInput.ct.accuracy_class,
          ct_resistance: legacyInput.ct.rct,
          rated_burden: legacyInput.ct.rated_burden_va || 7.5,
          CT_Accuracy_Limit_Factor: legacyInput.ct.alf || 10
        },
        connected_devices: legacyInput.ieds.map(d => ({
          device_name: d.name,
          burden_va: d.burden_va
        })),
        accuracy_limit_factor: legacyInput.ct.alf || 10
      };

    case 'ABB_RET670':
      return {
        ct_parameters: {
          ct_ratio_tap1: 3200,
          ct_ratio_tap2: legacyInput.ct.ratio_primary || 600,
          ct_ratio_secondary: legacyInput.ct.ratio_secondary,
          class_of_accuracy: legacyInput.ct.accuracy_class,
          ct_resistance: legacyInput.ct.rct,
          knee_point_voltage: legacyInput.ct.vk_available,
          magnetizing_current: legacyInput.ct.io_at_vk
        },
        system_parameters: {
          system_frequency: legacyInput.system.frequency,
          hv_bus_voltage: legacyInput.system.bus_voltage_kv,
          mv_bus_voltage: legacyInput.system.bus_voltage_kv * 0.25,
          max_hv_fault_current: legacyInput.system.fault_current_ka * 1000,
          max_mv_fault_current: legacyInput.system.fault_current_ka * 1000 * 0.8,
          transformer_rating_mva: 100,
          percentage_impedance: 25
        },
        wiring_parameters: {
          total_lead_resistance: 2 * (legacyInput.wiring.cable_length_m / 1000) * (legacyInput.wiring.r20 * 1.21615),
          conductor_length: legacyInput.wiring.cable_length_m,
          conductor_cross_section: legacyInput.wiring.conductor_mm2,
          resistance_per_km: legacyInput.wiring.r20
        },
        connected_devices: {
          ret670_burden: legacyInput.ieds.reduce((sum, d) => sum + d.burden_va, 0),
          other_devices_burden: 0
        }
      };

    case 'RED670': {
      // FIX: derive real fault currents instead of fixed multipliers.
      const faults = deriveRED670FaultCurrents(legacyInput.system, legacyInput.line);

      // FIX: loop resistance at 75°C, not one-way resistance at 20°C.
      const loop_resistance_75c =
        2 * (legacyInput.wiring.cable_length_m / 1000) * (legacyInput.wiring.r20 * 1.21615);

      // FIX: use the REAL Tap-1 and Tap-2 CT ratios the user entered — no
      // more fabricated placeholder ("×1.78") for tap1. If the caller only
      // ever sends one tap (ratio_primary_tap2 absent), both taps fall back
      // to the same value so the calculation still runs sensibly.
      const tap1Primary = legacyInput.ct.ratio_primary;
      const tap2Primary = legacyInput.ct.ratio_primary_tap2 ?? tap1Primary;

      // Rct/Vk/Io are a single set of nameplate values shared by both taps
      // (the form only collects one of each) — no more invented per-tap
      // scale factors (×1.75 / ×1.6 / ×2) that had no basis in user input.
      const activeRct = legacyInput.ct.rct;
      const activeVk = legacyInput.ct.vk_available;
      const activeIo = legacyInput.ct.io_at_vk;

      // FIX: which tap is actually in service now comes from the caller
      // instead of being hardcoded to 'tap2'. Defaults to 'tap1' if the
      // caller doesn't specify (Tap-1 is generally the primary/higher-ratio
      // tap on the CT nameplate).
      const activeTap: 'tap1' | 'tap2' = legacyInput.ct.active_tap ?? 'tap1';

      return {
        ct_parameters: {
          ct_ratio_tap1: tap1Primary,
          ct_ratio_tap2: tap2Primary,
          ct_ratio_secondary: legacyInput.ct.ratio_secondary,
          class_of_accuracy: legacyInput.ct.accuracy_class,
          ct_resistance_tap1: activeRct,
          ct_resistance_tap2: activeRct,
          knee_point_voltage_tap1: activeVk,
          knee_point_voltage_tap2: activeVk,
          magnetizing_current_tap1: activeIo,
          magnetizing_current_tap2: activeIo
        },
        system_parameters: {
          system_frequency: legacyInput.system.frequency,
          hv_bus_voltage: legacyInput.system.bus_voltage_kv,
          mv_bus_voltage: legacyInput.system.bus_voltage_kv,
          max_hv_fault_current: faults.max_hv_fault_current,
          max_through_fault_3ph: faults.max_through_fault_3ph,
          max_through_fault_1ph: faults.max_through_fault_1ph,
          max_endzone1_3ph: faults.max_endzone1_3ph,
          max_endzone1_1ph: faults.max_endzone1_1ph,
          xr_ratio: legacyInput.system.xr_ratio,
          system_time_constant_3ph: (legacyInput.system.xr_ratio / (2 * Math.PI * legacyInput.system.frequency)) * 1000,
          system_time_constant_1ph_through: (legacyInput.system.xr_ratio / (2 * Math.PI * legacyInput.system.frequency)) * 1000,
          system_time_constant_1ph_endzone: (legacyInput.system.xr_ratio / (2 * Math.PI * legacyInput.system.frequency)) * 1000
        },
        wiring_parameters: {
          total_lead_resistance: loop_resistance_75c,
          conductor_length: legacyInput.wiring.cable_length_m,
          conductor_cross_section: legacyInput.wiring.conductor_mm2,
          resistance_per_km: legacyInput.wiring.r20
        },
        connected_devices: {
          red670_burden: legacyInput.ieds.reduce((sum, d) => sum + d.burden_va, 0),
          other_devices_burden: 0
        },
        cable_parameters: {
          positive_sequence_resistance: legacyInput.line.r1,
          positive_sequence_reactance: legacyInput.line.x1,
          zero_sequence_resistance: legacyInput.line.r0,
          zero_sequence_reactance: legacyInput.line.x0,
          route_length: legacyInput.line.length_km
        },
        active_tap: activeTap
      };
    }

    default:
      throw new Error(`Cannot convert legacy input for template type: ${templateType}`);
  }
}

function getApplicationDescription(templateType: IEDTemplateType): string {
  switch (templateType) {
    case 'SIEMENS_7SJ85':
      return '33kV Feeder Protection - Multi-Function Protection Relay';
    case 'ABB_RET670':
      return '132kV/33kV Transformer Protection - 100MVA Rating';
    case 'RED670':
      return '132kV Cable Feeders - Line Differential & Distance Protection';
    default:
      return 'CT/VT Adequacy Check';
  }
}

function validateSiemens7SJ85Results(results: any): any {
  const differences: string[] = [];

  const hasRequiredKssc = results.adequacy_check?.required_kssc || results.required_kssc;
  const hasAvailableKssc = results.adequacy_check?.available_kssc || results.available_kssc;

  if (!hasRequiredKssc) differences.push('Missing required Kssc value');
  if (!hasAvailableKssc) differences.push('Missing available Kssc value');

  const validation = differences.length === 0;
  const summary = validation
    ? 'All calculations completed successfully'
    : `${differences.length} validation issue(s) found`;

  return { validation, differences, summary };
}

export function calculateProjectCTAdequacy(
  input: FullAnalysisInput,
  templateType: IEDTemplateType,
  projectMetadata: {
    project_id: string;
    workspace_id: string;
    calculated_by: string;
  }
): Promise<ProjectCalculationResult> {

  const convertedInput = convertLegacyInput(input, templateType);

  const request: ProjectCalculationRequest = {
    template_type: templateType,
    input_data: convertedInput,
    project_id: projectMetadata.project_id,
    workspace_id: projectMetadata.workspace_id,
    calculated_by: projectMetadata.calculated_by
  };

  return performProjectCalculation(request);
}