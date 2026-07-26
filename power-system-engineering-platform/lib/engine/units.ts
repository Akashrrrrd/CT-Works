/**
 * Engineering unit system.
 *
 * Every quantity that flows through the calculation engine carries a `Unit`.
 * The validation engine uses these tags to enforce dimensional consistency
 * BEFORE any formula executes (system-prompt rule #8).
 *
 * Units are intentionally explicit strings rather than a full dimensional
 * algebra: the templates work in a fixed, well-known set of engineering units,
 * and being explicit keeps every reported value traceable (rule #10).
 */

export type Unit =
  | "mm2" // conductor cross-section
  | "ohm_per_km"
  | "ohm_per_m"
  | "ohm"
  | "per_K" // temperature coefficient (K^-1)
  | "A" // amperes
  | "kA"
  | "V"
  | "kV"
  | "VA"
  | "m" // metres
  | "km"
  | "Hz"
  | "degC"
  | "deg" // angle degrees
  | "rad"
  | "ms"
  | "ratio" // dimensionless ratio (X/R, SIR, Kssc, turns...)
  | "unitless"

export const UNIT_LABEL: Record<Unit, string> = {
  mm2: "mm²",
  ohm_per_km: "Ω/km",
  ohm_per_m: "Ω/m",
  ohm: "Ω",
  per_K: "K⁻¹",
  A: "A",
  kA: "kA",
  V: "V",
  kV: "kV",
  VA: "VA",
  m: "m",
  km: "km",
  Hz: "Hz",
  degC: "°C",
  deg: "°",
  rad: "rad",
  ms: "ms",
  ratio: "",
  unitless: "",
}

/** A physical quantity: a numeric value tagged with its engineering unit. */
export interface Quantity {
  value: number
  unit: Unit
}

export function q(value: number, unit: Unit): Quantity {
  return { value, unit }
}

/** Format a quantity for display with a sensible number of significant digits. */
export function formatQuantity(quantity: Quantity, digits = 4): string {
  const label = UNIT_LABEL[quantity.unit]
  const num = formatNumber(quantity.value, digits)
  return label ? `${num} ${label}` : num
}

export function formatNumber(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "—"
  if (value === 0) return "0"
  const abs = Math.abs(value)
  // Large magnitudes (fault currents) look best as integers with separators.
  if (abs >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 })
  // Otherwise show up to `digits` significant figures without trailing noise.
  return Number(value.toPrecision(digits)).toString()
}
