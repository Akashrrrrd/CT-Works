/**
 * Domain model for the CT/VT adequacy platform.
 *
 * Hierarchy (rule #7 — parameters cascade downward and are reused, never
 * re-prompted):
 *   Project  → system + cable parameters (shared by every bay & IED)
 *     Bay    → CT/VT wiring parameters (shared by every IED in the bay)
 *       IED  → connected-device parameters (CT ratio, Rct, available Vk…)
 */

import type { FieldRule } from "./validation"

/* ----------------------------- constants ------------------------------ */

/** Operating temperature used for the 75°C resistance calculation. */
export const OPERATING_TEMP_C = 75
/** Copper temperature coefficient (K⁻¹) used by the templates. */
export const COPPER_ALPHA = 0.00393

/* ------------------------------ records -------------------------------- */

export interface SystemParams {
  frequencyHz: number
  busVoltageKV: number
  maxFaultKA: number
  xrRatio: number
  // Cable / power line parameters
  r1: number // +ve seq resistance Ω/km
  x1: number // +ve seq reactance Ω/km
  r0: number // zero seq resistance Ω/km
  x0: number // zero seq reactance Ω/km
  routeLengthKm: number
}

export interface CtWiring {
  areaMm2: number
  r20: number // Ω/km at 20°C
  alpha: number // K⁻¹
  secondaryCurrentA: number // Is
  relayRatedCurrentA: number // Ir
  lengthM: number // CT → relay
  tempC: number
}

export interface VtWiring {
  areaMm2: number
  r20: number
  alpha: number
  primaryKV: number
  secondaryKV: number
  lengthM: number
  tempC: number
}

export interface Bay {
  id: string
  projectId: string
  name: string
  voltageClass?: string
  ct: CtWiring
  vt: VtWiring
  ieds: IedInstance[]
}

export interface IedInstance {
  id: string
  bayId: string
  templateId: string
  name: string
  /** Connected-device parameters keyed by the template's field schema. */
  params: Record<string, number>
}

export interface Project {
  id: string
  name: string
  client?: string
  substation?: string
  description?: string
  system: SystemParams
  bays: Bay[]
  createdAt: number
  updatedAt: number
}

/* --------------------------- field schemas ----------------------------- */
/**
 * Field rules double as the form schema (labels + units) AND the validation
 * spec, keeping UI and engine in sync from a single source.
 */

export const SYSTEM_FIELDS: FieldRule[] = [
  { key: "frequencyHz", label: "System frequency", unit: "Hz", required: true, positive: true },
  { key: "busVoltageKV", label: "Bus voltage level", unit: "kV", required: true, positive: true },
  { key: "maxFaultKA", label: "Max. bus fault level", unit: "kA", required: true, positive: true },
  { key: "xrRatio", label: "X/R ratio", unit: "ratio", required: true, positive: true },
  { key: "r1", label: "+ve seq. resistance R1", unit: "ohm_per_km", required: true, positive: true },
  { key: "x1", label: "+ve seq. reactance X1", unit: "ohm_per_km", required: true, positive: true },
  { key: "r0", label: "Zero seq. resistance R0", unit: "ohm_per_km", required: true, positive: true },
  { key: "x0", label: "Zero seq. reactance X0", unit: "ohm_per_km", required: true, positive: true },
  { key: "routeLengthKm", label: "Route length", unit: "km", required: true, positive: true },
]

export const CT_WIRING_FIELDS: FieldRule[] = [
  { key: "areaMm2", label: "Conductor cross-section", unit: "mm2", required: true, positive: true },
  { key: "r20", label: "Resistance at 20°C", unit: "ohm_per_km", required: true, positive: true },
  { key: "alpha", label: "Temp. coefficient a", unit: "per_K", required: true, positive: true },
  { key: "secondaryCurrentA", label: "CT secondary current Is", unit: "A", required: true, positive: true },
  { key: "relayRatedCurrentA", label: "Relay rated current Ir", unit: "A", required: true, positive: true },
  { key: "lengthM", label: "Conductor length (CT→relay)", unit: "m", required: true, positive: true },
  { key: "tempC", label: "Temperature", unit: "degC", required: true },
]

export const VT_WIRING_FIELDS: FieldRule[] = [
  { key: "areaMm2", label: "Conductor cross-section", unit: "mm2", required: true, positive: true },
  { key: "r20", label: "Resistance at 20°C", unit: "ohm_per_km", required: true, positive: true },
  { key: "alpha", label: "Temp. coefficient a", unit: "per_K", required: true, positive: true },
  { key: "primaryKV", label: "VT primary voltage Vp", unit: "kV", required: true, positive: true },
  { key: "secondaryKV", label: "VT secondary voltage Vs", unit: "kV", required: true, positive: true },
  { key: "lengthM", label: "Conductor length (VT→relay)", unit: "m", required: true, positive: true },
  { key: "tempC", label: "Temperature", unit: "degC", required: true },
]

/* ---------------------------- factory defaults -------------------------- */

export function defaultSystem(): SystemParams {
  return {
    frequencyHz: 50,
    busVoltageKV: 132,
    maxFaultKA: 50,
    xrRatio: 15,
    r1: 0.0221,
    x1: 0.16,
    r0: 0.13,
    x0: 0.06,
    routeLengthKm: 1.74,
  }
}

export function defaultCtWiring(): CtWiring {
  return {
    areaMm2: 6,
    r20: 3.69,
    alpha: COPPER_ALPHA,
    secondaryCurrentA: 1,
    relayRatedCurrentA: 1,
    lengthM: 120,
    tempC: OPERATING_TEMP_C,
  }
}

export function defaultVtWiring(): VtWiring {
  return {
    areaMm2: 2.5,
    r20: 8.87,
    alpha: COPPER_ALPHA,
    primaryKV: 132 / Math.sqrt(3),
    secondaryKV: 0.11 / Math.sqrt(3),
    lengthM: 120,
    tempC: OPERATING_TEMP_C,
  }
}
