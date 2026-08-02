/**
 * 🤖 AI-POWERED EXCEL ANALYZER USING IBM WATSONX
 * Intelligently extracts CT parameters from any Excel format using AI
 */

interface AIExtractedData {
 ct_parameters: {
 ct_ratio_primary?: number;
 ct_ratio_secondary?: number;
 accuracy_class?: string;
 rct?: number;
 vk_available?: number;
 io_at_vk?: number;
 };
 system_parameters: {
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
 };
 devices: Array<{
 device_name: string;
 ct_ratio?: string;
 accuracy_class?: string;
 ct_resistance?: string;
 vk_knee_point_voltage?: string;
 burden?: string;
 magnetizing_current?: string;
 }>;
 confidence_score: number;
 ai_notes: string[];
}

export class AIExcelAnalyzer {
 /**
 * 🧠 Analyze Excel data using IBM WatsonX AI
 */
 static async analyzeExcelWithAI(excelData: any[][]): Promise<AIExtractedData> {
 console.log('🤖 STARTING AI-POWERED EXCEL ANALYSIS WITH IBM WATSONX');

 const apiKey = process.env.IBM_WATSONX_API_KEY;
 const projectId = process.env.IBM_WATSONX_PROJECT_ID;
 
 if (!apiKey || !projectId) {
 console.log('⚠️ IBM WatsonX credentials not found, using enhanced pattern matching');
 return this.enhancedPatternMatching(excelData);
 }

 try {
 // Prepare Excel data for AI analysis
 const excelText = this.convertExcelToText(excelData);
 
 // Try IBM WatsonX API call
 const aiResult = await this.callWatsonXAPI(excelText, apiKey, projectId);
 
 if (aiResult) {
 console.log('✅ AI Analysis successful');
 return aiResult;
 }
 } catch (error) {
 console.error('❌ AI Analysis failed:', error);
 }

 // Fallback to enhanced pattern matching
 console.log('🔄 Using enhanced pattern matching as fallback');
 return this.enhancedPatternMatching(excelData);
 }

 /**
 * 🔗 Call IBM WatsonX API
 */
 private static async callWatsonXAPI(
 excelText: string, 
 apiKey: string, 
 projectId: string
 ): Promise<AIExtractedData | null> {
 try {
 // Get access token
 const tokenResponse = await fetch('https://iam.cloud.ibm.com/identity/token', {
 method: 'POST',
 headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
 body: new URLSearchParams({
 grant_type: 'urn:iam:grant-type:apikey',
 apikey: apiKey,
 }),
 });

 const tokenData = await tokenResponse.json();
 const accessToken = tokenData.access_token;

 if (!accessToken) {
 throw new Error('Failed to get access token');
 }

 // Create AI prompt
 const prompt = `
Extract CT parameters from this Excel data. Return only JSON:

${excelText.substring(0, 2000)}

Required JSON format:
{
 "ct_ratio_primary": 800,
 "ct_ratio_secondary": 1,
 "accuracy_class": "PX",
 "rct": 3.5,
 "vk_available": 540,
 "frequency": 50,
 "bus_voltage_kv": 33,
 "devices": [{"device_name": "REQ650", "ct_ratio": "800/1A"}]
}

Return only the JSON, no other text.
`;

 // Call WatsonX API
 const response = await fetch('https://eu-gb.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${accessToken}`,
 },
 body: JSON.stringify({
 input: prompt,
 parameters: {
 decoding_method: 'greedy',
 max_new_tokens: 800,
 temperature: 0.1,
 },
 model_id: 'ibm/granite-13b-instruct-v2',
 project_id: projectId,
 }),
 });

 if (!response.ok) {
 throw new Error(`WatsonX API error: ${response.status}`);
 }

 const result = await response.json();
 const aiText = result.results?.[0]?.generated_text || '';
 
 return this.parseAIResponse(aiText);

 } catch (error) {
 console.error('WatsonX API call failed:', error);
 return null;
 }
 }

 /**
 * 📝 Convert Excel data to text
 */
 private static convertExcelToText(data: any[][]): string {
 const lines: string[] = [];
 
 for (let i = 0; i < Math.min(data.length, 40); i++) {
 const row = data[i];
 if (row && row.length > 0) {
 const rowText = row.map(cell => String(cell || '')).join(' | ');
 if (rowText.trim()) {
 lines.push(`Row ${i}: ${rowText}`);
 }
 }
 }
 
 return lines.join('\n');
 }

 /**
 * 🧩 Parse AI response
 */
 private static parseAIResponse(aiText: string): AIExtractedData {
 try {
 const jsonMatch = aiText.match(/\{[\s\S]*\}/);
 if (jsonMatch) {
 const parsed = JSON.parse(jsonMatch[0]);
 
 return {
 ct_parameters: {
 ct_ratio_primary: parsed.ct_ratio_primary,
 ct_ratio_secondary: parsed.ct_ratio_secondary,
 accuracy_class: parsed.accuracy_class,
 rct: parsed.rct,
 vk_available: parsed.vk_available,
 io_at_vk: parsed.io_at_vk
 },
 system_parameters: {
 frequency: parsed.frequency,
 bus_voltage_kv: parsed.bus_voltage_kv,
 max_bus_fault_mva: parsed.max_bus_fault_mva,
 r1: parsed.r1,
 x1: parsed.x1,
 r0: parsed.r0,
 x0: parsed.x0,
 route_length_km: parsed.route_length_km,
 relay_burden_va: parsed.relay_burden_va,
 lead_resistance: parsed.lead_resistance
 },
 devices: parsed.devices || [],
 confidence_score: 0.85,
 ai_notes: ['AI extraction successful']
 };
 }
 } catch (error) {
 console.error('Failed to parse AI response:', error);
 }

 return this.createDefaultResponse('AI parsing failed');
 }

 /**
 * 🎯 Enhanced pattern matching (AI fallback)
 */
 private static enhancedPatternMatching(data: any[][]): AIExtractedData {
 const result = this.createDefaultResponse('Enhanced pattern matching used');
 let confidence = 0.3;

 console.log('🔍 Running enhanced pattern matching...');

 for (let i = 0; i < Math.min(data.length, 50); i++) {
 const row = data[i];
 if (!row || row.length < 2) continue;

 const firstCell = String(row[0] || '').toLowerCase().trim();
 
 // Enhanced CT Ratio detection
 if (firstCell.includes('ct ratio') || firstCell.includes('ratio')) {
 for (let j = 1; j < row.length; j++) {
 const cellValue = String(row[j] || '').trim();
 const ratioMatch = cellValue.match(/(\d+)\/(\d+)/);
 if (ratioMatch) {
 result.ct_parameters.ct_ratio_primary = parseInt(ratioMatch[1]);
 result.ct_parameters.ct_ratio_secondary = parseInt(ratioMatch[2]);
 confidence += 0.2;
 result.ai_notes.push(`Found CT ratio: ${cellValue}`);
 console.log(`✅ Found CT ratio: ${cellValue}`);
 }
 }
 }

 // Enhanced Accuracy Class detection
 if (firstCell.includes('accuracy') || firstCell.includes('class')) {
 for (let j = 1; j < row.length; j++) {
 const cellValue = String(row[j] || '').trim();
 if (/^(PX|P|0\.5|1\.0|5P|10P)$/i.test(cellValue)) {
 result.ct_parameters.accuracy_class = cellValue;
 confidence += 0.15;
 result.ai_notes.push(`Found accuracy class: ${cellValue}`);
 console.log(`✅ Found accuracy class: ${cellValue}`);
 }
 }
 }

 // Enhanced Resistance detection
 if (firstCell.includes('resistance') || firstCell.includes('rct')) {
 for (let j = 1; j < row.length; j++) {
 const cellValue = parseFloat(String(row[j] || ''));
 if (!isNaN(cellValue) && cellValue > 0 && cellValue < 100) {
 result.ct_parameters.rct = cellValue;
 confidence += 0.15;
 result.ai_notes.push(`Found CT resistance: ${cellValue}Ω`);
 console.log(`✅ Found CT resistance: ${cellValue}Ω`);
 }
 }
 }

 // Enhanced Knee Point Voltage detection
 if (firstCell.includes('knee') || firstCell.includes('vk') || firstCell.includes('voltage')) {
 for (let j = 1; j < row.length; j++) {
 const cellValue = parseFloat(String(row[j] || ''));
 if (!isNaN(cellValue) && cellValue > 100 && cellValue < 10000) {
 result.ct_parameters.vk_available = cellValue;
 confidence += 0.15;
 result.ai_notes.push(`Found Vk: ${cellValue}V`);
 console.log(`✅ Found Vk: ${cellValue}V`);
 }
 }
 }

 // Enhanced Device Name detection
 if (firstCell.includes('device') || firstCell.includes('relay') || firstCell.includes('name')) {
 for (let j = 1; j < row.length; j++) {
 const cellValue = String(row[j] || '').trim();
 if (cellValue && cellValue.length > 2 && /^[A-Z0-9]+/.test(cellValue)) {
 result.devices.push({
 device_name: cellValue,
 ct_ratio: `${result.ct_parameters.ct_ratio_primary}/${result.ct_parameters.ct_ratio_secondary}A`,
 accuracy_class: result.ct_parameters.accuracy_class || 'PX'
 });
 confidence += 0.1;
 result.ai_notes.push(`Found device: ${cellValue}`);
 console.log(`✅ Found device: ${cellValue}`);
 }
 }
 }
 }

 result.confidence_score = Math.min(confidence, 1.0);
 console.log(`🎯 Pattern matching confidence: ${(result.confidence_score * 100).toFixed(0)}%`);
 
 return result;
 }

 /**
 * 🏗️ Create default response structure - NO DEFAULT VALUES
 */
 private static createDefaultResponse(method: string): AIExtractedData {
 return {
 ct_parameters: {},
 system_parameters: {},
 devices: [],
 confidence_score: 0.1,
 ai_notes: [method + ' - No data extracted from Excel']
 };
 }
}