/**
 * Formula Engine.
 *
 * A `Formula` is a validated, self-describing unit of engineering logic.
 * Per system-prompt rule #5, every formula declares its Inputs, Units,
 * Formula identifier, Output and validation. Formulas are pure functions:
 * given tagged inputs they return a tagged output plus a human-readable trace
 * (rule #10 — deterministic and traceable).
 *
 * Rule #1/#2: formulas are NEVER invented here. Each carries a `source`
 * pointing at the originating Excel template / IEC clause / manual.
 */

import type { Unit } from "./units"

export type FormulaSource =
  | { kind: "excel-template"; ref: string }
  | { kind: "iec"; ref: string }
  | { kind: "manufacturer"; ref: string }
  | { kind: "engineer"; ref: string }

export interface FormulaInputSpec {
  key: string
  label: string
  unit: Unit
}

export interface Formula {
  /** Stable formula identifier used in every trace line. */
  id: string
  label: string
  /** Human-readable expression, e.g. "R20 × [1 + a(t − 20)] / 1000". */
  expression: string
  inputs: FormulaInputSpec[]
  outputUnit: Unit
  source: FormulaSource
  /** Pure evaluation. Inputs are keyed numeric values already unit-checked. */
  evaluate: (inputs: Record<string, number>) => number
}

/**
 * A single executed calculation step, retained for the report/trace.
 * Records the exact input values used so any result can be re-derived by hand.
 */
export interface TraceStep {
  formulaId: string
  label: string
  expression: string
  substitution: string
  inputs: { label: string; value: number; unit: Unit }[]
  output: { value: number; unit: Unit }
  source: FormulaSource
}

/** Central registry so formulas can be looked up and audited by id. */
export class FormulaRegistry {
  private formulas = new Map<string, Formula>()

  register(formula: Formula): Formula {
    if (this.formulas.has(formula.id)) {
      throw new Error(`Duplicate formula id: ${formula.id}`)
    }
    this.formulas.set(formula.id, formula)
    return formula
  }

  get(id: string): Formula {
    const f = this.formulas.get(id)
    if (!f) throw new Error(`Unknown formula id: ${id}`)
    return f
  }

  all(): Formula[] {
    return [...this.formulas.values()]
  }
}

export const formulaRegistry = new FormulaRegistry()

/**
 * Executes a formula, producing both the numeric result and a `TraceStep`.
 * `substitution` is an optional pre-rendered "numbers plugged in" string; when
 * omitted a generic one is built from the input values.
 */
export function runFormula(
  formula: Formula,
  inputs: Record<string, number>,
  substitution?: string,
): { value: number; step: TraceStep } {
  const value = formula.evaluate(inputs)
  const inputLines = formula.inputs.map((spec) => ({
    label: spec.label,
    value: inputs[spec.key],
    unit: spec.unit,
  }))
  const step: TraceStep = {
    formulaId: formula.id,
    label: formula.label,
    expression: formula.expression,
    substitution: substitution ?? defaultSubstitution(formula, inputs),
    inputs: inputLines,
    output: { value, unit: formula.outputUnit },
    source: formula.source,
  }
  return { value, step }
}

function defaultSubstitution(formula: Formula, inputs: Record<string, number>): string {
  const parts = formula.inputs.map((spec) => `${spec.key}=${format(inputs[spec.key])}`)
  return `${parts.join(", ")} → ${format(formula.evaluate(inputs))}`
}

function format(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return Number(value.toPrecision(6)).toString()
}
