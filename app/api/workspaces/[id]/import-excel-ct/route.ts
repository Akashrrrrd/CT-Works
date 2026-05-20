import { NextRequest, NextResponse } from 'next/server';
import { parseExcelCTData } from '@/lib/services/excel-parser';

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
    
    // Validate file type
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xls or .xlsx)' },
        { status: 400 }
      );
    }
    
    // Parse the Excel file
    const extractedData = await parseExcelCTData(file);
    
    // Return the extracted data
    return NextResponse.json({
      success: true,
      data: extractedData,
      message: 'Excel file parsed successfully'
    });
    
  } catch (error) {
    console.error('Excel import error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse Excel file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}