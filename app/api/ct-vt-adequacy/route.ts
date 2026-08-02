/**
 * CT/VT ADEQUACY CHECK API ENDPOINT
 * Handles automated calculations from web interface
 */

import { NextRequest, NextResponse } from 'next/server';
import { AutomatedCalculationEngine } from '@/lib/services/automated-calculation-engine';
import type { CTVTAdequacyInput } from '@/lib/types/ct-vt-adequacy-types';

export async function POST(request: NextRequest) {
 try {
 const input: CTVTAdequacyInput = await request.json();
 
 // Validate input
 if (!input.system || !input.ct_wiring || !input.transmission_line || !input.ieds) {
 return NextResponse.json(
 { error: 'Missing required input parameters' },
 { status: 400 }
 );
 }
 
 if (input.ieds.length === 0) {
 return NextResponse.json(
 { error: 'At least one IED must be specified' },
 { status: 400 }
 );
 }
 
 // Perform calculations
 const report = AutomatedCalculationEngine.performCompleteAnalysis(input);
 
 return NextResponse.json(report);
 
 } catch (error) {
 console.error('CT/VT adequacy calculation error:', error);
 return NextResponse.json(
 { 
 error: 'Calculation failed', 
 details: error instanceof Error ? error.message : 'Unknown error'
 },
 { status: 500 }
 );
 }
}

export async function GET() {
 return NextResponse.json({
 message: 'CT/VT Adequacy Check API',
 version: '1.0.0',
 endpoints: {
 'POST /': 'Calculate CT/VT adequacy for given parameters',
 'GET /ieds': 'Get list of available IEDs',
 'GET /templates': 'Get system configuration templates'
 }
 });
}