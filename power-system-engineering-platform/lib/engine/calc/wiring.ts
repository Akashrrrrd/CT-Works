/**
 * CT & VT wiring calculation module.
 *
 * Reproduces the "CT Wiring" / "VT Wiring" template sections:
 * R75 = R20·[1 + a(t − 20)]/1000 (Ω/m)
 * Rl = 2·R75·L (Ω, loop)
 * Pl = Is²·Rl (VA, CT lead burden)
 *
 * These inputs are shared by every IED in a bay, so the module is called once
 * per bay and the result reused (rule #7).
 */

import { runFormula, type TraceStep } from "../formula"
import { F_WIRE_R75, F_WIRE_RLEAD, F_WIRE_VA } from "../formulas"
import type { CtWiring, VtWiring } from "../model"
import type { WiringResult } from "../results"

export function calcCtWiring(ct: CtWiring): WiringResult {
 const steps: TraceStep[] = []

 const r75 = runFormula(
 F_WIRE_R75,
 { R20: ct.r20, a: ct.alpha, t: ct.tempC },
 `${ct.r20} · [1 + ${ct.alpha}(${ct.tempC} − 20)] / 1000`,
 )
 steps.push(r75.step)

 const rLead = runFormula(F_WIRE_RLEAD, { R: r75.value, L: ct.lengthM }, `2 · ${sig(r75.value)} · ${ct.lengthM}`)
 steps.push(rLead.step)

 const va = runFormula(
 F_WIRE_VA,
 { Is: ct.secondaryCurrentA, Rl: rLead.value },
 `${ct.secondaryCurrentA}² · ${sig(rLead.value)}`,
 )
 steps.push(va.step)

 return { r75: r75.value, rLead: rLead.value, va: va.value, steps }
}

export function calcVtWiring(vt: VtWiring): WiringResult {
 const steps: TraceStep[] = []

 const r75 = runFormula(
 F_WIRE_R75,
 { R20: vt.r20, a: vt.alpha, t: vt.tempC },
 `${vt.r20} · [1 + ${vt.alpha}(${vt.tempC} − 20)] / 1000`,
 )
 steps.push(r75.step)

 const rLead = runFormula(F_WIRE_RLEAD, { R: r75.value, L: vt.lengthM }, `2 · ${sig(r75.value)} · ${vt.lengthM}`)
 steps.push(rLead.step)

 return { r75: r75.value, rLead: rLead.value, va: 0, steps }
}

function sig(value: number): string {
 return Number(value.toPrecision(6)).toString()
}
