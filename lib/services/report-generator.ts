/**
 * PROFESSIONAL PDF REPORT GENERATOR - Step 12 Implementation
 * Generates engineering-grade reports matching your exact specification
 */

import type { CTVTAdequacyReport, IEDAdequacyResult } from '@/lib/types/ct-vt-adequacy-types';

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT DATA STRUCTURE (Your Step 12 Specification)
// ═══════════════════════════════════════════════════════════════════════════════

interface ReportSection {
  title: string;
  content: string | ReportTable | ReportCalculation[];
  type: 'text' | 'table' | 'calculations';
}

interface ReportTable {
  headers: string[];
  rows: (string | number)[][];
}

interface ReportCalculation {
  step: string;
  formula: string;
  inputs: Record<string, number | string>;
  result: number;
  unit: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL REPORT GENERATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ProfessionalReportGenerator {

  /**
   * Generate complete engineering report as specified in your Step 12
   */
  static generateReport(report: CTVTAdequacyReport): ReportSection[] {
    const sections: ReportSection[] = [];

    // 1. PROJECT INFORMATION
    sections.push({
      title: 'PROJECT INFORMATION',
      type: 'table',
      content: {
        headers: ['Parameter', 'Value'],
        rows: [
          ['Project Name', report.project_info.project_name],
          ['Substation', report.project_info.substation], 
          ['Voltage Level', report.project_info.voltage_level],
          ['Engineer', report.project_info.engineer],
          ['Date Calculated', report.project_info.date_calculated],
          ['Analysis Standard', 'IEC 61869-2, IEEE C37.110']
        ]
      }
    });

    // 2. INPUT PARAMETERS
    sections.push({
      title: 'INPUT PARAMETERS',
      type: 'table',
      content: {
        headers: ['System Parameter', 'Value', 'Unit'],
        rows: [
          ['Bus Fault Level', report.system_summary.bus_fault_level, 'kA'],
          ['System Frequency', report.system_summary.system_frequency, 'Hz'],
          ['Bus Voltage Level', report.system_summary.bus_voltage_level, 'kV'],
          ['X/R Ratio', report.system_summary.xr_ratio, ''],
          ['Phase Voltage', report.system_summary.phase_voltage.toFixed(0), 'V'],
          ['Max Fault Current', report.system_summary.max_fault_current.toFixed(0), 'A'],
          ['Source Impedance', report.system_summary.source_impedance.toFixed(4), 'Ω']
        ]
      }
    });

    // 3. TRANSMISSION LINE PARAMETERS  
    sections.push({
      title: 'TRANSMISSION LINE PARAMETERS',
      type: 'table',
      content: {
        headers: ['Parameter', 'Value', 'Unit'],
        rows: [
          ['Positive Seq. Resistance (R1)', report.system_summary.positive_sequence_resistance, 'Ω/km'],
          ['Positive Seq. Reactance (X1)', report.system_summary.positive_sequence_reactance, 'Ω/km'],
          ['Zero Seq. Resistance (R0)', report.system_summary.zero_sequence_resistance, 'Ω/km'],
          ['Zero Seq. Reactance (X0)', report.system_summary.zero_sequence_reactance, 'Ω/km'],
          ['Route Length', report.system_summary.route_length, 'km']
        ]
      }
    });

    // 4. CT CABLE DETAILS
    sections.push({
      title: 'CT CABLE DETAILS',
      type: 'table', 
      content: {
        headers: ['Parameter', 'Value', 'Unit'],
        rows: [
          ['Cross Section', `${report.wiring_summary.ct_wiring.resistance_at_temp} mm²`, ''],
          ['Resistance @ 20°C', `${report.wiring_summary.ct_wiring.resistance_at_temp} Ω/km`, ''],
          ['Resistance @ Operating Temp', `${report.wiring_summary.ct_wiring.resistance_at_temp} Ω/km`, ''],
          ['Lead Length', 'N/A', 'm'], // TODO: Add to report structure
          ['Loop Resistance', report.wiring_summary.ct_wiring.loop_resistance.toFixed(4), 'Ω']
        ]
      }
    });

    // 5. VT CABLE DETAILS
    sections.push({
      title: 'VT CABLE DETAILS',
      type: 'table',
      content: {
        headers: ['Parameter', 'Value', 'Unit'],
        rows: [
          ['Cross Section', 'N/A', 'mm²'], // TODO: Add to report structure  
          ['Resistance @ 20°C', `${report.wiring_summary.vt_wiring.resistance_at_temp} Ω/km`, ''],
          ['Lead Length', 'N/A', 'm'],
          ['Loop Resistance', report.wiring_summary.vt_wiring.loop_resistance.toFixed(4), 'Ω']
        ]
      }
    });

    // 6. SELECTED IEDs TABLE
    sections.push({
      title: 'SELECTED IEDs',
      type: 'table',
      content: {
        headers: ['IED Name', 'CT Ratio', 'Accuracy Class', 'CT Resistance (Ω)', 'Burden (VA)', 'Verdict'],
        rows: report.ied_results.map(ied => [
          ied.ied_name,
          `${ied.ct_ratio_primary}/${ied.ct_ratio_secondary}A`,
          ied.accuracy_class,
          ied.inputs.rct.toString(),
          ied.ied_burden.toString(),
          ied.verdict
        ])
      }
    });

    // 7. DETAILED CALCULATIONS FOR EACH IED
    report.ied_results.forEach((ied, index) => {
      sections.push({
        title: `DETAILED CALCULATIONS - ${ied.ied_name}`,
        type: 'calculations',
        content: ied.calculation_steps.map(step => ({
          step: step.step_name,
          formula: step.formula,
          inputs: step.inputs,
          result: step.result,
          unit: step.unit,
          description: step.description
        }))
      });

      // CT Adequacy Results for this IED
      sections.push({
        title: `CT ADEQUACY RESULT - ${ied.ied_name}`,
        type: 'table',
        content: {
          headers: ['Check Type', 'Required', 'Available', 'Result', 'Safety Margin'],
          rows: [
            ...(ied.required_kssc ? [[
              'KSSC Method',
              ied.required_kssc.toString(),
              ied.available_kssc?.toString() || 'N/A',
              ied.verdict,
              `${ied.safety_margin > 0 ? '+' : ''}${ied.safety_margin}%`
            ]] : []),
            ...(ied.required_vk ? [[
              'Vk Method',
              `${ied.required_vk}V`,
              `${ied.available_vk}V`,
              ied.verdict,
              `${ied.safety_margin > 0 ? '+' : ''}${ied.safety_margin}%`
            ]] : [])
          ]
        }
      });
    });

    // 8. OVERALL SUMMARY
    sections.push({
      title: 'OVERALL SUMMARY',
      type: 'table',
      content: {
        headers: ['Summary Item', 'Count'],
        rows: [
          ['Total IEDs Checked', report.overall_summary.total_ieds_checked.toString()],
          ['Suitable IEDs', report.overall_summary.suitable_ieds.toString()],
          ['Under-dimensioned IEDs', report.overall_summary.under_dimensioned_ieds.toString()],
          ['Not Applicable IEDs', report.overall_summary.not_applicable_ieds.toString()],
          ['Overall Verdict', report.overall_summary.overall_verdict]
        ]
      }
    });

    // 9. FINAL ENGINEERING CONCLUSION
    const conclusion = this.generateEngineeringConclusion(report);
    sections.push({
      title: 'FINAL ENGINEERING CONCLUSION',
      type: 'text',
      content: conclusion
    });

    // 10. RECOMMENDATIONS
    sections.push({
      title: 'RECOMMENDATIONS',
      type: 'text', 
      content: report.recommendations.join('\n\n')
    });

    // 11. CALCULATION STANDARDS
    sections.push({
      title: 'CALCULATION STANDARDS',
      type: 'text',
      content: report.calculation_standards.join('\n')
    });

    return sections;
  }

  /**
   * Generate engineering conclusion based on results
   */
  private static generateEngineeringConclusion(report: CTVTAdequacyReport): string {
    const { overall_summary, ied_results } = report;
    
    let conclusion = '';

    if (overall_summary.overall_verdict === 'ALL_SUITABLE') {
      conclusion = `Based on the comprehensive CT/VT adequacy analysis, all ${overall_summary.total_ieds_checked} IEDs in this application are SUITABLY DIMENSIONED for the given system conditions.\n\n`;
      
      conclusion += `The analysis confirms that:\n`;
      conclusion += `• All current transformers can handle the maximum fault currents without saturation\n`;
      conclusion += `• All voltage transformers can maintain accuracy within specified limits\n`;
      conclusion += `• Cable burdens are within acceptable limits for all devices\n`;
      conclusion += `• Adequate safety margins exist for all protection and metering functions\n\n`;
      
      conclusion += `The proposed CT/VT configuration is APPROVED for implementation.`;
      
    } else if (overall_summary.overall_verdict === 'SOME_ISSUES') {
      conclusion = `The CT/VT adequacy analysis reveals that ${overall_summary.suitable_ieds} out of ${overall_summary.total_ieds_checked} IEDs are suitably dimensioned.\n\n`;
      
      if (overall_summary.under_dimensioned_ieds > 0) {
        conclusion += `${overall_summary.under_dimensioned_ieds} IED(s) are UNDER-DIMENSIONED and require attention:\n`;
        
        ied_results.filter(ied => ied.verdict === 'UNDER_DIMENSIONED').forEach(ied => {
          conclusion += `• ${ied.ied_name}: Safety margin ${ied.safety_margin}%\n`;
        });
        
        conclusion += `\nRECOMMENDATION: Review and upgrade the under-dimensioned installations before commissioning.`;
      }
      
    } else {
      conclusion = `CRITICAL: Multiple IEDs in this application are UNDER-DIMENSIONED. Immediate design review is required.\n\n`;
      conclusion += `The current CT/VT configuration is NOT APPROVED for implementation without modifications.`;
    }

    conclusion += `\n\nThis analysis has been performed in accordance with IEC 61869-2 (Current Transformers) and IEEE C37.110 (Application Guide for Current Transformers) standards.`;
    
    return conclusion;
  }

  /**
   * Export report as HTML for PDF generation
   */
  static exportAsHTML(report: CTVTAdequacyReport): string {
    const sections = this.generateReport(report);
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CT/VT Adequacy Report - ${report.project_info.project_name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1f2937; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .calculation { background-color: #f9fafb; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; }
        .formula { font-family: monospace; background-color: #fff; padding: 5px; border: 1px solid #d1d5db; }
        .suitable { color: #059669; font-weight: bold; }
        .under-dimensioned { color: #dc2626; font-weight: bold; }
        .footer { margin-top: 50px; border-top: 1px solid #d1d5db; padding-top: 20px; font-size: 12px; color: #6b7280; }
    </style>
</head>
<body>
    <h1>CT/VT ADEQUACY ANALYSIS REPORT</h1>
    <p><strong>Project:</strong> ${report.project_info.project_name}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
`;

    sections.forEach(section => {
      html += `<h2>${section.title}</h2>\n`;
      
      if (section.type === 'text') {
        html += `<p>${(section.content as string).replace(/\n/g, '<br>')}</p>\n`;
        
      } else if (section.type === 'table') {
        const table = section.content as ReportTable;
        html += '<table>\n<thead>\n<tr>\n';
        table.headers.forEach(header => {
          html += `<th>${header}</th>\n`;
        });
        html += '</tr>\n</thead>\n<tbody>\n';
        
        table.rows.forEach(row => {
          html += '<tr>\n';
          row.forEach((cell, index) => {
            let cellClass = '';
            if (table.headers[index] === 'Verdict' || table.headers[index] === 'Result') {
              if (cell === 'SUITABLE') cellClass = 'suitable';
              else if (cell === 'UNDER_DIMENSIONED') cellClass = 'under-dimensioned';
            }
            html += `<td class="${cellClass}">${cell}</td>\n`;
          });
          html += '</tr>\n';
        });
        html += '</tbody>\n</table>\n';
        
      } else if (section.type === 'calculations') {
        const calculations = section.content as ReportCalculation[];
        calculations.forEach((calc, index) => {
          html += `
<div class="calculation">
    <h4>${index + 1}. ${calc.step}</h4>
    <p><strong>Description:</strong> ${calc.description}</p>
    <div class="formula"><strong>Formula:</strong> ${calc.formula}</div>
    <p><strong>Inputs:</strong></p>
    <ul>
`;
          Object.entries(calc.inputs).forEach(([key, value]) => {
            html += `<li>${key}: ${typeof value === 'number' ? value.toFixed(4) : value}</li>\n`;
          });
          html += `
    </ul>
    <p><strong>Result:</strong> ${calc.result.toFixed(4)} ${calc.unit}</p>
</div>
`;
        });
      }
    });

    html += `
    <div class="footer">
        <p>This report was generated by the CT/VT Adequacy Check System</p>
        <p>Analysis performed according to IEC 61869-2 and IEEE C37.110 standards</p>
        <p>Report generated on: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Export report as structured JSON for API integration
   */
  static exportAsJSON(report: CTVTAdequacyReport): string {
    const sections = this.generateReport(report);
    return JSON.stringify({
      metadata: {
        project: report.project_info,
        generated_at: new Date().toISOString(),
        version: '1.0.0'
      },
      sections,
      summary: report.overall_summary,
      recommendations: report.recommendations,
      standards: report.calculation_standards
    }, null, 2);
  }
}