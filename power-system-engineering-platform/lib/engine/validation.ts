/**
 * Validation Engine.
 *
 * Runs BEFORE the calculation engine (system-prompt rules #8 and #5).
 * Responsibilities:
 *   1. Dimensional consistency — every supplied value must carry the unit the
 *      field expects.
 *   2. Value rules — required, positive, ranges, etc.
 *
 * The engine returns structured issues rather than throwing, so the UI can
 * surface field-level errors and block calculation until inputs are valid.
 */

import type { Unit } from "./units"

export type Severity = "error" | "warning"

export interface ValidationIssue {
  field: string
  message: string
  severity: Severity
}

export interface FieldRule {
  key: string
  label: string
  unit: Unit
  required?: boolean
  /** Must be strictly greater than zero. */
  positive?: boolean
  min?: number
  max?: number
}

export interface FieldValue {
  value: number | undefined
  unit: Unit
}

/**
 * Validate a set of field values against their rules.
 * Checks both the declared unit (dimensional consistency) and value rules.
 */
export function validateFields(
  rules: FieldRule[],
  values: Record<string, FieldValue | undefined>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const rule of rules) {
    const fv = values[rule.key]

    if (fv === undefined || fv.value === undefined || Number.isNaN(fv.value)) {
      if (rule.required) {
        issues.push({ field: rule.key, message: `${rule.label} is required.`, severity: "error" })
      }
      continue
    }

    // Dimensional consistency: the provided unit must match the expected unit.
    if (fv.unit !== rule.unit) {
      issues.push({
        field: rule.key,
        message: `${rule.label} has inconsistent units (expected ${rule.unit}, got ${fv.unit}).`,
        severity: "error",
      })
      continue
    }

    if (rule.positive && fv.value <= 0) {
      issues.push({ field: rule.key, message: `${rule.label} must be greater than zero.`, severity: "error" })
    }
    if (rule.min !== undefined && fv.value < rule.min) {
      issues.push({ field: rule.key, message: `${rule.label} must be ≥ ${rule.min}.`, severity: "error" })
    }
    if (rule.max !== undefined && fv.value > rule.max) {
      issues.push({ field: rule.key, message: `${rule.label} must be ≤ ${rule.max}.`, severity: "error" })
    }
  }

  return issues
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error")
}
