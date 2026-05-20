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
  
  // Multiple Devices Found (NEW)
  detected_devices?: Array<{
    name: string;
    type: string;
    protection_type: string;
    functions: string[];
  }>;
  
  // Metadata
  project_name?: string;
  substation_name?: string;
  engineer_name?: string;
  date?: string;

  // Extended Project Data (from your demo structure)
  bus_fault_level_ka?: number;
  xr_ratio?: number;
  conductor_cross_section_1?: number;
  conductor_cross_section_2?: number;
  resistance_20c_1?: number;
  resistance_20c_2?: number;
  lead_length_1?: number;
  lead_length_2?: number;
  transformer_power_mva?: number;
  transformer_impedance?: number;
  transformer_voltage?: string;
  
  // Multiple CT Cores Data
  cores?: Array<{
    core_name: string;
    device: string;
    ct_ratio: string;
    accuracy_class: string;
    ct_resistance: number;
    vk_voltage: number;
    burden_va?: number;
    magnetizing_current?: number;
    protection_type: string;
  }>;
}

// Common patterns for finding CT data in Excel sheets
const CT_PATTERNS = {
  // Project identification
  project_title: [
    /proj\.?\s*demo/i,
    /outgoing\s*cable\s*feeders/i,
    /project\s*name/i,
    /title/i
  ],

  // System Parameters
  bus_fault_level: [
    /bus\s*fault\s*level/i,
    /fault\s*level/i,
    /short\s*circuit/i,
    /ka/i
  ],
  
  system_frequency: [
    /system\s*frequency/i,
    /frequency/i,
    /hz/i
  ],
  
  bus_voltage: [
    /bus\s*voltage\s*level/i,
    /voltage\s*level/i,
    /system\s*voltage/i,
    /kv/i
  ],

  // System Data patterns  
  system_fault_level: [
    /fault\s*level/i,
    /fault\s*mva/i,
    /short\s*circuit/i,
    /ikmax/i
  ],

  xr_ratio: [
    /x\/r\s*ratio/i,
    /xr\s*ratio/i,
    /reactance.*resistance/i
  ],

  // CT Wiring Details
  conductor_cross_section: [
    /conductor\s*cross\s*section/i,
    /cross\s*section/i,
    /wire\s*size/i,
    /mm/i
  ],

  resistance_20c: [
    /resistance\s*at\s*20.*c/i,
    /resistance.*copper/i,
    /Ω\/km/i,
    /ohm.*km/i
  ],

  lead_length: [
    /lead\s*length/i,
    /length.*current\s*loop/i,
    /vt\s*to\s*relay/i,
    /meter/i,
    /\bm\b/i
  ],

  // Cable/Route Parameters
  route_length: [
    /route\s*length/i,
    /cable\s*length/i,
    /distance/i,
    /km/i
  ],

  positive_sequence_r: [
    /positive\s*sequence\s*resistance/i,
    /r1/i,
    /pos.*seq.*r/i
  ],

  positive_sequence_x: [
    /positive\s*sequence\s*reactance/i,
    /z1/i,
    /pos.*seq.*x/i,
    /pos.*seq.*z/i
  ],

  zero_sequence_r: [
    /zero\s*sequence\s*resistance/i,
    /negative\s*sequence\s*resistance/i,
    /r0/i,
    /zero.*seq.*r/i
  ],

  zero_sequence_x: [
    /zero\s*sequence\s*reactance/i,
    /negative\s*sequence\s*reactance/i,
    /z0/i,
    /zero.*seq.*x/i
  ],

  // Transformer Data
  transformer_power: [
    /power\s*rating/i,
    /transformer.*mva/i,
    /mva/i
  ],

  transformer_impedance: [
    /impedance/i,
    /transformer.*impedance/i,
    /z.*transformer/i
  ],

  transformer_voltage: [
    /rated\s*voltage/i,
    /transformer.*voltage/i,
    /voltage.*rating/i
  ],

  // Protection & CT Core Details
  protection_devices: [
    /devices/i,
    /protection/i,
    /red\s*670/i,
    /rex\s*640/i,
    /ref\s*615/i,
    /reb\s*670/i,
    /frer/i
  ],

  ct_core: [
    /core/i,
    /ct\s*core/i,
    /t1/i,
    /core\s*\d+/i
  ],

  // CT Ratio patterns
  ct_ratio: [
    /ct\s*ratio/i,
    /current\s*transformer\s*ratio/i,
    /800\/1a/i,
    /2500\/1a/i,
    /\d+\/\d+a/i
  ],
  
  // CT Resistance patterns
  ct_resistance: [
    /ct\s*resistance/i,
    /resistance/i,
    /ohm/i,
    /Ω/i
  ],
  
  // Knee Point Voltage patterns
  knee_point: [
    /vk/i,
    /knee\s*point\s*voltage/i,
    /saturation\s*voltage/i,
    /limiting\s*voltage/i
  ],
  
  // Accuracy Class patterns
  accuracy: [
    /accuracy\s*class/i,
    /class/i,
    /px/i,
    /5p/i,
    /0\.5/i
  ],
  
  // Magnetizing Current patterns
  magnetizing: [
    /magnetizing\s*current/i,
    /burden/i,
    /ma/i,
    /va/i
  ],

  // Protection Types
  distance_protection: [
    /distance/i,
    /differential/i,
    /protection/i
  ],

  bcpu_protection: [
    /bcpu/i,
    /oc\/ef/i,
    /overcurrent/i
  ],

  ammeters: [
    /ammeters/i,
    /ammeter/i,
    /measurement/i
  ],

  busbar_protection: [
    /bb\/bf/i,
    /busbar/i,
    /bus.*protection/i
  ],

  // Cable Parameters
  cable_r1: [
    /positive\s*sequence\s*resistance/i,
    /r1/i,
    /pos.*seq.*r/i
  ],

  cable_x1: [
    /positive\s*sequence\s*reactance/i,
    /z1/i,
    /pos.*seq.*x/i,
    /pos.*seq.*z/i
  ],

  cable_r0: [
    /zero\s*sequence\s*resistance/i,
    /negative\s*sequence\s*resistance/i,
    /r0/i,
    /zero.*seq.*r/i
  ],

  cable_x0: [
    /zero\s*sequence\s*reactance/i,
    /negative\s*sequence\s*reactance/i,
    /z0/i,
    /zero.*seq.*x/i
  ],

  cable_length: [
    /route\s*length/i,
    /cable\s*length/i,
    /distance/i,
    /km/i
  ],

  // Relay and System Parameters
  relay_burden: [
    /relay\s*burden/i,
    /burden/i,
    /va/i
  ],

  lead_resistance: [
    /lead\s*resistance/i,
    /wiring\s*resistance/i,
    /conductor\s*resistance/i
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
      console.log('Excel sheets found:', sheetNames);
      
      for (const sheetName of sheetNames) {
        try {
          const worksheet = this.workbook.Sheets[sheetName];
          if (!worksheet) {
            console.warn(`Worksheet "${sheetName}" is empty or invalid`);
            continue;
          }
          
          await this.parseWorksheet(worksheet, sheetName);
        } catch (sheetError) {
          console.error(`Error parsing sheet "${sheetName}":`, sheetError);
          // Continue with other sheets instead of failing completely
        }
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
    
    console.log(`Parsing worksheet: ${sheetName}`);
    console.log(`Rows found: ${jsonData.length}`);
    
    // Look for project identification
    this.extractProjectInfo(jsonData, sheetName);
    
    // Look for system parameters section
    this.extractSystemParameters(jsonData);
    
    // Look for CT wiring details
    this.extractCTWiringDetails(jsonData);
    
    // Look for cable/route parameters
    this.extractCableParameters(jsonData);
    
    // Look for transformer data
    this.extractTransformerData(jsonData);
    
    // Look for protection & CT core details (the main table)
    this.extractProtectionCoreDetails(jsonData);
    
    // Look for individual CT data patterns (fallback)
    for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
      const row = jsonData[rowIndex];
      if (!row || row.length === 0) continue;
      
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        if (!cell || typeof cell !== 'string') continue;
        
        // Extract CT parameters
        this.extractCTParameters(cell, row, jsonData, rowIndex, colIndex);
        
        // Extract relay information
        this.extractRelayInfo(cell, row, jsonData, rowIndex, colIndex);
        
        // Extract project metadata
        this.extractMetadata(cell, row, jsonData, rowIndex, colIndex);
      }
    }
  }

  private extractProjectInfo(data: any[][], sheetName: string) {
    // Look for project title in sheet name or first few rows
    if (CT_PATTERNS.project_title.some(pattern => pattern.test(sheetName))) {
      this.extractedData.project_name = sheetName;
    }
    
    // Check first 5 rows for project information
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      for (const cell of row) {
        if (typeof cell === 'string') {
          if (CT_PATTERNS.project_title.some(pattern => pattern.test(cell))) {
            this.extractedData.project_name = cell;
          }
        }
      }
    }
  }

  private extractSystemParameters(data: any[][]) {
    if (!data || !Array.isArray(data)) return;
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || !Array.isArray(row)) continue;
      
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        if (!cell || typeof cell !== 'string') continue;
        
        try {
          // Bus Fault Level
          if (CT_PATTERNS.bus_fault_level.some(pattern => pattern.test(cell))) {
            const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
            if (values.length > 0) {
              this.extractedData.bus_fault_level_ka = values[0];
              // Convert kA to MVA (approximate: MVA = kA * kV * sqrt(3))
              if (this.extractedData.bus_voltage_kv) {
                this.extractedData.max_bus_fault_mva = values[0] * this.extractedData.bus_voltage_kv * Math.sqrt(3);
              }
            }
          }
          
          // System Frequency
          if (CT_PATTERNS.system_frequency.some(pattern => pattern.test(cell))) {
            const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
            if (values.length > 0) {
              this.extractedData.frequency = values[0];
            }
          }
          
          // Bus Voltage Level
          if (CT_PATTERNS.bus_voltage.some(pattern => pattern.test(cell))) {
            const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
            if (values.length > 0) {
              this.extractedData.bus_voltage_kv = values[0];
            }
          }
          
          // X/R Ratio
          if (CT_PATTERNS.xr_ratio.some(pattern => pattern.test(cell))) {
            const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
            if (values.length > 0) {
              this.extractedData.xr_ratio = values[0];
            }
          }
        } catch (error) {
          console.warn(`Error extracting system parameter at row ${rowIndex}, col ${colIndex}:`, error);
        }
      }
    }
  }

  private extractCTWiringDetails(data: any[][]) {
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row) continue;
      
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        if (!cell || typeof cell !== 'string') continue;
        
        // Conductor Cross Section
        if (CT_PATTERNS.conductor_cross_section.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 3);
          if (values.length > 0) {
            this.extractedData.conductor_cross_section_1 = values[0];
            if (values.length > 1) {
              this.extractedData.conductor_cross_section_2 = values[1];
            }
          }
        }
        
        // Resistance at 20°C
        if (CT_PATTERNS.resistance_20c.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 3);
          if (values.length > 0) {
            this.extractedData.resistance_20c_1 = values[0];
            if (values.length > 1) {
              this.extractedData.resistance_20c_2 = values[1];
            }
          }
        }
        
        // Lead Length
        if (CT_PATTERNS.lead_length.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 3);
          if (values.length > 0) {
            this.extractedData.lead_length_1 = values[0];
            if (values.length > 1) {
              this.extractedData.lead_length_2 = values[1];
            }
          }
        }
      }
    }
  }

  private extractCableParameters(data: any[][]) {
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row) continue;
      
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        if (!cell || typeof cell !== 'string') continue;
        
        // Route Length
        if (CT_PATTERNS.route_length.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
          if (values.length > 0) {
            this.extractedData.route_length_km = values[0];
          }
        }
        
        // Positive Sequence Resistance R1
        if (CT_PATTERNS.positive_sequence_r.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
          if (values.length > 0) {
            this.extractedData.r1 = values[0];
          }
        }
        
        // Positive Sequence Reactance Z1
        if (CT_PATTERNS.positive_sequence_x.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
          if (values.length > 0) {
            this.extractedData.x1 = values[0];
          }
        }
        
        // Zero Sequence Resistance R0
        if (CT_PATTERNS.zero_sequence_r.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
          if (values.length > 0) {
            this.extractedData.r0 = values[0];
          }
        }
        
        // Zero Sequence Reactance Z0
        if (CT_PATTERNS.zero_sequence_x.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
          if (values.length > 0) {
            this.extractedData.x0 = values[0];
          }
        }
      }
    }
  }

  private extractTransformerData(data: any[][]) {
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row) continue;
      
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        if (!cell || typeof cell !== 'string') continue;
        
        // Transformer Power Rating
        if (CT_PATTERNS.transformer_power.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
          if (values.length > 0) {
            this.extractedData.transformer_power_mva = values[0];
          }
        }
        
        // Transformer Impedance
        if (CT_PATTERNS.transformer_impedance.some(pattern => pattern.test(cell))) {
          const values = this.findNearbyNumbers(data, rowIndex, colIndex, 2);
          if (values.length > 0) {
            this.extractedData.transformer_impedance = values[0];
          }
        }
        
        // Transformer Voltage
        if (CT_PATTERNS.transformer_voltage.some(pattern => pattern.test(cell))) {
          const text = this.findNearbyText(data, rowIndex, colIndex, 2);
          if (text.includes('kV') || text.includes('/')) {
            this.extractedData.transformer_voltage = text;
          }
        }
      }
    }
  }

  private extractProtectionCoreDetails(data: any[][]) {
    // Look for the protection table header
    let tableStartRow = -1;
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row) continue;
      
      // Look for table headers
      const rowText = row.join(' ').toLowerCase();
      if (rowText.includes('protection') && rowText.includes('ct core') && rowText.includes('devices')) {
        tableStartRow = rowIndex;
        break;
      }
    }
    
    if (tableStartRow === -1) return;
    
    // Initialize arrays for collecting data
    this.extractedData.cores = [];
    this.extractedData.detected_devices = [];
    
    // Look for data rows after the header
    for (let rowIndex = tableStartRow + 1; rowIndex < Math.min(tableStartRow + 10, data.length); rowIndex++) {
      const row = data[rowIndex];
      if (!row || row.length < 4) continue;
      
      // Skip empty rows
      if (row.every(cell => !cell || cell === '')) continue;
      
      // Extract core data from each column (Distance+Differential, BCPU+OC/EF, Ammeters, BB/BF)
      const protectionTypes = ['Distance + Differential Protection', 'BCPU + OC/EF', 'Ammeters', 'BB/BF'];
      
      for (let colIndex = 2; colIndex < Math.min(row.length, 6); colIndex++) {
        const cell = row[colIndex];
        if (!cell) continue;
        
        const coreData = {
          core_name: `Core ${colIndex - 1}`,
          device: '',
          ct_ratio: '',
          accuracy_class: '',
          ct_resistance: 0,
          vk_voltage: 0,
          burden_va: 0,
          magnetizing_current: 0,
          protection_type: protectionTypes[colIndex - 2] || 'Unknown'
        };
        
        // Extract device name and collect all devices
        if (typeof cell === 'string' && (cell.includes('RED') || cell.includes('REX') || cell.includes('REF') || cell.includes('REB') || cell.includes('FRER'))) {
          coreData.device = cell;
          
          // Determine device type and functions, but don't overwrite - collect all
          let deviceType = '';
          let functions: string[] = [];
          
          if (cell.includes('RED 670') || cell.includes('RED670')) {
            deviceType = 'RED670';
            functions = ['differential', 'distance', 'breaker_failure'];
          } else if (cell.includes('REX640')) {
            deviceType = 'REX640';
            functions = ['overcurrent'];
          } else if (cell.includes('REF615')) {
            deviceType = 'REF615';
            functions = ['differential'];
          } else if (cell.includes('REB670')) {
            deviceType = 'REB670';
            functions = ['busbar_protection'];
          } else if (cell.includes('FRER')) {
            deviceType = 'FRER';
            functions = ['measurement'];
          }
          
          // Add to detected devices if not already present
          if (deviceType && !this.extractedData.detected_devices?.some(d => d.type === deviceType)) {
            this.extractedData.detected_devices?.push({
              name: cell,
              type: deviceType,
              protection_type: protectionTypes[colIndex - 2] || 'Unknown',
              functions: functions
            });
          }
          
          // Set primary relay type to the first significant one (RED670 preferred)
          if (!this.extractedData.relay_type || deviceType === 'RED670') {
            this.extractedData.relay_type = deviceType;
            this.extractedData.protection_functions = functions;
          }
        }
        
        // Extract CT ratio (800/1A, 2500/1A) - use the first one found
        if (typeof cell === 'string' && cell.includes('/') && cell.includes('A')) {
          coreData.ct_ratio = cell;
          if (!this.extractedData.ct_ratio_primary) {
            const ratioMatch = cell.match(/(\d+)\/(\d+)A?/);
            if (ratioMatch) {
              this.extractedData.ct_ratio_primary = parseInt(ratioMatch[1]);
              this.extractedData.ct_ratio_secondary = parseInt(ratioMatch[2]);
            }
          }
        }
        
        // Extract accuracy class (PX, 0.5) - use the first one found
        if (typeof cell === 'string' && (cell.includes('PX') || cell.includes('0.5') || cell.includes('5P'))) {
          coreData.accuracy_class = cell;
          if (!this.extractedData.accuracy_class) {
            this.extractedData.accuracy_class = cell;
          }
        }
        
        // Extract numeric values (resistance, voltage, burden, current) - use first found
        if (typeof cell === 'number') {
          if (cell >= 1 && cell <= 50) {
            // Likely CT resistance (1-50 ohms)
            coreData.ct_resistance = cell;
            if (!this.extractedData.rct) {
              this.extractedData.rct = cell;
            }
          } else if (cell >= 100 && cell <= 1000) {
            // Likely Vk voltage (100-1000V)
            coreData.vk_voltage = cell;
            if (!this.extractedData.vk_available) {
              this.extractedData.vk_available = cell;
            }
          } else if (cell >= 1 && cell <= 100 && cell < 50) {
            // Likely magnetizing current (1-100mA) or burden (1-100VA)
            if (coreData.magnetizing_current === 0) {
              coreData.magnetizing_current = cell;
              if (!this.extractedData.io_at_vk) {
                this.extractedData.io_at_vk = cell;
              }
            } else {
              coreData.burden_va = cell;
              if (!this.extractedData.relay_burden_va) {
                this.extractedData.relay_burden_va = cell / 1000; // Convert VA to kVA
              }
            }
          }
        }
        
        // Only add if we have meaningful data
        if (coreData.device || coreData.ct_ratio || coreData.accuracy_class) {
          this.extractedData.cores?.push(coreData);
        }
      }
    }
    
    // Log detected devices for debugging
    console.log('Detected devices:', this.extractedData.detected_devices);
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
    if (CT_PATTERNS.system_fault_level && CT_PATTERNS.system_fault_level.some(pattern => pattern.test(cell))) {
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
    
    // Add safety checks
    if (!data || !Array.isArray(data) || data.length === 0) {
      return numbers;
    }
    
    for (let r = Math.max(0, rowIndex - radius); r <= Math.min(data.length - 1, rowIndex + radius); r++) {
      const row = data[r];
      if (!row || !Array.isArray(row)) continue;
      
      for (let c = Math.max(0, colIndex - radius); c <= Math.min(row.length - 1, colIndex + radius); c++) {
        const cell = row[c];
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
    
    // Add safety checks
    if (!data || !Array.isArray(data) || data.length === 0) {
      return text;
    }
    
    for (let r = Math.max(0, rowIndex - radius); r <= Math.min(data.length - 1, rowIndex + radius); r++) {
      const row = data[r];
      if (!row || !Array.isArray(row)) continue;
      
      for (let c = Math.max(0, colIndex - radius); c <= Math.min(row.length - 1, colIndex + radius); c++) {
        const cell = row[c];
        if (typeof cell === 'string' && cell.trim().length > text.length) {
          text = cell.trim();
        }
      }
    }
    
    return text;
  }

  private validateAndFillDefaults(): ExcelCTData {
    // Set default values for missing required fields based on your demo project
    const defaults: ExcelCTData = {
      // Primary CT data (from Protection & CT Core Details table)
      ct_ratio_primary: this.extractedData.ct_ratio_primary || 800,
      ct_ratio_secondary: this.extractedData.ct_ratio_secondary || 1,
      accuracy_class: this.extractedData.accuracy_class || 'PX',
      rct: this.extractedData.rct || 3.5,
      vk_available: this.extractedData.vk_available || 540,
      io_at_vk: this.extractedData.io_at_vk || 20,
      
      // System parameters (from System Parameters section)
      frequency: this.extractedData.frequency || 50,
      bus_voltage_kv: this.extractedData.bus_voltage_kv || 33,
      max_bus_fault_mva: this.extractedData.max_bus_fault_mva || 
        (this.extractedData.bus_fault_level_ka ? 
          this.extractedData.bus_fault_level_ka * (this.extractedData.bus_voltage_kv || 33) * Math.sqrt(3) : 
          1800),
      
      // Cable/Route parameters
      r1: this.extractedData.r1 || 0.0221,
      x1: this.extractedData.x1 || 0.16,
      r0: this.extractedData.r0 || 0.13,
      x0: this.extractedData.x0 || 0.06,
      route_length_km: this.extractedData.route_length_km || 0.2,
      
      // Lead resistance calculation from CT wiring details
      lead_resistance: this.calculateLeadResistance(),
      relay_burden_va: this.extractedData.relay_burden_va || 0.02,
      
      // Relay information (from Protection & CT Core Details)
      relay_type: this.extractedData.relay_type || 'RED670',
      relay_model: this.extractedData.relay_model || 
        `${this.extractedData.relay_type || 'RED670'} - Transformer Differential + Distance + Breaker Failure`,
      protection_functions: this.extractedData.protection_functions || ['differential', 'distance', 'breaker_failure'],
      
      // Project metadata
      project_name: this.extractedData.project_name || 'PROJ. DEMO INPUTS - OUTGOING CABLE FEEDERS',
      substation_name: this.extractedData.substation_name || '33kV Substation',
      engineer_name: this.extractedData.engineer_name || 'Engineer',
      date: this.extractedData.date || new Date().toLocaleDateString(),
      
      // Extended project data
      bus_fault_level_ka: this.extractedData.bus_fault_level_ka || 31.5,
      xr_ratio: this.extractedData.xr_ratio,
      conductor_cross_section_1: this.extractedData.conductor_cross_section_1 || 6,
      conductor_cross_section_2: this.extractedData.conductor_cross_section_2 || 2.5,
      resistance_20c_1: this.extractedData.resistance_20c_1 || 3.69,
      resistance_20c_2: this.extractedData.resistance_20c_2 || 8.87,
      lead_length_1: this.extractedData.lead_length_1 || 50,
      lead_length_2: this.extractedData.lead_length_2 || 50,
      transformer_power_mva: this.extractedData.transformer_power_mva || 100,
      transformer_impedance: this.extractedData.transformer_impedance || 0.25,
      transformer_voltage: this.extractedData.transformer_voltage || '138/34.5 kV',
      
      // Multiple cores data
      cores: this.extractedData.cores || []
    };
    
    return defaults;
  }

  private calculateLeadResistance(): number {
    // Calculate lead resistance based on CT wiring details
    // Formula: R = ρ * L / A (where ρ is resistivity, L is length, A is cross-sectional area)
    
    const section1 = this.extractedData.conductor_cross_section_1 || 6; // mm²
    const section2 = this.extractedData.conductor_cross_section_2 || 2.5; // mm²
    const resistance1 = this.extractedData.resistance_20c_1 || 3.69; // Ω/km
    const resistance2 = this.extractedData.resistance_20c_2 || 8.87; // Ω/km
    const length1 = (this.extractedData.lead_length_1 || 50) / 1000; // Convert m to km
    const length2 = (this.extractedData.lead_length_2 || 50) / 1000; // Convert m to km
    
    // Calculate total lead resistance (assuming series connection)
    const leadR1 = resistance1 * length1;
    const leadR2 = resistance2 * length2;
    
    // Use the higher resistance section as the limiting factor
    return Math.max(leadR1, leadR2);
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