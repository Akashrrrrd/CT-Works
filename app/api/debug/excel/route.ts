import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
 try {
 const formData = await request.formData();
 const file = formData.get('file') as File;
 
 if (!file) {
 return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
 }
 
 const arrayBuffer = await file.arrayBuffer();
 const workbook = XLSX.read(arrayBuffer, { type: 'array' });
 
 const debugInfo: any = {
 filename: file.name,
 fileSize: file.size,
 sheetNames: workbook.SheetNames,
 sheets: {}
 };
 
 for (const sheetName of workbook.SheetNames) {
 const sheet = workbook.Sheets[sheetName];
 const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
 
 // Find where the device table is
 let deviceSectionRow = -1;
 for (let i = 0; i < data.length; i++) {
 const row = data[i];
 if (!row) continue;
 const joined = row.map((c: any) => String(c ?? '').toLowerCase()).join(' ');
 if (
 (joined.includes('protection') && (joined.includes('purpose') || joined.includes('device'))) ||
 (joined.includes('connected') && joined.includes('device'))
 ) {
 deviceSectionRow = i;
 break;
 }
 }

 debugInfo.sheets[sheetName] = {
 totalRows: data.length,
 totalColumns: Math.max(...data.map(row => row ? row.length : 0)),
 deviceSectionFoundAtRow: deviceSectionRow,
 // Show ALL rows with their index for full transparency
 allRows: data.map((row, idx) => ({
 rowIndex: idx,
 cells: row ? row.map((cell: any) => cell !== null && cell !== undefined ? String(cell) : '') : []
 }))
 };
 }
 
 return NextResponse.json({ success: true, debug: debugInfo });
 
 } catch (error) {
 console.error('Debug Excel error:', error);
 return NextResponse.json(
 { error: 'Failed to debug Excel file', details: error instanceof Error ? error.message : 'Unknown error' },
 { status: 500 }
 );
 }
}