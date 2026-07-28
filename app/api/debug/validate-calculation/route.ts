import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { method, inputs } = await request.json();

    if (method === 'siemens_7sj85') {
      // SIEMENS 7SJ85 KSSC Calculation
      const Ipn = inputs.ct_ratio_primary || 600;
      const Isn = inputs.ct_ratio_secondary || 1;
      const Rct = inputs.ct_resistance || 8;
      const Rl = inputs.lead_resistance || 0.35;
      const Sr = inputs.relay_burden_va || 7.5;
      const n = inputs.accuracy_limit_factor || 20;
      const freq = inputs.frequency || 50;
      const Vbus = inputs.bus_voltage_kv || 33;
      const Ikmax_kA = inputs.max_bus_fault_kA || 31.5;

      // Calculate fault current at secondary
      const Itkmax = (Ikmax_kA * 1000) / Ipn;

      // Required Kssc
      const required_kssc = Itkmax / Isn;

      // CT internal burden
      const PE = Math.pow(Isn, 2) * Rct;

      // Rated burden
      const PN = Sr;

      // Lead burden
      const RL = Rl * 2; // Round trip
      const PL = Math.pow(RL, 2) / Math.pow(Isn, 2);

      // Available Kssc
      const available_kssc = n * ((PE + PN) / (PE + PL));

      const verdict = available_kssc >= required_kssc ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';

      return NextResponse.json({
        kssc_required: Math.round(required_kssc * 100) / 100,
        kssc_available: Math.round(available_kssc * 100) / 100,
        verdict,
        calculation_method: 'KSSC',
        intermediates: {
          Itkmax: Math.round(Itkmax * 100) / 100,
          Ipn,
          Isn,
          Rct,
          Rl,
          Sr,
          n,
          PE: Math.round(PE * 100) / 100,
          PN,
          RL,
          PL: Math.round(PL * 100) / 100,
          'required_kssc': Math.round(required_kssc * 100) / 100,
          'available_kssc': Math.round(available_kssc * 100) / 100,
        },
      });
    } else if (method === 'red670') {
      // RED670 VK Method Calculation (simplified)
      const Ipn = inputs.ct_ratio_primary || 800;
      const Isn = inputs.ct_ratio_secondary || 1;
      const Rct = inputs.ct_resistance || 6;
      const Rl = inputs.lead_resistance || 0.30;
      const Sr = inputs.relay_burden_va || 5;
      const freq = inputs.frequency || 50;
      const Vbus = inputs.bus_voltage_kv || 33;
      const Ikmax_kA = inputs.max_bus_fault_kA || 31.5;

      // Calculate fault current at secondary
      const Itkmax = (Ikmax_kA * 1000) / Ipn;

      // Available Vk (example: from relay specs)
      const vk_available = Isn * Rct * Itkmax * 1.5; // Simplified

      // Required Vk based on burden
      const vk_required = (Sr * 2) + (Rl * Math.pow(Itkmax, 2));

      const verdict = vk_available >= vk_required ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';

      return NextResponse.json({
        vk_available: Math.round(vk_available * 100) / 100,
        vk_required: Math.round(vk_required * 100) / 100,
        verdict,
        calculation_method: 'VK_METHOD',
        intermediates: {
          Itkmax: Math.round(Itkmax * 100) / 100,
          Ipn,
          Isn,
          Rct,
          Rl,
          Sr,
          'vk_available': Math.round(vk_available * 100) / 100,
          'vk_required': Math.round(vk_required * 100) / 100,
        },
      });
    }

    return NextResponse.json({ error: 'Unknown method' }, { status: 400 });
  } catch (error) {
    console.error('[v0] Calculation validation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Calculation failed' },
      { status: 500 }
    );
  }
}
