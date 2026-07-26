import { FullAnalysisInput, AnalysisResult } from './calculation-engine';

const BLACK: [number, number, number] = [0, 0, 0];
const HEADER_FILL: [number, number, number] = [232, 232, 232];
const RULE_WIDTH = 0.4;
const MARGIN = 20;
const COMPANY_NAME = 'HITACHI';
const CLASSIFICATION = 'CONFIDENTIAL \u2014 FOR INTERNAL CIRCULATION ONLY';

const clean = (text: unknown): string => String(text ?? '').replace(/[^\x00-\xFF]/g, '');

function drawHeader(doc: any, pageWidth: number, title: string, pageNum: number) {
  const margin = MARGIN;
  const y = 6;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);
  doc.text(CLASSIFICATION, pageWidth / 2, y, { align: 'center' });
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  
  const ruleY = y + 10;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1.2);
  doc.rect(margin, ruleY, 35, 9, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text(COMPANY_NAME, margin + 17.5, ruleY + 6.5, { align: 'center' });
  
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text(title, margin + 40, ruleY + 6.5);
  doc.setLineWidth(0.4);
  doc.line(margin, ruleY + 12, pageWidth - margin, ruleY + 12);
  
  if (pageNum > 1) {
    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.text(`(continued)`, margin, ruleY + 17);
    return ruleY + 22;
  }
  
  return ruleY + 18;
}

function drawFooter(doc: any, pageWidth: number, pageHeight: number, pageNum: number, totalPages: number) {
  const margin = MARGIN;
  const y = pageHeight - 15;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.text(`${COMPANY_NAME} \u2014 Confidential Engineering Report`, margin, y + 5);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, y + 5, { align: 'center' });
  doc.text(new Date().toLocaleString(), pageWidth - margin, y + 5, { align: 'right' });
}

export async function generateEngineReport(input: FullAnalysisInput, result: AnalysisResult): Promise<void> {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = MARGIN;
  const contentWidth = pageWidth - margin * 2;
  
  let pageCount = 1;
  let y = drawHeader(doc, pageWidth, 'CT/VT Adequacy Full Engine Report', pageCount);

  const checkPage = (height: number) => {
    if (y + height > pageHeight - 25) {
      doc.addPage();
      pageCount++;
      y = drawHeader(doc, pageWidth, 'CT/VT Adequacy Full Engine Report', pageCount);
    }
  };

  const drawSectionTitle = (title: string) => {
    checkPage(15);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(title.toUpperCase(), margin, y + 6);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 8, margin + contentWidth, y + 8);
    y += 14;
  };

  const drawTable = (headers: string[], rows: string[][], colWidths: number[]) => {
    checkPage(12 + rows.length * 8);
    let currentY = y;
    
    // Header
    doc.setFillColor(...HEADER_FILL);
    doc.rect(margin, currentY, contentWidth, 8, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    let x = margin;
    headers.forEach((h, i) => {
      doc.text(h, x + 2, currentY + 5.5);
      x += colWidths[i];
    });
    currentY += 8;

    // Rows
    doc.setFont('times', 'normal');
    rows.forEach((row, rIdx) => {
      if (rIdx % 2 === 1) {
         doc.setFillColor(247, 247, 247);
         doc.rect(margin, currentY, contentWidth, 8, 'F');
      }
      x = margin;
      row.forEach((cell, i) => {
        doc.text(cell, x + 2, currentY + 5.5);
        x += colWidths[i];
      });
      currentY += 8;
    });
    
    doc.setDrawColor(...BLACK);
    doc.rect(margin, y, contentWidth, currentY - y);
    y = currentY + 10;
  };

  // 1. Inputs
  drawSectionTitle('Input Parameters');
  const inputRows = [
    ['System Frequency', `${input.system.frequency} Hz`],
    ['Bus Voltage', `${input.system.bus_voltage_kv} kV`],
    ['Max Fault Current', `${input.system.fault_current_ka} kA`],
    ['X/R Ratio', `${input.system.xr_ratio}`],
    ['Route Length', `${input.line.length_km} km`],
    ['CT Ratio', `${input.ct.ratio_primary}/${input.ct.ratio_secondary} A`],
    ['CT Class', input.ct.accuracy_class],
    ['CT Rct', `${input.ct.rct} ohm`],
    ['CT Lead Resistance', `${input.wiring.r20} ohm/km`],
  ];
  drawTable(['Parameter', 'Value'], inputRows, [100, 70]);

  // 2. Verdict
  drawSectionTitle('Final Verdict');
  checkPage(30);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, contentWidth, 24, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text(result.conclusion, margin + contentWidth/2, y + 8, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Required: ${result.kssc_required || result.vk_required} | Available: ${result.kssc_available || result.vk_available}`, margin + contentWidth/2, y + 16, { align: 'center' });
  y += 35;

  // 3. Formula Trace
  drawSectionTitle('Formula Trace & Calculation Steps');
  const steps = result.intermediates?.steps || [];
  
  if (steps.length === 0) {
    doc.setFont('times', 'italic');
    doc.text('No detailed trace steps found.', margin, y);
    y += 10;
  }

  for (const step of steps) {
    checkPage(35);
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(`${step.label} (${step.formulaId})`, margin, y);
    y += 5;
    
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.text(`Expression : ${clean(step.expression)}`, margin + 5, y);
    y += 5;
    doc.text(`Substituted: ${clean(step.substitution)}`, margin + 5, y);
    y += 5;
    doc.text(`Result     : ${Number(step.output.value).toFixed(4)} ${step.output.unit}`, margin + 5, y);
    y += 8;
  }

  // Draw footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, pageHeight, i, totalPages);
  }

  doc.save(`Adequacy_Engine_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
