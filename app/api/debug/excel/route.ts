import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    // Get the uploaded file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const debugInfo: any = {
      filename: file.name,
      fileSize: file.size,
      sheetNames: workbook.SheetNames,
      sheets: {}
    };
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      debugInfo.sheets[sheetName] = {
        totalRows: data.length,
        totalColumns: Math.max(...data.map(row => row ? row.length : 0)),
        firstTenRows: data.slice(0, 10),
        allData: data // Include all data for debugging
      };
    }
    
    return NextResponse.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('Debug Excel error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug Excel file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}