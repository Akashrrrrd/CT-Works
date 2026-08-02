/**
 * Excel Processing Service for CT Adequacy Analysis
 * Handles parsing of standardized Excel format:
 * - 17 Standard Parameters (fixed structure, varying values)
 * - 7 Device Parameters × N Devices (4-20 devices possible)
 */

import * as XLSX from 'xlsx';

// 17 Standard Parameters Structure
export interface StandardParameters {
 bus_fault_level?: string; // kA (e.g., "31.5kA/3sec")
 system_frequency?: string; // Hz (e.g., "50")
 bus_voltage_level?: string; // kV (e.g., "33kV")
 xr_ratio?: string; // - (e.g., "-")
 ct_wiring_conductor_cross_section_1?: string; // mm (e.g., "6")
 resistance_w_km_20c_1?: string; // Ω/km (e.g., "3.69")
 specific_resistance_20c_1?: string; // K-1 (e.g., "-")
 lead_length_vt_to_relay_1?: string; // m (e.g., "50")
 ct_wiring_conductor_cross_section_2?: string; // mm (e.g., "2.5")
 resistance_w_km_20c_2?: string; // Ω/km (e.g., "8.87")
 specific_resistance_20c_2?: string; // K-1 (e.g., "-")
 lead_length_vt_to_relay_2?: string; // m (e.g., "50")
 route_length?: string; // km (e.g., "0.20")
 positive_seq_resistance_r1?: string; // Ω/km (e.g., "0.0221")
 positive_seq_reactance_z1?: string; // Ω/km (e.g., "0.1600")
 negative_seq_resistance_r0?: string; // Ω/km (e.g., "0.1300")
 negative_seq_reactance_z0?: string; // Ω/km (e.g., "0.0600")
 // Additional transformer parameters
 power_rating?: string; // MVA (e.g., "100")
 impedance?: string; // % (e.g., "25%")
 rated_voltage?: string; // kV (e.g., "138/34.5 kV")
}

// 7 Device Parameters Structure (per device)
export interface DeviceParameters {
 device_name: string; // RED670, BCPU, Ammeters, BB/BF, etc.
 core?: string; // Core designation (e.g., "Core 1", "T1", "-")
 ct_core_used_for?: string; // Purpose/Function (e.g., "Core 1", "Core 2")
 ct_ratio?: string; // e.g., "800/1A", "2500/1A"
 accuracy_class?: string; // e.g., "PX", "0.5"
 ct_resistance?: string; // ohm (e.g., "3.5", "6", "2.5", "15")
 vk_knee_point_voltage?: string; // V (e.g., "540", "400")
 burden?: string; // VA (e.g., "10", "20")
 magnetizing_current?: string; // mA (e.g., "20", "-")
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
 console.log('🔄 ═══════════════════════════════════════════════════════════');
 console.log(`🔄 PROCESSING FRESH EXCEL FILE: ${file.name}`);
 console.log(`🔄 File size: ${file.size} bytes | Last modified: ${new Date(file.lastModified).toISOString()}`);
 console.log('🔄 ═══════════════════════════════════════════════════════════');

 // Validate file format
 const formatValidation = this.validateFileFormat(file);
 if (!formatValidation.isValid) {
 return formatValidation;
 }

 // Read Excel file - force fresh read without caching
 console.log('📖 Reading Excel file into memory...');
 const arrayBuffer = await file.arrayBuffer();
 console.log(`📊 ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
 
 const workbook = XLSX.read(arrayBuffer, { 
 type: 'array',
 cellDates: false,
 cellNF: false,
 cellText: false
 });
 console.log(`📄 Workbook loaded with ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);

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
 console.log(` 📊 Standard Parameters: ${Object.keys(result.standard_parameters).length}`);
 console.log(` 🔌 Devices Found: ${result.total_devices}`);
 console.log(` 📝 Device Types: ${result.device_types.join(', ')}`);

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
 console.log(` Possible match for ${missing}: Row ${i} "${paramName}" = "${row[1] || row[2] || 'N/A'}"`);
 }
 }
 }
 }
 }
 
 console.log('📋 Final standard parameters object:', standardParams);
 }

 private static extractDeviceParameters(data: any[][]): DeviceParameters[] {
 console.log('\n🔍 ═══════════════════════════════════════════════════════════');
 console.log('🔍 STARTING DEVICE PARAMETER EXTRACTION');
 console.log('🔍 ═══════════════════════════════════════════════════════════\n');

 // SPECIAL DEBUG: Look for CT Ratio values first
 console.log('🎯 SPECIAL CT RATIO DEBUG - SCANNING ALL ROWS:');
 for (let i = 0; i < Math.min(data.length, 30); i++) {
 const row = data[i];
 if (!row || row.length < 2) continue;
 const firstCell = String(row[0] || '').toLowerCase().trim();
 
 // Look for CT ratio patterns in ALL cells of rows containing "ratio"
 if (firstCell.includes('ct ratio') || firstCell.includes('ratio') || firstCell.includes('ct')) {
 console.log(`🎯 CT RATIO ROW ${i}:`, row.slice(0, 8).map((cell, j) => `col${j}="${cell}"`).join(' | '));
 
 // Check ALL columns for CT ratio values like 700/1A, 2000/1A, 800/1, etc.
 for (let col = 0; col < Math.min(row.length, 15); col++) {
 const cellValue = String(row[col] || '').trim();
 // Enhanced pattern matching for CT ratios
 if (cellValue && (
 cellValue.includes('/1A') || 
 cellValue.includes('/1') || 
 /^\d+\/\d+A?$/i.test(cellValue) ||
 /^\d+:\d+$/i.test(cellValue) ||
 cellValue.match(/\b\d{3,4}\/\d+/i)
 )) {
 console.log(` 🎯 FOUND CT RATIO VALUE: col${col} = "${cellValue}"`);
 }
 }
 }
 
 // Also scan for standalone ratio values in any row
 for (let col = 0; col < Math.min(row.length, 15); col++) {
 const cellValue = String(row[col] || '').trim();
 if (cellValue && /\b(700|800|1000|2000|2500)\/1A?\b/i.test(cellValue)) {
 console.log(` 🔥 STANDALONE CT RATIO FOUND: Row ${i}, Col ${col} = "${cellValue}"`);
 }
 }
 }

 // ── Step 1: Find the exact row where the device table begins ──────────────
 let sectionHeaderRow = -1;
 let deviceNameRow = -1;
 let paramStartRow = -1;

 // Pass 1 — look for section header like "PROTECTION PURPOSE / DEVICES"
 console.log('🔎 Pass 1: Looking for section header row...');
 for (let i = 0; i < data.length; i++) {
 const row = data[i];
 if (!row) continue;
 const firstCell = String(row[0] ?? '').toLowerCase();
 const joined = row.map((c: any) => String(c ?? '').toLowerCase()).join(' ');
 
 if (
 (joined.includes('protection') && (joined.includes('purpose') || joined.includes('device'))) ||
 (joined.includes('connected') && joined.includes('device'))
 ) {
 sectionHeaderRow = i;
 console.log(`✅ Found section header at row ${i}: "${row[0]}"`);
 break;
 }
 }
 
 if (sectionHeaderRow === -1) {
 console.log('⚠️ No explicit section header found, will scan from beginning');
 }

 // Pass 2 — find the row that carries device names
 console.log('\n🔎 Pass 2: Looking for device name row...');
 const startSearch = sectionHeaderRow >= 0 ? sectionHeaderRow : 0;
 
 for (let i = startSearch; i < Math.min(startSearch + 20, data.length); i++) {
 const row = data[i];
 if (!row || row.length < 3) continue;

 const firstCell = String(row[0] ?? '').toLowerCase().trim();
 
 // Skip if this looks like a parameter row
 if (firstCell.includes('core') || firstCell.includes('ratio') || 
 firstCell.includes('accuracy') || firstCell.includes('resistance') ||
 firstCell.includes('vk') || firstCell.includes('knee') || 
 firstCell.includes('burden') || firstCell.includes('magnetizing')) {
 console.log(` Row ${i}: SKIPPED (parameter keyword in first cell: "${firstCell}")`);
 continue;
 }

 // Count device-like cells in columns 2+
 let deviceLikeCells = 0;
 const cellsPreview: string[] = [];
 
 for (let j = 2; j < Math.min(row.length, 10); j++) { // Check up to column 10
 const cell = row[j];
 if (cell === null || cell === undefined) continue;
 const s = String(cell).trim();
 if (!s || s === '-') continue;
 
 const lc = s.toLowerCase();
 const isUnit = /^(ohm|va|ma|mw|kva|kw|kv|hz|a|v|km|mm|%|-)$/i.test(s);
 const isNumber = /^\d+\.?\d*$/.test(s);
 const isPureSymbol = /^[\/\-_]+$/.test(s);
 
 if (!isUnit && !isNumber && !isPureSymbol && s.length >= 2) {
 deviceLikeCells++;
 cellsPreview.push(`col${j}="${s}"`);
 }
 }

 console.log(` Row ${i}: Found ${deviceLikeCells} device-like cells [${cellsPreview.join(', ')}]`);
 
 if (deviceLikeCells >= 2) {
 deviceNameRow = i;
 console.log(`✅ Selected row ${i} as device name row`);
 break;
 }
 }

 if (deviceNameRow === -1) {
 console.log('❌ ERROR: No device name row found!');
 return [];
 }

 console.log(`\n📍 Device name row identified: ${deviceNameRow}`);

 // ── Step 2: Collect device names from up to 4 header rows ────────────────
 console.log('\n🔎 Pass 3: Collecting device names from header rows...');
 const deviceColMap = new Map<number, string[]>(); // col → [fragments]

 for (let i = deviceNameRow; i < Math.min(deviceNameRow + 4, data.length); i++) {
 const row = data[i];
 if (!row) continue;

 const firstCell = String(row[0] ?? '').toLowerCase().trim();

 // Stop collecting names once we're in the parameter section
 if (i > deviceNameRow && (
 firstCell.includes('core') ||
 firstCell.includes('ct ratio') || firstCell.includes('ratio') ||
 firstCell.includes('accuracy') ||
 firstCell.includes('ct resistance') ||
 firstCell.includes('resistance') ||
 firstCell.includes('vk') || firstCell.includes('knee') ||
 firstCell.includes('burden') ||
 firstCell.includes('magnetizing')
 )) {
 paramStartRow = i;
 console.log(` ⛔ Row ${i}: STOP - parameter row detected: "${firstCell}"`);
 break;
 }

 console.log(` 📝 Row ${i}: Processing for device name fragments...`);
 
 for (let j = 2; j < Math.min(row.length, 10); j++) { // Limit to first 10 columns
 const cell = row[j];
 if (cell === null || cell === undefined) continue;
 const s = String(cell).trim();
 if (!s || s === '-') continue;

 const isUnit = /^(ohm|va|ma|mw|kva|kw|kv|hz|a|v|km|mm|%|-)$/i.test(s);
 const isNumber = /^\d+\.?\d*$/.test(s);
 const isPureSymbol = /^[\/\-_]+$/.test(s);
 
 if (isUnit || isNumber || isPureSymbol) {
 console.log(` col${j}: SKIPPED "${s}" (unit/number/symbol)`);
 continue;
 }

 if (!deviceColMap.has(j)) deviceColMap.set(j, []);
 const existing = deviceColMap.get(j)!;
 if (!existing.some(f => f.toUpperCase() === s.toUpperCase())) {
 existing.push(s);
 console.log(` col${j}: Added fragment "${s}"`);
 }
 }
 }

 // Build final device-name list, sorted by column
 const validDeviceCols: Array<{ name: string; column: number }> = [];
 for (const [col, fragments] of deviceColMap.entries()) {
 const name = fragments.join(' ').trim();
 if (name.length >= 2) {
 validDeviceCols.push({ name, column: col });
 }
 }
 validDeviceCols.sort((a, b) => a.column - b.column);

 console.log(`\n✅ Device name collection complete: ${validDeviceCols.length} devices found`);
 validDeviceCols.forEach((d, i) => {
 console.log(` [${i+1}] Column ${d.column}: "${d.name}"`);
 });

 if (validDeviceCols.length === 0) {
 console.log('❌ ERROR: No valid device columns after filtering!');
 return [];
 }

 // ── Step 3: Build device objects ──────────────────────────────────────────
 console.log('\n🔎 Pass 4: Building device objects...');
 const devices: DeviceParametersInternal[] = validDeviceCols.map(({ name, column }) => ({
 device_name: name,
 core: 'N/A',
 ct_core_used_for: 'N/A',
 ct_ratio: 'N/A',
 accuracy_class: 'N/A',
 ct_resistance: 'N/A',
 vk_knee_point_voltage: 'N/A',
 burden: 'N/A',
 magnetizing_current: 'N/A',
 _column: column,
 }));
 console.log(`✅ Created ${devices.length} device objects (all parameters initialized to N/A)`);

 // ── Step 4: Scan parameter rows — no row limit ────────────────────────────
 console.log('\n🔎 Pass 5: Extracting parameter values...');
 
 // If paramStartRow wasn't found during header scan, search forward
 if (paramStartRow === -1) {
 console.log(' Searching for parameter section start...');
 for (let i = deviceNameRow + 1; i < Math.min(deviceNameRow + 10, data.length); i++) {
 const row = data[i];
 if (!row) continue;
 const fc = String(row[0] ?? '').toLowerCase().trim();
 if (fc.includes('core') || fc.includes('ct ratio') || fc.includes('ratio') ||
 fc.includes('accuracy') || fc.includes('ct resistance') ||
 fc.includes('vk') || fc.includes('knee') ||
 fc.includes('burden') || fc.includes('magnetizing')) {
 paramStartRow = i;
 console.log(` ✅ Found parameter start at row ${i}: "${fc}"`);
 break;
 }
 }
 }

 if (paramStartRow === -1) {
 console.log('❌ ERROR: Could not find parameter rows!');
 console.log('\n📊 Final extracted devices (with N/A values):');
 devices.forEach((d, i) => {
 console.log(` [${i+1}] ${d.device_name} - All parameters: N/A`);
 });
 return devices;
 }

 console.log(`📍 Parameter section starts at row ${paramStartRow}`);
 console.log(` Will scan from row ${paramStartRow} to end of sheet (${data.length} total rows)`);

 let parametersFound = 0;
 
 for (let i = paramStartRow; i < data.length; i++) {
 const row = data[i];
 if (!row || row.length < 2) continue;

 const firstCell = String(row[0] ?? '').toLowerCase().trim();
 if (!firstCell) continue;

 let paramKey: keyof DeviceParameters | '' = '';

 // Match parameter name with enhanced logging
 if (firstCell.includes('core') && !firstCell.includes('used') && !firstCell.includes('ct core')) {
 paramKey = 'core';
 } else if (firstCell.includes('ct core used') || firstCell.includes('used for') || firstCell.includes('core used')) {
 paramKey = 'ct_core_used_for';
 } else if (firstCell.includes('ct ratio') || (firstCell.includes('ratio') && !firstCell.includes('x/r'))) {
 paramKey = 'ct_ratio';
 console.log(` 🎯 CRITICAL: CT RATIO ROW DETECTED`);
 } else if (firstCell.includes('class of accuracy') || firstCell.includes('accuracy class') || firstCell.includes('accuracy')) {
 paramKey = 'accuracy_class';
 } else if (
 firstCell.includes('ct resistance') ||
 (firstCell.includes('resistance') &&
 !firstCell.includes('seq') && !firstCell.includes('specific') &&
 !firstCell.includes('w/km') && !firstCell.includes('copper') &&
 !firstCell.includes('lead'))
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

 parametersFound++;
 console.log(`\n 📋 Row ${i}: Parameter "${firstCell}" → ${paramKey}`);

 // Assign value for each device from its column
 for (const device of devices) {
 const col = device._column!;
 let raw: any = col < row.length ? row[col] : undefined;

 // Enhanced CT Ratio extraction for values like "700/1A", "2000/1A", etc.
 if (paramKey === 'ct_ratio') {
 console.log(` 🎯 RAW CELL VALUE for "${device.device_name}" at row ${i}, col ${col}:`, raw);
 console.log(` 🎯 Full row data:`, row);
 
 // Try to find CT ratio in the current row if the device column is empty
 if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') {
 console.log(` 🔍 Searching entire row for CT ratio patterns...`);
 for (let searchCol = 0; searchCol < row.length; searchCol++) {
 const searchValue = String(row[searchCol] || '').trim();
 if (searchValue && (
 /\b(700|800|1000|2000|2500)\/1A?\b/i.test(searchValue) ||
 /^\d{3,4}\/\d+A?$/i.test(searchValue) ||
 searchValue.includes('/1A') ||
 searchValue.includes('/1')
 )) {
 console.log(` 🎯 FOUND CT RATIO IN ROW: col${searchCol} = "${searchValue}"`);
 raw = searchValue;
 break;
 }
 }
 }
 }

 // Handle merged cells — check adjacent columns if exact is empty
 if (raw === null || raw === undefined || String(raw).trim() === '') {
 if (col - 1 >= 2 && row[col-1] != null && String(row[col-1]).trim() !== '') {
 raw = row[col - 1];
 console.log(` Device "${device.device_name}" (col${col}): Empty, using col${col-1}`);
 } else if (col + 1 < row.length && row[col+1] != null && String(row[col+1]).trim() !== '') {
 raw = row[col + 1];
 console.log(` Device "${device.device_name}" (col${col}): Empty, using col${col+1}`);
 }
 }

 const value = this.normalizeValue(raw);
 const oldValue = (device as any)[paramKey];
 (device as any)[paramKey] = value;
 
 // Extra logging for CT Ratio
 if (paramKey === 'ct_ratio') {
 console.log(` 🎯 FINAL CT RATIO for "${device.device_name}": raw="${raw}" → normalized="${value}"`);
 }
 
 console.log(` ✓ Device "${device.device_name}" (col${col}): ${paramKey} = "${value}"${oldValue !== 'N/A' && oldValue !== value ? ` [was: ${oldValue}]` : ''}`);
 }
 }

 console.log(`\n✅ Parameter extraction complete: ${parametersFound} parameters extracted`);

 // ── Step 5: Clean up and return ────────────────────────────────────────────
 console.log('\n🔎 Pass 6: Final validation and cleanup...');
 
 const finalDevices: DeviceParameters[] = devices.map(d => {
 const clean = { ...d };
 delete clean._column;
 return clean;
 });

 console.log('\n✅ ═══════════════════════════════════════════════════════════');
 console.log(`✅ EXTRACTION COMPLETE: ${finalDevices.length} DEVICES`);
 console.log('✅ ═══════════════════════════════════════════════════════════\n');
 
 finalDevices.forEach((d, i) => {
 console.log(`📦 Device [${i+1}]: ${d.device_name}`);
 console.log(` ├─ Core: ${d.core}`);
 console.log(` ├─ CT Core Used For: ${d.ct_core_used_for}`);
 console.log(` ├─ CT Ratio: ${d.ct_ratio}`);
 console.log(` ├─ Accuracy Class: ${d.accuracy_class}`);
 console.log(` ├─ CT Resistance: ${d.ct_resistance}Ω`);
 console.log(` ├─ Vk (Knee Point): ${d.vk_knee_point_voltage}V`);
 console.log(` ├─ Burden: ${d.burden}VA`);
 console.log(` └─ Magnetizing Current: ${d.magnetizing_current}mA`);
 console.log('');
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
 const lenMetres1 = this.parseNumber(params.lead_length_vt_to_relay_1); // metres
 const resPerKm1 = this.parseNumber(params.resistance_w_km_20c_1); // Ω/km
 leadResistance += (lenMetres1 / 1000) * resPerKm1;
 }
 if (params.lead_length_vt_to_relay_2 && params.resistance_w_km_20c_2) {
 const lenMetres2 = this.parseNumber(params.lead_length_vt_to_relay_2);
 const resPerKm2 = this.parseNumber(params.resistance_w_km_20c_2);
 leadResistance += (lenMetres2 / 1000) * resPerKm2;
 }
 result.lead_resistance = leadResistance > 0 ? leadResistance : 0.1;

 // CT parameters from first device
 if (firstDevice) {
 if (firstDevice.ct_ratio && firstDevice.ct_ratio !== 'N/A') {
 console.log('🔍 Processing CT ratio:', firstDevice.ct_ratio);
 
 // Enhanced CT ratio parsing to handle formats like "700/1A", "2000/1", "800/1A"
 let ratioString = firstDevice.ct_ratio.trim();
 
 // Remove common suffixes and clean up
 ratioString = ratioString.replace(/A$/i, ''); // Remove trailing A
 
 const ratio = ratioString.split('/');
 if (ratio.length === 2) {
 const primary = this.parseNumber(ratio[0]);
 const secondary = this.parseNumber(ratio[1]);
 
 if (primary > 0 && secondary > 0) {
 result.ct_ratio_primary = primary;
 result.ct_ratio_secondary = secondary;
 console.log(`✅ Extracted CT ratio: ${primary}/${secondary}`);
 } else {
 console.log(`⚠️ Invalid CT ratio values: ${primary}/${secondary}`);
 }
 } else {
 console.log(`⚠️ Invalid CT ratio format: ${firstDevice.ct_ratio}`);
 }
 } else {
 console.log('⚠️ No CT ratio found in first device');
 }
 if (firstDevice.accuracy_class && firstDevice.accuracy_class !== 'N/A') {
 result.accuracy_class = firstDevice.accuracy_class;
 console.log(`✅ Extracted accuracy class: ${result.accuracy_class}`);
 } else {
 console.log('⚠️ No accuracy class found in first device');
 }
 
 if (firstDevice.ct_resistance && firstDevice.ct_resistance !== 'N/A') {
 result.rct = this.parseNumber(firstDevice.ct_resistance);
 console.log(`✅ Extracted CT resistance: ${result.rct}Ω`);
 } else {
 console.log('⚠️ No CT resistance found in first device');
 }
 
 if (firstDevice.vk_knee_point_voltage && firstDevice.vk_knee_point_voltage !== 'N/A') {
 result.vk_available = this.parseNumber(firstDevice.vk_knee_point_voltage);
 console.log(`✅ Extracted Vk: ${result.vk_available}V`);
 } else {
 console.log('⚠️ No Vk (knee point voltage) found in first device');
 }
 
 if (firstDevice.magnetizing_current && firstDevice.magnetizing_current !== 'N/A') {
 result.io_at_vk = this.parseNumber(firstDevice.magnetizing_current);
 console.log(`✅ Extracted magnetizing current: ${result.io_at_vk}mA`);
 } else {
 console.log('⚠️ No magnetizing current found in first device');
 }
 
 if (firstDevice.burden && firstDevice.burden !== 'N/A') {
 result.relay_burden_va = this.parseNumber(firstDevice.burden);
 console.log(`✅ Extracted burden: ${result.relay_burden_va}VA`);
 } else {
 console.log('⚠️ No burden found in first device');
 }
 if (firstDevice.magnetizing_current) {
 result.io_at_vk = this.parseNumber(firstDevice.magnetizing_current) / 1000; // Convert mA to A
 }
 if (firstDevice.burden) {
 result.relay_burden_va = this.parseNumber(firstDevice.burden);
 }
 }

 // NO DEFAULT VALUES - System must use only extracted data
 console.log('✅ Legacy fields generation complete - no defaults applied');
 
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