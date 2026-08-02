/**
 * Result shapes produced by the calculation engine. Every result section
 * carries the `TraceStep[]` that produced it so the report generator can show
 * a full, hand-checkable derivation (system-prompt rules #5 and #10).
 */

import type { TraceStep } from "./formula"
import type { Complex } from "./complex"

export interface WiringResult {
 r75: number // Ω/m
 rLead: number // Ω
 va: number // VA (CT only; undefined-safe 0 for VT)
 steps: TraceStep[]
}

export interface FaultCase {
 key: string
 label: string
 impedance: Complex
 magnitude: number
 xr: number
 current: number // A
 tpMs: number
}

export interface FaultStudyResult {
 faultCurrentI: number // A
 hvRatingV: number // V
 sourceImpedance: Complex
 sourceMagnitude: number
 angleDeg: number
 tpMs: number
 z1l: Complex
 z0l: Complex
 z1lMag: number
 sir: number
 cases: FaultCase[]
 steps: TraceStep[]
}

export type Verdict = "suitable" | "not-suitable"

export interface AdequacyFunctionResult {
 key: string
 label: string
 ealReq: number // V
 steps: TraceStep[]
}

export interface AdequacyResult {
 templateId: string
 templateName: string
 /** Individual function checks (differential, distance, breaker failure…). */
 functions: AdequacyFunctionResult[]
 governingEalReq: number
 requiredVk: number
 availableVk: number
 verdict: Verdict
 engineVersion: string
 /** Extra headline metrics for templates that don't use the Vk method. */
 metrics: { label: string; value: number; unit: string }[]
 requiredLabel: string
 availableLabel: string
 steps: TraceStep[]
}
