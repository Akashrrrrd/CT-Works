import { NextRequest, NextResponse } from 'next/server';
import { ExcelProcessor } from '@/lib/services/excel-processor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    
    // Clear any potential caches - force fresh processing
    console.log('🔄 PROCESSING FRESH EXCEL FILE');
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
    console.log('🔧 Starting fresh Excel processing...');
    
    // Process the Excel file using the new standardized processor
    const result = await ExcelProcessor.processExcelFile(file);
    
    if (!result.isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Excel file validation failed',
          errors: result.errors,
          warnings: result.warnings
        },
        { status: 400 }
      );
    }
    
    // Return the extracted data with detailed structure
    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Excel file parsed successfully. Found ${result.data?.total_devices} devices with 17 standard parameters.`,
      summary: {
        standard_parameters_found: Object.keys(result.data?.standard_parameters || {}).length,
        devices_found: result.data?.total_devices || 0,
        device_types: result.data?.device_types || [],
        warnings: result.warnings
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
    console.error('Excel import error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to parse Excel file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}