import { evaluateBay } from '../engine/calc-engine';
import { SystemParams, Bay, CtWiring, VtWiring, IedInstance } from '../engine/model';
import { FullAnalysisInput, AnalysisResult } from './calculation-engine';

export function convertLegacyInput(input: FullAnalysisInput, templateType?: string): { system: SystemParams, bay: Bay } {
 // Convert system
 const system: SystemParams = {
 frequencyHz: input.system.frequency,
 busVoltageKV: input.system.bus_voltage_kv,
 maxFaultKA: input.system.fault_current_ka,
 xrRatio: input.system.xr_ratio,
 r1: input.line.r1,
 x1: input.line.x1,
 r0: input.line.r0,
 x0: input.line.x0,
 routeLengthKm: input.line.length_km
 };

 // Extract which tap is active if this is RED670
 let primaryA = input.ct.ratio_primary;
 if (input.ct.active_tap === 'tap2' && input.ct.ratio_primary_tap2) {
 primaryA = input.ct.ratio_primary_tap2;
 }

 // Convert CT Wiring
 const ct: CtWiring = {
 relayRatedCurrentA: input.ct.ratio_secondary,
 secondaryCurrentA: input.ct.ratio_secondary, // assumption
 r20: input.wiring.r20,
 alpha: input.wiring.alpha,
 tempC: input.wiring.temperature,
 lengthM: input.wiring.cable_length_m
 };

 // Convert VT Wiring
 const vt: VtWiring = {
 r20: input.wiring.r20, // using same cable for simplicity if not provided
 alpha: input.wiring.alpha,
 tempC: input.wiring.temperature,
 lengthM: input.wiring.cable_length_m
 };

 // Construct Bay
 const bay: Bay = {
 id: "bay-1",
 projectId: "proj-1",
 name: "Bay 1",
 voltageClass: `${system.busVoltageKV} kV`,
 ct,
 vt,
 ieds: []
 };

 // Default to RED670 or 7SJ85 based on templateType
 const resolvedTemplate = (templateType?.toLowerCase().includes('7sj85')) ? '7SJ85' : 'RED670';
 
 const ied: IedInstance = {
 id: "ied-1",
 bayId: bay.id,
 templateId: resolvedTemplate,
 name: input.ieds?.[0]?.name || "Device 1",
 params: {
 ctPrimaryA: primaryA,
 ctSecondaryA: input.ct.ratio_secondary,
 rctOhm: input.ct.rct,
 availableVk: input.ct.vk_available || 0,
 bfOperateCurrentA: input.system.fault_current_ka * 1000, // heuristic if missing
 magCurrentMa: input.ct.io_at_vk || 0,
 ratedBurdenVA: input.ct.rated_burden_va || 0,
 alf: input.ct.alf || 20,
 maxThroughFaultA: input.system.fault_current_ka * 1000 // heuristic if missing
 }
 };

 bay.ieds.push(ied);

 return { system, bay };
}

export function convertEngineResult(engineResult: any, input: FullAnalysisInput): AnalysisResult {
 const fault = engineResult.fault;
 const wiring = engineResult.wiring;
 const iedResult = engineResult.ieds[0]?.adequacy;

 let verdict: 'ADEQUATE' | 'UNDER DIMENSIONED' = 'UNDER DIMENSIONED';
 if (iedResult?.verdict === 'suitable') {
 verdict = 'ADEQUATE';
 }

 // Find 3ph / 1ph through faults
 const i3through = fault.cases.find((c: any) => c.key === "through-3ph");
 const i1through = fault.cases.find((c: any) => c.key === "through-1ph");

 return {
 verdict,
 kssc_required: iedResult?.requiredVk || 0, // In 7SJ85, requiredVk is hijacked for ksscReq
 kssc_available: iedResult?.availableVk || 0,
 vk_required: iedResult?.requiredVk || 0,
 vk_available: iedResult?.availableVk || 0,
 wiring: {
 r_at_temp: wiring.ct.r75,
 rl_one_way: wiring.ct.rLead / 2, // approximation
 rl_loop: wiring.ct.rLead,
 pl_burden_va: wiring.ct.va
 },
 source: {
 zs: fault.sourceMagnitude,
 rs: fault.sourceImpedance.re,
 xs: fault.sourceImpedance.im,
 theta_deg: fault.angleDeg,
 tp: fault.tpMs / 1000
 },
 faults: {
 z1l: fault.z1lMag,
 z_total_3ph: i3through?.magnitude || 0,
 if_3ph: i3through?.current || 0,
 z0l: 0, // Could extract from fault.z0l magnitude
 z_total_1ph: i1through?.magnitude || 0,
 if_1ph: i1through?.current || 0,
 },
 burden: {
 pe: 0, 
 pl: wiring.ct.va,
 ied_total_va: 0,
 total_va: wiring.ct.va
 },
 kssc: {
 required: iedResult?.requiredVk || 0,
 available: iedResult?.availableVk || 0
 },
 intermediates: {
 engineVersion: iedResult?.engineVersion,
 steps: iedResult?.steps // For report generator
 },
 conclusion: iedResult?.verdict === 'suitable' ? 'Suitably Dimensioned' : 'Under Dimensioned'
 };
}
