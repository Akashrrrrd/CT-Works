import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { RED670_Calculator } from '@/lib/services/red670-calculations';

async function auth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyJWT(token) : null;
}

/**
 * RED670 CT ADEQUACY CALCULATION ENDPOINT
 * POST /api/relay-formulas/red670
 */
export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const input = await req.json();
    
    // Validate required input structure
    const requiredSections = ['ct_parameters', 'system_parameters', 'connected_devices', 'wiring_parameters', 'cable_parameters'];
    for (const section of requiredSections) {
      if (!input[section]) {
        return NextResponse.json({ 
          error: `Missing required section: ${section}` 
        }, { status: 400 });
      }
    }

    // Perform complete RED670 calculation
    const results = RED670_Calculator.performCompleteCalculation(input);

    // Validate against Hitachi document
    const validation = RED670_Calculator.validateAgainstDocument(results);

    // Add calculation metadata
    const response = {
      template: 'RED670',
      calculation_date: new Date().toISOString(),
      calculated_by: user.email,
      validation: validation,
      ...results
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('RED670 calculation error:', error);
    return NextResponse.json({ 
      error: 'Calculation failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/relay-formulas/red670
 * Returns the RED670 template schema and example inputs
 */
export async function GET(req: NextRequest) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Return template schema and example values from Hitachi document
  const templateInfo = {
    name: 'RED670 Line Protection CT Adequacy Calculation',
    description: 'Complete line differential and distance protection CT adequacy check per Hitachi standards N-19957 2-DF4W',
    document_reference: {
      title: 'CT/VT ADEQUACY CHECK - 132/33kV SUBSTATION DF4W AT AL DHAFRA AREA',
      document_no: 'N-19957 2-DF4W',
      date: '4/22/2026',
      contractor: 'HITACHI',
      application: '132kV Cable Feeders - Line Differential & Distance Protection'
    },
    example_input: {
      ct_parameters: {
        ct_ratio_tap1: 3200,                // A
        ct_ratio_tap2: 1800,                // A (recommended)
        ct_ratio_secondary: 1,              // A
        class_of_accuracy: 'PX',            // Class
        ct_resistance_tap1: 9.8,            // Ω at 3200A
        ct_resistance_tap2: 5.6,            // Ω at 1800A
        knee_point_voltage_tap1: 2000,      // V at 3200A
        knee_point_voltage_tap2: 1250,      // V at 1800A
        magnetizing_current_tap1: 10,       // mA at 3200A
        magnetizing_current_tap2: 20        // mA at 1800A
      },
      system_parameters: {
        system_frequency: 50,               // Hz
        hv_bus_voltage: 132,                // kV
        mv_bus_voltage: 132,                // kV
        max_hv_fault_current: 50000,        // A (close-in)
        max_through_fault_3ph: 42230,       // A
        max_through_fault_1ph: 43475,       // A
        max_endzone1_3ph: 43585,           // A
        max_endzone1_1ph: 44648,           // A
        xr_ratio: 15,                       // X/R ratio
        system_time_constant_3ph: 47.73,    // ms
        system_time_constant_1ph_through: 27.37, // ms
        system_time_constant_1ph_endzone: 29.64  // ms
      },
      wiring_parameters: {
        total_lead_resistance: 1.10,        // Ω
        conductor_length: 120,              // m
        conductor_cross_section: 6.0,       // mm²
        resistance_per_km: 4.48759          // Ω/km
      },
      connected_devices: {
        red670_burden: 0.02,                // VA
        other_devices_burden: 0             // VA
      },
      cable_parameters: {
        positive_sequence_resistance: 0.0221, // Ω/km
        positive_sequence_reactance: 0.1600,  // Ω/km
        zero_sequence_resistance: 0.1300,     // Ω/km
        zero_sequence_reactance: 0.0600,      // Ω/km
        route_length: 1.74                    // km
      }
    },
    expected_outputs: {
      final_verdict: 'SUITABLY DIMENSIONED',
      differential_calculations: {
        close_in_faults: 186.58,            // V (from document)
        through_faults_3ph: 315.18,         // V (from document)
        through_faults_1ph: 324.47,         // V (from document)
        controlling_equation: 'Through Faults (1-ph)'
      },
      distance_calculations: {
        close_in_faults: 186.58,            // V (from document)
        endzone1_3ph: 487.934,              // V (from document)
        endzone1_1ph: 499.839,              // V (from document) - controlling
        controlling_equation: 'Endzone-1 (1-ph)'
      },
      ct_adequacy_check: {
        required_vk: 399.87,                // V (499.84 × 0.8)
        available_vk: 1250,                 // V (1800A tap)
        suitable: true,
        verdict: 'SUITABLY DIMENSIONED'
      }
    },
    calculation_formulas: {
      differential_close_in: 'Ealreq = Ikmax × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))',
      differential_through: 'Ealreq = 2 × Itmax × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))',
      distance_close_in: 'Ealreq = Ikmax × (Isn/Ipn) × a × (Rct + Rl + Sr/(Ir×Ir))',
      distance_endzone: 'Ealreq = Ikzone × (Isn/Ipn) × k × (Rct + Rl + Sr/(Ir×Ir))',
      required_vk: 'Vk = Ealreq × 0.8 (per manufacturer reference)'
    }
  };

  return NextResponse.json(templateInfo);
}