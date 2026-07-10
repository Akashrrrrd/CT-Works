import { NextRequest, NextResponse } from 'next/server';
import { ExcelProcessor } from '@/lib/services/excel-processor';
import { AIExcelAnalyzer } from '@/lib/services/ai-excel-analyzer';
import * as XLSX from 'xlsx';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    
    console.log('🤖 STARTING AI-ENHANCED EXCEL PROCESSING');
    console.log(`📁 Processing file for workspace: ${workspaceId}`);
    
    // Get the uploaded file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('❌ No file uploaded in request');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    console.log(`📄 File received: ${file.name} (${file.size} bytes)`);
    console.log(`🕒 File last modified: ${new Date(file.lastModified).toISOString()}`);
    
    // Read Excel file for AI analysis
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    console.log('🤖 Starting AI analysis of Excel data...');
    
    // Use AI to analyze the Excel data
    const aiResult = await AIExcelAnalyzer.analyzeExcelWithAI(rawData);
    
    console.log('🎯 AI Analysis Results:', {
      confidence: aiResult.confidence_score,
      devices_found: aiResult.devices.length,
      ai_notes: aiResult.ai_notes
    });
    
    // Also run traditional processor as backup/validation
    console.log('🔧 Running traditional processor for comparison...');
    const traditionalResult = await ExcelProcessor.processExcelFile(file);
    
    // Combine AI results with traditional processing - NO DEFAULT VALUES
    const combinedData = {
      // Use only extracted parameters - no defaults
      ct_ratio_primary: aiResult.ct_parameters.ct_ratio_primary || traditionalResult.data?.ct_ratio_primary,
      ct_ratio_secondary: aiResult.ct_parameters.ct_ratio_secondary || traditionalResult.data?.ct_ratio_secondary,
      accuracy_class: aiResult.ct_parameters.accuracy_class || traditionalResult.data?.accuracy_class,
      rct: aiResult.ct_parameters.rct || traditionalResult.data?.rct,
      vk_available: aiResult.ct_parameters.vk_available || traditionalResult.data?.vk_available,
      io_at_vk: aiResult.ct_parameters.io_at_vk || traditionalResult.data?.io_at_vk,
      
      // System parameters from extraction only
      frequency: aiResult.system_parameters.frequency || traditionalResult.data?.frequency,
      bus_voltage_kv: aiResult.system_parameters.bus_voltage_kv || traditionalResult.data?.bus_voltage_kv,
      max_bus_fault_mva: aiResult.system_parameters.max_bus_fault_mva || traditionalResult.data?.max_bus_fault_mva,
      r1: aiResult.system_parameters.r1 || traditionalResult.data?.r1,
      x1: aiResult.system_parameters.x1 || traditionalResult.data?.x1,
      r0: aiResult.system_parameters.r0 || traditionalResult.data?.r0,
      x0: aiResult.system_parameters.x0 || traditionalResult.data?.x0,
      route_length_km: aiResult.system_parameters.route_length_km || traditionalResult.data?.route_length_km,
      relay_burden_va: aiResult.system_parameters.relay_burden_va || traditionalResult.data?.relay_burden_va,
      lead_resistance: aiResult.system_parameters.lead_resistance || traditionalResult.data?.lead_resistance,
      
      // Device information from extraction only
      devices: aiResult.devices.length > 0 ? aiResult.devices : (traditionalResult.data?.devices || []),
      total_devices: aiResult.devices.length || traditionalResult.data?.total_devices || 0,
      device_types: aiResult.devices.map(d => d.device_name) || traditionalResult.data?.device_types || [],
      
      // AI metadata
      ai_confidence: aiResult.confidence_score,
      ai_notes: aiResult.ai_notes,
      processing_method: aiResult.confidence_score > 0.7 ? 'AI_PRIMARY' : 'TRADITIONAL_PRIMARY'
    };
    
    console.log('✅ COMBINED AI + TRADITIONAL PROCESSING COMPLETE');
    
    // Return enhanced results
    return NextResponse.json({
      success: true,
      data: combinedData,
      message: `AI-enhanced Excel processing complete. Confidence: ${(aiResult.confidence_score * 100).toFixed(0)}%`,
      summary: {
        standard_parameters_found: Object.keys(aiResult.ct_parameters).length + Object.keys(aiResult.system_parameters).length,
        devices_found: combinedData.total_devices,
        device_types: combinedData.device_types,
        ai_confidence: aiResult.confidence_score,
        processing_method: combinedData.processing_method,
        ai_notes: aiResult.ai_notes,
        warnings: traditionalResult.warnings || []
      },
      timestamp: new Date().toISOString(),
      fileInfo: {
        name: file.name,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('❌ AI-Enhanced Excel processing failed:', error);
    
    // Fallback to traditional processing if AI fails
    try {
      console.log('🔄 Falling back to traditional Excel processing...');
      const file = (await request.formData()).get('file') as File;
      const result = await ExcelProcessor.processExcelFile(file);
      
      return NextResponse.json({
        success: true,
        data: result.data,
        message: 'Processed with traditional method (AI unavailable)',
        summary: {
          standard_parameters_found: Object.keys(result.data?.standard_parameters || {}).length,
          devices_found: result.data?.total_devices || 0,
          device_types: result.data?.device_types || [],
          ai_confidence: 0,
          processing_method: 'TRADITIONAL_FALLBACK',
          ai_notes: ['AI processing failed, used traditional method'],
          warnings: result.warnings
        }
      });
      
    } catch (fallbackError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Both AI and traditional processing failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
}