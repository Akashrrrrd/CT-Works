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
    // ── Step 1: Find the device table header row ───────────────────────────────
    // The device table header contains multiple non-empty cells in columns 2+
    // that are device names. We look for a row that has ≥2 non-empty cells
    // in the data columns (col ≥ 2) AND at least one parameter-name row follows.

    let deviceHeaderRow = -1;
    let paramStartRow   = -1;

    // Map: column index → accumulated device name (may span multiple header rows)
    const deviceColMap = new Map<number, string>();

    // Scan every row of the sheet — no row limit
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;

      const rowText = row.map((c: any) => String(c ?? '').toLowerCase()).join(' ');

      // When we see "core" or "ct ratio" or "accuracy" as first cell, we've
      // passed the header section and are into parameter rows.
      const firstCell = String(row[0] ?? '').toLowerCase().trim();
      if (
        firstCell.includes('core') ||
        firstCell.includes('ct ratio') || firstCell.includes('ratio') ||
        firstCell.includes('accuracy') ||
        firstCell.includes('ct resistance') ||
        firstCell.includes('vk') || firstCell.includes('knee') ||
        firstCell.includes('burden') ||
        firstCell.includes('magnetizing')
      ) {
        if (deviceColMap.size > 0 && deviceHeaderRow !== -1) {
          paramStartRow = i;
          break;
        }
      }

      // Collect device-name fragments from columns 2 onwards
      for (let j = 2; j < row.length; j++) {
        const cell = row[j];
        if (cell === null || cell === undefined) continue;
        const cellStr = String(cell).trim();
        if (!cellStr || cellStr === '-') continue;

        // Accept any non-trivial text as part of the device name for this column
        // We'll merge multi-row names (e.g. "DISTANCE +" on row N, "DIFFERENTIAL" on row N+1)
        const existing = deviceColMap.get(j);
        if (existing) {
          // Append only if different content (avoid duplicate words)
          if (!existing.toUpperCase().includes(cellStr.toUpperCase())) {
            deviceColMap.set(j, existing + ' ' + cellStr);
          }
        } else {
          deviceColMap.set(j, cellStr);
        }

        if (deviceHeaderRow === -1) {
          deviceHeaderRow = i;
        }
      }
    }

    if (deviceColMap.size === 0) {
      console.log('No device columns found');
      return [];
    }

    // ── Step 2: Filter columns to those that actually look like device names ──
    // A column qualifies if its accumulated name has at least 3 characters and
    // is not just a unit or number string.
    const validDeviceCols: Array<{ name: string; column: number }> = [];
    for (const [col, name] of deviceColMap.entries()) {
      const trimmed = name.trim();
      if (trimmed.length < 2) continue;
      // Skip if it looks like a unit column (e.g. "ohm", "VA", "mA", "A", "kA")
      const lc = trimmed.toLowerCase();
      if (/^(ohm|va|ma|mw|kva|kw|kv|hz|a|v|km|mm|%)$/.test(lc)) continue;
      // Skip pure numbers
      if (/^\d+\.?\d*$/.test(trimmed)) continue;
      validDeviceCols.push({ name: trimmed, column: col });
    }

    // Sort by column index so devices appear left-to-right
    validDeviceCols.sort((a, b) => a.column - b.column);

    console.log(`Found ${validDeviceCols.length} device columns:`, validDeviceCols.map(d => `col${d.column}="${d.name}"`));

    if (validDeviceCols.length === 0) {
      console.log('No valid device columns after filtering');
      return [];
    }

    // ── Step 3: Build device objects ──────────────────────────────────────────
    const devices: DeviceParametersInternal[] = validDeviceCols.map(({ name, column }) => ({
      device_name:           name,
      core:                  'N/A',
      ct_core_used_for:      'N/A',
      ct_ratio:              'N/A',
      accuracy_class:        'N/A',
      ct_resistance:         'N/A',
      vk_knee_point_voltage: 'N/A',
      burden:                'N/A',
      magnetizing_current:   'N/A',
      _column:               column,
    }));

    // ── Step 4: Scan ALL remaining rows for parameter values ──────────────────
    // No 20-row limit — scan from paramStartRow to end of sheet.
    const scanFrom = paramStartRow !== -1 ? paramStartRow : deviceHeaderRow + 1;

    for (let i = scanFrom; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;

      const firstCell = String(row[0] ?? '').toLowerCase().trim();
      if (!firstCell) continue;

      // Determine which device parameter this row maps to
      let paramKey: keyof DeviceParameters | '' = '';

      if (firstCell.includes('core') && !firstCell.includes('used') && !firstCell.includes('ct core')) {
        paramKey = 'core';
      } else if (firstCell.includes('ct core used') || firstCell.includes('used for') || firstCell.includes('core used')) {
        paramKey = 'ct_core_used_for';
      } else if (firstCell.includes('ct ratio') || (firstCell.includes('ratio') && !firstCell.includes('x/r'))) {
        paramKey = 'ct_ratio';
      } else if (firstCell.includes('accuracy class') || (firstCell.includes('accuracy') && !firstCell.includes('class of'))) {
        paramKey = 'accuracy_class';
      } else if (firstCell.includes('class of accuracy')) {
        paramKey = 'accuracy_class';
      } else if (
        firstCell.includes('ct resistance') ||
        (firstCell.includes('resistance') && !firstCell.includes('seq') && !firstCell.includes('specific') && !firstCell.includes('w/km') && !firstCell.includes('copper'))
      ) {
        paramKey = 'ct_resistance';
      } else if (firstCell.includes('vk') || firstCell.includes('knee point') || firstCell.includes('knee-point')) {
        paramKey = 'vk_knee_point_voltage';
      } else if (firstCell.includes('burden') && !firstCell.includes('load') && !firstCell.includes('total')) {
        paramKey = 'burden';
      } else if (firstCell.includes('magnetizing') || firstCell.includes('magnetising')) {
        paramKey = 'magnetizing_current';
      }

      if (!paramKey) continue;

      // Assign value for each device from its column
      for (const device of devices) {
        const col = device._column!;
        // Try the exact column first, then adjacent columns if empty
        let raw: any = col < row.length ? row[col] : undefined;

        // If the exact cell is empty, check one column left or right
        // (handles merged cells in Excel that XLSX reads as empty adjacents)
        if (raw === null || raw === undefined || String(raw).trim() === '') {
          if (col - 1 >= 2 && row[col - 1] !== null && row[col - 1] !== undefined && String(row[col - 1]).trim() !== '') {
            raw = row[col - 1];
          } else if (col + 1 < row.length && row[col + 1] !== null && row[col + 1] !== undefined && String(row[col + 1]).trim() !== '') {
            raw = row[col + 1];
          }
        }

        const value = this.normalizeValue(raw);
        (device as any)[paramKey] = value;
        console.log(`  Device "${device.device_name}" col${col}: ${paramKey} = "${value}"`);
      }
    }

    // ── Step 5: Clean up and return ────────────────────────────────────────────
    const finalDevices: DeviceParameters[] = devices.map(d => {
      const clean = { ...d };
      delete clean._column;
      return clean;
    });

    console.log('✅ Final devices:');
    finalDevices.forEach((d, i) => {
      console.log(`  [${i + 1}] ${d.device_name}: CT=${d.ct_ratio}, Rct=${d.ct_resistance}, Vk=${d.vk_knee_point_voltage}, Burden=${d.burden}, Io=${d.magnetizing_current}`);
    });

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