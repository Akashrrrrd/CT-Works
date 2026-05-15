// Excel Parser for CT Adequacy Data Extraction
import * as XLSX from 'xlsx';

export interface ExcelCTData {
  // Sheet 1 - CT Equipment Data
  ct_ratio_primary: number;
  ct_ratio_secondary: number;
  accuracy_class: string;
  rct: number;
  vk_available: number;
  io_at_vk: number;
  
  // Sheet 2 - System Data
  frequency: number;
  bus_voltage_kv: number;
  max_bus_fault_mva: number;
  r1: number;
  x1: number;
  r0: number;
  x0: number;
  route_length_km: number;
  relay_burden_va: number;
  lead_resistance: number;
  
  // Relay Information
  relay_type?: string;
  relay_model?: string;
  protection_functions?: string[];
  
  // Metadata
  project_name?: string;
  substation_name?: string;
  engineer_name?: string;
  date?: string;
}

// Common patterns for finding CT data in Excel sheets
const CT_PATTERNS = {
  // CT Ratio patterns
  ct_ratio: [
    /ct\s*ratio/i,
    /current\s*transformer\s*ratio/i,
    /primary\s*current/i,
    /secondary\s*current/i,
    /ipn/i,
    /isn/i
  ],
  
  // CT Resistance patterns
  ct_resistance: [
    /ct\s*resistance/i,
    /rct/i,
    /winding\s*resistance/i,
    /secondary\s*resistance/i
  ],
  
  // Knee Point Voltage patterns
  knee_point: [
    /knee\s*point/i,
    /vk/i,
    /saturation\s*voltage/i,
    /limiting\s*voltage/i
  ],
  
  // Accuracy Class patterns
  accuracy: [
    /accuracy\s*class/i,
    /class/i,
    /px/i,
    /5p/i
  ],
  
  // Magnetizing Current patterns
  magnetizing: [
    /magnetizing\s*current/i,
    /io/i,
    /excitation\s*current/i
  ],
  
  // System Data patterns
  bus_voltage: [
    /bus\s*voltage/i,
    /system\s*voltage/i,
    /voltage\s*level/i,
    /kv/i
  ],
  
  fault_level: [
    /fault\s*level/i,
    /fault\s*mva/i,
    /short\s*circuit/i,
    /ikmax/i
  ],
  
  // Cable parameters
  cable_r1: [/r1/i, /positive\s*sequence\s*resistance/i],
  cable_x1: [/x1/i, /positive\s*sequence\s*reactance/i],
  cable_r0: [/r0/i, /zero\s*sequence\s*resistance/i],
  cable_x0: [/x0/i, /zero\s*sequence\s*reactance/i],
  cable_length: [/length/i, /route/i, /distance/i],
  
  // Relay data
  relay_burden: [
    /relay\s*burden/i,
    /sr/i,
    /burden/i,
    /va/i
  ],
  
  lead_resistance: [
    /lead\s*resistance/i,
    /rl/i,
    /cable\s*resistance/i
  ]
};

// Relay type detection patterns
const RELAY_PATTERNS = {
  'RED670': [/red670/i, /red\s*670/i],
  'REB670': [/reb670/i, /reb\s*670/i],
  'REF615': [/ref615/i, /ref\s*615/i],
  'REL670': [/rel670/i, /rel\s*670/i],
  'REQ650': [/req650/i, /req\s*650/i],
  'SEL-421': [/sel.?421/i, /sel\s*421/i],
  'SIEMENS': [/7sj/i, /7sa/i, /7sd/i],
  'GE': [/d60/i, /d90/i, /l90/i]
};

// Protection function detection
const FUNCTION_PATTERNS = {
  differential: [
    /differential/i,
    /diff/i,
    /87/i,
    /transformer\s*protection/i,
    /busbar\s*protection/i
  ],
  distance: [
    /distance/i,
    /21/i,
    /line\s*protection/i,
    /impedance/i,
    /zone/i
  ],
  breaker_failure: [
    /breaker\s*failure/i,
    /bf/i,
    /50bf/i,
    /circuit\s*breaker\s*failure/i
  ]
};

export class ExcelCTParser {
  private workbook: XLSX.WorkBook | null = null;
  private extractedData: Partial<ExcelCTData> = {};

  async parseFile(file: File): Promise<ExcelCTData> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Reset extracted data
      this.extractedData = {};
      
      // Parse each worksheet
      const sheetNames = this.workbook.SheetNames;
      
      for (const sheetName of sheetNames) {
        const worksheet = this.workbook.Sheets[sheetName];
        await this.parseWorksheet(worksheet, sheetName);
      }
      
      // Validate and fill defaults
      return this.validateAndFillDefaults();
      
    } catch (error) {
      console.error('Excel parsing error:', error);
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseWorksheet(worksheet: XLSX.WorkSheet, sheetName: string) {
    // Convert worksheet to JSON for easier processing
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Look for CT data patterns
    for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex];
      if (!row || row.length === 0) continue;
      
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        if (!cell || typeof cell !== 'string') continue;
        
        // Extract CT parameters
        this.extractCTParameters(cell, row, jsonData, rowIndex, colIndex);
        
        // Extract system parameters
        this.extractSystemParameters(cell, row, jsonData, rowIndex, colIndex);
        
        // Extract relay information
        this.extractRelayInfo(cell, row, jsonData, rowIndex, colIndex);
        
        // Extract project metadata
        this.extractMetadata(cell, row, jsonData, rowIndex, colIndex);
      }
    }
  }

  private extractCTParameters(cell: string, row: any[], data: any[][], rowIndex: number, colIndex: number) {
    // CT Ratio extraction
    if (CT_PATTERNS.ct_ratio.some(pattern => pattern.test(cell))) {
      const ratioMatch = this.findNearbyNumbers(data, rowIndex, colIndex, 3);
      if (ratioMatch.length >= 2) {
        this.extractedData.ct_ratio_primary = Math.max(...ratioMatch);
        this.extractedData.ct_ratio_secondary = Math.min(...ratioMatch);
      } else if (ratioMatch.length === 1) {
        // Look for ratio format like "600/1" or "600:1"
        const ratioStr = this.findNearbyText(data, rowIndex, colIndex, 2);
        const ratioPattern = /(\d+)[\/:]\s*(\d+)/;
        const match = ratioStr.match(ratioPattern);
        if (match) {
          this.extractedData.ct_ratio_primary = parseInt(match[1]);
          this.extractedData.ct_ratio_secondary = parseInt(match[2]);
        } else if (ratioMatch[0] > 10) {
          this.extractedData.ct_ratio_primary = ratioMatch[0];
          this.extractedData.ct_ratio_secondary = 1; // Default secondary
        }
      }
    }
    
    // CT Resistance
    if (CT_PATTERNS.ct_resistance.some(pattern => pattern.test(cell))) {
      const resistance = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (resistance.length > 0) {
        this.extractedData.rct = resistance[0];
      }
    }
    
    // Knee Point Voltage
    if (CT_PATTERNS.knee_point.some(pattern => pattern.test(cell))) {
      const voltage = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (voltage.length > 0) {
        this.extractedData.vk_available = voltage[0];
      }
    }
    
    // Accuracy Class
    if (CT_PATTERNS.accuracy.some(pattern => pattern.test(cell))) {
      const accuracyText = this.findNearbyText(data, rowIndex, colIndex, 2);
      const accuracyMatch = accuracyText.match(/(PX|5P\d*|10P\d*|\d+P\d*)/i);
      if (accuracyMatch) {
        this.extractedData.accuracy_class = accuracyMatch[1].toUpperCase();
      }
    }
    
    // Magnetizing Current
    if (CT_PATTERNS.magnetizing.some(pattern => pattern.test(cell))) {
      const current = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (current.length > 0) {
        this.extractedData.io_at_vk = current[0];
      }
    }
  }

  private extractSystemParameters(cell: string, row: any[], data: any[][], rowIndex: number, colIndex: number) {
    // Bus Voltage
    if (CT_PATTERNS.bus_voltage.some(pattern => pattern.test(cell))) {
      const voltage = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (voltage.length > 0) {
        this.extractedData.bus_voltage_kv = voltage[0];
      }
    }
    
    // Fault Level
    if (CT_PATTERNS.fault_level.some(pattern => pattern.test(cell))) {
      const faultLevel = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (faultLevel.length > 0) {
        this.extractedData.max_bus_fault_mva = faultLevel[0];
      }
    }
    
    // Cable Parameters
    if (CT_PATTERNS.cable_r1.some(pattern => pattern.test(cell))) {
      const r1 = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (r1.length > 0) this.extractedData.r1 = r1[0];
    }
    
    if (CT_PATTERNS.cable_x1.some(pattern => pattern.test(cell))) {
      const x1 = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (x1.length > 0) this.extractedData.x1 = x1[0];
    }
    
    if (CT_PATTERNS.cable_r0.some(pattern => pattern.test(cell))) {
      const r0 = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (r0.length > 0) this.extractedData.r0 = r0[0];
    }
    
    if (CT_PATTERNS.cable_x0.some(pattern => pattern.test(cell))) {
      const x0 = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (x0.length > 0) this.extractedData.x0 = x0[0];
    }
    
    if (CT_PATTERNS.cable_length.some(pattern => pattern.test(cell))) {
      const length = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (length.length > 0) this.extractedData.route_length_km = length[0];
    }
    
    // Relay Burden
    if (CT_PATTERNS.relay_burden.some(pattern => pattern.test(cell))) {
      const burden = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (burden.length > 0) this.extractedData.relay_burden_va = burden[0];
    }
    
    // Lead Resistance
    if (CT_PATTERNS.lead_resistance.some(pattern => pattern.test(cell))) {
      const leadR = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
      if (leadR.length > 0) this.extractedData.lead_resistance = leadR[0];
    }
  }

  private extractRelayInfo(cell: string, row: any[], data: any[][], rowIndex: number, colIndex: number) {
    // Detect relay type
    for (const [relayType, patterns] of Object.entries(RELAY_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(cell))) {
        this.extractedData.relay_type = relayType;
        this.extractedData.relay_model = cell.trim();
        break;
      }
    }
    
    // Detect protection functions
    if (!this.extractedData.protection_functions) {
      this.extractedData.protection_functions = [];
    }
    
    for (const [functionType, patterns] of Object.entries(FUNCTION_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(cell))) {
        if (!this.extractedData.protection_functions.includes(functionType)) {
          this.extractedData.protection_functions.push(functionType);
        }
      }
    }
  }

  private extractMetadata(cell: string, row: any[], data: any[][], rowIndex: number, colIndex: number) {
    // Project name patterns
    if (/project|substation|ss/i.test(cell)) {
      const projectText = this.findNearbyText(data, rowIndex, colIndex, 3);
      if (projectText.length > cell.length) {
        this.extractedData.project_name = projectText.trim();
      }
    }
    
    // Engineer name patterns
    if (/engineer|prepared|checked|by/i.test(cell)) {
      const engineerText = this.findNearbyText(data, rowIndex, colIndex, 2);
      if (engineerText.match(/[A-Za-z]{2,}/)) {
        this.extractedData.engineer_name = engineerText.trim();
      }
    }
    
    // Date patterns
    if (/date/i.test(cell)) {
      const dateText = this.findNearbyText(data, rowIndex, colIndex, 2);
      const dateMatch = dateText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
      if (dateMatch) {
        this.extractedData.date = dateMatch[0];
      }
    }
  }

  private findNearbyNumbers(data: any[][], rowIndex: number, colIndex: number, radius: number): number[] {
    const numbers: number[] = [];
    
    for (let r = Math.max(0, rowIndex - radius); r <= Math.min(data.length - 1, rowIndex + radius); r++) {
      for (let c = Math.max(0, colIndex - radius); c <= Math.min((data[r]?.length || 0) - 1, colIndex + radius); c++) {
        const cell = data[r]?.[c];
        if (typeof cell === 'number' && !isNaN(cell)) {
          numbers.push(cell);
        } else if (typeof cell === 'string') {
          const numMatch = cell.match(/(\d+\.?\d*)/);
          if (numMatch) {
            const num = parseFloat(numMatch[1]);
            if (!isNaN(num)) numbers.push(num);
          }
        }
      }
    }
    
    return numbers.filter((num, index, arr) => arr.indexOf(num) === index); // Remove duplicates
  }

  private findNearbyText(data: any[][], rowIndex: number, colIndex: number, radius: number): string {
    let text = '';
    
    for (let r = Math.max(0, rowIndex - radius); r <= Math.min(data.length - 1, rowIndex + radius); r++) {
      for (let c = Math.max(0, colIndex - radius); c <= Math.min((data[r]?.length || 0) - 1, colIndex + radius); c++) {
        const cell = data[r]?.[c];
        if (typeof cell === 'string' && cell.trim().length > text.length) {
          text = cell.trim();
        }
      }
    }
    
    return text;
  }

  private validateAndFillDefaults(): ExcelCTData {
    // Set default values for missing required fields
    const defaults: ExcelCTData = {
      ct_ratio_primary: this.extractedData.ct_ratio_primary || 600,
      ct_ratio_secondary: this.extractedData.ct_ratio_secondary || 1,
      accuracy_class: this.extractedData.accuracy_class || 'PX',
      rct: this.extractedData.rct || 2.5,
      vk_available: this.extractedData.vk_available || 400,
      io_at_vk: this.extractedData.io_at_vk || 30,
      
      frequency: this.extractedData.frequency || 50,
      bus_voltage_kv: this.extractedData.bus_voltage_kv || 33,
      max_bus_fault_mva: this.extractedData.max_bus_fault_mva || 750,
      r1: this.extractedData.r1 || 0.125,
      x1: this.extractedData.x1 || 0.112,
      r0: this.extractedData.r0 || 0.375,
      x0: this.extractedData.x0 || 0.336,
      route_length_km: this.extractedData.route_length_km || 5,
      relay_burden_va: this.extractedData.relay_burden_va || 0.02,
      lead_resistance: this.extractedData.lead_resistance || 0.47,
      
      relay_type: this.extractedData.relay_type || 'REQ650',
      relay_model: this.extractedData.relay_model || 'REQ650 - Breaker Failure Protection',
      protection_functions: this.extractedData.protection_functions || ['breaker_failure'],
      
      project_name: this.extractedData.project_name || '33kV Cable Feeders',
      substation_name: this.extractedData.substation_name || '33kV DF5W SS',
      engineer_name: this.extractedData.engineer_name || 'Engineer',
      date: this.extractedData.date || new Date().toLocaleDateString()
    };
    
    return defaults;
  }

  // Helper method to determine IED type based on extracted data
  getIEDType(): string {
    const relayType = this.extractedData.relay_type;
    const functions = this.extractedData.protection_functions || [];
    
    // Map relay types to template IDs
    const relayMapping: Record<string, string> = {
      'RED670': 'tpl-red670',
      'REB670': 'tpl-reb670', 
      'REF615': 'tpl-ref615',
      'REL670': 'tpl-rel670',
      'REQ650': 'tpl-req650'
    };
    
    if (relayType && relayMapping[relayType]) {
      return relayMapping[relayType];
    }
    
    // Fallback based on protection functions
    if (functions.includes('differential') && functions.includes('distance') && functions.includes('breaker_failure')) {
      return 'tpl-red670';
    } else if (functions.includes('differential')) {
      return 'tpl-differential';
    } else if (functions.includes('distance')) {
      return 'tpl-distance';
    } else if (functions.includes('breaker_failure')) {
      return 'tpl-breaker-failure';
    }
    
    return 'tpl-req650'; // Default
  }
}

// Export utility function for easy use
export async function parseExcelCTData(file: File): Promise<ExcelCTData> {
  const parser = new ExcelCTParser();
  return await parser.parseFile(file);
}