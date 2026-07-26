/**
 * Minimal complex-number helpers for power-system impedance arithmetic.
 *
 * Impedances are stored as rectangular components Z = r + jx (both in ohms).
 * The templates express fault impedances as complex sums and report both the
 * magnitude |Z| and the X/R angle, so those are provided as first-class ops.
 */

export interface Complex {
  re: number // resistance component (Ω)
  im: number // reactance component (Ω)
}

export function cplx(re: number, im: number): Complex {
  return { re, im }
}

export function add(...values: Complex[]): Complex {
  return values.reduce((acc, z) => ({ re: acc.re + z.re, im: acc.im + z.im }), { re: 0, im: 0 })
}

export function scale(z: Complex, k: number): Complex {
  return { re: z.re * k, im: z.im * k }
}

/** |Z| = sqrt(r^2 + x^2) */
export function magnitude(z: Complex): number {
  return Math.hypot(z.re, z.im)
}

/** X/R ratio = im / re */
export function xrRatio(z: Complex): number {
  return z.im / z.re
}

/** Impedance angle in degrees = atan(x / r) */
export function angleDeg(z: Complex): number {
  return (Math.atan2(z.im, z.re) * 180) / Math.PI
}

export function formatComplex(z: Complex, digits = 4): string {
  const r = round(z.re, digits)
  const x = round(z.im, digits)
  const sign = x >= 0 ? "+" : "−"
  return `${r} ${sign} j${Math.abs(x)}`
}

function round(value: number, digits: number): number {
  return Number(value.toPrecision(digits))
}
