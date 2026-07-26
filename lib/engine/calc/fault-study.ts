/**
 * System fault-current & time-constant study (RED 670 template).
 *
 * Computes source impedance from the busbar fault level, then derives the four
 * fault cases the adequacy checks depend on:
 *   • 3-ph through fault              (Itmax, 3-ph)
 *   • 1-ph to earth through fault     (Itmax, 1-ph)
 *   • 3-ph endzone-1 fault (80%)      (Ikzone-1, 3-ph)
 *   • 1-ph to earth endzone-1 (80%)   (Ikzone-1, 1-ph)
 *
 * All impedance arithmetic is complex (r + jx); magnitudes and X/R angles are
 * reported exactly as the template does.
 */

import { runFormula, type TraceStep, type FormulaSource } from "../formula"
import { F_FAULT_I, F_FAULT_V, F_FAULT_ZS, F_ANGLE, F_TP, F_SIR, F_I3PH, F_I1PH } from "../formulas"
import { add, cplx, magnitude, scale, xrRatio, angleDeg, formatComplex, type Complex } from "../complex"
import type { SystemParams } from "../model"
import type { FaultCase, FaultStudyResult } from "../results"

const SQRT3 = Math.sqrt(3)
const TWO_PI = 2 * Math.PI
const SRC: FormulaSource = { kind: "excel-template", ref: "RED670 › Fault Current & Time Constant" }

function sig(v: number): string {
  return Number(v.toPrecision(6)).toString()
}

function manualStep(
  formulaId: string,
  label: string,
  expression: string,
  substitution: string,
  output: { value: number; unit: TraceStep["output"]["unit"] },
): TraceStep {
  return { formulaId, label, expression, substitution, inputs: [], output, source: SRC }
}

export function calcFaultStudy(sys: SystemParams): FaultStudyResult {
  const steps: TraceStep[] = []

  const I = runFormula(F_FAULT_I, { faultKA: sys.maxFaultKA }, `${sys.maxFaultKA} × 1000`)
  const V = runFormula(F_FAULT_V, { busKV: sys.busVoltageKV }, `${sys.busVoltageKV} × 1000`)
  steps.push(I.step, V.step)

  const zsMag = runFormula(F_FAULT_ZS, { V: V.value, I: I.value }, `(${V.value} × 1) / (√3 × ${I.value})`)
  steps.push(zsMag.step)

  const angle = runFormula(F_ANGLE, { xr: sys.xrRatio }, `tan⁻¹(${sys.xrRatio})`)
  steps.push(angle.step)

  const rs = zsMag.value * Math.cos(angle.value)
  const xs = zsMag.value * Math.sin(angle.value)
  const zs = cplx(rs, xs)
  steps.push(
    manualStep(
      "FAULT.ZS.CPLX",
      "Source impedance (rectangular)",
      "Zs = Zs·cos øs + j·Zs·sin øs",
      `${sig(zsMag.value)}·cos(${sig(angle.value)}) + j·${sig(zsMag.value)}·sin(${sig(angle.value)}) = ${formatComplex(zs)}`,
      { value: zsMag.value, unit: "ohm" },
    ),
  )

  const tp = runFormula(F_TP, { xr: sys.xrRatio, f: sys.frequencyHz }, `${sys.xrRatio} / (2π·${sys.frequencyHz}) × 1000`)
  steps.push(tp.step)

  // Line impedances (per km → total over route length)
  const z1PerKm = cplx(sys.r1, sys.x1)
  const z0PerKm = cplx(sys.r0, sys.x0)
  const z1l = scale(z1PerKm, sys.routeLengthKm)
  const z0l = scale(z0PerKm, sys.routeLengthKm)
  steps.push(
    manualStep(
      "LINE.Z1L",
      "Total +ve seq. line impedance",
      "Z1L = (R1 + jX1) · RL",
      `(${sys.r1} + j${sys.x1}) · ${sys.routeLengthKm} = ${formatComplex(z1l)}`,
      { value: magnitude(z1l), unit: "ohm" },
    ),
    manualStep(
      "LINE.Z0L",
      "Total zero seq. line impedance",
      "Z0L = (R0 + jX0) · RL",
      `(${sys.r0} + j${sys.x0}) · ${sys.routeLengthKm} = ${formatComplex(z0l)}`,
      { value: magnitude(z0l), unit: "ohm" },
    ),
  )

  const z1lMag = magnitude(z1l)
  const sir = runFormula(F_SIR, { Zs: zsMag.value, Z1L: z1lMag }, `${sig(zsMag.value)} / (0.8 · ${sig(z1lMag)})`)
  steps.push(sir.step)

  const cases: FaultCase[] = []

  // --- 3-ph through fault ---
  const z1t = add(zs, z1l)
  const i3through = buildThreePhase("through-3ph", "3-ph through fault", z1t, V.value, sys.frequencyHz, steps)
  cases.push(i3through)

  // --- 1-ph to earth through fault ---
  const zot = add(zs, z0l)
  const z0f = add(z1t, z1t, zot) // Z1t + Z2t + Zot  (Z2t = Z1t)
  const i1through = buildSinglePhase("through-1ph", "1-ph to earth through fault", z0f, V.value, sys.frequencyHz, steps)
  cases.push(i1through)

  // --- 3-ph endzone-1 (80%) ---
  const z1z = add(zs, scale(z1l, 0.8))
  const i3zone = buildThreePhase("endzone-3ph", "3-ph endzone-1 fault (80%)", z1z, V.value, sys.frequencyHz, steps)
  cases.push(i3zone)

  // --- 1-ph to earth endzone-1 (80%) ---
  const zoz = add(zs, scale(z0l, 0.8))
  const z0fz = add(z1z, z1z, zoz)
  const i1zone = buildSinglePhase("endzone-1ph", "1-ph to earth endzone-1 (80%)", z0fz, V.value, sys.frequencyHz, steps)
  cases.push(i1zone)

  return {
    faultCurrentI: I.value,
    hvRatingV: V.value,
    sourceImpedance: zs,
    sourceMagnitude: zsMag.value,
    angleDeg: (angle.value * 180) / Math.PI,
    tpMs: tp.value,
    z1l,
    z0l,
    z1lMag,
    sir: sir.value,
    cases,
    steps,
  }
}

function buildThreePhase(
  key: string,
  label: string,
  z: Complex,
  V: number,
  f: number,
  steps: TraceStep[],
): FaultCase {
  const mag = magnitude(z)
  const xr = xrRatio(z)
  steps.push(
    manualStep(
      `${key}.Z`,
      `${label} — fault impedance`,
      "Z = Zs + Z1L  (|Z|, X/R)",
      `${formatComplex(z)} → |Z| = ${sig(mag)} Ω, X/R = ${sig(angleDeg(z))}°`,
      { value: mag, unit: "ohm" },
    ),
  )
  const current = runFormula(F_I3PH, { V, Zmag: mag }, `(${V} × 1.0) / (${sig(mag)} · √3)`)
  const tpMs = (xr / (TWO_PI * f)) * 1000
  steps.push(current.step)
  return { key, label, impedance: z, magnitude: mag, xr, current: current.value, tpMs }
}

function buildSinglePhase(
  key: string,
  label: string,
  z0f: Complex,
  V: number,
  f: number,
  steps: TraceStep[],
): FaultCase {
  const mag = magnitude(z0f)
  const xr = xrRatio(z0f)
  steps.push(
    manualStep(
      `${key}.Z`,
      `${label} — fault impedance`,
      "Z0f = Z1 + Z2 + Z0  (|Z|, X/R)",
      `${formatComplex(z0f)} → |Z| = ${sig(mag)} Ω, X/R = ${sig(angleDeg(z0f))}°`,
      { value: mag, unit: "ohm" },
    ),
  )
  const current = runFormula(F_I1PH, { V, Zmag: mag }, `(${V} × 1.0 × 3) / (${sig(mag)} · √3)`)
  const tpMs = (xr / (TWO_PI * f)) * 1000
  steps.push(current.step)
  return { key, label, impedance: z0f, magnitude: mag, xr, current: current.value, tpMs }
}
