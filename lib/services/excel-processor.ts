/**
 * Excel Processing Service for CT Adequacy Analysis
 * Handles parsing of standardized Excel format:
 * - 17 Standard Parameters (fixed structure, varying values)
 * - 7 Device Parameters × N Devices (4-20 devices possible)
 */

import * as XLSX from 'xlsx';

// 17 Standard Parameters Structure
export interface StandardParameters {
  bus_fault_level?: string;           // kA (e.g., "31.5kA/3sec")
  system_frequency?: string;          // Hz (e.g., "50")
  bus_voltage_level?: string;         // kV (e.g., "33kV")
  xr_ratio?: string;                  // - (e.g., "-")
  ct_wiring_conductor_cross_section_1?: string;  // mm (e.g., "6")
  resistance_w_km_20c_1?: string;     // Ω/km (e.g., "3.69")
  specific_resistance_20c_1?: string; // K-1 (e.g., "-")
  lead_length_vt_to_relay_1?: string; // m (e.g., "50")
  ct_wiring_conductor_cross_section_2?: string;  // mm (e.g., "2.5")
  resistance_w_km_20c_2?: string;     // Ω/km (e.g., "8.87")
  specific_resistance_20c_2?: string; // K-1 (e.g., "-")
  lead_length_vt_to_relay_2?: string; // m (e.g., "50")
  route_length?: string;              // km (e.g., "0.20")
  positive_seq_resistance_r1?: string; // Ω/km (e.g., "0.0221")
  positive_seq_reactance_z1?: string;  // Ω/km (e.g., "0.1600")
  negative_seq_resistance_r0?: string; // Ω/km (e.g., "0.1300")
  negative_seq_reactance_z0?: string;  // Ω/km (e.g., "0.0600")
  // Additional transformer parameters
  power_rating?: string;              // MVA (e.g., "100")
  impedance?: string;                 // % (e.g., "25%")
  rated_voltage?: string;             // kV (e.g., "138/34.5 kV")
}

// 7 Device Parameters Structure (per device)
export interface DeviceParameters {
  device_name: string;                // RED670, BCPU, Ammeters, BB/BF, etc.
  core?: string;                      // Core designation (e.g., "Core 1", "T1", "-")
  ct_core_used_for?: string;          // Purpose/Function (e.g., "Core 1", "Core 2")
  ct_ratio?: string;                  // e.g., "800/1A", "2500/1A"
  accuracy_class?: string;            // e.g., "PX", "0.5"
  ct_resistance?: string;             // ohm (e.g., "3.5", "6", "2.5", "15")
  vk_knee_point_voltage?: string;     // V (e.g., "540", "400")
  burden?: string;                    // VA (e.g., "10", "20")
  magnetizing_current?: string;       // mA (e.g., "20", "-")
}

// Internal interface for processing (includes temporary _column field)
interface DeviceParametersInternal extends DeviceParameters {
  _column?: number;
}

export interface ExcelData {
  // 17 Standard Parameters (always present)
  standard_parameters: StandardParameters;
  
  // Variable number of devices (4-20) with 7 parameters each
  devices: DeviceParameters[];
  
  // Metadata
  total_devices: number;
  device_types: string[];
  
  // Legacy compatibility fields (derived from new structure)
  ct_ratio_primary?: number;
  ct_ratio_secondary?: number;
  accuracy_class?: string;
  rct?: number;
  vk_available?: number;
  io_at_vk?: number;
  frequency?: number;
  bus_voltage_kv?: number;
  max_bus_fault_mva?: number;
  r1?: number;
  x1?: number;
  r0?: number;
  x0?: number;
  route_length_km?: number;
  relay_burden_va?: number;
  lead_resistance?: number;
  
  // Additional extracted data
  relay_type?: string;
  relay_model?: string;
  protection_functions?: string[];
  detected_devices?: Array<{
    name: string;
    type: string;
    protection_type: string;
    functions: string[];
  }>;
}

export interface ExcelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: ExcelData;
}

export class ExcelProcessor {
  // Device parameter mapping (7 parameters per device) - Enhanced patterns  
  private static readonly DEVICE_PARAMETER_PATTERNS = {
    core: ['core'],
    ct_core_used_for: ['ct core used for', 'used for', 'purpose', 'ctcoreusedfor'],
    ct_ratio: ['ct ratio', 'ratio', 'ctratio'],
    accuracy_class: ['accuracy class', 'accuracy', 'class', 'accuracyclass'],
    ct_resistance: ['ct resistance', 'resistance', 'ctresistance'],
    vk_knee_point_voltage: ['vk- knee point voltage', 'knee point voltage', 'vk', 'knee point', 'kneepoint', 'kneepointvoltage'],
    burden: ['burden'],
    magnetizing_current: ['magnetizing current', 'magnetizing', 'current', 'magnetizingcurrent']
  };

  static async processExcelFile(file: File): Promise<ExcelValidationResult> {
    try {
      // Validate file format
      const formatValidation = this.validateFileFormat(file);
      if (!formatValidation.isValid) {
        return formatValidation;
      }

      // Read Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Extract data using the standardized structure
      const extractedData = await this.extractStandardizedData(workbook);
      
      // Validate extracted data
      const validation = this.validateExtractedData(extractedData);
      
      return {
        isValid: validation.errors.length === 0,
        errors: validation.errors,
        warnings: validation.warnings,
        data: validation.errors.length === 0 ? extractedData : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  private static validateFileFormat(file: File): ExcelValidationResult {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const supportedFormats = ['.xlsx', '.xls'];
    
    if (!supportedFormats.includes(extension)) {
      return {
        isValid: false,
        errors: [`Unsupported file format: ${extension}. Supported formats: ${supportedFormats.join(', ')}`],
        warnings: []
      };
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return {
        isValid: false,
        errors: ['File size exceeds 50MB limit'],
        warnings: []
      };
    }

    return { isValid: true, errors: [], warnings: [] };
  }

  private static async extractStandardizedData(workbook: XLSX.WorkBook): Promise<ExcelData> {
    const result: ExcelData = {
      standard_parameters: {},
      devices: [],
      total_devices: 0,
      device_types: []
    };

    console.log('🔍 STARTING EXCEL PROCESSING');
    console.log('Processing workbook with sheets:', workbook.SheetNames);

    // Process only the first sheet to avoid duplicates
    const firstSheetName = workbook.SheetNames[0];
    console.log(`📄 Processing primary sheet: ${firstSheetName}`);
    
    const sheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    console.log(`📊 Sheet ${firstSheetName} has ${data.length} rows`);
    
    // Log first 20 rows for comprehensive debugging
    console.log('🔍 FIRST 20 ROWS OF EXCEL DATA:');
    data.slice(0, 20).forEach((row, i) => {
      if (row && row.length > 0) {
        console.log(`Row ${i}:`, row.map(cell => cell ? String(cell).substring(0, 50) : '').join(' | '));
      }
    });
    
    // Extract 17 standard parameters
    console.log('\n📋 EXTRACTING STANDARD PARAMETERS...');
    this.extractStandardParameters(data, result.standard_parameters);
    
    // Extract device parameters (7 parameters × N devices)
    console.log('\n🔌 EXTRACTING DEVICE PARAMETERS...');
    const devices = this.extractDeviceParameters(data);
    result.devices = devices; // Don't push, just assign to avoid duplicates

    // Set metadata
    result.total_devices = result.devices.length;
    result.device_types = [...new Set(result.devices.map(d => d.device_name))];

    console.log(`\n✅ EXTRACTION COMPLETE:`);
    console.log(`   📊 Standard Parameters: ${Object.keys(result.standard_parameters).length}`);
    console.log(`   🔌 Devices Found: ${result.total_devices}`);
    console.log(`   📝 Device Types: ${result.device_types.join(', ')}`);

    // Generate legacy compatibility fields
    console.log('\n🔄 GENERATING LEGACY COMPATIBILITY FIELDS...');
    this.generateLegacyFields(result);

    return result;
  }

  private static extractStandardParameters(data: any[][], standardParams: StandardParameters): void {
    console.log('Extracting standard parameters from', data.length, 'rows');
    
    // Track which parameters we've found for better debugging
    const foundParameters: string[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;

      const parameterName = String(row[0] || '').toLowerCase().trim();
      if (!parameterName) continue;
      
      // Try multiple columns for values (column 2, 1, or any non-empty column)
      let value = null;
      for (let col = 2; col >= 1 && col < row.length; col--) {
        if (row[col] !== null && row[col] !== undefined && String(row[col]).trim() !== '') {
          value = this.normalizeValue(row[col]);
          break;
        }
      }
      
      if (!value) {
        // Try any column after the parameter name
        for (let col = 1; col < row.length; col++) {
          if (row[col] !== null && row[col] !== undefined && String(row[col]).trim() !== '') {
            value = this.normalizeValue(row[col]);
            break;
          }
        }
      }

      if (!value) value = 'N/A';

      console.log(`Row ${i}: Parameter "${parameterName}" = "${value}"`);

      // Enhanced matching for all 17+ standard parameters with more flexible patterns
      const cleanParam = parameterName.replace(/[^a-z0-9]/g, '');
      
      // Bus and System Parameters
      if (parameterName.includes('bus fault level') || parameterName.includes('fault level') || 
          parameterName.includes('busfault') || cleanParam.includes('busfaultlevel')) {
        standardParams.bus_fault_level = value;
        foundParameters.push('bus_fault_level');
        console.log('✅ Found bus_fault_level:', value);
      } else if (parameterName.includes('system frequency') || parameterName.includes('frequency') || 
                 cleanParam.includes('systemfrequency') || cleanParam.includes('freq')) {
        standardParams.system_frequency = value;
        foundParameters.push('system_frequency');
        console.log('✅ Found system_frequency:', value);
      } else if (parameterName.includes('bus voltage level') || parameterName.includes('voltage level') || 
                 parameterName.includes('bus voltage') || cleanParam.includes('busvoltagelevel')) {
        standardParams.bus_voltage_level = value;
        foundParameters.push('bus_voltage_level');
        console.log('✅ Found bus_voltage_level:', value);
      } else if (parameterName.includes('x/r ratio') || parameterName.includes('xr ratio') || 
                 parameterName.includes('x r ratio') || cleanParam.includes('xrratio')) {
        standardParams.xr_ratio = value;
        foundParameters.push('xr_ratio');
        console.log('✅ Found xr_ratio:', value);
      }
      
      // CT Wiring Parameters (First Set)
      else if ((parameterName.includes('conductor cross section') || parameterName.includes('ct wiring') || 
                parameterName.includes('cross section')) && !foundParameters.includes('ct_wiring_conductor_cross_section_1')) {
        standardParams.ct_wiring_conductor_cross_section_1 = value;
        foundParameters.push('ct_wiring_conductor_cross_section_1');
        console.log('✅ Found ct_wiring_conductor_cross_section_1:', value);
      } else if ((parameterName.includes('resistance in w/km') || parameterName.includes('resistance w/km') || 
                  (parameterName.includes('resistance') && parameterName.includes('copper'))) && 
                 !foundParameters.includes('resistance_w_km_20c_1')) {
        standardParams.resistance_w_km_20c_1 = value;
        foundParameters.push('resistance_w_km_20c_1');
        console.log('✅ Found resistance_w_km_20c_1:', value);
      } else if ((parameterName.includes('specific resistance') || 
                  (parameterName.includes('specific') && parameterName.includes('copper'))) && 
                 !foundParameters.includes('specific_resistance_20c_1')) {
        standardParams.specific_resistance_20c_1 = value;
        foundParameters.push('specific_resistance_20c_1');
        console.log('✅ Found specific_resistance_20c_1:', value);
      } else if ((parameterName.includes('lead length') && 
                  (parameterName.includes('current loop') || parameterName.includes('vt to relay'))) && 
                 !foundParameters.includes('lead_length_vt_to_relay_1')) {
        standardParams.lead_length_vt_to_relay_1 = value;
        foundParameters.push('lead_length_vt_to_relay_1');
        console.log('✅ Found lead_length_vt_to_relay_1:', value);
      }
      
      // CT Wiring Parameters (Second Set)
      else if ((parameterName.includes('conductor cross section') || parameterName.includes('ct wiring') || 
                parameterName.includes('cross section')) && foundParameters.includes('ct_wiring_conductor_cross_section_1')) {
        standardParams.ct_wiring_conductor_cross_section_2 = value;
        foundParameters.push('ct_wiring_conductor_cross_section_2');
        console.log('✅ Found ct_wiring_conductor_cross_section_2:', value);
      } else if ((parameterName.includes('resistance in w/km') || parameterName.includes('resistance w/km') || 
                  (parameterName.includes('resistance') && parameterName.includes('copper'))) && 
                 foundParameters.includes('resistance_w_km_20c_1')) {
        standardParams.resistance_w_km_20c_2 = value;
        foundParameters.push('resistance_w_km_20c_2');
        console.log('✅ Found resistance_w_km_20c_2:', value);
      } else if ((parameterName.includes('specific resistance') || 
                  (parameterName.includes('specific') && parameterName.includes('copper'))) && 
                 foundParameters.includes('specific_resistance_20c_1')) {
        standardParams.specific_resistance_20c_2 = value;
        foundParameters.push('specific_resistance_20c_2');
        console.log('✅ Found specific_resistance_20c_2:', value);
      } else if ((parameterName.includes('lead length') && 
                  (parameterName.includes('current loop') || parameterName.includes('vt to relay'))) && 
                 foundParameters.includes('lead_length_vt_to_relay_1')) {
        standardParams.lead_length_vt_to_relay_2 = value;
        foundParameters.push('lead_length_vt_to_relay_2');
        console.log('✅ Found lead_length_vt_to_relay_2:', value);
      }
      
      // Route and Sequence Parameters
      else if (parameterName.includes('route length') || cleanParam.includes('routelength')) {
        standardParams.route_length = value;
        foundParameters.push('route_length');
        console.log('✅ Found route_length:', value);
      } else if ((parameterName.includes('positive seq') || parameterName.includes('positive sequence')) && 
                 parameterName.includes('resistance') && (parameterName.includes('r1') || parameterName.includes('r 1'))) {
        standardParams.positive_seq_resistance_r1 = value;
        foundParameters.push('positive_seq_resistance_r1');
        console.log('✅ Found positive_seq_resistance_r1:', value);
      } else if ((parameterName.includes('positive seq') || parameterName.includes('positive sequence')) && 
                 parameterName.includes('reactance') && (parameterName.includes('z1') || parameterName.includes('z 1'))) {
        standardParams.positive_seq_reactance_z1 = value;
        foundParameters.push('positive_seq_reactance_z1');
        console.log('✅ Found positive_seq_reactance_z1:', value);
      } else if ((parameterName.includes('negative seq') || parameterName.includes('zero seq') || 
                  parameterName.includes('negative sequence') || parameterName.includes('zero sequence')) && 
                 parameterName.includes('resistance') && (parameterName.includes('r0') || parameterName.includes('r 0'))) {
        standardParams.negative_seq_resistance_r0 = value;
        foundParameters.push('negative_seq_resistance_r0');
        console.log('✅ Found negative_seq_resistance_r0:', value);
      } else if ((parameterName.includes('negative seq') || parameterName.includes('zero seq') || 
                  parameterName.includes('negative sequence') || parameterName.includes('zero sequence')) && 
                 parameterName.includes('reactance') && (parameterName.includes('z0') || parameterName.includes('z 0'))) {
        standardParams.negative_seq_reactance_z0 = value;
        foundParameters.push('negative_seq_reactance_z0');
        console.log('✅ Found negative_seq_reactance_z0:', value);
      }
      
      // Transformer Parameters
      else if (parameterName.includes('power rating') || (parameterName.includes('power') && parameterName.includes('mva')) ||
               parameterName.includes('transformer') || cleanParam.includes('powerrating')) {
        standardParams.power_rating = value;
        foundParameters.push('power_rating');
        console.log('✅ Found power_rating:', value);
      } else if (parameterName.includes('impedance') && !parameterName.includes('sequence')) {
        standardParams.impedance = value;
        foundParameters.push('impedance');
        console.log('✅ Found impedance:', value);
      } else if (parameterName.includes('rated voltage') || 
                 (parameterName.includes('voltage') && parameterName.includes('kv') && !parameterName.includes('bus'))) {
        standardParams.rated_voltage = value;
        foundParameters.push('rated_voltage');
        console.log('✅ Found rated_voltage:', value);
      }
      
      // Catch any missed parameters with broader patterns
      else if (parameterName.length > 3 && value !== 'N/A') {
        console.log(`⚠️ Unmatched parameter: "${parameterName}" = "${value}"`);
      }
    }
    
    console.log(`\n📊 PARAMETER EXTRACTION SUMMARY:`);
    console.log(`Found ${foundParameters.length} out of 17+ expected parameters`);
    console.log('✅ Found parameters:', foundParameters);
    
    // Check for missing critical parameters
    const expectedParams = [
      'bus_fault_level', 'system_frequency', 'bus_voltage_level', 'xr_ratio',
      'ct_wiring_conductor_cross_section_1', 'resistance_w_km_20c_1', 'lead_length_vt_to_relay_1',
      'route_length', 'positive_seq_resistance_r1', 'positive_seq_reactance_z1', 
      'negative_seq_resistance_r0', 'negative_seq_reactance_z0',
      'power_rating', 'impedance', 'rated_voltage'
    ];
    
    const missingParams = expectedParams.filter(param => !foundParameters.includes(param));
    if (missingParams.length > 0) {
      console.log('⚠️ Missing parameters:', missingParams);
      console.log('\n🔍 SEARCHING FOR MISSED PARAMETERS IN ALL ROWS:');
      
      // Try to find missed parameters with more flexible matching
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        const paramName = String(row[0] || '').toLowerCase().trim();
        if (paramName.length > 3) {
          // Check if this might be a missed parameter
          for (const missing of missingParams) {
            const keywords = missing.split('_');
            if (keywords.some(keyword => paramName.includes(keyword))) {
              console.log(`   Possible match for ${missing}: Row ${i} "${paramName}" = "${row[1] || row[2] || 'N/A'}"`);
            }
          }
        }
      }
    }
    
    console.log('📋 Final standard parameters object:', standardParams);
  }

  private static extractDeviceParameters(data: any[][]): DeviceParameters[] {
    const devices: DeviceParametersInternal[] = [];
    
    // Look for device table with multiple strategies
    let deviceTableStart = -1;
    let deviceHeaderRow = -1;
    
    // Strategy 1: Look for "PROTECTION PURPOSE" or "DEVICES" keywords
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const rowText = row.join(' ').toLowerCase();
      if ((rowText.includes('protection') && (rowText.includes('purpose') || rowText.includes('devices'))) ||
          rowText.includes('devices')) {
        deviceTableStart = i;
        break;
      }
    }

    // Strategy 2: If not found, look for any row with device-like names
    if (deviceTableStart === -1) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        
        const deviceCount = row.filter(cell => {
          if (!cell) return false;
          const cellStr = String(cell).toUpperCase();
          return cellStr.includes('RED') || cellStr.includes('REF') || 
                 cellStr.includes('REL') || cellStr.includes('BCPU') || 
                 cellStr.includes('AMMETER') || cellStr.includes('BB') ||
                 cellStr.includes('BF') || cellStr.includes('CORE') ||
                 cellStr.includes('670') || cellStr.includes('615') ||
                 cellStr.includes('640') || cellStr.includes('DISTANCE') ||
                 cellStr.includes('DIFFERENTIAL') || cellStr.includes('OC/EF');
        }).length;
        
        if (deviceCount >= 2) { // At least 2 device-like names
          deviceTableStart = i - 1; // Start one row before
          break;
        }
      }
    }

    if (deviceTableStart === -1) {
      console.log('No device table found');
      return devices;
    }

    console.log(`Device table starts around row ${deviceTableStart}`);

    // Find the header row with device names (search in next 10 rows)
    const deviceColumns: Array<{ name: string; column: number }> = [];
    
    for (let i = Math.max(0, deviceTableStart); i < Math.min(deviceTableStart + 10, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      console.log(`Checking row ${i} for device names:`, row);
      
      // Look for device names in the row (check columns 2 onwards to skip parameter names)
      const currentRowDevices: Array<{ name: string; column: number }> = [];
      
      for (let j = 2; j < row.length; j++) { // Start from column 2 to skip parameter column
        const cell = row[j];
        if (!cell) continue;
        
        const cellStr = String(cell).trim();
        if (cellStr && cellStr !== '-' && cellStr.length > 1) {
          // Check if it looks like a device name
          const upperCell = cellStr.toUpperCase();
          if (upperCell.includes('DISTANCE') || upperCell.includes('DIFFERENTIAL') || 
              upperCell.includes('PROTECTION') || upperCell.includes('RED') || 
              upperCell.includes('REF') || upperCell.includes('REL') || 
              upperCell.includes('BCPU') || upperCell.includes('AMMETER') || 
              upperCell.includes('BB') || upperCell.includes('BF') || 
              upperCell.includes('670') || upperCell.includes('615') || 
              upperCell.includes('640') || upperCell.includes('OC') ||
              upperCell.includes('EF') || upperCell.includes('FRER')) {
            
            // Check if this column already has a device name
            const existingDevice = deviceColumns.find(d => d.column === j);
            if (!existingDevice) {
              currentRowDevices.push({ name: cellStr, column: j });
            }
          }
        }
      }
      
      if (currentRowDevices.length > 0) {
        console.log(`Found ${currentRowDevices.length} new devices at row ${i}:`, currentRowDevices.map(d => d.name));
        deviceColumns.push(...currentRowDevices);
        
        if (deviceHeaderRow === -1) {
          deviceHeaderRow = i;
        }
      }
    }

    if (deviceColumns.length === 0) {
      console.log('No device columns found');
      return [];
    }

    // Remove duplicates based on column position (keep first occurrence)
    const uniqueDeviceColumns = deviceColumns.filter((device, index, self) => 
      index === self.findIndex(d => d.column === device.column)
    );

    console.log(`Found ${uniqueDeviceColumns.length} unique device columns:`, uniqueDeviceColumns);

    // Create device objects for unique devices only
    uniqueDeviceColumns.forEach(({ name, column }) => {
      devices.push({
        device_name: name,
        core: 'N/A',
        ct_core_used_for: 'N/A',
        ct_ratio: 'N/A',
        accuracy_class: 'N/A',
        ct_resistance: 'N/A',
        vk_knee_point_voltage: 'N/A',
        burden: 'N/A',
        magnetizing_current: 'N/A',
        _column: column // Store column index for later use
      });
    });

    console.log(`Processing ${devices.length} unique devices from row ${deviceHeaderRow}`);

    // Extract the 7 parameters for each device (search in next 20 rows)
    for (let i = deviceHeaderRow + 1; i < Math.min(deviceHeaderRow + 20, data.length); i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;

      const parameterName = String(row[0] || '').toLowerCase().trim();
      if (!parameterName) continue;
      
      console.log(`Processing device parameter row ${i}: "${parameterName}"`);
      
      // Enhanced parameter matching with more patterns and better logging
      let paramKey = '';
      
      if (parameterName.includes('core') && !parameterName.includes('used')) {
        paramKey = 'core';
      } else if (parameterName.includes('ct core used') || parameterName.includes('used for') || 
                 parameterName.includes('core used')) {
        paramKey = 'ct_core_used_for';
      } else if (parameterName.includes('ct ratio') || parameterName.includes('ratio')) {
        paramKey = 'ct_ratio';
      } else if (parameterName.includes('accuracy class') || parameterName.includes('accuracy')) {
        paramKey = 'accuracy_class';
      } else if (parameterName.includes('ct resistance') || 
                 (parameterName.includes('resistance') && !parameterName.includes('seq') && !parameterName.includes('specific'))) {
        paramKey = 'ct_resistance';
      } else if (parameterName.includes('vk') || parameterName.includes('knee point') || 
                 parameterName.includes('knee-point') || parameterName.includes('kneepointvoltage')) {
        paramKey = 'vk_knee_point_voltage';
      } else if (parameterName.includes('burden')) {
        paramKey = 'burden';
      } else if (parameterName.includes('magnetizing') || 
                 (parameterName.includes('current') && !parameterName.includes('loop') && !parameterName.includes('lead'))) {
        paramKey = 'magnetizing_current';
      }
      
      if (paramKey) {
        console.log(`✅ Matched device parameter "${parameterName}" to ${paramKey}`);
        
        // Set values for each device using their stored column positions
        devices.forEach((device, deviceIndex) => {
          const deviceColumn = device._column;
          if (deviceColumn !== undefined && deviceColumn < row.length) {
            const value = this.normalizeValue(row[deviceColumn]);
            (device as any)[paramKey] = value;
            console.log(`   Device ${deviceIndex + 1} (${device.device_name}): ${paramKey} = "${value}"`);
          }
        });
      } else if (parameterName.length > 2) {
        console.log(`⚠️ Unmatched device parameter: "${parameterName}"`);
      }
    }

    // Clean up temporary column data and return only unique devices
    const finalDevices: DeviceParameters[] = devices.map(device => {
      const cleanDevice = { ...device };
      delete cleanDevice._column;
      return cleanDevice;
    });

    console.log(`Final unique devices (${finalDevices.length}):`, finalDevices.map(d => d.device_name));
    return finalDevices;
  }

  private static normalizeValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    const stringValue = String(value).trim();
    return stringValue === '' || stringValue === '-' ? 'N/A' : stringValue;
  }

  private static generateLegacyFields(result: ExcelData): void {
    // Extract legacy fields from the new structure for backward compatibility
    const params = result.standard_parameters;
    const firstDevice = result.devices[0];

    // System parameters
    if (params.system_frequency) {
      result.frequency = this.parseNumber(params.system_frequency);
    }
    if (params.bus_voltage_level) {
      result.bus_voltage_kv = this.parseNumber(params.bus_voltage_level);
    }
    if (params.bus_fault_level) {
      result.max_bus_fault_mva = this.parseNumber(params.bus_fault_level);
    }
    if (params.route_length) {
      result.route_length_km = this.parseNumber(params.route_length);
    }
    if (params.positive_seq_resistance_r1) {
      result.r1 = this.parseNumber(params.positive_seq_resistance_r1);
    }
    if (params.positive_seq_reactance_z1) {
      result.x1 = this.parseNumber(params.positive_seq_reactance_z1);
    }
    if (params.negative_seq_resistance_r0) {
      result.r0 = this.parseNumber(params.negative_seq_resistance_r0);
    }
    if (params.negative_seq_reactance_z0) {
      result.x0 = this.parseNumber(params.negative_seq_reactance_z0);
    }

    // Calculate lead resistance (lead_length is in METRES, resistance in Ω/km)
    let leadResistance = 0;
    if (params.lead_length_vt_to_relay_1 && params.resistance_w_km_20c_1) {
      const lenMetres1   = this.parseNumber(params.lead_length_vt_to_relay_1); // metres
      const resPerKm1    = this.parseNumber(params.resistance_w_km_20c_1);     // Ω/km
      leadResistance    += (lenMetres1 / 1000) * resPerKm1;
    }
    if (params.lead_length_vt_to_relay_2 && params.resistance_w_km_20c_2) {
      const lenMetres2   = this.parseNumber(params.lead_length_vt_to_relay_2);
      const resPerKm2    = this.parseNumber(params.resistance_w_km_20c_2);
      leadResistance    += (lenMetres2 / 1000) * resPerKm2;
    }
    result.lead_resistance = leadResistance > 0 ? leadResistance : 0.1;

    // CT parameters from first device
    if (firstDevice) {
      if (firstDevice.ct_ratio) {
        const ratio = firstDevice.ct_ratio.split('/');
        if (ratio.length === 2) {
          result.ct_ratio_primary = this.parseNumber(ratio[0]);
          result.ct_ratio_secondary = this.parseNumber(ratio[1]);
        }
      }
      if (firstDevice.accuracy_class) {
        result.accuracy_class = firstDevice.accuracy_class;
      }
      if (firstDevice.ct_resistance) {
        result.rct = this.parseNumber(firstDevice.ct_resistance);
      }
      if (firstDevice.vk_knee_point_voltage) {
        result.vk_available = this.parseNumber(firstDevice.vk_knee_point_voltage);
      }
      if (firstDevice.magnetizing_current) {
        result.io_at_vk = this.parseNumber(firstDevice.magnetizing_current) / 1000; // Convert mA to A
      }
      if (firstDevice.burden) {
        result.relay_burden_va = this.parseNumber(firstDevice.burden);
      }
    }

    // Ensure all required fields have values (use defaults if missing)
    if (!result.frequency) result.frequency = 50;
    if (!result.bus_voltage_kv) result.bus_voltage_kv = 33;
    if (!result.max_bus_fault_mva) result.max_bus_fault_mva = 31.5;
    if (!result.r1) result.r1 = 0.0221;
    if (!result.x1) result.x1 = 0.16;
    if (!result.r0) result.r0 = 0.13;
    if (!result.x0) result.x0 = 0.06;
    if (!result.route_length_km) result.route_length_km = 0.2;
    if (!result.lead_resistance) result.lead_resistance = 0.1;
    if (!result.ct_ratio_primary) result.ct_ratio_primary = 800;
    if (!result.ct_ratio_secondary) result.ct_ratio_secondary = 1;
    if (!result.accuracy_class) result.accuracy_class = 'PX';
    if (!result.rct) result.rct = 3.5;
    if (!result.vk_available) result.vk_available = 540;
    if (!result.io_at_vk) result.io_at_vk = 0.02;
    if (!result.relay_burden_va) result.relay_burden_va = 0;

    // Generate detected devices for compatibility
    result.detected_devices = result.devices.map(device => ({
      name: device.device_name,
      type: device.device_name,
      protection_type: this.inferProtectionType(device.device_name),
      functions: this.inferProtectionFunctions(device.device_name)
    }));

    // Set relay type from first device
    if (result.devices.length > 0) {
      result.relay_type = result.devices[0].device_name;
      result.relay_model = result.devices[0].device_name;
    }

    console.log('Generated legacy fields for computation:', {
      frequency: result.frequency,
      bus_voltage_kv: result.bus_voltage_kv,
      max_bus_fault_mva: result.max_bus_fault_mva,
      ct_ratio_primary: result.ct_ratio_primary,
      ct_ratio_secondary: result.ct_ratio_secondary,
      rct: result.rct,
      vk_available: result.vk_available,
      lead_resistance: result.lead_resistance,
      relay_burden_va: result.relay_burden_va
    });
  }

  private static parseNumber(value: string): number {
    if (!value || value === 'N/A' || value === '-') return 0;
    // Take the FIRST numeric token only — avoids "31.5kA/3sec" → 31.53 bug
    const match = value.match(/^[^0-9]*([+-]?\d+\.?\d*)/);
    if (!match) return 0;
    const n = parseFloat(match[1]);
    return isNaN(n) ? 0 : n;
  }

  private static inferProtectionType(deviceName: string): string {
    const name = deviceName.toUpperCase();
    if (name.includes('RED670')) return 'Transformer Differential';
    if (name.includes('REF615')) return 'Feeder Protection';
    if (name.includes('REL670')) return 'Line Protection';
    if (name.includes('BCPU')) return 'Bay Control';
    if (name.includes('AMMETER')) return 'Metering';
    if (name.includes('BB') || name.includes('BF')) return 'Busbar/Breaker Failure';
    return 'Protection Relay';
  }

  private static inferProtectionFunctions(deviceName: string): string[] {
    const name = deviceName.toUpperCase();
    const functions: string[] = [];
    
    if (name.includes('RED670')) {
      functions.push('differential', 'distance', 'breaker_failure');
    } else if (name.includes('REF615')) {
      functions.push('differential', 'overcurrent');
    } else if (name.includes('REL670')) {
      functions.push('distance', 'overcurrent');
    } else if (name.includes('BB') || name.includes('BF')) {
      functions.push('breaker_failure');
    } else {
      functions.push('protection');
    }
    
    return functions;
  }

  private static validateExtractedData(data: ExcelData): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate standard parameters (be more lenient - only warn, don't error)
    const paramCount = Object.keys(data.standard_parameters).length;
    if (paramCount === 0) {
      warnings.push('No standard parameters found in Excel file');
    } else if (paramCount < 10) {
      warnings.push(`Only ${paramCount} standard parameters found. Expected around 17 parameters.`);
    } else {
      console.log(`✅ Found ${paramCount} standard parameters`);
    }

    // Validate devices (be more lenient - only warn, don't error)
    if (data.devices.length === 0) {
      warnings.push('No device data found in Excel file. This may be normal if the Excel format is different.');
    } else {
      console.log(`✅ Found ${data.devices.length} devices`);
      
      if (data.devices.length < 4) {
        warnings.push(`Only ${data.devices.length} devices found. Expected at least 4 devices.`);
      } else if (data.devices.length > 20) {
        warnings.push(`${data.devices.length} devices found. This is more than the typical range of 4-20 devices.`);
      }

      // Validate each device has required parameters (warnings only, not errors)
      data.devices.forEach((device, index) => {
        if (!device.device_name) {
          warnings.push(`Device ${index + 1}: Missing device name`);
        }
        if (!device.ct_ratio || device.ct_ratio === 'N/A') {
          warnings.push(`Device ${index + 1} (${device.device_name}): Missing CT ratio`);
        }
        if (!device.vk_knee_point_voltage || device.vk_knee_point_voltage === 'N/A') {
          warnings.push(`Device ${index + 1} (${device.device_name}): Missing knee point voltage`);
        }
      });
    }

    // Only return errors for critical issues that would prevent processing
    // Most validation issues are now warnings to allow processing to continue
    
    return { errors, warnings };
  }
}