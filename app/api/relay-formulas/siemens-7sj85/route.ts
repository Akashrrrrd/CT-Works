import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { Siemens7SJ85Calculator } from '@/lib/services/siemens-7sj85-calculations';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

/**
 * SIEMENS 7SJ85 CT/VT ADEQUACY CALCULATION ENDPOINT
 * POST /api/relay-formulas/siemens-7sj85
 */
export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const input = await req.json();
    
    // Validate required input structure
    const requiredSections = ['ct_wiring', 'system', 'power_line', 'ct_core', 'connected_devices'];
    for (const section of requiredSections) {
      if (!input[section]) {
        return NextResponse.json({ 
          error: `Missing required section: ${section}` 
        }, { status: 400 });
      }
    }

    // Perform complete 7SJ85 calculation
    const results = Siemens7SJ85Calculator.performCompleteCalculation(input);

    // Add calculation metadata
    const response = {
      template: 'SIEMENS 7SJ85',
      document_reference: 'N-19957 2-DF4W',
      calculation_date: new Date().toISOString(),
      calculated_by: user.email,
      ...results
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('7SJ85 calculation error:', error);
    return NextResponse.json({ 
      error: 'Calculation failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/relay-formulas/siemens-7sj85
 * Returns the 7SJ85 template schema and example inputs
 */
export async function GET(req: NextRequest) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Return template schema and example values from Hitachi document
  const templateInfo = {
    name: 'SIEMENS 7SJ85 CT/VT Adequacy Calculation',
    description: 'Complete CT/VT adequacy check per Hitachi standards N-19957 2-DF4W',
    document_reference: {
      title: 'CT/VT ADEQUACY CHECK - 132/33kV SUBSTATION DF4W AT AL DHAFRA AREA',
      document_no: 'N-19957 2-DF4W',
      date: '4/22/2026',
      contractor: 'HITACHI'
    },
    example_input: {
      ct_wiring: {
        conductor_cross_section: 6.00,      // mm²
        resistance_w_km_20c: 3.69,          // Ω/km
        specific_resistance_20c: 0.00393,   // /K⁻¹
        conductor_length_m: 120             // m
      },
      vt_wiring: {
        conductor_cross_section: 2.50,      // mm²
        resistance_w_km_20c: 8.87,          // Ω/km
        specific_resistance_20c: 0.00393,   // /K⁻¹
        conductor_length_m: 120,            // m
        primary_voltage: 132,               // kV
        secondary_voltage: 0.11             // kV
      },
      system: {
        system_frequency: 50,               // Hz
        bus_voltage_level: 132,             // kV
        max_bus_fault_level: 50,            // kA
        xr_ratio: 15,                       // X/R ratio
        mv_bus_voltage_level: 132,          // kV
        mv_max_bus_fault_rating: 40         // kA
      },
      power_line: {
        assumed_cable: 3,                   // Number of cables
        cable_type: 'CU HDPE',              // Cable type
        cable_mm2: 240,                     // mm²
        cables_per_phase: 1,                // Cables per phase
        positive_seq_resistance_r1: 0.0221, // Ω/km
        positive_seq_reactance_x1: 0.1600,  // Ω/km
        zero_seq_resistance_r0: 0.1300,     // Ω/km
        zero_seq_reactance_x0: 0.0600,      // Ω/km
        route_length: 1.74                  // km
      },
      ct_core: {
        ct_ratio_primary: 3150,             // A
        ct_ratio_secondary: 1,              // A
        class_of_accuracy: '5P 20',         // Class
        ct_resistance: 9,                   // Ω
        rated_burden: 7.5                   // VA
      },
      connected_devices: {
        device_7sj85: { burden: 0.02 },     // VA
        device_sel751: { burden: 0.02 },    // VA
        device_fms: { burden: 0.06 },       // VA
        device_avr: { burden: 0.20 }        // VA
      }
    },
    expected_outputs: {
      final_verdict: 'SUITABLY DIMENSIONED',
      required_kssc: 10.00,
      available_kssc: 31.81,
      ct_calculations: {
        resistance_at_75c: 4.48759,        // Ω/km
        lead_resistance: 0.54,             // Ω
        loop_resistance: 1.08,             // Ω
        va_consumption: 1.08               // VA
      },
      fault_calculations: {
        system_tp_ms: 40.94,               // ms
        through_fault_current_a: 43475,    // A
        endzone1_fault_current_a: 43585,   // A
        xr_ratio_through: 8.60,
        xr_ratio_endzone1: 13.19
      }
    }
  };

  return NextResponse.json(templateInfo);
}