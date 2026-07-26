/**
 * The canonical formula catalogue.
 *
 * Every formula here is transcribed verbatim from a validated source — the
 * organization Excel templates ("7SJ85 RELAY TEMPLATE" / "RED 670 IED
 * TEMPLATE") — and NEVER invented (system-prompt rules #1, #2, #3).
 * The `source.ref` on each formula points back at the exact template section.
 */

import { type Formula, formulaRegistry } from "./formula"

const SQRT3 = Math.sqrt(3)
const TWO_PI = 2 * Math.PI

const excel = (ref: string) => ({ kind: "excel-template" as const, ref })

function def(f: Formula): Formula {
  return formulaRegistry.register(f)
}

/* ------------------------------------------------------------------ */
/* CT / VT wiring (shared across all IEDs in a bay)                    */
/* ------------------------------------------------------------------ */

export const F_WIRE_R75 = def({
  id: "WIRE.R75",
  label: "Conductor resistance at t°C",
  expression: "R20 · [1 + a·(t − 20)] / 1000",
  inputs: [
    { key: "R20", label: "Resistance at 20°C", unit: "ohm_per_km" },
    { key: "a", label: "Temp. coefficient", unit: "per_K" },
    { key: "t", label: "Temperature", unit: "degC" },
  ],
  outputUnit: "ohm_per_m",
  source: excel("Template › CT/VT Wiring › Resistance at t°C"),
  evaluate: ({ R20, a, t }) => (R20 * (1 + a * (t - 20))) / 1000,
})

export const F_WIRE_RLEAD = def({
  id: "WIRE.RLEAD",
  label: "Lead resistance (loop)",
  expression: "Rl = 2 · R · L",
  inputs: [
    { key: "R", label: "Resistance at t°C", unit: "ohm_per_m" },
    { key: "L", label: "Conductor length", unit: "m" },
  ],
  outputUnit: "ohm",
  source: excel("Template › CT/VT Wiring › Lead Resistance"),
  evaluate: ({ R, L }) => 2 * R * L,
})

export const F_WIRE_VA = def({
  id: "WIRE.VA",
  label: "Lead burden (VA consumption)",
  expression: "Pl = Is² · Rl",
  inputs: [
    { key: "Is", label: "CT secondary current", unit: "A" },
    { key: "Rl", label: "Lead resistance", unit: "ohm" },
  ],
  outputUnit: "VA",
  source: excel("Template › CT Wiring › VA consumption of leads"),
  evaluate: ({ Is, Rl }) => Is * Is * Rl,
})

/* ------------------------------------------------------------------ */
/* System fault study (RED 670 template)                              */
/* ------------------------------------------------------------------ */

export const F_FAULT_I = def({
  id: "FAULT.I",
  label: "Max. HV busbar fault current",
  expression: "I = Max. bus fault level × 1000",
  inputs: [{ key: "faultKA", label: "Max. bus fault level", unit: "kA" }],
  outputUnit: "A",
  source: excel("Template › Fault Current › Max. HV Busbar fault current"),
  evaluate: ({ faultKA }) => faultKA * 1000,
})

export const F_FAULT_V = def({
  id: "FAULT.V",
  label: "HV rating of busbar",
  expression: "V = Bus voltage level × 1000",
  inputs: [{ key: "busKV", label: "Bus voltage level", unit: "kV" }],
  outputUnit: "V",
  source: excel("Template › Fault Current › HV rating of busbar"),
  evaluate: ({ busKV }) => busKV * 1000,
})

export const F_FAULT_ZS = def({
  id: "FAULT.ZS",
  label: "Source impedance (magnitude)",
  expression: "Zs = (V × 1) / (√3 · I)",
  inputs: [
    { key: "V", label: "HV rating", unit: "V" },
    { key: "I", label: "Fault current", unit: "A" },
  ],
  outputUnit: "ohm",
  source: excel("Template › Fault Current › Source impedance Zs"),
  evaluate: ({ V, I }) => (V * 1) / (SQRT3 * I),
})

export const F_ANGLE = def({
  id: "FAULT.ANGLE",
  label: "Impedance angle",
  expression: "øs = tan⁻¹(X/R)",
  inputs: [{ key: "xr", label: "X/R ratio", unit: "ratio" }],
  outputUnit: "rad",
  source: excel("Template › Fault Current › Impedance angle"),
  evaluate: ({ xr }) => Math.atan(xr),
})

export const F_TP = def({
  id: "FAULT.TP",
  label: "System time constant (L/R)",
  expression: "tp = (X/R) / (2π·f) × 1000",
  inputs: [
    { key: "xr", label: "X/R ratio", unit: "ratio" },
    { key: "f", label: "System frequency", unit: "Hz" },
  ],
  outputUnit: "ms",
  source: excel("Template › Fault Current › System time-constant"),
  evaluate: ({ xr, f }) => (xr / (TWO_PI * f)) * 1000,
})

export const F_SIR = def({
  id: "FAULT.SIR",
  label: "Source Impedance Ratio",
  expression: "SIR = Zs / (0.8 · Z1L)",
  inputs: [
    { key: "Zs", label: "Source impedance", unit: "ohm" },
    { key: "Z1L", label: "+ve seq. line impedance", unit: "ohm" },
  ],
  outputUnit: "ratio",
  source: excel("Template › Fault Current › Source Impedance Ratio (SIR)"),
  evaluate: ({ Zs, Z1L }) => Zs / (0.8 * Z1L),
})

export const F_I3PH = def({
  id: "FAULT.I3PH",
  label: "3-ph fault current",
  expression: "I = (V × 1.0) / (|Z1| · √3)",
  inputs: [
    { key: "V", label: "HV rating", unit: "V" },
    { key: "Zmag", label: "Fault impedance |Z1|", unit: "ohm" },
  ],
  outputUnit: "A",
  source: excel("Template › Fault Current › 3-ph fault current"),
  evaluate: ({ V, Zmag }) => (V * 1.0) / (Zmag * SQRT3),
})

export const F_I1PH = def({
  id: "FAULT.I1PH",
  label: "1-ph to earth fault current",
  expression: "I = (V × 1.0 × 3) / (|Z0f| · √3)",
  inputs: [
    { key: "V", label: "HV rating", unit: "V" },
    { key: "Zmag", label: "Fault impedance |Z0f|", unit: "ohm" },
  ],
  outputUnit: "A",
  source: excel("Template › Fault Current › 1-ph to earth fault current"),
  evaluate: ({ V, Zmag }) => (V * 1.0 * 3) / (Zmag * SQRT3),
})

/* ------------------------------------------------------------------ */
/* RED 670 CT adequacy — Differential / Distance / Breaker failure     */
/* ------------------------------------------------------------------ */

export const F_RED_EAL_CLOSE = def({
  id: "RED.EAL.CLOSE",
  label: "Ealreq — close-in fault",
  expression: "Ikmax · (Isn/Ipn) · (Rct + Rl + Sr/Ir²)",
  inputs: [
    { key: "Ik", label: "Ikmax (close-in)", unit: "A" },
    { key: "Isn", label: "CT sec. rated current", unit: "A" },
    { key: "Ipn", label: "CT primary rated current", unit: "A" },
    { key: "Rct", label: "CT winding resistance", unit: "ohm" },
    { key: "Rl", label: "Lead resistance", unit: "ohm" },
    { key: "Sr", label: "Relay burden", unit: "VA" },
    { key: "Ir", label: "Relay rated current", unit: "A" },
  ],
  outputUnit: "V",
  source: excel("RED670 › Differential/Distance › Eal close-in (eq.1)"),
  evaluate: ({ Ik, Isn, Ipn, Rct, Rl, Sr, Ir }) => Ik * (Isn / Ipn) * (Rct + Rl + Sr / (Ir * Ir)),
})

export const F_RED_EAL_THROUGH = def({
  id: "RED.EAL.THROUGH",
  label: "Ealreq — through fault (differential)",
  expression: "2 · Itmax · (Isn/Ipn) · (Rct + Rl + Sr/Ir²)",
  inputs: [
    { key: "It", label: "Itmax (through)", unit: "A" },
    { key: "Isn", label: "CT sec. rated current", unit: "A" },
    { key: "Ipn", label: "CT primary rated current", unit: "A" },
    { key: "Rct", label: "CT winding resistance", unit: "ohm" },
    { key: "Rl", label: "Lead resistance", unit: "ohm" },
    { key: "Sr", label: "Relay burden", unit: "VA" },
    { key: "Ir", label: "Relay rated current", unit: "A" },
  ],
  outputUnit: "V",
  source: excel("RED670 › Differential › Eal through fault (eq.2)"),
  evaluate: ({ It, Isn, Ipn, Rct, Rl, Sr, Ir }) => 2 * It * (Isn / Ipn) * (Rct + Rl + Sr / (Ir * Ir)),
})

export const F_RED_EAL_ZONE = def({
  id: "RED.EAL.ZONE",
  label: "Ealreq — endzone-1 fault (distance)",
  expression: "Ikzone-1 · (Isn/Ipn) · k · (Rct + Rl + Sr/Ir²)",
  inputs: [
    { key: "Ik", label: "Ikzone-1", unit: "A" },
    { key: "Isn", label: "CT sec. rated current", unit: "A" },
    { key: "Ipn", label: "CT primary rated current", unit: "A" },
    { key: "k", label: "DC factor k", unit: "ratio" },
    { key: "Rct", label: "CT winding resistance", unit: "ohm" },
    { key: "Rl", label: "Lead resistance", unit: "ohm" },
    { key: "Sr", label: "Relay burden", unit: "VA" },
    { key: "Ir", label: "Relay rated current", unit: "A" },
  ],
  outputUnit: "V",
  source: excel("RED670 › Distance › Eal endzone-1 (eq.2)"),
  evaluate: ({ Ik, Isn, Ipn, k, Rct, Rl, Sr, Ir }) => Ik * (Isn / Ipn) * k * (Rct + Rl + Sr / (Ir * Ir)),
})

export const F_RED_EAL_DIST_CLOSE = def({
  id: "RED.EAL.DIST.CLOSE",
  label: "Ealreq — close-in fault (distance)",
  expression: "Ikmax · (Isn/Ipn) · a · (Rct + Rl + Sr/Ir²)",
  inputs: [
    { key: "Ik", label: "Ikmax (close-in)", unit: "A" },
    { key: "Isn", label: "CT sec. rated current", unit: "A" },
    { key: "Ipn", label: "CT primary rated current", unit: "A" },
    { key: "a", label: "DC factor a", unit: "ratio" },
    { key: "Rct", label: "CT winding resistance", unit: "ohm" },
    { key: "Rl", label: "Lead resistance", unit: "ohm" },
    { key: "Sr", label: "Relay burden", unit: "VA" },
    { key: "Ir", label: "Relay rated current", unit: "A" },
  ],
  outputUnit: "V",
  source: excel("RED670 › Distance › Eal close-in (eq.1)"),
  evaluate: ({ Ik, Isn, Ipn, a, Rct, Rl, Sr, Ir }) => Ik * (Isn / Ipn) * a * (Rct + Rl + Sr / (Ir * Ir)),
})

export const F_RED_EAL_BF = def({
  id: "RED.EAL.BF",
  label: "Ealreq — breaker failure",
  expression: "5 · Iop · (Isr/Ipr) · (Rct + Rl + Sr/Ir²)",
  inputs: [
    { key: "Iop", label: "Primary operate current", unit: "A" },
    { key: "Isr", label: "CT sec. rated current", unit: "A" },
    { key: "Ipr", label: "CT primary rated current", unit: "A" },
    { key: "Rct", label: "CT winding resistance", unit: "ohm" },
    { key: "Rl", label: "Lead resistance", unit: "ohm" },
    { key: "Sr", label: "Relay burden", unit: "VA" },
    { key: "Ir", label: "Relay rated current", unit: "A" },
  ],
  outputUnit: "V",
  source: excel("RED670 › Breaker Failure › Eal (eq.1)"),
  evaluate: ({ Iop, Isr, Ipr, Rct, Rl, Sr, Ir }) => 5 * Iop * (Isr / Ipr) * (Rct + Rl + Sr / (Ir * Ir)),
})

export const F_RED_VK = def({
  id: "RED.VK",
  label: "Required knee-point voltage",
  expression: "Vk = Ealreq × 0.8",
  inputs: [{ key: "Eal", label: "Highest Ealreq", unit: "V" }],
  outputUnit: "V",
  source: excel("RED670 › Required knee point voltage of the CT"),
  evaluate: ({ Eal }) => Eal * 0.8,
})

/* ------------------------------------------------------------------ */
/* 7SJ85 CT adequacy — overcurrent (Kssc method)                       */
/* ------------------------------------------------------------------ */

export const F_SJ_KSSC_REQ = def({
  id: "SJ.KSSC.REQ",
  label: "Required accuracy limit factor Kssc'",
  expression: "Kssc' = Itkmax / Ipn",
  inputs: [
    { key: "Itkmax", label: "Max. through fault (close-in)", unit: "A" },
    { key: "Ipn", label: "CT primary current", unit: "A" },
  ],
  outputUnit: "ratio",
  source: excel("7SJ85 › Required Kssc'"),
  evaluate: ({ Itkmax, Ipn }) => Itkmax / Ipn,
})

export const F_SJ_PE = def({
  id: "SJ.PE",
  label: "CT internal burden",
  expression: "PE = In² · Rct",
  inputs: [
    { key: "In", label: "Rated secondary current", unit: "A" },
    { key: "Rct", label: "CT winding resistance", unit: "ohm" },
  ],
  outputUnit: "VA",
  source: excel("7SJ85 › CT internal burden PE"),
  evaluate: ({ In, Rct }) => In * In * Rct,
})

export const F_SJ_KSSC_AVAIL = def({
  id: "SJ.KSSC.AVAIL",
  label: "Available (effective) Kssc'",
  expression: "n · [(PE + PN) / (PE + PL)]",
  inputs: [
    { key: "n", label: "CT accuracy limit factor (ALF)", unit: "ratio" },
    { key: "PE", label: "CT internal burden", unit: "VA" },
    { key: "PN", label: "Rated burden of CT", unit: "VA" },
    { key: "PL", label: "Lead + connected burden", unit: "VA" },
  ],
  outputUnit: "ratio",
  source: excel("7SJ85 › Available (effective) Kssc'"),
  evaluate: ({ n, PE, PN, PL }) => n * ((PE + PN) / (PE + PL)),
})
