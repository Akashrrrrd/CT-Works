/**
 * IED BURDEN DATABASE AND SPECIFICATION SERVICE
 * Contains standard burden values for all common IEDs
 * Eliminates need for manual burden entry by users
 */

import type { StandardIEDBurdens } from '@/lib/types/ct-vt-adequacy-types';

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD IED BURDENS DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

export const STANDARD_IED_BURDENS: Record<string, number> = {
  // PROTECTION RELAYS
  "SIEMENS 7SJ85": 0.5,        // VA @ In (multi-function protection)
  "SIEMENS 7SJ86": 0.5,        // VA @ In (line protection)  
  "SIEMENS 7UT87": 0.1,        // VA @ In (transformer differential)
  
  "ABB RET670": 0.1,           // VA @ In (transformer protection)
  "ABB RED670": 0.1,           // VA @ In (feeder protection)
  "ABB REF650": 0.1,           // VA @ In (feeder protection)
  "ABB REM650": 0.1,           // VA @ In (motor protection)
  
  "SEL 751": 0.33,             // VA @ In (feeder protection)
  "SEL 787": 0.1,              // VA @ In (transformer differential)
  "SEL 421": 0.33,             // VA @ In (distance protection)
  
  "GE F650": 0.2,              // VA @ In (feeder protection)
  "GE T60": 0.1,               // VA @ In (transformer protection)
  "GE L90": 0.1,               // VA @ In (line differential)
  
  "SCHNEIDER P142": 0.5,       // VA @ In (feeder protection)  
  "SCHNEIDER P143": 0.5,       // VA @ In (motor protection)
  
  // METERING DEVICES
  "ABB REB500": 30,            // VA @ In (bay control unit)
  "ABB REC650": 0.1,           // VA @ In (control & metering)
  
  "SCHNEIDER ION7650": 2.0,    // VA @ In (power meter)
  "SCHNEIDER ION8650": 2.0,    // VA @ In (advanced meter)
  
  "SOCOMEC DIRIS A40": 1.5,    // VA @ In (multifunction meter)
  "SOCOMEC DIRIS B30": 1.0,    // VA @ In (basic meter)
  
  // CONTROL & AUTOMATION
  "ABB RTU560": 0.5,           // VA @ In (remote terminal unit)
  "SCHNEIDER SEPAM": 1.0,      // VA @ In (protection & control)
  
  // MONITORING SYSTEMS  
  "OMICRON CPC100": 0.1,       // VA @ In (commissioning unit)
  "DOBLE F6150": 0.1,          // VA @ In (test equipment interface)
};

// ═══════════════════════════════════════════════════════════════════════════════
// IED CLASSIFICATION AND SPECIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type IEDType = 'PROTECTION' | 'METERING' | 'CONTROL' | 'MONITORING';
export type IEDFunction = 
  | 'DISTANCE' | 'DIFFERENTIAL' | 'OVERCURRENT' | 'BREAKER_FAILURE'
  | 'METERING' | 'CONTROL' | 'MONITORING' | 'MULTI_FUNCTION';

export interface IEDSpecification {
  name: string;
  manufacturer: string;
  type: IEDType;
  primary_function: IEDFunction;
  burden_va: number;
  typical_applications: string[];
  calculation_method: 'KSSC' | 'VK_METHOD' | 'BOTH';
  notes?: string;
}

export const IED_SPECIFICATIONS: Record<string, IEDSpecification> = {
  "SIEMENS 7SJ85": {
    name: "7SJ85",
    manufacturer: "SIEMENS",
    type: "PROTECTION",
    primary_function: "MULTI_FUNCTION",
    burden_va: 0.5,
    typical_applications: ["33kV feeders", "Transformer protection", "Line protection"],
    calculation_method: "KSSC",
    notes: "Multi-function relay with distance, differential, and overcurrent protection"
  },
  
  "ABB RET670": {
    name: "RET670", 
    manufacturer: "ABB",
    type: "PROTECTION",
    primary_function: "DIFFERENTIAL",
    burden_va: 0.1,
    typical_applications: ["Power transformer differential", "Auto-transformer protection"],
    calculation_method: "VK_METHOD",
    notes: "Transformer differential protection relay"
  },
  
  "ABB RED670": {
    name: "RED670",
    manufacturer: "ABB", 
    type: "PROTECTION",
    primary_function: "DISTANCE",
    burden_va: 0.1,
    typical_applications: ["132kV lines", "Cable feeders", "Line differential"],
    calculation_method: "VK_METHOD",
    notes: "Line protection with distance and differential functions"
  },
  
  "SEL 751": {
    name: "751",
    manufacturer: "SEL",
    type: "PROTECTION", 
    primary_function: "MULTI_FUNCTION",
    burden_va: 0.33,
    typical_applications: ["Feeder protection", "Distribution automation"],
    calculation_method: "BOTH",
    notes: "Feeder protection relay with control functions"
  },
  
  "ABB REB500": {
    name: "REB500",
    manufacturer: "ABB",
    type: "CONTROL",
    primary_function: "METERING", 
    burden_va: 30,
    typical_applications: ["Bay control", "Switchgear metering", "HMI interface"],
    calculation_method: "VK_METHOD",
    notes: "High burden device - requires careful CT adequacy check"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// IED DATABASE SERVICE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export class IEDDatabaseService {
  
  /**
   * Get IED burden value automatically
   * Eliminates need for manual entry
   */
  static getIEDBurden(iedName: string): number {
    const normalizedName = iedName.toUpperCase().trim();
    
    // Direct lookup
    if (STANDARD_IED_BURDENS[normalizedName]) {
      return STANDARD_IED_BURDENS[normalizedName];
    }
    
    // Fuzzy matching for common variations
    for (const [key, value] of Object.entries(STANDARD_IED_BURDENS)) {
      if (key.includes(normalizedName) || normalizedName.includes(key)) {
        return value;
      }
    }
    
    // Default conservative estimate for unknown IEDs
    console.warn(`IED '${iedName}' not found in database. Using default burden of 1.0 VA`);
    return 1.0;
  }
  
  /**
   * Get IED specification including calculation method
   */
  static getIEDSpecification(iedName: string): IEDSpecification | null {
    const normalizedName = iedName.toUpperCase().trim();
    
    if (IED_SPECIFICATIONS[normalizedName]) {
      return IED_SPECIFICATIONS[normalizedName];
    }
    
    // Fuzzy matching
    for (const [key, spec] of Object.entries(IED_SPECIFICATIONS)) {
      if (key.includes(normalizedName) || normalizedName.includes(key)) {
        return spec;
      }
    }
    
    return null;
  }
  
  /**
   * Get all available IEDs for dropdown lists
   */
  static getAllAvailableIEDs(): string[] {
    return Object.keys(STANDARD_IED_BURDENS).sort();
  }
  
  /**
   * Get IEDs by type (for filtering UI)
   */
  static getIEDsByType(type: IEDType): string[] {
    return Object.entries(IED_SPECIFICATIONS)
      .filter(([_, spec]) => spec.type === type)
      .map(([name, _]) => name)
      .sort();
  }
  
  /**
   * Get recommended calculation method for IED
   */
  static getCalculationMethod(iedName: string): 'KSSC' | 'VK_METHOD' | 'BOTH' {
    const spec = this.getIEDSpecification(iedName);
    return spec?.calculation_method || 'VK_METHOD';
  }
  
  /**
   * Validate if IED exists in database
   */
  static isKnownIED(iedName: string): boolean {
    return this.getIEDSpecification(iedName) !== null;
  }
  
  /**
   * Get IED type for appropriate calculation method selection
   */
  static getIEDType(iedName: string): IEDType {
    const spec = this.getIEDSpecification(iedName);
    return spec?.type || 'PROTECTION';
  }
  
  /**
   * Add custom IED to runtime database (for user-defined IEDs)
   */
  static addCustomIED(name: string, burden: number, type: IEDType = 'PROTECTION'): void {
    STANDARD_IED_BURDENS[name.toUpperCase()] = burden;
    console.log(`Added custom IED: ${name} with burden ${burden} VA`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR CT ADEQUACY CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard temperature coefficient for copper conductors
 */
export const COPPER_TEMP_COEFFICIENT = 0.00393; // per °C at 20°C

/**
 * Standard operating temperatures for different applications
 */
export const STANDARD_TEMPERATURES = {
  INDOOR_SWITCHGEAR: 40,    // °C
  OUTDOOR_SWITCHGEAR: 50,   // °C  
  CABLE_TRENCH: 45,         // °C
  DIRECT_BURIED: 25,        // °C
  OVERHEAD: 75,             // °C (worst case summer)
};

/**
 * Standard accuracy class factors
 */
export const ACCURACY_CLASS_FACTORS: Record<string, number> = {
  // Protection class
  "5P10": 10,
  "5P20": 20, 
  "5P30": 30,
  "10P10": 10,
  "10P20": 20,
  
  // Extended class
  "PX": 1,  // Requires specific ALF from test certificate
  "PR": 1,  // Requires specific ALF from test certificate
  
  // Metering class  
  "0.1": 1,
  "0.2": 1,
  "0.5": 1,
  "1.0": 1,
  "3.0": 1,
};

/**
 * Extract accuracy limit factor from accuracy class
 */
export function getAccuracyLimitFactor(accuracyClass: string): number {
  const normalized = accuracyClass.toUpperCase().trim();
  
  if (ACCURACY_CLASS_FACTORS[normalized]) {
    return ACCURACY_CLASS_FACTORS[normalized];
  }
  
  // Try to extract number from string like "5P20" -> 20
  const match = normalized.match(/(\d+)P(\d+)/);
  if (match) {
    return parseInt(match[2]);
  }
  
  // Default to 20 for protection relays, 1 for others
  console.warn(`Unknown accuracy class: ${accuracyClass}. Using default ALF = 20`);
  return 20;
}