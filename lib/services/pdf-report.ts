import { DeviceResult } from './ct-adequacy';
import { StandardParameters } from './excel-processor';

/**
 * 🏢 PROFESSIONAL BLACK & WHITE PDF REPORT GENERATOR FOR MNC COMPANIES
 * Clean, corporate design with no colors - only black text on white background
 */

// Clean text function
const clean = (text: string): string => String(text || '').replace(/[^\x00-\xFF]/g, '?');

/**
 * ✨ Generate Professional Corporate Device Report (Black & White Only)
 */
export async function generateDevicePDFReport(
  device: DeviceResult,
  systemParams: StandardParameters
): Promise<void> {
  console.log('🏢 PROFESSIONAL CORPORATE PDF GENERATOR ACTIVATED');
  
  // Simple jsPDF import
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const doc = new jsPDF('portrait', 'mm', 'a4');
  
  // Document setup
  doc.setProperties({
    title: `CT Adequacy Report - ${device.device_name}`,
    creator: 'CT Analysis System'
  });

  let y = 25;
  const pageWidth = 210;
  const margin = 20;

  // 🏢 CORPORATE HEADER (Black text only)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CT ADEQUACY ANALYSIS REPORT', margin, y);
  
  // Underline
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  
  y += 15;

  // Device name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Device: ${clean(device.device_name)}`, margin, y);
  
  y += 10;

  // Report date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Generated: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, margin, y);
  
  y += 20;

  // 🏢 VERDICT SECTION (Black border box)
  const verdictBoxHeight = 25;
  const boxWidth = pageWidth - (margin * 2);
  
  // Draw verdict box with black border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(margin, y, boxWidth, verdictBoxHeight, 'S');
  
  // Verdict text
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(device.verdict, margin + boxWidth/2, y + 10, { align: 'center' });
  
  // Technical details
  if (device.verdict !== 'NOT APPLICABLE') {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const vkText = `Vk Required: ${device.vk_required}V | Vk Available: ${device.vk_available > 0 ? device.vk_available + 'V' : 'N/A'}`;
    doc.text(vkText, margin + boxWidth/2, y + 18, { align: 'center' });
    
    if (device.vk_available > 0) {
      const ratio = ((device.vk_available / device.vk_required) * 100).toFixed(0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Adequacy Ratio: ${ratio}%`, margin + boxWidth/2, y + 22, { align: 'center' });
    }
  }
  
  y += verdictBoxHeight + 25;

  // 🏢 INPUT PARAMETERS TABLE (Black borders)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INPUT PARAMETERS', margin, y);
  y += 10;

  // Table structure
  const tableY = y;
  const rowHeight = 8;
  const col1Width = 60;
  const col2Width = 30;
  const col3Width = 20;
  
  // Header row
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, tableY, col1Width + col2Width + col3Width, rowHeight, 'S');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Parameter', margin + 2, tableY + 6);
  doc.text('Value', margin + col1Width + 2, tableY + 6);
  doc.text('Unit', margin + col1Width + col2Width + 2, tableY + 6);
  
  // Vertical lines
  doc.line(margin + col1Width, tableY, margin + col1Width, tableY + rowHeight);
  doc.line(margin + col1Width + col2Width, tableY, margin + col1Width + col2Width, tableY + rowHeight);
  
  y += rowHeight;
  
  // Data rows
  const params = [
    ['CT Ratio', `${device.inputs.ct_ratio_primary}/${device.inputs.ct_ratio_secondary}`, 'A'],
    ['Accuracy Class', device.inputs.accuracy_class || 'N/A', ''],
    ['CT Resistance', device.inputs.rct?.toString() || 'N/A', 'Ω'],
    ['Lead Resistance', device.inputs.lead_resistance?.toString() || 'N/A', 'Ω'],
    ['Relay Burden', device.inputs.relay_burden_va?.toString() || 'N/A', 'VA'],
    ['Bus Voltage', device.inputs.bus_voltage_kv?.toString() || 'N/A', 'kV'],
    ['Fault Level', device.inputs.max_bus_fault_kA?.toString() || 'N/A', 'kA'],
    ['Route Length', device.inputs.route_length_km?.toString() || 'N/A', 'km']
  ];
  
  doc.setFont('helvetica', 'normal');
  
  params.forEach((param, index) => {
    const rowY = y + (index * rowHeight);
    
    // Row border
    doc.rect(margin, rowY, col1Width + col2Width + col3Width, rowHeight, 'S');
    
    // Vertical lines
    doc.line(margin + col1Width, rowY, margin + col1Width, rowY + rowHeight);
    doc.line(margin + col1Width + col2Width, rowY, margin + col1Width + col2Width, rowY + rowHeight);
    
    // Text
    doc.text(param[0], margin + 2, rowY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(param[1], margin + col1Width + 2, rowY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(param[2], margin + col1Width + col2Width + 2, rowY + 6);
  });

  y += (params.length * rowHeight) + 20;

  // Check for new page
  if (y > 220) {
    doc.addPage();
    y = 30;
  }

  // 🏢 CALCULATION BREAKDOWN (Simple black text table)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CALCULATION BREAKDOWN', margin, y);
  y += 10;

  // Table header
  const calcTableY = y;
  const conditionWidth = 80;
  const ealreqWidth = 25;
  const vkWidth = 25;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, calcTableY, conditionWidth + ealreqWidth + vkWidth, rowHeight, 'S');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fault Condition', margin + 2, calcTableY + 6);
  doc.text('Ealreq (V)', margin + conditionWidth + 2, calcTableY + 6);
  doc.text('Vk Req (V)', margin + conditionWidth + ealreqWidth + 2, calcTableY + 6);
  
  // Vertical lines
  doc.line(margin + conditionWidth, calcTableY, margin + conditionWidth, calcTableY + rowHeight);
  doc.line(margin + conditionWidth + ealreqWidth, calcTableY, margin + conditionWidth + ealreqWidth, calcTableY + rowHeight);
  
  y += rowHeight;

  device.vk_breakdown.forEach((row, index) => {
    const rowY = y + (index * rowHeight);
    
    // Row border
    doc.rect(margin, rowY, conditionWidth + ealreqWidth + vkWidth, rowHeight, 'S');
    
    // Vertical lines
    doc.line(margin + conditionWidth, rowY, margin + conditionWidth, rowY + rowHeight);
    doc.line(margin + conditionWidth + ealreqWidth, rowY, margin + conditionWidth + ealreqWidth, rowY + rowHeight);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', row.isMax ? 'bold' : 'normal');
    
    const label = row.isMax ? `${row.label} (MAX)` : row.label;
    doc.text(label, margin + 2, rowY + 6);
    doc.text(row.ealreq.toString(), margin + conditionWidth + 2, rowY + 6);
    doc.text(row.vk.toString(), margin + conditionWidth + ealreqWidth + 2, rowY + 6);
  });

  y += (device.vk_breakdown.length * rowHeight) + 15;

  // Final result box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(margin, y, boxWidth, 15, 'S');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`FINAL RESULT: Ealreq Max = ${device.ealreq_max}V, Vk Required = ${device.vk_required}V`, margin + 2, y + 10);

  // 🏢 CORPORATE FOOTER (Black line)
  const footerY = 270;
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CT Analysis System - Professional Report', margin, footerY + 5);
  doc.text(new Date().toLocaleString(), pageWidth - margin, footerY + 5, { align: 'right' });

  // Save with professional naming
  const deviceName = clean(device.device_name).replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  doc.save(`CT_Adequacy_Report_${deviceName}_${timestamp}.pdf`);
  
  console.log('✅ PROFESSIONAL CORPORATE PDF GENERATED (Black & White)');
}

/**
 * ✨ Generate Professional Corporate Consolidated Report (Black & White Only)
 */
export async function generateConsolidatedPDFReport(
  devices: DeviceResult[],
  systemParams: StandardParameters
): Promise<void> {
  console.log('🏢 PROFESSIONAL CORPORATE CONSOLIDATED PDF GENERATOR ACTIVATED');
  
  // Simple jsPDF import
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  const pageWidth = 297; // A4 landscape
  const margin = 20;
  let y = 25;

  // 🏢 CORPORATE HEADER (Black text only)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CT ADEQUACY ANALYSIS - CONSOLIDATED REPORT', margin, y);
  
  // Underline
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  
  y = 40;

  // Summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${devices.length} devices analyzed on ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, margin, y);
  y += 20;

  // Devices overview table (Black borders)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVICES OVERVIEW', margin, y);
  y += 15;

  // Table structure
  const tableStartY = y;
  const rowHeight = 10;
  const colWidths = [15, 80, 35, 30, 30, 25, 25, 25]; // Column widths
  const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);

  // Header row
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, tableStartY, totalWidth, rowHeight, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  let x = margin;
  const headers = ['#', 'Device Name', 'CT Ratio', 'Verdict', 'Vk Req', 'Vk Avail', 'Ratio %', 'Status'];
  headers.forEach((header, i) => {
    // Vertical lines
    if (i > 0) {
      doc.line(x, tableStartY, x, tableStartY + rowHeight);
    }
    doc.text(header, x + 2, tableStartY + 7);
    x += colWidths[i];
  });
  
  y += rowHeight;

  // Device rows
  devices.forEach((device, index) => {
    const rowY = y + (index * rowHeight);
    
    // Row border
    doc.rect(margin, rowY, totalWidth, rowHeight, 'S');
    
    const ratio = device.vk_available > 0 ? 
      `${((device.vk_available / device.vk_required) * 100).toFixed(0)}%` : 'N/A';
    
    const name = device.device_name.length > 25 ? 
      device.device_name.substring(0, 22) + '...' : device.device_name;

    const rowData = [
      (index + 1).toString(),
      clean(name),
      `${device.inputs.ct_ratio_primary}/${device.inputs.ct_ratio_secondary}`,
      device.verdict === 'SUITABLY DIMENSIONED' ? 'SUITABLE' : 'UNDER DIM.',
      `${device.vk_required}V`,
      device.vk_available > 0 ? `${device.vk_available}V` : 'N/A',
      ratio,
      'ANALYZED'
    ];

    // Text content
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    x = margin;
    rowData.forEach((data, i) => {
      // Vertical lines
      if (i > 0) {
        doc.line(x, rowY, x, rowY + rowHeight);
      }
      
      // Bold for verdict column
      if (i === 3) {
        doc.setFont('helvetica', 'bold');
      }
      
      doc.text(data, x + 2, rowY + 7);
      
      if (i === 3) {
        doc.setFont('helvetica', 'normal');
      }
      
      x += colWidths[i];
    });
  });

  // Final summary box
  y += (devices.length * rowHeight) + 20;
  const summaryBoxWidth = 200;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(margin, y, summaryBoxWidth, 25, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ANALYSIS SUMMARY:', margin + 5, y + 10);
  
  const suitable = devices.filter(d => d.verdict === 'SUITABLY DIMENSIONED').length;
  const underDim = devices.length - suitable;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Devices: ${devices.length} | Suitable: ${suitable} | Under Dimensioned: ${underDim}`, margin + 5, y + 18);

  // 🏢 CORPORATE FOOTER (Black line)
  const footerY = 210 - 15; // A4 landscape height
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('CT Analysis System - Professional Report', margin, footerY + 5);
  doc.text(new Date().toLocaleString(), pageWidth - margin, footerY + 5, { align: 'right' });

  // Save with professional naming
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  doc.save(`CT_Adequacy_Consolidated_Report_${timestamp}.pdf`);
  
  console.log('✅ PROFESSIONAL CORPORATE CONSOLIDATED PDF GENERATED (Black & White)');
}