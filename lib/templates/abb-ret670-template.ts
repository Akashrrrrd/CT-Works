/**
 * ABB RET670 IED TEMPLATE CONFIGURATION
 * Based on Hitachi Technical Documentation N-19957 2-DF4W
 * Multi-Function Transformer Protection Relay
 */

export const ABB_RET670_TEMPLATE = {
  name: 'ABB RET670 - Multi-Function Transformer Protection',
  description: 'ABB RET670 transformer differential and REF protection relay with CT adequacy calculations per Hitachi standards.',
  manufacturer: 'ABB',
  model: 'RET670',
  iedType: 'tpl-abb-ret670',
  formula: 'ct-adequacy:tpl-abb-ret670',
  type: 'TRANSFORMER_PROTECTION',
  functions: [
    'TRANSFORMER DIFFERENTIAL PROTECTION (87T)',
    'RESTRICTED EARTH FAULT PROTECTION (REF)', 
    'OVERCURRENT PROTECTION (50/51)',
    'EARTH FAULT PROTECTION (50N/51N)',
    'BREAKER FAILURE PROTECTION (50BF)',
    'OVERLOAD PROTECTION (49)',
    'FREQUENCY PROTECTION (81)',
    'VOLTAGE PROTECTION (27/59)'
  ],
  
  // Input schema matching exact Hitachi document parameters
  inputSchema: {
    // CT Parameters (Page 5)
    ct_parameters: {
      ct_ratio_tap1: { 
        label: 'CT Ratio Tap-1 (A)', 
        type: 'number', 
        example: 3200,
        description: 'CT primary current rating - Tap 1'
      },
      ct_ratio_tap2: { 
        label: 'CT Ratio Tap-2 (A)', 
        type: 'number', 
        example: 600,
        description: 'CT primary current rating - Tap 2 (typically used)'
      },
      ct_ratio_tap3: { 
        label: 'CT Ratio Tap-3 (A)', 
        type: 'number', 
        example: 0,
        description: 'CT primary current rating - Tap 3 (optional)'
      },
      ct_ratio_secondary: { 
        label: 'CT Secondary Current (A)', 
        type: 'number', 
        example: 1,
        description: 'CT secondary current rating'
      },
      class_of_accuracy: { 
        label: 'Class of Accuracy', 
        type: 'string', 
        example: 'PX',
        description: 'CT accuracy class (PX, 5P, etc.)'
      },
      ct_resistance: { 
        label: 'CT Resistance Rct (Ω)', 
        type: 'number', 
        example: 16,
        description: 'CT secondary winding resistance'
      },
      knee_point_voltage: { 
        label: 'Knee Point Voltage Vk (V)', 
        type: 'number', 
        example: 1600,
        description: 'CT knee point voltage'
      },
      magnetizing_current: { 
        label: 'Magnetizing Current I0 (mA)', 
        type: 'number', 
        example: 10,
        description: 'Magnetizing current at knee point voltage'
      }
    },

    // System Parameters (Page 2)
    system_parameters: {
      system_frequency: { 
        label: 'System Frequency (Hz)', 
        type: 'number', 
        example: 50,
        description: 'Power system frequency'
      },
      hv_bus_voltage: { 
        label: 'HV Bus Voltage (kV)', 
        type: 'number', 
        example: 132,
        description: 'High voltage bus level'
      },
      mv_bus_voltage: { 
        label: 'MV Bus Voltage (kV)', 
        type: 'number', 
        example: 33,
        description: 'Medium voltage bus level'
      },
      max_hv_fault_current: { 
        label: 'Max HV Fault Current (A)', 
        type: 'number', 
        example: 50000,
        description: 'Maximum HV busbar fault current'
      },
      max_mv_fault_current: { 
        label: 'Max MV Fault Current (A)', 
        type: 'number', 
        example: 40000,
        description: 'Maximum MV busbar fault current'
      },
      transformer_rating_mva: { 
        label: 'Transformer Rating (MVA)', 
        type: 'number', 
        example: 100,
        description: 'Power transformer rating'
      },
      percentage_impedance: { 
        label: 'Transformer Impedance (%)', 
        type: 'number', 
        example: 25,
        description: 'Transformer percentage impedance'
      }
    },

    // Wiring Parameters (Page 7)
    wiring_parameters: {
      total_lead_resistance: { 
        label: 'Total Lead Resistance RL (Ω)', 
        type: 'number', 
        example: 1.10,
        description: 'Total resistance of CT to relay leads'
      },
      conductor_length: { 
        label: 'Conductor Length (m)', 
        type: 'number', 
        example: 120,
        description: 'One-way cable length from CT to relay'
      },
      conductor_cross_section: { 
        label: 'Conductor Cross Section (mm²)', 
        type: 'number', 
        example: 6.0,
        description: 'Cable conductor cross-sectional area'
      },
      resistance_per_km: { 
        label: 'Resistance per km (Ω/km)', 
        type: 'number', 
        example: 3.69,
        description: 'Cable resistance per kilometer at 20°C'
      }
    },

    // Connected Devices (Page 5)
    connected_devices: {
      ret670_burden: { 
        label: 'RET670 Burden (VA)', 
        type: 'number', 
        example: 0.02,
        description: 'ABB RET670 relay burden'
      },
      other_devices_burden: { 
        label: 'Other Devices Burden (VA)', 
        type: 'number', 
        example: 0,
        description: 'Additional devices connected to same CT core'
      }
    }
  },

  // Output schema for results
  outputSchema: {
    final_verdict: { 
      type: 'string', 
      description: 'Final CT adequacy verdict' 
    },
    required_vk: { 
      type: 'number', 
      description: 'Required knee point voltage (V)' 
    },
    available_vk: { 
      type: 'number', 
      description: 'Available knee point voltage (V)' 
    },
    transformer_calculations: { 
      type: 'object', 
      description: 'Transformer load current calculations' 
    },
    ealreq_calculations: { 
      type: 'object', 
      description: 'Equivalent secondary EMF calculations' 
    },
    ct_adequacy_check: { 
      type: 'object', 
      description: 'CT adequacy assessment results' 
    },
    safety_margin: { 
      type: 'number', 
      description: 'Safety margin percentage' 
    }
  },

  // Specifications from Hitachi document
  specifications: {
    rated_voltage: '132kV/33kV',
    transformer_rating: '100MVA',
    ct_ratio: '3200/600/1A',
    frequency: '50Hz',
    accuracy_class: 'PX',
    knee_point_voltage: '1600V',
    magnetizing_current: '10mA',
    ct_resistance: '16Ω',
    protection_functions: [
      'Transformer Differential (87T)',
      'Restricted Earth Fault (REF)',
      'Overcurrent Protection (50/51)',
      'Earth Fault Protection (50N/51N)', 
      'Breaker Failure (50BF)',
      'Overload Protection (49)',
      'Frequency Protection (81)',
      'Voltage Protection (27/59)'
    ],
    communication: ['IEC 61850', 'DNP3', 'Modbus', 'IEC 60870-5-103'],
    manufacturer: 'ABB',
    model: 'RET670'
  },

  // Calculation methodology from document
  calculation_method: {
    title: 'Transformer Differential Protection CT Adequacy',
    description: 'Uses equivalent secondary EMF method with three calculation equations',
    equations: [
      'Eq(1): Ealreq = 30 × Int × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))',
      'Eq(2): Ealreq = 2 × Itf × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))', 
      'Eq(3): Ealreq = If × (Isn/Ipn) × (Rct + Rl + Sr/(Ir×Ir))',
      'Required Vk = Controlling Ealreq × 0.8'
    ],
    standards: ['IEC 61869-2', 'IEEE C37.110', 'ABB Application Guide'],
    controlling_equation: 'Equation (3) - Maximum fault current case'
  },

  // Document reference
  datasheet: {
    title: 'CT/VT ADEQUACY CHECK - 132/33kV SUBSTATION DF4W AT AL DHAFRA AREA',
    document_no: 'N-19957 2-DF4W',
    date: '4/22/2026',
    contractor: 'HITACHI',
    revision: 'A',
    application: '132kV_100MVA TR. FEEDERS',
    device_type: 'Multi Func. Trans. Protection +HV REF'
  }
};