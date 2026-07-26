/**
 * Template Management + template-driven adequacy procedures.
 *
 * System-prompt rule #6: "Adding a new IED must require only a new template,
 * not new application code." Each `IedTemplate` bundles:
 *   • its standard CT/VT burdens (manufacturer values),
 *   • the connected-device input schema (drives the UI form + validation),
 *   • the adequacy procedure that consumes shared project/bay results.
 *
 * The UI and calculation engine iterate over this registry generically — they
 * never branch on a specific IED id.
 */

import { runFormula, type TraceStep, type FormulaSource } from "./formula"
import {
  F_RED_EAL_CLOSE,
  F_RED_EAL_THROUGH,
  F_RED_EAL_ZONE,
  F_RED_EAL_DIST_CLOSE,
  F_RED_EAL_BF,
  F_RED_VK,
  F_SJ_KSSC_REQ,
  F_SJ_PE,
  F_SJ_KSSC_AVAIL,
} from "./formulas"
import type { FieldRule } from "./validation"
import type { CtWiring } from "./model"
import type { WiringResult, FaultStudyResult, AdequacyResult, AdequacyFunctionResult } from "./results"

export interface AdequacyContext {
  ct: CtWiring
  wiring: WiringResult
  fault: FaultStudyResult
  params: Record<string, number>
}

export interface IedTemplate {
  id: string
  name: string
  manufacturer: string
  family: string
  description: string
  /** Standard IED burden used in Eal / lead-burden terms (VA). */
  ctBurden: number
  vtBurden: number
  /** Connected-device input schema (CT ratio, Rct, available Vk…). */
  fields: FieldRule[]
  defaultParams: Record<string, number>
  runAdequacy: (ctx: AdequacyContext) => AdequacyResult
}

function sig(v: number): string {
  return Number(v.toPrecision(6)).toString()
}

function currentOf(fault: FaultStudyResult, key: string): number {
  return fault.cases.find((c) => c.key === key)?.current ?? 0
}
function tpOf(fault: FaultStudyResult, key: string): number {
  return fault.cases.find((c) => c.key === key)?.tpMs ?? 0
}

/* ==================================================================== */
/* RED 670 — line differential & distance + breaker failure             */
/* ==================================================================== */

const RED670: IedTemplate = {
  id: "RED670",
  name: "ABB RED670",
  manufacturer: "ABB",
  family: "Relion 670/650",
  description: "Line differential & distance protection. CT adequacy via equivalent secondary e.m.f. (Eal).",
  ctBurden: 0.02,
  vtBurden: 0.02,
  fields: [
    { key: "ctPrimaryA", label: "CT primary rated current Ipn", unit: "A", required: true, positive: true },
    { key: "ctSecondaryA", label: "CT secondary rated current Isn", unit: "A", required: true, positive: true },
    { key: "rctOhm", label: "CT winding resistance Rct", unit: "ohm", required: true, positive: true },
    { key: "availableVk", label: "Available knee-point voltage Vk", unit: "V", required: true, positive: true },
    { key: "bfOperateCurrentA", label: "Breaker-failure operate current Iop", unit: "A", required: true, positive: true },
    { key: "magCurrentMa", label: "Magnetizing current I₀ at Vk", unit: "A" },
  ],
  defaultParams: {
    ctPrimaryA: 3200,
    ctSecondaryA: 1,
    rctOhm: 9.8,
    availableVk: 2000,
    bfOperateCurrentA: 50000,
    magCurrentMa: 10,
  },
  runAdequacy(ctx) {
    const { ct, wiring, fault, params } = ctx
    const Ir = ct.relayRatedCurrentA
    const Isn = params.ctSecondaryA
    const Ipn = params.ctPrimaryA
    const Rct = params.rctOhm
    const Rl = wiring.rLead
    const Sr = this.ctBurden

    const Ikmax = fault.faultCurrentI
    const It3 = currentOf(fault, "through-3ph")
    const It1 = currentOf(fault, "through-1ph")
    const Iz3 = currentOf(fault, "endzone-3ph")
    const Iz1 = currentOf(fault, "endzone-1ph")

    // DC-component factors from the template's stated thresholds.
    const aFactor = fault.tpMs <= 400 ? 1 : 1
    const k3 = tpOf(fault, "endzone-3ph") <= 200 ? 3 : 3
    const k1 = tpOf(fault, "endzone-1ph") <= 200 ? 3 : 3

    const common = { Isn, Ipn, Rct, Rl, Sr, Ir }
    const functions: AdequacyFunctionResult[] = []
    const allSteps: TraceStep[] = []

    const push = (key: string, label: string, r: { value: number; step: TraceStep }) => {
      functions.push({ key, label, ealReq: r.value, steps: [r.step] })
      allSteps.push(r.step)
    }

    // Differential
    push("diff-close", "Differential — close-in", runFormula(F_RED_EAL_CLOSE, { Ik: Ikmax, ...common }))
    push("diff-through-3ph", "Differential — through (3-ph)", runFormula(F_RED_EAL_THROUGH, { It: It3, ...common }))
    push("diff-through-1ph", "Differential — through (1-ph)", runFormula(F_RED_EAL_THROUGH, { It: It1, ...common }))
    // Distance
    push("dist-close", "Distance — close-in", runFormula(F_RED_EAL_DIST_CLOSE, { Ik: Ikmax, a: aFactor, ...common }))
    push("dist-zone-3ph", "Distance — endzone-1 (3-ph)", runFormula(F_RED_EAL_ZONE, { Ik: Iz3, k: k3, ...common }))
    push("dist-zone-1ph", "Distance — endzone-1 (1-ph)", runFormula(F_RED_EAL_ZONE, { Ik: Iz1, k: k1, ...common }))
    // Breaker failure
    push(
      "bf",
      "Breaker failure",
      runFormula(F_RED_EAL_BF, { Iop: params.bfOperateCurrentA, Isr: Isn, Ipr: Ipn, Rct, Rl, Sr, Ir }),
    )

    const governingEalReq = Math.max(...functions.map((f) => f.ealReq))
    const vk = runFormula(F_RED_VK, { Eal: governingEalReq }, `${sig(governingEalReq)} × 0.8`)
    allSteps.push(vk.step)

    const availableVk = params.availableVk
    const verdict = availableVk > vk.value ? "suitable" : "not-suitable"

    return {
      templateId: this.id,
      templateName: this.name,
      functions,
      governingEalReq,
      requiredVk: vk.value,
      availableVk,
      verdict,
      requiredLabel: "Required Vk",
      availableLabel: "Available Vk",
      metrics: [
        { label: "Governing Ealreq", value: governingEalReq, unit: "V" },
        { label: "Lead resistance Rl", value: Rl, unit: "Ω" },
      ],
      steps: allSteps,
    }
  },
}

/* ==================================================================== */
/* SIEMENS 7SJ85 — overcurrent (Kssc method)                            */
/* ==================================================================== */

const SJ85_SRC: FormulaSource = { kind: "excel-template", ref: "7SJ85 › CT adequacy" }

const SJ85: IedTemplate = {
  id: "7SJ85",
  name: "SIEMENS 7SJ85",
  manufacturer: "Siemens",
  family: "SIPROTEC 5",
  description: "Overcurrent (OC + BCU). CT adequacy via effective accuracy limit factor Kssc'.",
  ctBurden: 0.01,
  vtBurden: 0.01,
  fields: [
    { key: "ctPrimaryA", label: "CT primary current Ipn", unit: "A", required: true, positive: true },
    { key: "ctSecondaryA", label: "Rated secondary current In", unit: "A", required: true, positive: true },
    { key: "rctOhm", label: "CT winding resistance Rct", unit: "ohm", required: true, positive: true },
    { key: "ratedBurdenVA", label: "Rated burden of CT PN", unit: "VA", required: true, positive: true },
    { key: "alf", label: "CT accuracy limit factor n", unit: "ratio", required: true, positive: true },
    { key: "maxThroughFaultA", label: "Max. through fault at close-in Itkmax", unit: "A", required: true, positive: true },
  ],
  defaultParams: {
    ctPrimaryA: 3150,
    ctSecondaryA: 1,
    rctOhm: 9,
    ratedBurdenVA: 7.5,
    alf: 20,
    maxThroughFaultA: 31500,
  },
  runAdequacy(ctx) {
    const { wiring, params } = ctx
    const In = params.ctSecondaryA
    const Rct = params.rctOhm
    const PN = params.ratedBurdenVA
    const n = params.alf

    // Lead + connected-device burden: CT-lead VA plus the IED's own burden.
    const PL = wiring.va + this.ctBurden

    const ksscReq = runFormula(
      F_SJ_KSSC_REQ,
      { Itkmax: params.maxThroughFaultA, Ipn: params.ctPrimaryA },
      `${params.maxThroughFaultA} / ${params.ctPrimaryA}`,
    )
    const pe = runFormula(F_SJ_PE, { In, Rct }, `${In}² · ${Rct}`)
    const plStep: TraceStep = {
      formulaId: "SJ.PL",
      label: "Lead + connected burden PL",
      expression: "PL = Pl(leads) + IED burden",
      substitution: `${sig(wiring.va)} + ${this.ctBurden} = ${sig(PL)}`,
      inputs: [
        { label: "CT lead burden", value: wiring.va, unit: "VA" },
        { label: "IED burden", value: this.ctBurden, unit: "VA" },
      ],
      output: { value: PL, unit: "VA" },
      source: SJ85_SRC,
    }
    const ksscAvail = runFormula(
      F_SJ_KSSC_AVAIL,
      { n, PE: pe.value, PN, PL },
      `${n} · [(${sig(pe.value)} + ${PN}) / (${sig(pe.value)} + ${sig(PL)})]`,
    )

    const verdict = ksscAvail.value > ksscReq.value ? "suitable" : "not-suitable"

    return {
      templateId: this.id,
      templateName: this.name,
      functions: [
        { key: "oc", label: "Overcurrent (Kssc')", ealReq: ksscReq.value, steps: [ksscReq.step] },
      ],
      governingEalReq: ksscReq.value,
      requiredVk: ksscReq.value,
      availableVk: ksscAvail.value,
      verdict,
      requiredLabel: "Required Kssc'",
      availableLabel: "Available Kssc'",
      metrics: [
        { label: "CT internal burden PE", value: pe.value, unit: "VA" },
        { label: "Rated burden PN", value: PN, unit: "VA" },
        { label: "Lead + connected PL", value: PL, unit: "VA" },
        { label: "Accuracy limit factor n", value: n, unit: "" },
      ],
      steps: [ksscReq.step, pe.step, plStep, ksscAvail.step],
    }
  },
}

/* ------------------------------ registry ------------------------------- */

const TEMPLATES: Record<string, IedTemplate> = {
  [RED670.id]: RED670,
  [SJ85.id]: SJ85,
}

export function getTemplate(id: string): IedTemplate {
  const t = TEMPLATES[id]
  if (!t) throw new Error(`Unknown IED template: ${id}`)
  return t
}

export function listTemplates(): IedTemplate[] {
  return Object.values(TEMPLATES)
}
