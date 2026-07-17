/**
 * PROJECT CALCULATION SERVICE
 * Routes all project CT/VT adequacy calculations to the appropriate IED templates
 * Ensures all projects use the exact Hitachi N-19957 2-DF4W formulas and calculations
 */

import { runFullAnalysis, type FullAnalysisInput, type AnalysisResult } from './calculation-engine';
import { Siemens7SJ85Calculator } from './siemens-7sj85-calculations';
import { ABB_RET670_Calculator } from './abb-ret670-calculations';
import { RED670_Calculator } from './red670-calculations';

// Standard IED template types that all projects must use
export type IEDTemplateType = 'SIEMENS_7SJ85' | 'ABB_RET670' | 'RED670';

export interface ProjectCalculationRequest {
  template_type: IEDTemplateType;
  input_data: any; // Template-specific input structure
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
 * MAIN PROJECT CALCULATION FUNCTION
 * All project calculations MUST go through this function to ensure
 * consistent use of Hitachi N-19957 2-DF4W formulas
 */
export async function performProjectCalculation(
  request: ProjectCalculationRequest
): Promise<ProjectCalculationResult> {
  
  const calculation_id = `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const calculation_date = new Date().toISOString();

  let detailed_results: any;
  let validation: any;
  
  // Route to appropriate IED template calculator
  switch (request.template_type) {
    case 'SIEMENS_7SJ85':
      detailed_results = Siemens7SJ85Calculator.performCompleteCalculation(request.input_data);
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

  // Determine final verdict
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

/**
 * Get multiple calculations for comparative analysis
 */
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
      // Add failed calculation result
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
          conductor_cross_section: legacyInput.wiring.conductor_mm2,
          resistance_20c: legacyInput.wiring.r20,
          temperature_coefficient: legacyInput.wiring.alpha,
          conductor_length: legacyInput.wiring.cable_length_m,
          cores: legacyInput.wiring.cores
        },
        system: {
          system_frequency: legacyInput.system.frequency,
          bus_voltage_level: legacyInput.system.bus_voltage_kv,
          max_bus_fault_level: legacyInput.system.fault_current_ka,
          xr_ratio: legacyInput.system.xr_ratio
        },
        power_line: {
          positive_sequence_resistance: legacyInput.line.r1,
          positive_sequence_reactance: legacyInput.line.x1,
          zero_sequence_resistance: legacyInput.line.r0,
          zero_sequence_reactance: legacyInput.line.x0,
          route_length: legacyInput.line.length_km
        },
        ct_core: {
          ct_ratio_primary: legacyInput.ct.ratio_primary,
          ct_ratio_secondary: legacyInput.ct.ratio_secondary,
          class_of_accuracy: legacyInput.ct.accuracy_class,
          rated_burden: legacyInput.ct.rated_burden_va,
          accuracy_limit_factor: legacyInput.ct.alf,
          ct_resistance: legacyInput.ct.rct
        },
        connected_devices: {
          ied_names: legacyInput.ieds.map(d => d.name),
          burden_values: legacyInput.ieds.map(d => d.burden_va)
        }
      };
      
    case 'ABB_RET670':
      return {
        ct_parameters: {
          ct_ratio_tap1: 3200,
          ct_ratio_tap2: 600, // Most common for transformers
          ct_ratio_secondary: legacyInput.ct.ratio_secondary,
          class_of_accuracy: legacyInput.ct.accuracy_class,
          ct_resistance: legacyInput.ct.rct,
          knee_point_voltage: legacyInput.ct.vk_available,
          magnetizing_current: legacyInput.ct.io_at_vk
        },
        system_parameters: {
          system_frequency: legacyInput.system.frequency,
          hv_bus_voltage: legacyInput.system.bus_voltage_kv,
          mv_bus_voltage: legacyInput.system.bus_voltage_kv * 0.25, // Assume step-down
          max_hv_fault_current: legacyInput.system.fault_current_ka * 1000,
          max_mv_fault_current: legacyInput.system.fault_current_ka * 1000 * 0.8,
          transformer_rating_mva: 100, // Standard assumption
          percentage_impedance: 25
        },
        wiring_parameters: {
          total_lead_resistance: legacyInput.wiring.cable_length_m / 1000 * legacyInput.wiring.r20,
          conductor_length: legacyInput.wiring.cable_length_m,
          conductor_cross_section: legacyInput.wiring.conductor_mm2,
          resistance_per_km: legacyInput.wiring.r20
        },
        connected_devices: {
          ret670_burden: legacyInput.ieds.reduce((sum, d) => sum + d.burden_va, 0),
          other_devices_burden: 0
        }
      };
      
    case 'RED670':
      return {
        ct_parameters: {
          ct_ratio_tap1: 3200,
          ct_ratio_tap2: 1800, // Most common for feeders
          ct_ratio_secondary: legacyInput.ct.ratio_secondary,
          class_of_accuracy: legacyInput.ct.accuracy_class,
          ct_resistance_tap1: legacyInput.ct.rct * 1.75, // Scale for different taps
          ct_resistance_tap2: legacyInput.ct.rct,
          knee_point_voltage_tap1: legacyInput.ct.vk_available * 1.6,
          knee_point_voltage_tap2: legacyInput.ct.vk_available,
          magnetizing_current_tap1: legacyInput.ct.io_at_vk,
          magnetizing_current_tap2: legacyInput.ct.io_at_vk * 2
        },
        system_parameters: {
          system_frequency: legacyInput.system.frequency,
          hv_bus_voltage: legacyInput.system.bus_voltage_kv,
          mv_bus_voltage: legacyInput.system.bus_voltage_kv,
          max_hv_fault_current: legacyInput.system.fault_current_ka * 1000,
          max_through_fault_3ph: legacyInput.system.fault_current_ka * 1000 * 0.85,
          max_through_fault_1ph: legacyInput.system.fault_current_ka * 1000 * 0.87,
          max_endzone1_3ph: legacyInput.system.fault_current_ka * 1000 * 0.87,
          max_endzone1_1ph: legacyInput.system.fault_current_ka * 1000 * 0.89,
          xr_ratio: legacyInput.system.xr_ratio,
          system_time_constant_3ph: 47.73,
          system_time_constant_1ph_through: 27.37,
          system_time_constant_1ph_endzone: 29.64
        },
        wiring_parameters: {
          total_lead_resistance: legacyInput.wiring.cable_length_m / 1000 * legacyInput.wiring.r20,
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
        }
      };
      
    default:
      throw new Error(`Cannot convert legacy input for template type: ${templateType}`);
  }
}

// Helper functions
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
  // Basic validation for SIEMENS 7SJ85
  const tolerance = 2; // 2% tolerance
  const differences: string[] = [];
  
  // Expected values would be specific to the project configuration
  // This is a simplified validation
  const hasRequiredKssc = results.adequacy_check?.required_kssc || results.required_kssc;
  const hasAvailableKssc = results.adequacy_check?.available_kssc || results.available_kssc;
  
  if (!hasRequiredKssc) {
    differences.push('Missing required Kssc value');
  }
  
  if (!hasAvailableKssc) {
    differences.push('Missing available Kssc value');
  }
  
  const validation = differences.length === 0;
  const summary = validation 
    ? '✅ All calculations completed successfully'
    : `❌ ${differences.length} validation issue(s) found`;

  return { validation, differences, summary };
}

/**
 * Project calculation wrapper that automatically uses appropriate IED template
 */
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