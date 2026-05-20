import { NextRequest, NextResponse } from 'next/server';
import { ExcelProcessor } from '@/lib/services/excel-processor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    
    // Get the uploaded file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
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