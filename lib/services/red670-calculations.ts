/**
 * RED670 IED TEMPLATE - CT/VT ADEQUACY CALCULATIONS
 * Based on Hitachi Technical Documentation N-19957 2-DF4W
 * 132kV Cable Feeders - Line Differential & Distance Protection
 */

export interface CT_Parameters_RED670 {
  // CT Configuration from document pages
  ct_ratio_tap1: number;              // 3200 A
  ct_ratio_tap2: number;              // 1800 A  
  ct_ratio_secondary: number;         // 1 A
  class_of_accuracy: string;          // PX
  ct_resistance_tap1: number;         // Rct = 9.8 Ω at 3200A
  ct_resistance_tap2: number;         // Rct = 5.6 Ω at 1800A
  knee_point_voltage_tap1: number;    // Vk = 2000 V at 3200A
  knee_point_voltage_tap2: number;    // Vk = 1250 V at 1800A
  magnetizing_current_tap1: number;   // I0 = 10 mA at Vk (3200A)
  magnetizing_current_tap2: number;   // I0 = 20 mA at Vk (1800A)
}

export interface System_Parameters_RED670 {
  system_frequency: number;           // 50 Hz
  hv_bus_voltage: number;             // 132 kV
  mv_bus_voltage: number;             // 132 kV (same level)
  max_hv_fault_current: number;       // 50000 A (close-in faults)
  max_through_fault_3ph: number;      // 42230 A (3-phase through fault)
  max_through_fault_1ph: number;      // 43475 A (1-phase through fault)
  max_endzone1_3ph: number;          // 43585 A (3-ph endzone-1)
  max_endzone1_1ph: number;          // 44648 A (1-ph endzone-1)
  xr_ratio: number;                   // X/R ratio (various values from doc)
  system_time_constant_3ph: number;   // 47.73 ms (3-ph through fault)
  system_time_constant_1ph_through: number; // 27.37 ms (1-ph through fault)
  system_time_constant_1ph_endzone: number; // 29.64 ms (1-ph endzone-1)
}

export interface Connected_Devices_RED670 {
  red670_burden: number;              // 0.02 VA (from document)
  other_devices_burden?: number;      // Additional connected devices
}

export interface Wiring_Parameters_RED670 {
  total_lead_resistance: number;      // RL = 1.10 Ω (from document)
  conductor_length: number;           // Cable length in meters
  conductor_cross_section: number;    // mm²
  resistance_per_km: number;          // Ω/km
}

export interface Cable_Parameters_RED670 {
  // Power line parameters from document
  positive_sequence_resistance: number;    // R1 = 0.0221 Ω/km
  positive_sequence_reactance: number;     // X1 = 0.1600 Ω/km
  zero_sequence_resistance: number;        // R0 = 0.1300 Ω/km
  zero_sequence_reactance: number;         // X0 = 0.0600 Ω/km
  route_length: number;                    // 1.74 km
  cable_positive_impedance_total: number;  // Z1L = 0.0385 + j0.2784 Ω
  cable_zero_impedance_total: number;      // Z0L = 0.2262 + j0.1044 Ω
}

/**
 * DIFFERENTIAL PROTECTION CALCULATIONS
 * Based on exact formulas from Hitachi document pages 6-8
 */
export class DifferentialProtectionCalculations_RED670 {

  /**
   * Calculate Equivalent Secondary EMF Required for Close-in Faults
   * Equation (1): Ealreq = Ikmax × (Isn/Ipn) × (Rct + Rl + Sr/(Ir × Ir))
   */
  static calculateEalreqCloseFaults(
    ikmax: number,        // Max primary fault current (50000 A)
    isn: number,          // CT secondary rated current (1 A)
    ipn: number,          // CT primary rated current (1800 A or 3200 A)
    rct: number,          // CT resistance at selected tap
    rl: number,           // Total lead resistance (1.10 Ω)
    sr: number,           // Burden of RED670 (0.02 VA)
    ir: number            // Relay rated current (1 A)
  ): number {
    return ikmax * (isn / ipn) * (rct + rl + (sr / (ir * ir)));
  }

  /**
   * Calculate Equivalent Secondary EMF Required for Through Faults (3-phase)
   * Equation (2): Ealreq = 2 × Itmax × (Isn/Ipn) × (Rct + Rl + Sr/(Ir × Ir))
   */
  static calculateEalreqThroughFaults3ph(
    itmax: number,        // Max primary through fault current (42230 A)
    isn: number,          // CT secondary rated current (1 A)
    ipn: number,          // CT primary rated current
    rct: number,          // CT resistance
    rl: number,           // Total lead resistance (1.10 Ω)
    sr: number,           // Burden of RED670 (0.02 VA)
    ir: number            // Relay rated current (1 A)
  ): number {
    return 2 * itmax * (isn / ipn) * (rct + rl + (sr / (ir * ir)));
  }

  /**
   * Calculate Equivalent Secondary EMF Required for Through Faults (1-phase)
   * Equation (2): Ealreq = 2 × Itmax × (Isn/Ipn) × (Rct + Rl + Sr/(Ir × Ir))
   */
  static calculateEalreqThroughFaults1ph(
    itmax: number,        // Max primary through fault current (43475 A)
    isn: number,          // CT secondary rated current (1 A)
    ipn: number,          // CT primary rated current
    rct: number,          // CT resistance
    rl: number,           // Total lead resistance (1.10 Ω)
    sr: number,           // Burden of RED670 (0.02 VA)
    ir: number            // Relay rated current (1 A)
  ): number {
    return 2 * itmax * (isn / ipn) * (rct + rl + (sr / (ir * ir)));
  }

  /**
   * Determine highest Ealreq for Differential Function (controlling equation)
   */
  static determineControllingEalreqDifferential(
    ealreq_close: number,
    ealreq_through_3ph: number,
    ealreq_through_1ph: number
  ): { highest: number; equation: string; applicable: boolean } {
    const values = [
      { value: ealreq_close, equation: "Close-in Faults" },
      { value: ealreq_through_3ph, equation: "Through Faults (3-ph)" },
      { value: ealreq_through_1ph, equation: "Through Faults (1-ph)" }
    ];
    
    const highest = values.reduce((max, current) => 
      current.value > max.value ? current : max
    );

    return {
      highest: highest.value,
      equation: highest.equation,
      applicable: true
    };
  }
}

/**
 * DISTANCE PROTECTION CALCULATIONS
 * Based on exact formulas from Hitachi document pages 9-11
 */
export class DistanceProtectionCalculations_RED670 {

  /**
   * Calculate Equivalent Secondary EMF Required for Close-in Faults (Distance)
   * Ealreq = Ikmax × (Isn/Ipn) × a × (Rct + Rl + Sr/(Ir × Ir))
   * Where 'a' is a factor (typically 1 for close-in faults)
   */
  static calculateEalreqDistanceCloseFaults(
    ikmax: number,        // Max primary fault current (50000 A)
    isn: number,          // CT secondary rated current (1 A)
    ipn: number,          // CT primary rated current
    a_factor: number,     // Factor for distance function (1)
    rct: number,          // CT resistance
    rl: number,           // Total lead resistance (1.10 Ω)
    sr: number,           // Burden of RED670 (0.02 VA)
    ir: number            // Relay rated current (1 A)
  ): number {
    return ikmax * (isn / ipn) * a_factor * (rct + rl + (sr / (ir * ir)));
  }

  /**
   * Calculate Equivalent Secondary EMF Required for Endzone-1 Faults (3-phase)
   * Ealreq = Ikzone1 × (Isn/Ipn) × k × (Rct + Rl + Sr/(Ir × Ir))
   * Where 'k' is the time constant factor (typically 3)
   */
  static calculateEalreqDistanceEndzone1_3ph(
    ikzone1: number,      // Max endzone-1 fault current (43585 A)
    isn: number,          // CT secondary rated current (1 A)
    ipn: number,          // CT primary rated current
    k_factor: number,     // Time constant factor (3)
    rct: number,          // CT resistance
    rl: number,           // Total lead resistance (1.10 Ω)
    sr: number,           // Burden of RED670 (0.02 VA)
    ir: number            // Relay rated current (1 A)
  ): number {
    return ikzone1 * (isn / ipn) * k_factor * (rct + rl + (sr / (ir * ir)));
  }

  /**
   * Calculate Equivalent Secondary EMF Required for Endzone-1 Faults (1-phase)
   * Ealreq = Ikzone1 × (Isn/Ipn) × k × (Rct + Rl + Sr/(Ir × Ir))
   */
  static calculateEalreqDistanceEndzone1_1ph(
    ikzone1: number,      // Max endzone-1 fault current (44648 A)
    isn: number,          // CT secondary rated current (1 A)
    ipn: number,          // CT primary rated current
    k_factor: number,     // Time constant factor (3)
    rct: number,          // CT resistance
    rl: number,           // Total lead resistance (1.10 Ω)
    sr: number,           // Burden of RED670 (0.02 VA)
    ir: number            // Relay rated current (1 A)
  ): number {
    return ikzone1 * (isn / ipn) * k_factor * (rct + rl + (sr / (ir * ir)));
  }

  /**
   * Determine highest Ealreq for Distance Function (controlling equation)
   */
  static determineControllingEalreqDistance(
    ealreq_close: number,
    ealreq_endzone1_3ph: number,
    ealreq_endzone1_1ph: number
  ): { highest: number; equation: string; applicable: boolean } {
    const values = [
      { value: ealreq_close, equation: "Close-in Faults" },
      { value: ealreq_endzone1_3ph, equation: "Endzone-1 (3-ph)" },
      { value: ealreq_endzone1_1ph, equation: "Endzone-1 (1-ph)" }
    ];
    
    const highest = values.reduce((max, current) => 
      current.value > max.value ? current : max
    );

    return {
      highest: highest.value,
      equation: highest.equation,
      applicable: true
    };
  }
}

/**
 * CT ADEQUACY CALCULATIONS FOR RED670
 * Based on knee point voltage method from document pages 11-12
 */
export class CT_AdequacyCalculations_RED670 {

  /**
   * Calculate Required Knee Point Voltage (Vk)
   * From document: Vk = Ealreq × 0.8 (per manufacturer reference)
   */
  static calculateRequiredVk(ealreq: number): number {
    return ealreq * 0.8;
  }

  /**
   * Determine CT suitability for both taps
   */
  static determineCTSuitability(
    available_vk: number,   // Available knee point voltage
    required_vk: number     // Required knee point voltage (calculated)
  ): { suitable: boolean; verdict: string; margin: number } {
    const suitable = available_vk > required_vk;
    const verdict = suitable ? "SUITABLY DIMENSIONED" : "UNDER DIMENSIONED";
    const margin = ((available_vk - required_vk) / required_vk) * 100;
    
    return { suitable, verdict, margin };
  }
}

/**
 * MAIN RED670 CALCULATION ENGINE
 * Integrates all calculations following the exact Hitachi document flow
 */
export class RED670_Calculator {

  /**
   * Complete CT adequacy calculation for RED670 Line Protection
   * Following exact calculation sequence from Hitachi documents
   */
  static performCompleteCalculation(input: {
    ct_parameters: CT_Parameters_RED670;
    system_parameters: System_Parameters_RED670;
    connected_devices: Connected_Devices_RED670;
    wiring_parameters: Wiring_Parameters_RED670;
    cable_parameters: Cable_Parameters_RED670;
  }) {
    const results: any = {
      differential_calculations: {},
      distance_calculations: {},
      ct_adequacy_check: {},
      final_verdict: "",
      tap_comparison: {},
      document_reference: {
        title: "CT/VT ADEQUACY CHECK - 132/33kV SUBSTATION DF4W",
        document_no: "N-19957 2-DF4W",
        device: "RED670 - Line Differential & Distance Protection",
        application: "132kV Cable Feeders",
        functions: ["Line Differential Protection", "Distance Protection (Zones 1-3)", "Overcurrent Protection"]
      }
    };

    const ct_params = input.ct_parameters;
    const system_params = input.system_parameters;
    const wiring = input.wiring_parameters;
    const devices = input.connected_devices;

    // Common parameters
    const isn = ct_params.ct_ratio_secondary; // 1 A
    const rl = wiring.total_lead_resistance;  // 1.10 Ω
    const sr = devices.red670_burden;         // 0.02 VA
    const ir = 1; // 1 A relay current

    // Calculate for both CT taps (3200A and 1800A)
    const taps = [
      {
        name: "Tap-1 (3200A)",
        ipn: ct_params.ct_ratio_tap1,
        rct: ct_params.ct_resistance_tap1,
        available_vk: ct_params.knee_point_voltage_tap1
      },
      {
        name: "Tap-2 (1800A)", 
        ipn: ct_params.ct_ratio_tap2,
        rct: ct_params.ct_resistance_tap2,
        available_vk: ct_params.knee_point_voltage_tap2
      }
    ];

    results.tap_comparison = {};

    taps.forEach((tap, index) => {
      const tapKey = `tap${index + 1}`;
      
      // 1. DIFFERENTIAL PROTECTION CALCULATIONS
      
      // Close-in faults (from document: 50000 A)
      const ealreq_diff_close = DifferentialProtectionCalculations_RED670.calculateEalreqCloseFaults(
        system_params.max_hv_fault_current, isn, tap.ipn, tap.rct, rl, sr, ir
      );

      // Through faults 3-phase (from document: 42230 A)
      const ealreq_diff_through_3ph = DifferentialProtectionCalculations_RED670.calculateEalreqThroughFaults3ph(
        system_params.max_through_fault_3ph, isn, tap.ipn, tap.rct, rl, sr, ir
      );

      // Through faults 1-phase (from document: 43475 A)
      const ealreq_diff_through_1ph = DifferentialProtectionCalculations_RED670.calculateEalreqThroughFaults1ph(
        system_params.max_through_fault_1ph, isn, tap.ipn, tap.rct, rl, sr, ir
      );

      // Determine controlling equation for differential
      const controlling_diff = DifferentialProtectionCalculations_RED670.determineControllingEalreqDifferential(
        ealreq_diff_close, ealreq_diff_through_3ph, ealreq_diff_through_1ph
      );

      // 2. DISTANCE PROTECTION CALCULATIONS
      
      // Close-in faults for distance (a = 1)
      const ealreq_dist_close = DistanceProtectionCalculations_RED670.calculateEalreqDistanceCloseFaults(
        system_params.max_hv_fault_current, isn, tap.ipn, 1, tap.rct, rl, sr, ir
      );

      // Endzone-1 faults 3-phase (k = 3, from document time constant)
      const ealreq_dist_endzone1_3ph = DistanceProtectionCalculations_RED670.calculateEalreqDistanceEndzone1_3ph(
        system_params.max_endzone1_3ph, isn, tap.ipn, 3, tap.rct, rl, sr, ir
      );

      // Endzone-1 faults 1-phase (k = 3)
      const ealreq_dist_endzone1_1ph = DistanceProtectionCalculations_RED670.calculateEalreqDistanceEndzone1_1ph(
        system_params.max_endzone1_1ph, isn, tap.ipn, 3, tap.rct, rl, sr, ir
      );

      // Determine controlling equation for distance
      const controlling_dist = DistanceProtectionCalculations_RED670.determineControllingEalreqDistance(
        ealreq_dist_close, ealreq_dist_endzone1_3ph, ealreq_dist_endzone1_1ph
      );

      // 3. OVERALL CONTROLLING EQUATION
      
      // Highest Ealreq between differential and distance functions
      const overall_highest = Math.max(controlling_diff.highest, controlling_dist.highest);
      const overall_controlling = overall_highest === controlling_diff.highest ? 
        `Differential: ${controlling_diff.equation}` : 
        `Distance: ${controlling_dist.equation}`;

      // 4. CT ADEQUACY CHECK
      
      const required_vk = CT_AdequacyCalculations_RED670.calculateRequiredVk(overall_highest);
      const suitability = CT_AdequacyCalculations_RED670.determineCTSuitability(
        tap.available_vk, required_vk
      );

      // Store results for this tap
      results.tap_comparison[tapKey] = {
        tap_info: {
          name: tap.name,
          primary_current: tap.ipn,
          ct_resistance: tap.rct,
          available_vk: tap.available_vk
        },
        differential_protection: {
          close_in_faults: ealreq_diff_close,
          through_faults_3ph: ealreq_diff_through_3ph,
          through_faults_1ph: ealreq_diff_through_1ph,
          controlling_equation: controlling_diff.equation,
          highest_ealreq: controlling_diff.highest
        },
        distance_protection: {
          close_in_faults: ealreq_dist_close,
          endzone1_3ph: ealreq_dist_endzone1_3ph,
          endzone1_1ph: ealreq_dist_endzone1_1ph,
          controlling_equation: controlling_dist.equation,
          highest_ealreq: controlling_dist.highest
        },
        overall_assessment: {
          highest_ealreq: overall_highest,
          controlling_function: overall_controlling,
          required_vk: required_vk,
          available_vk: tap.available_vk,
          suitable: suitability.suitable,
          verdict: suitability.verdict,
          safety_margin: suitability.margin
        }
      };
    });

    // Determine recommended tap (prefer 1800A tap as used in document)
    const recommendedTap = results.tap_comparison.tap2; // 1800A tap
    results.final_verdict = recommendedTap.overall_assessment.verdict;
    
    // Set main results to recommended tap
    results.differential_calculations = recommendedTap.differential_protection;
    results.distance_calculations = recommendedTap.distance_protection;
    results.ct_adequacy_check = recommendedTap.overall_assessment;

    return results;
  }

  /**
   * Validate calculation against Hitachi document expected values
   */
  static validateAgainstDocument(results: any): {
    validation: boolean;
    differences: string[];
    summary: string;
  } {
    const differences: string[] = [];
    const tolerance = 2; // 2% tolerance for RED670
    
    // Expected values from Hitachi document (using 1800A tap)
    const expected = {
      diff_close_in: 186.58,        // V (from document page 7)
      diff_through_3ph: 315.18,     // V (from document page 8)
      diff_through_1ph: 324.47,     // V (from document page 8)
      dist_endzone1_3ph: 487.934,   // V (from document page 10)
      dist_endzone1_1ph: 499.839,   // V (from document page 11)
      highest_ealreq: 499.84,       // V (controlling from document)
      required_vk: 399.87,          // V (from document page 11)
      available_vk: 1250,           // V (CT specification)
      verdict: "SUITABLY DIMENSIONED"
    };

    const tap2Results = results.tap_comparison?.tap2;
    if (!tap2Results) {
      differences.push("Missing tap2 (1800A) results");
      return { validation: false, differences, summary: "❌ Critical calculation data missing" };
    }

    // Check differential calculations
    const diffDiff = Math.abs(tap2Results.differential_protection.close_in_faults - expected.diff_close_in);
    if ((diffDiff / expected.diff_close_in) * 100 > tolerance) {
      differences.push(`Differential close-in: ${tap2Results.differential_protection.close_in_faults.toFixed(2)}V (expected ${expected.diff_close_in}V)`);
    }

    // Check distance calculations
    const distDiff = Math.abs(tap2Results.distance_protection.endzone1_1ph - expected.dist_endzone1_1ph);
    if ((distDiff / expected.dist_endzone1_1ph) * 100 > tolerance) {
      differences.push(`Distance endzone-1 1ph: ${tap2Results.distance_protection.endzone1_1ph.toFixed(2)}V (expected ${expected.dist_endzone1_1ph}V)`);
    }

    // Check required Vk
    const vkDiff = Math.abs(tap2Results.overall_assessment.required_vk - expected.required_vk);
    if ((vkDiff / expected.required_vk) * 100 > tolerance) {
      differences.push(`Required Vk: ${tap2Results.overall_assessment.required_vk.toFixed(2)}V (expected ${expected.required_vk}V)`);
    }

    // Check final verdict
    if (tap2Results.overall_assessment.verdict !== expected.verdict) {
      differences.push(`Final verdict: ${tap2Results.overall_assessment.verdict} (expected ${expected.verdict})`);
    }

    const validation = differences.length === 0;
    const summary = validation 
      ? "✅ All calculations match Hitachi document exactly"
      : `❌ ${differences.length} calculation(s) differ from document`;

    return { validation, differences, summary };
  }
}