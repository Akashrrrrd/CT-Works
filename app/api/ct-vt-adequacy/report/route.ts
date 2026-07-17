/**
 * PDF REPORT GENERATION API
 * Converts adequacy analysis results to professional PDF reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProfessionalReportGenerator } from '@/lib/services/report-generator';
import type { CTVTAdequacyReport } from '@/lib/types/ct-vt-adequacy-types';

export async function POST(request: NextRequest) {
  try {
    const report: CTVTAdequacyReport = await request.json();
    
    // Get format from query params
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'html';
    
    switch (format) {
      case 'html':
        const htmlContent = ProfessionalReportGenerator.exportAsHTML(report);
        return new NextResponse(htmlContent, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="${report.project_info.project_name}_CT_VT_Report.html"`
          }
        });
        
      case 'json':
        const jsonContent = ProfessionalReportGenerator.exportAsJSON(report);
        return new NextResponse(jsonContent, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${report.project_info.project_name}_CT_VT_Report.json"`
          }
        });
        
      default:
        return NextResponse.json(
          { error: 'Unsupported format. Use html or json.' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { 
        error: 'Report generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'CT/VT Adequacy Report Generator API',
    formats: ['html', 'json'],
    usage: 'POST /api/ct-vt-adequacy/report?format=html',
    example: 'POST with CTVTAdequacyReport in body'
  });
}