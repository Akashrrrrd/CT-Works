import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { ABB_RET670_Calculator } from '@/lib/services/abb-ret670-calculations';

async function auth(req: NextRequest) {
 const token = req.cookies.get('auth-token')?.value;
 return token ? verifyJWT(token) : null;
}

/**
 * ABB RET670 CT ADEQUACY CALCULATION ENDPOINT
 * POST /api/relay-formulas/abb-ret670
 */
export async function POST(req: NextRequest) {
 const user = await auth(req);
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 try {
 const input = await req.json();
 
 // Validate required input structure
 const requiredSections = ['ct_parameters', 'system_parameters', 'connected_devices', 'wiring_parameters'];
 for (const section of requiredSections) {
 if (!input[section]) {
 return NextResponse.json({ 
 error: `Missing required section: ${section}` 
 }, { status: 400 });
 }
 }

 // Perform complete RET670 calculation
 const results = ABB_RET670_Calculator.performCompleteCalculation(input);

 // Validate against standard document
 const validation = ABB_RET670_Calculator.validateAgainstDocument(results);

 // Add calculation metadata
 const response = {
 template: 'ABB RET670',
 calculation_date: new Date().toISOString(),
 calculated_by: user.email,
 validation: validation,
 ...results
 };

 return NextResponse.json(response);

 } catch (error) {
 console.error('RET670 calculation error:', error);
 return NextResponse.json({ 
 error: 'Calculation failed', 
 details: error instanceof Error ? error.message : 'Unknown error'
 }, { status: 500 });
 }
}

/**
 * GET /api/relay-formulas/abb-ret670
 * Returns the RET670 template schema and example inputs
 */
export async function GET(req: NextRequest) {
 const user = await auth(req);
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 // Return template schema and example values from standard document
 const templateInfo = {
 name: 'ABB RET670 Transformer Protection CT Adequacy Calculation',
 description: 'Complete transformer differential protection CT adequacy check per Engineering standards ',
 document_reference: {
 title: 'CT/VT ADEQUACY CHECK - 132/33kV SUBSTATION ',
 document_no: '',
 date: '4/22/2026',
 contractor: 'STANDARD',
 application: 'Multi Func. Trans. Protection +HV REF'
 },
 example_input: {
 ct_parameters: {
 ct_ratio_tap1: 3200, // A (HV side)
 ct_ratio_tap2: 600, // A (LV side - typically used)
 ct_ratio_tap3: 0, // A (optional)
 ct_ratio_secondary: 1, // A
 class_of_accuracy: 'PX', // Class
 ct_resistance: 16, // Ω
 knee_point_voltage: 1600, // V
 magnetizing_current: 10 // mA
 },
 system_parameters: {
 system_frequency: 50, // Hz
 hv_bus_voltage: 132, // kV
 mv_bus_voltage: 33, // kV (estimated)
 max_hv_fault_current: 50000, // A
 max_mv_fault_current: 40000, // A
 transformer_rating_mva: 100, // MVA
 percentage_impedance: 25 // %
 },
 wiring_parameters: {
 total_lead_resistance: 1.10, // Ω
 conductor_length: 120, // m
 conductor_cross_section: 6.0, // mm²
 resistance_per_km: 3.69 // Ω/km
 },
 connected_devices: {
 ret670_burden: 0.02, // VA
 other_devices_burden: 0 // VA
 }
 },
 expected_outputs: {
 final_verdict: 'SUITABLY DIMENSIONED',
 transformer_calculations: {
 hv_full_load_current: 437.39, // A (from document)
 rated_mva: 100
 },
 ealreq_calculations: {
 equation_1_result: 90.04, // V (from document page 7)
 equation_2_result: 96.04, // V (from document page 7) 
 equation_3_result: 274.47, // V (from document page 8)
 controlling_equation: 3,
 highest_ealreq: 274.47 // V (controlling)
 },
 ct_adequacy_check: {
 required_vk: 219.57, // V (274.47 × 0.8)
 available_vk: 1600, // V (CT specification)
 suitable: true,
 verdict: 'SUITABLY DIMENSIONED'
 }
 },
 calculation_formulas: {
 transformer_current: 'Int = MVA × 1000 / (√3 × Un)',
 ealreq_equation_1: 'Ealreq = 30 × Int × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))',
 ealreq_equation_2: 'Ealreq = 2 × Itf × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))',
 ealreq_equation_3: 'Ealreq = If × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))',
 required_vk: 'Vk = Ealreq × 0.8 (per ABB manufacturer reference)'
 }
 };

 return NextResponse.json(templateInfo);
}