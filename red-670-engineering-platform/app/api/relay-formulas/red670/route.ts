import { type NextRequest, NextResponse } from "next/server"
import {
 RED670Engine,
 RED670ValidationException,
 RED670_EXCEL_CONSTANTS,
 validateRED670Input,
 type RED670Input,
} from "@/lib/services/red670-calculations"

/**
 * POST /api/relay-formulas/red670
 * Runs the RED670 CT adequacy engine. Deterministic: same payload -> same result.
 */
export async function POST(req: NextRequest) {
 let payload: RED670Input
 try {
 payload = (await req.json()) as RED670Input
 } catch {
 return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
 }

 const errors = validateRED670Input(payload)
 if (errors.length > 0) {
 return NextResponse.json({ error: "Input validation failed", validation_errors: errors }, { status: 400 })
 }

 try {
 const results = RED670Engine.calculate(payload)
 return NextResponse.json({
 ...results,
 calculation_date: new Date().toISOString(),
 reference: {
 source: "Customer Excel template (single source of truth)",
 sheets: ["CT-VT Burdens", "Parameters & Fault Cal.", "IFP1-RED670"],
 parity: "Verified against 5 Excel test cases - all Ealreq / Vk values match to full double precision",
 },
 constants_used: RED670_EXCEL_CONSTANTS,
 echo_input: payload,
 })
 } catch (error) {
 if (error instanceof RED670ValidationException) {
 return NextResponse.json(
 { error: "Input validation failed", validation_errors: error.errors },
 { status: 400 },
 )
 }
 console.log("[v0] RED670 calculation error:", error)
 return NextResponse.json(
 { error: "Calculation failed", details: error instanceof Error ? error.message : "Unknown error" },
 { status: 500 },
 )
 }
}

/**
 * GET /api/relay-formulas/red670
 * Returns the input schema, the formula chain and the Excel cell references.
 */
export async function GET() {
 return NextResponse.json({
 name: "RED670 Line Differential & Distance Protection - CT Adequacy",
 method: "Ealreq / Vk method, transcribed from the customer Excel template",
 input_schema: {
 system: {
 bus_fault_level_ka: "number, kA ('Parameters & Fault Cal.'!Q10)",
 system_frequency_hz: "number, Hz (Q8)",
 bus_voltage_kv: "number, kV (Q9)",
 xr_ratio: "number (Q11)",
 voltage_pu: "optional number, default 1 (Q37)",
 },
 line: {
 positive_sequence_resistance: "ohm/km (Q20)",
 positive_sequence_reactance: "ohm/km (Q21)",
 zero_sequence_resistance: "ohm/km (Q22)",
 zero_sequence_reactance: "ohm/km (Q23)",
 route_length_km: "km (Q24)",
 cables_per_phase: "optional number, default 1 (N17)",
 },
 ct_wiring: {
 conductor_cross_section_mm2: "mm2 ('CT-VT Burdens'!S10)",
 resistance_per_km_at_20c: "ohm/km at 20 C (S11)",
 lead_length_m: "m, CT to relay (S19)",
 operating_temperature_c: "optional, default 75 (S15)",
 alpha_per_k: "optional, default 0.00393 (S12)",
 },
 vt_wiring: "same three fields for the VT loop (S28 / S29 / S37), optional",
 relay_rated_current: "Ir in A (S18)",
 ct_taps: [
 {
 name: "optional label",
 ct_ratio_primary: "Ipn in A (H10 / J129 / L249)",
 ct_ratio_secondary: "Isn in A (O10)",
 class_of_accuracy: "optional string (H11)",
 ct_resistance_ohm: "Rct (H12 / J131)",
 knee_point_voltage_v: "available Vk (H13 / J132)",
 magnetizing_current_ma: "optional I0 at Vk (H14 / J133)",
 },
 ],
 device_burdens: [{ name: "string", burden_va: "VA (Q48 = 0.02 for 670/650 series)", is_protected_relay: "bool" }],
 dc_factors: {
 a_within_threshold: "default 1 for tp <= 400 ms (Q88)",
 a_beyond_threshold: "optional - the template leaves this row blank",
 k_within_threshold: "default 3 for tp <= 200 ms (Q92)",
 k_beyond_threshold: "optional - the template leaves this row blank",
 },
 },
 formula_chain: {
 "1_lead_resistance": [
 "R(t) = R20 x (1 + alpha x (t - 20)) 'CT-VT Burdens'!S15",
 "R per m = R(t) / 1000 S16",
 "2RL = 2 x R per m x lead length S21",
 "Pl = Isn^2 x 2RL S22",
 "Sl = Sr' + other device burdens + Pl 'IFP1-RED670'!J22",
 "Rl = Sl / (Isn x Isn) P21",
 ],
 "2_source_and_line": [
 "Ikmax = bus fault level x 1000 Q32",
 "V = bus voltage x 1000 Q33",
 "Zs = (V x pu) / (sqrt3 x Ikmax) Q38",
 "phi = atan(X/R); Rs = Zs cos phi; Xs = Zs sin phi Q43/Q46/Q47",
 "Z1L = (R1/n + jX1/n) x route length L28/O28",
 "Z0L = (R0/n + jX0/n) x route length L29/O29",
 "SIR = Zs / (0.8 x |Z1L|) E52",
 "tp = (X/R x 1000) / (2 x (22/7) x f) Q59 (template uses 22/7 for pi)",
 ],
 "3_fault_currents": [
 "3-ph through: Z1t = Zs + Z1L, I = V x pu / (|Z1t| x sqrt3) M70",
 "1-ph through: Z0t = Zs + Z0L, Z0f = Z1t + Z1t + Z0t,",
 " I = (V x pu x 3) / (|Z0f| x sqrt3) M91",
 "3-ph endzone-1: Z1z = Zs + 0.8 x Z1L, I = V x pu / (|Z1z| x sqrt3) M110",
 "1-ph endzone-1: Z0z = Zs + 0.8 x Z0L, Z0fz = Z1z + Z1z + Z0z,",
 " I = (V x pu x 3) / (|Z0fz| x sqrt3) M131",
 "each case carries its own X/R = X/R of the impedance used, and its own tp",
 ],
 "4_ealreq_per_tap": [
 "bracket = Rct + Rl + Sr / (Ir x Ir)",
 "Differential close-in: Ealreq = Ikmax x (Isn/Ipn) x bracket D50",
 "Differential through 3-ph: Ealreq = 2 x It3 x (Isn/Ipn) x bracket D56",
 "Differential through 1-ph: Ealreq = 2 x It1 x (Isn/Ipn) x bracket D62",
 "Distance close-in: Ealreq = Ikmax x (Isn/Ipn) x a x bracket D99",
 "Distance endzone-1 3-ph: Ealreq = Iz3 x (Isn/Ipn) x k x bracket D106",
 "Distance endzone-1 1-ph: Ealreq = Iz1 x (Isn/Ipn) x k x bracket D113",
 "a = 1 while system tp <= 400 ms (Q88 / Q95)",
 "k = 3 while the fault tp <= 200 ms (Q92 / Q102 / Q109)",
 ],
 "5_verdict": [
 "Ealreq(max) = MAX(the six values above) Q115",
 "Vk required = Ealreq(max) x 0.8 Q118-Q120",
 "Suitably Dimensioned when Vk available > Vk required H123",
 ],
 },
 constants: RED670_EXCEL_CONSTANTS,
 example_input: {
 system: { bus_fault_level_ka: 31.5, system_frequency_hz: 50, bus_voltage_kv: 33, xr_ratio: 40, voltage_pu: 1 },
 line: {
 positive_sequence_resistance: 0.0221,
 positive_sequence_reactance: 0.16,
 zero_sequence_resistance: 0.13,
 zero_sequence_reactance: 0.06,
 route_length_km: 0.2,
 cables_per_phase: 1,
 },
 ct_wiring: { conductor_cross_section_mm2: 2.5, resistance_per_km_at_20c: 7.41, lead_length_m: 150 },
 vt_wiring: { conductor_cross_section_mm2: 2.5, resistance_per_km_at_20c: 7.41, lead_length_m: 150 },
 relay_rated_current: 1,
 ct_taps: [
 {
 name: "Tap-1",
 ct_ratio_primary: 2500,
 ct_ratio_secondary: 1,
 class_of_accuracy: "PX-A",
 ct_resistance_ohm: 5,
 knee_point_voltage_v: 3750,
 magnetizing_current_ma: 60,
 },
 {
 name: "Tap-2",
 ct_ratio_primary: 1500,
 ct_ratio_secondary: 1,
 class_of_accuracy: "PX-A",
 ct_resistance_ohm: 3,
 knee_point_voltage_v: 200,
 magnetizing_current_ma: 100,
 },
 ],
 device_burdens: [{ name: "RED670", burden_va: 0.02, is_protected_relay: true }],
 },
 expected_output_for_example: {
 note: "Reproduces Excel test case 1 exactly",
 "Tap-1": { highest_ealreq_v: 283.0843923361499, vk_required_v: 226.46751386891992, verdict: "Suitably Dimensioned" },
 "Tap-2": { highest_ealreq_v: 349.94841122660466, vk_required_v: 279.95872898128374, verdict: "Under Dimensioned" },
 },
 })
}
