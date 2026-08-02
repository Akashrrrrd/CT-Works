import { type NextRequest, NextResponse } from "next/server"
import {
 SJ85Engine,
 SJ85ValidationException,
 SJ85_EXCEL_CONSTANTS,
 validateSJ85Input,
 type SJ85Input,
} from "@/lib/services/red670-calculations"

/**
 * POST /api/relay-formulas/7sj85
 * Runs the 7SJ85 (5P class, ALF/Kssc) CT adequacy engine.
 * Deterministic: same payload -> same result.
 */
export async function POST(req: NextRequest) {
 let payload: SJ85Input
 try {
 payload = (await req.json()) as SJ85Input
 } catch {
 return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
 }

 const errors = validateSJ85Input(payload)
 if (errors.length > 0) {
 return NextResponse.json({ error: "Input validation failed", validation_errors: errors }, { status: 400 })
 }

 try {
 const results = SJ85Engine.calculate(payload)
 return NextResponse.json({
 ...results,
 calculation_date: new Date().toISOString(),
 reference: {
 source: "Customer Excel template (single source of truth)",
 sheets: ["CT-VT Burdens", "BCU+OC-5P SEL751+7SJ85", "BCU+OC-5P SEL751+7SJ85 (2)"],
 parity: "Verified against 10 CT blocks across 5 Excel test cases - all Kssc values match to full double precision",
 },
 constants_used: SJ85_EXCEL_CONSTANTS,
 echo_input: payload,
 })
 } catch (error) {
 if (error instanceof SJ85ValidationException) {
 return NextResponse.json({ error: "Input validation failed", validation_errors: error.errors }, { status: 400 })
 }
 console.log("[v0] 7SJ85 calculation error:", error)
 return NextResponse.json(
 { error: "Calculation failed", details: error instanceof Error ? error.message : "Unknown error" },
 { status: 500 },
 )
 }
}

/**
 * GET /api/relay-formulas/7sj85
 * Returns the input schema, the formula chain and the Excel cell references.
 */
export async function GET() {
 return NextResponse.json({
 name: "7SJ85 Overcurrent + BCU - CT Adequacy (5P class)",
 method:
 "Accuracy Limiting Factor (Kssc) method per IEC 61869-2, transcribed from the customer Excel template. " +
 "This is a steady-state burden check and is deliberately different from the RED670 Ealreq/Vk transient method.",
 difference_from_red670: [
 "RED670 dimensions the CT on knee point voltage against a transient Ealreq, using DC factors a and k, the system X/R and per-fault time constants.",
 "7SJ85 dimensions the CT on its accuracy limiting factor n, comparing the required Kssc (Itkmax / Ipn) with the effective Kssc that the actual burden allows.",
 "The 7SJ85 sheet needs no sequence impedances, no fault-current study and no time constants - only Itkmax, the CT nameplate data and the connected burden.",
 ],
 input_schema: {
 itkmax_a: "number, A - max through fault current at close-in fault (S24). Provide this or bus_fault_level_ka.",
 bus_fault_level_ka: "number, kA - convenience alternative, multiplied by 1000 as per S24 ('Parameters & Fault Cal.'!Q10 * 1000)",
 ct_wiring: {
 conductor_cross_section_mm2: "mm2 ('CT-VT Burdens'!S10)",
 resistance_per_km_at_20c: "ohm/km at 20 C (S11)",
 lead_length_m: "m, CT to relay (S19)",
 operating_temperature_c: "optional, default 75 (S15)",
 alpha_per_k: "optional, default 0.00393 (S12)",
 },
 device_burdens: [
 {
 name: "string, e.g. 7SJ85 / SEL751 / FMS / AVR",
 burden_va: "VA at rated 1 A ('CT-VT Burdens'!Q54, Q55, Q92, Q88 ...)",
 },
 ],
 ct_taps: [
 {
 name: "optional label",
 core: "optional, e.g. Core3",
 ct_ratio_primary: "Ipn in A (H10 / J51 / L92)",
 ct_ratio_secondary: "In in A (O10 / O51 / O92)",
 ct_resistance_ohm: "Rct (H12 / J53 / L94)",
 rated_burden_va: "PN (H13 / J54 / L95)",
 accuracy_limiting_factor: "n, the 20 of 5P20 (I11 / K52 / M93)",
 class_of_accuracy: "optional string, e.g. 5P (H11)",
 },
 ],
 feeder: "optional label",
 description: "optional label",
 },
 formula_chain: {
 "1_lead_burden": [
 "R(t) = R20 x (1 + alpha x (t - 20)) 'CT-VT Burdens'!S15",
 "R per m = R(t) / 1000 S16",
 "2RL = 2 x R per m x lead length S21",
 "Pl = Is^2 x 2RL S22",
 ],
 "2_burdens": [
 "PE = In x In x Rct P22 / P63 / P103",
 "PL = SUM(device burdens) + Pl J22 / J63 / J103",
 "PN = CT rated burden from the nameplate S30 / S71 / S111",
 ],
 "3_kssc": [
 "Itkmax = bus fault level x 1000 S24",
 "Kssc required = Itkmax / Ipn G34 / G75 / G115",
 "Kssc available = n x ((PE + PN) / (PE + PL)) G38 / G79 / G119",
 ],
 "4_verdict": [
 "comparison = IF(available > required, '>', '<') F40 / F81 / F121",
 "Suitably Dimensioned when Kssc available > Kssc required G42 / G83 / G123",
 "the test is a STRICT greater-than, so an exact tie is reported as under dimensioned",
 ],
 "5_derived_engineering_outputs": [
 "Itkmax(max) = Kssc available x Ipn largest fault current the tap can serve",
 "Rct(max) = ((required x PL - n x PN) / (n - required)) / In^2 highest Rct that still passes",
 ],
 },
 constants: SJ85_EXCEL_CONSTANTS,
 example_input: {
 itkmax_a: 31500,
 ct_wiring: { conductor_cross_section_mm2: 2.5, resistance_per_km_at_20c: 7.41, lead_length_m: 150 },
 device_burdens: [
 { name: "7SJ85", burden_va: 0.02 },
 { name: "SEL751", burden_va: 0.02 },
 { name: "FMS", burden_va: 0.058 },
 { name: "AVR", burden_va: 0.2 },
 ],
 ct_taps: [
 {
 name: "Tap-1",
 core: "Core3",
 ct_ratio_primary: 3150,
 ct_ratio_secondary: 1,
 ct_resistance_ohm: 9,
 rated_burden_va: 7.5,
 accuracy_limiting_factor: 20,
 class_of_accuracy: "5P",
 },
 {
 name: "Tap-2",
 core: "Core3",
 ct_ratio_primary: 2000,
 ct_ratio_secondary: 1,
 ct_resistance_ohm: 5,
 rated_burden_va: 5,
 accuracy_limiting_factor: 20,
 class_of_accuracy: "5P",
 },
 ],
 },
 expected_output_for_example: {
 note: "Reproduces Excel test case 1, sheet 'BCU+OC-5P SEL751+7SJ85' exactly",
 lead_burden_va: 2.70350145,
 total_external_burden_va: 3.00150145,
 "Tap-1": { kssc_required: 10, kssc_available: 27.496559607548107, verdict: "Suitably Dimensioned" },
 "Tap-2": { kssc_required: 15.75, kssc_available: 24.99530884919105, verdict: "Suitably Dimensioned" },
 },
 })
}
