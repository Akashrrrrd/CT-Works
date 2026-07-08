import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

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
    
    console.log(`🔍 DEBUG: Processing ${file.name} (${file.size} bytes)`);
    
    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    // Find the specific CT Ratio row
    const ctRatioRowIndex = data.findIndex((row, index) => {
      const firstCell = String(row[0] || '').toLowerCase().trim();
      return firstCell.includes('ct ratio') || firstCell === 'ct ratio';
    });
    
    const ctRatioRow = ctRatioRowIndex >= 0 ? data[ctRatioRowIndex] : null;

    // Find rows around the CT Ratio for context
    const contextRows = [];
    if (ctRatioRowIndex >= 0) {
      for (let i = Math.max(0, ctRatioRowIndex - 3); i <= Math.min(data.length - 1, ctRatioRowIndex + 3); i++) {
        const row = data[i];
        if (row) {
          contextRows.push({
            rowIndex: i,
            isCTRatioRow: i === ctRatioRowIndex,
            col0: String(row[0] || ''),
            col1: String(row[1] || ''),
            col2: String(row[2] || ''),
            col3: String(row[3] || ''), 
            col4: String(row[4] || ''),
            col5: String(row[5] || ''),
            col6: String(row[6] || '')
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      fileInfo: {
        name: file.name,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      },
      sheetInfo: {
        sheetName: firstSheetName,
        totalRows: data.length
      },
      ctRatioAnalysis: {
        found: ctRatioRowIndex >= 0,
        rowIndex: ctRatioRowIndex,
        expectedValues: {
          col2: "Should be 700/1A (Device 1)",
          col3: "Should be 700/1A (Device 2)", 
          col4: "Should be 700/1A (Device 3)",
          col5: "Should be 2000/1A (Device 4)"
        },
        actualValues: {
          col2: ctRatioRow?.[2] || null,
          col3: ctRatioRow?.[3] || null,
          col4: ctRatioRow?.[4] || null,
          col5: ctRatioRow?.[5] || null
        },
        fullCTRatioRow: ctRatioRow
      },
      contextRows: contextRows,
      message: `CT Ratio row ${ctRatioRowIndex >= 0 ? 'found' : 'not found'}`
    });
    
  } catch (error) {
    console.error('Debug Excel error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to debug Excel file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}