/**
 * Calculation Engine — orchestrates the full deterministic pipeline for a bay:
 *
 *   validate → CT wiring → VT wiring → system fault study → per-IED adequacy
 *
 * Project/bay parameters are computed once and reused across every IED in the
 * bay (rule #7). Validation runs first and blocks calculation on errors
 * (rule #8). Everything returned is fully traceable (rule #10).
 */

import { validateFields, hasErrors, type ValidationIssue, type FieldRule, type FieldValue } from "./validation"
import {
  type Bay,
  type SystemParams,
  type CtWiring,
  type VtWiring,
  type IedInstance,
  SYSTEM_FIELDS,
  CT_WIRING_FIELDS,
  VT_WIRING_FIELDS,
} from "./model"
import { calcCtWiring, calcVtWiring } from "./calc/wiring"
import { calcFaultStudy } from "./calc/fault-study"
import { getTemplate } from "./templates"
import type { WiringResult, FaultStudyResult, AdequacyResult } from "./results"

export interface IedEvaluation {
  ied: IedInstance
  templateName: string
  adequacy: AdequacyResult | null
  issues: ValidationIssue[]
}

export interface BayEvaluation {
  ctWiring: WiringResult | null
  vtWiring: WiringResult | null
  fault: FaultStudyResult | null
  ieds: IedEvaluation[]
  issues: ValidationIssue[]
  ok: boolean
}

/** Build the {value, unit} map the validation engine consumes from a record. */
function toFieldValues(rules: FieldRule[], record: Record<string, number>): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {}
  for (const rule of rules) {
    out[rule.key] = { value: record[rule.key], unit: rule.unit }
  }
  return out
}

export function validateSystem(system: SystemParams): ValidationIssue[] {
  return validateFields(SYSTEM_FIELDS, toFieldValues(SYSTEM_FIELDS, system as unknown as Record<string, number>))
}

export function validateCt(ct: CtWiring): ValidationIssue[] {
  return validateFields(CT_WIRING_FIELDS, toFieldValues(CT_WIRING_FIELDS, ct as unknown as Record<string, number>))
}

export function validateVt(vt: VtWiring): ValidationIssue[] {
  return validateFields(VT_WIRING_FIELDS, toFieldValues(VT_WIRING_FIELDS, vt as unknown as Record<string, number>))
}

export function evaluateBay(system: SystemParams, bay: Bay): BayEvaluation {
  const sysIssues = validateSystem(system)
  const ctIssues = validateCt(bay.ct)
  const vtIssues = validateVt(bay.vt)
  const issues = [...sysIssues, ...ctIssues, ...vtIssues]

  const canComputeShared = !hasErrors(issues)

  const ctWiring = canComputeShared ? calcCtWiring(bay.ct) : null
  const vtWiring = canComputeShared ? calcVtWiring(bay.vt) : null
  const fault = !hasErrors(sysIssues) ? calcFaultStudy(system) : null

  const ieds: IedEvaluation[] = bay.ieds.map((ied) => {
    const template = getTemplate(ied.templateId)
    const iedIssues = validateFields(template.fields, toFieldValues(template.fields, ied.params))
    const canRun = !hasErrors(iedIssues) && ctWiring !== null && fault !== null
    const adequacy = canRun
      ? template.runAdequacy({ ct: bay.ct, wiring: ctWiring!, fault: fault!, params: ied.params })
      : null
    return { ied, templateName: template.name, adequacy, issues: iedIssues }
  })

  const allIedIssues = ieds.flatMap((e) => e.issues)
  const ok = !hasErrors([...issues, ...allIedIssues]) && ieds.every((e) => e.adequacy !== null)

  return { ctWiring, vtWiring, fault, ieds, issues, ok }
}
