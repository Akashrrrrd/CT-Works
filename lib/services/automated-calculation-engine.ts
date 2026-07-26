import { CTVTAdequacyInput, CTVTAdequacyReport, IEDAdequacyResult } from '../types/ct-vt-adequacy-types';
import { runFullAnalysis, FullAnalysisInput } from './calculation-engine';

export class AutomatedCalculationEngine {
  static performCompleteAnalysis(input: CTVTAdequacyInput): CTVTAdequacyReport {
    // 1. Map CTVTAdequacyInput -> FullAnalysisInput
    const fullInput: FullAnalysisInput = {
      system: {
        frequency: input.system.system_frequency,
        bus_voltage_kv: input.system.bus_voltage_level,
        fault_current_ka: input.system.bus_fault_level,
        xr_ratio: input.system.xr_ratio
      },
      line: {
        r1: input.transmission_line.positive_sequence_resistance,
        x1: input.transmission_line.positive_sequence_reactance,
        r0: input.transmission_line.zero_sequence_resistance,
        x0: input.transmission_line.zero_sequence_reactance,
        length_km: input.transmission_line.route_length
      },
      wiring: {
        conductor_mm2: input.ct_wiring.conductor_cross_section,
        r20: input.ct_wiring.resistance_w_km_20c,
        alpha: 0.00393, // standard copper
        temperature: 75, // standard operating temp
        cable_length_m: input.ct_wiring.lead_length_ct_to_relay,
        cores: 2
      },
      ct: {
        ratio_primary: parseInt(input.ieds[0]?.ct_ratio.split('/')[0] || '1'),
        ratio_secondary: parseInt(input.ieds[0]?.ct_ratio.split('/')[1] || '1'),
        accuracy_class: input.ieds[0]?.accuracy_class || '5P20',
        rct: input.ieds[0]?.ct_resistance || 0,
        vk_available: input.ieds[0]?.knee_point_voltage || 0,
        io_at_vk: input.ieds[0]?.magnetizing_current || 0,
        alf: input.ieds[0]?.accuracy_limit_factor || 20,
        rated_burden_va: 0 // Will default from IED later if needed
      },
      vt: {
        ratio_primary: 132000,
        ratio_secondary: 110,
        wiring_resistance: 0
      },
      ieds: input.ieds.map(i => ({ name: i.ied_name, burden_va: 0, type: 'protection' }))
    };

    // 2. Run Engine
    const analysisResult = runFullAnalysis(fullInput, input.ieds[0]?.ied_name);

    // 3. Map AnalysisResult -> CTVTAdequacyReport
    const iedResult: IEDAdequacyResult = {
      ied_name: input.ieds[0]?.ied_name || 'Unknown',
      ied_type: 'PROTECTION',
      ct_ratio: input.ieds[0]?.ct_ratio || '1/1',
      ct_ratio_primary: fullInput.ct.ratio_primary,
      ct_ratio_secondary: fullInput.ct.ratio_secondary,
      accuracy_class: fullInput.ct.accuracy_class,
      ct_internal_burden: analysisResult.burden.pe,
      lead_burden: analysisResult.burden.pl,
      ied_burden: analysisResult.burden.ied_total_va,
      total_burden: analysisResult.burden.total_va,
      required_kssc: analysisResult.kssc_required,
      available_kssc: analysisResult.kssc_available,
      required_vk: analysisResult.vk_required,
      available_vk: analysisResult.vk_available,
      safety_margin: 0, // Simplified
      verdict: analysisResult.verdict === 'ADEQUATE' ? 'SUITABLE' : 'UNDER_DIMENSIONED',
      calculation_steps: analysisResult.intermediates?.steps || [],
      detailed_results: analysisResult
    };

    return {
      system_parameters: {
        source_impedance: analysisResult.source.zs,
        source_resistance: analysisResult.source.rs,
        source_reactance: analysisResult.source.xs,
        time_constant: analysisResult.source.tp,
        phase_voltage: fullInput.system.bus_voltage_kv * 1000 / Math.sqrt(3),
        max_fault_current: analysisResult.faults.if_3ph,
        max_fault_current_1ph: analysisResult.faults.if_1ph,
        zone1_reach_impedance: analysisResult.faults.z1l * 0.8,
        zone1_fault_current_3ph: 0, // Can be pulled from steps if needed
        zone1_fault_current_1ph: 0
      },
      wiring_parameters: {
        ct_wiring: {
          loop_resistance: analysisResult.wiring.rl_loop,
          lead_burden: analysisResult.wiring.pl_burden_va,
          resistance_at_temp: analysisResult.wiring.r_at_temp
        },
        vt_wiring: {
          loop_resistance: 0,
          lead_burden: 0,
          resistance_at_temp: 0
        }
      },
      ied_results: [iedResult],
      overall_verdict: iedResult.verdict,
      timestamp: new Date().toISOString()
    };
  }
}

export class SystemCalculations { }
export class WiringCalculations { }
export class FaultCurrentCalculations { }
export class BurdenCalculations { }