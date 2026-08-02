import { NextRequest, NextResponse } from 'next/server';
import { RED670_Calculator, RED670_Calculation_Input } from '@/lib/services/red670-calculations';

/**
 * POST /api/relay-formulas/red670
 * Executes the RED670 CT adequacy calculation
 */
export async function POST(req: NextRequest) {
 try {
 const input: RED670_Calculation_Input = await req.json();

 if (!input.system || !input.ct_wiring || !input.cable || !input.taps) {
 return NextResponse.json(
 { error: 'Missing required sections: system, ct_wiring, cable, and taps are required' },
 { status: 400 }
 );
 }

 const results = RED670_Calculator.performCompleteCalculation(input);

 return NextResponse.json({
 success: true,
 timestamp: new Date().toISOString(),
 ...results,
 });
 } catch (error) {
 console.error('RED670 calculation engine error:', error);
 return NextResponse.json(
 {
 error: 'Calculation execution failed',
 details: error instanceof Error ? error.message : 'Unknown engineering calculation error',
 },
 { status: 500 }
 );
 }
}

/**
 * GET /api/relay-formulas/red670
 * Returns the calculation engine schema, documentation reference, and reference inputs
 */
export async function GET() {
 return NextResponse.json({
 template: 'RED670 Line Protection CT Adequacy Engine',
 standard: 'Engineering Technical Specification ',
 description: 'Line Differential (87L) & Distance Protection (21) CT Knee-Point Voltage Adequacy Engine',
 input_schema: {
 system: ['bus_fault_level_ka', 'system_frequency', 'bus_voltage_kv', 'xr_ratio'],
 ct_wiring: ['conductor_cross_section', 'resistance_20c_per_km', 'lead_length'],
 vt_wiring: ['conductor_cross_section', 'resistance_20c_per_km', 'lead_length'],
 cable: ['positive_sequence_resistance', 'positive_sequence_reactance', 'zero_sequence_resistance', 'zero_sequence_reactance', 'route_length'],
 taps: {
 tap1: ['ct_ratio_primary', 'ct_ratio_secondary', 'class_of_accuracy', 'ct_resistance', 'magnetizing_current', 'knee_point_voltage'],
 tap2: ['ct_ratio_primary', 'ct_ratio_secondary', 'class_of_accuracy', 'ct_resistance', 'magnetizing_current', 'knee_point_voltage'],
 },
 },
 reference_example: {
 system: { bus_fault_level_ka: 31.5, system_frequency: 50, bus_voltage_kv: 33, xr_ratio: 40 },
 ct_wiring: { conductor_cross_section: 2.5, resistance_20c_per_km: 7.41, lead_length: 150 },
 cable: { positive_sequence_resistance: 0.0221, positive_sequence_reactance: 0.16, zero_sequence_resistance: 0.13, zero_sequence_reactance: 0.06, route_length: 0.2 },
 taps: {
 tap1: { ct_ratio_primary: 2500, ct_ratio_secondary: 1, class_of_accuracy: 'PX', ct_resistance: 5.0, magnetizing_current: 60, knee_point_voltage: 3750 },
 tap2: { ct_ratio_primary: 1500, ct_ratio_secondary: 1, class_of_accuracy: 'PX', ct_resistance: 3.0, magnetizing_current: 100, knee_point_voltage: 200 },
 },
 },
 });
}
