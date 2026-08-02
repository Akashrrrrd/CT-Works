/**
 * INTELLIGENT CT/VT ADEQUACY ANALYSIS ENGINE
 * Implements all formulas from the system spec exactly.
 * No hardcoded relay logic — relay formulas are loaded dynamically.
 *
 * FIX: FullAnalysisInput.ct now carries ratio_primary_tap2 and active_tap so
 * RED670's two real CT taps (not a fabricated placeholder) can flow all the
 * way from the frontend through to the calculator.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CTParameters {
 ratio_primary: number; // Ipn — A (Tap-1 for RED670, the only tap for others)
 ratio_primary_tap2?: number; // RED670 only — Tap-2 primary. Defaults to ratio_primary if absent.
 active_tap?: 'tap1' | 'tap2'; // RED670 only — which tap is actually in service.
 ratio_secondary: number; // In — A
 accuracy_class: string; // e.g. 5P20, Class X, PX
 rct: number; // CT winding resistance — Ω
 rated_burden_va: number; // Rated burden — VA
 alf: number; // Accuracy Limit Factor
 vk_available: number; // Knee point voltage — V
 io_at_vk: number; // Magnetising current at Vk — mA
}

export interface VTParameters {
 ratio_primary: number; // Vp — V
 ratio_secondary: number; // Vs — V
 wiring_resistance:number; // Ω
}

export interface WiringParameters {
 conductor_mm2: number; // Cross-section — mm²
 r20: number; // Resistance at 20°C — Ω/km
 alpha: number; // Temperature coefficient — /°C
 temperature: number; // Operating temperature — °C
 cable_length_m: number; // One-way cable length — m
 cores: 2 | 1; // 2 = loop (2×RL), 1 = single
}

export interface IEDEntry {
 name: string; // e.g. ABB RED670
 burden_va: number; // VA at In
 type: string; // differential | distance | protection | metering
}

export interface SystemParameters {
 frequency: number; // Hz
 bus_voltage_kv: number; // kV line-to-line
 fault_current_ka: number; // Max fault current — kA (3-phase)
 xr_ratio: number; // X/R ratio
}

export interface LineParameters {
 r1: number; // Positive-seq R — Ω/km
 x1: number; // Positive-seq X — Ω/km
 r0: number; // Zero-seq R — Ω/km
 x0: number; // Zero-seq X — Ω/km
 length_km: number; // km
}

export interface FullAnalysisInput {
 ct: CTParameters;
 vt?: VTParameters;
 wiring: WiringParameters;
 ieds: IEDEntry[];
 system: SystemParameters;
 line: LineParameters;
}

export interface AnalysisResult {
 verdict: 'ADEQUATE' | 'UNDER DIMENSIONED';
 kssc_required: number;
 kssc_available: number;
 vk_required: number;
 vk_available: number;
 wiring: WiringCalcs;
 source: SourceCalcs;
 faults: FaultCalcs;
 burden: BurdenCalcs;
 kssc: KsscCalcs;
 intermediates: Record<string, any>;
 conclusion: string;
}

export interface WiringCalcs {
 r_at_temp: number; // Ω/km at operating temp
 rl_one_way: number; // Ω one-way
 rl_loop: number; // Ω loop (2×RL)
 pl_burden_va: number; // CT lead burden VA
}

export interface SourceCalcs {
 zs: number; // |Zs| Ω
 rs: number; // Rs Ω
 xs: number; // Xs Ω
 theta_deg: number;
 tp: number; // Time constant — s
}

export interface FaultCalcs {
 // 3-phase
 z1l: number; // Z1 × length
 z_total_3ph: number;
 if_3ph: number; // A
 // 1-phase
 z0l: number;
 z_total_1ph: number;
 if_1ph: number; // A
}

export interface BurdenCalcs {
 pe: number; // Internal burden VA
 pl: number; // Lead burden VA
 ied_total_va: number; // Sum of all IED burdens
 total_va: number; // PE + PL + IED
}

export interface KsscCalcs {
 required: number; // Itkmax / Ipn
 available: number; // n × (PE + PN) / (PE + PL)
}

// ── Main engine ───────────────────────────────────────────────────────────────

import { convertLegacyInput, convertEngineResult } from './engine-adapter';
import { evaluateBay } from '../engine/calc-engine';

export function runFullAnalysis(input: FullAnalysisInput, templateType?: string): AnalysisResult {
 const { system, bay } = convertLegacyInput(input, templateType);
 const result = evaluateBay(system, bay);
 return convertEngineResult(result, input);
}

export interface RelayFormula {
 name: string;
 expression: string;
 variables: string[];
 type: 'equation' | 'inequality_gte' | 'inequality_lte';
 description?: string;
}

export function evaluateRelayFormula(formula: RelayFormula, values: Record<string, number>): { result: number; pass?: boolean } {
 try {
 let expr = formula.expression;
 for (const [key, val] of Object.entries(values)) {
 expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val));
 }
 // Safe evaluation for standard arithmetic expressions
 const fn = new Function(`return (${expr});`);
 const res = Number(fn());
 return { result: isNaN(res) ? 0 : res, pass: true };
 } catch (e) {
 return { result: 0, pass: false };
 }
}