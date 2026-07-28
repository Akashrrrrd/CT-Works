/**
 * REPORT DOWNLOAD SERVICE
 * Handles HTML and data export for IED computation reports
 */

import type { CTVTAdequacyReport } from '@/lib/types/ct-vt-adequacy-types';

export interface ReportDownloadOptions {
  projectName: string;
  includeTimestamp?: boolean;
  format?: 'html' | 'json' | 'csv';
}

export class ReportDownloadService {
  
  /**
   * Generate professional HTML report for IED computations
   */
  static generateHTMLReport(
    results: CTVTAdequacyReport,
    projectInfo: any,
    systemParams: any,
    ctWiring: any,
    vtWiring: any,
    options: ReportDownloadOptions
  ): string {
    const timestamp = new Date();
    const formattedDate = timestamp.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    const iedResultsTable = results.ied_results.map(r => {
      const verdictColor = r.verdict === 'SUITABLE' ? '#10b981' : '#ef4444';
      const verdictBgColor = r.verdict === 'SUITABLE' ? '#ecfdf5' : '#fef2f2';
      
      return `
    <tr style="border-bottom: 1px solid #e5e7eb; background: ${verdictBgColor};">
      <td style="padding: 12px; font-weight: 600;">${r.ied_name}</td>
      <td style="padding: 12px;">${r.ct_ratio_primary}/${r.ct_ratio_secondary}A</td>
      <td style="padding: 12px;">${r.accuracy_class}</td>
      <td style="padding: 12px; color: ${verdictColor}; font-weight: 600;">${r.verdict}</td>
      <td style="padding: 12px; text-align: right;">${r.total_burden.toFixed(2)}</td>
      <td style="padding: 12px; text-align: right;">${r.required_vk.toFixed(2)}</td>
      <td style="padding: 12px; text-align: right;">${r.available_vk.toFixed(2)}</td>
      <td style="padding: 12px; text-align: right; color: ${r.safety_margin >= 0 ? '#10b981' : '#ef4444'};">${r.safety_margin > 0 ? '+' : ''}${r.safety_margin.toFixed(1)}%</td>
    </tr>`;
    }).join('');

    const recommendationsHTML = results.recommendations.length > 0 ? `
    <div class="section">
      <h2>💡 Recommendations</h2>
      <ul class="recommendations">
        ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CT/VT Adequacy Analysis Report - ${options.projectName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      background: #ffffff;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    /* Header */
    .header {
      text-align: center;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 30px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 28px;
      color: #0066cc;
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .header p {
      color: #6b7280;
      font-size: 14px;
      margin: 5px 0;
    }
    
    /* Verdict Box */
    .verdict-box {
      padding: 25px;
      border-radius: 8px;
      text-align: center;
      margin: 25px 0;
      font-size: 20px;
      font-weight: bold;
    }
    
    .verdict-suitable {
      background: #ecfdf5;
      color: #065f46;
      border: 2px solid #10b981;
    }
    
    .verdict-issues {
      background: #fef2f2;
      color: #7f1d1d;
      border: 2px solid #ef4444;
    }
    
    /* Section */
    .section {
      margin: 30px 0;
      padding: 20px;
      background: #f9fafb;
      border-left: 4px solid #0066cc;
      border-radius: 4px;
    }
    
    .section h2 {
      font-size: 18px;
      color: #0066cc;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
      font-weight: 600;
    }
    
    .section h3 {
      font-size: 14px;
      color: #1f2937;
      margin: 15px 0 10px 0;
      font-weight: 600;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }
    
    .info-item {
      background: white;
      padding: 12px;
      border-radius: 4px;
      border-left: 3px solid #0066cc;
    }
    
    .info-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 5px;
      letter-spacing: 0.5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      background: white;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    th {
      background: #0066cc;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    tr:hover {
      background: #f3f4f6;
    }
    
    /* Recommendations */
    .recommendations {
      margin-left: 20px;
      list-style-position: outside;
    }
    
    .recommendations li {
      margin: 10px 0;
      color: #1e40af;
      font-size: 13px;
      line-height: 1.5;
    }
    
    /* Formulas Section */
    .formula-box {
      background: #f0f9ff;
      border: 1px solid #7dd3fc;
      border-radius: 4px;
      padding: 12px;
      margin: 10px 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #0369a1;
      overflow-x: auto;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    
    .footer-divider {
      margin: 8px 0;
    }
    
    .page-break {
      page-break-after: always;
      margin: 40px 0;
    }
    
    @media print {
      body { 
        padding: 0; 
        margin: 0; 
        background: white;
      }
      .container { 
        padding: 0; 
        margin: 0; 
        max-width: 100%;
      }
      .section {
        page-break-inside: avoid;
      }
    }
    
    @media screen and (max-width: 768px) {
      .container {
        padding: 20px 10px;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      table {
        font-size: 12px;
      }
      
      td, th {
        padding: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>CT/VT Adequacy Analysis Report</h1>
      <p>Comprehensive Calculation & Formula Breakdown</p>
      <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">
        Generated: ${formattedDate} at ${formattedTime}
      </p>
    </div>

    <!-- Overall Verdict -->
    <div class="verdict-box ${results.overall_summary.overall_verdict === 'ALL_SUITABLE' ? 'verdict-suitable' : 'verdict-issues'}">
      ${results.overall_summary.overall_verdict === 'ALL_SUITABLE' ? '✅ ALL IEDS SUITABLE' : '⚠️ SOME IEDS REQUIRE ATTENTION'}
    </div>

    <!-- Summary Section -->
    <div class="section">
      <h2>📊 Summary</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Total IEDs Checked</div>
          <div class="info-value">${results.overall_summary.total_ieds_checked}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Suitable IEDs</div>
          <div class="info-value" style="color: #10b981;">${results.overall_summary.suitable_ieds}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Under-dimensioned IEDs</div>
          <div class="info-value" style="color: ${results.overall_summary.total_ieds_checked - results.overall_summary.suitable_ieds > 0 ? '#ef4444' : '#10b981'};">
            ${results.overall_summary.total_ieds_checked - results.overall_summary.suitable_ieds}
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Success Rate</div>
          <div class="info-value">${Math.round((results.overall_summary.suitable_ieds / results.overall_summary.total_ieds_checked) * 100)}%</div>
        </div>
      </div>
    </div>

    <!-- Project Information -->
    <div class="section">
      <h2>📋 Project Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Project Name</div>
          <div class="info-value">${projectInfo?.name || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Substation</div>
          <div class="info-value">${projectInfo?.substation || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Engineer</div>
          <div class="info-value">${projectInfo?.engineer || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Analysis Date</div>
          <div class="info-value">${projectInfo?.date || 'N/A'}</div>
        </div>
      </div>
    </div>

    <!-- System Parameters -->
    <div class="section">
      <h2>⚡ System Parameters</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Bus Voltage</div>
          <div class="info-value">${systemParams?.bus_voltage_level || 'N/A'} kV</div>
        </div>
        <div class="info-item">
          <div class="info-label">System Frequency</div>
          <div class="info-value">${systemParams?.system_frequency || 'N/A'} Hz</div>
        </div>
        <div class="info-item">
          <div class="info-label">Fault Level</div>
          <div class="info-value">${systemParams?.bus_fault_level || 'N/A'} kA</div>
        </div>
        <div class="info-item">
          <div class="info-label">X/R Ratio</div>
          <div class="info-value">${systemParams?.xr_ratio || 'N/A'}</div>
        </div>
      </div>
    </div>

    <!-- Wiring Configuration -->
    <div class="section">
      <h2>🔌 Wiring Configuration</h2>
      
      <h3>CT (Current Transformer) Wiring</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Cable Cross Section</div>
          <div class="info-value">${ctWiring?.conductor_cross_section || 'N/A'} mm²</div>
        </div>
        <div class="info-item">
          <div class="info-label">Resistance @ 20°C</div>
          <div class="info-value">${ctWiring?.resistance_w_km_20c || 'N/A'} Ω/km</div>
        </div>
        <div class="info-item">
          <div class="info-label">Lead Length</div>
          <div class="info-value">${ctWiring?.lead_length_ct_to_relay || 'N/A'} m</div>
        </div>
      </div>

      <h3>VT (Voltage Transformer) Wiring</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Cable Cross Section</div>
          <div class="info-value">${vtWiring?.conductor_cross_section || 'N/A'} mm²</div>
        </div>
        <div class="info-item">
          <div class="info-label">Resistance @ 20°C</div>
          <div class="info-value">${vtWiring?.resistance_w_km_20c || 'N/A'} Ω/km</div>
        </div>
        <div class="info-item">
          <div class="info-label">Lead Length</div>
          <div class="info-value">${vtWiring?.lead_length_vt_to_relay || 'N/A'} m</div>
        </div>
      </div>
    </div>

    <!-- Individual IED Results -->
    <div class="section">
      <h2>🛡️ Individual IED Calculations & Results</h2>
      <p style="color: #6b7280; font-size: 13px; margin-bottom: 15px;">Detailed calculations and adequacy verdict for each IED device</p>
      
      <table>
        <thead>
          <tr>
            <th>IED Name</th>
            <th>CT Ratio</th>
            <th>Accuracy Class</th>
            <th>Verdict</th>
            <th>Total Burden (VA)</th>
            <th>Required Vk (V)</th>
            <th>Available Vk (V)</th>
            <th>Safety Margin</th>
          </tr>
        </thead>
        <tbody>
          ${iedResultsTable}
        </tbody>
      </table>
    </div>

    <!-- Recommendations -->
    ${recommendationsHTML}

    <!-- Formulas & Standards -->
    <div class="section">
      <h2>📐 Calculation Formulas & Standards</h2>
      
      <h3>CT Adequacy Method - Vk Calculation</h3>
      <div class="formula-box">
        Ealreq = K × (If / n) × (Rct + 2Rl + Rr)
      </div>
      
      <p style="margin: 10px 0; color: #374151; font-size: 13px; line-height: 1.8;">
        <strong>Where:</strong><br/>
        • <strong>K</strong> = Protection scheme multiplying factor<br/>
        • <strong>If</strong> = Maximum fault current (A)<br/>
        • <strong>n</strong> = CT turns ratio (secondary rated current)<br/>
        • <strong>Rct</strong> = CT secondary winding resistance (Ω)<br/>
        • <strong>Rl</strong> = One-way lead resistance (Ω)<br/>
        • <strong>Rr</strong> = Relay burden resistance = VA / (Isec)²
      </p>
      
      <h3>Verdict Criteria</h3>
      <ul style="margin-left: 20px; color: #374151; font-size: 13px; line-height: 1.8;">
        <li><strong>SUITABLE:</strong> Available Vk ≥ Required Vk with positive safety margin</li>
        <li><strong>UNDER-DIMENSIONED:</strong> Available Vk &lt; Required Vk</li>
      </ul>
      
      <h3>Applicable Standards & References</h3>
      <ul style="margin-left: 20px; color: #374151; font-size: 13px; line-height: 1.8;">
        <li><strong>IEC 61869-2:</strong> Instrument transformers - Additional requirements for current transformers</li>
        <li><strong>IEEE C57.13:</strong> Standard requirements for instrument transformers</li>
        <li><strong>IS 2705:</strong> Indian Standard for Current Transformers</li>
        <li><strong>EN 60044-1:</strong> Safety requirements for instrument transformers</li>
      </ul>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-divider">
        <strong>Important Disclaimer:</strong> This report is generated by the CT/VT Adequacy Analysis System.
      </div>
      <div class="footer-divider">
        All calculations are performed based on the input parameters provided and applicable engineering standards.
      </div>
      <div class="footer-divider">
        Please verify all results with a qualified electrical engineer before implementation.
      </div>
      <div style="margin-top: 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
        <p>Report Reference: <strong>${options.projectName}_${Date.now()}</strong></p>
        <p style="font-size: 11px; margin-top: 5px;">© CT/VT Adequacy Analysis System</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Export results as JSON for integration with other systems
   */
  static generateJSONReport(
    results: CTVTAdequacyReport,
    options: ReportDownloadOptions
  ): string {
    const reportData = {
      metadata: {
        projectName: options.projectName,
        generatedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0'
      },
      summary: results.overall_summary,
      iedResults: results.ied_results,
      recommendations: results.recommendations,
      timestamp: Date.now()
    };

    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Export results as CSV for spreadsheet analysis
   */
  static generateCSVReport(
    results: CTVTAdequacyReport,
    options: ReportDownloadOptions
  ): string {
    const headers = [
      'IED Name',
      'CT Ratio Primary',
      'CT Ratio Secondary',
      'Accuracy Class',
      'Verdict',
      'Total Burden (VA)',
      'Required Vk (V)',
      'Available Vk (V)',
      'Safety Margin (%)'
    ];

    const rows = results.ied_results.map(r => [
      r.ied_name,
      r.ct_ratio_primary,
      r.ct_ratio_secondary,
      r.accuracy_class,
      r.verdict,
      r.total_burden.toFixed(2),
      r.required_vk.toFixed(2),
      r.available_vk.toFixed(2),
      r.safety_margin.toFixed(1)
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  /**
   * Trigger browser download of generated report
   */
  static downloadReport(
    content: string,
    filename: string,
    mimeType: string = 'text/html;charset=utf-8'
  ): void {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download report');
    }
  }
}
