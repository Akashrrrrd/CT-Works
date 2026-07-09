import { DeviceResult } from './ct-adequacy';
import { StandardParameters } from './excel-processor';

/**
 * PROFESSIONAL BLACK & WHITE PDF REPORT GENERATOR
 * Classic corporate design: black text/lines on white background only.
 * Light grayscale fills (no hue) are used sparingly for table headers,
 * which reads as "monochrome/professional" rather than "colored".
 */

// ---------- shared constants ----------

const BLACK: [number, number, number] = [0, 0, 0];
const HEADER_FILL: [number, number, number] = [235, 235, 235]; // grayscale only
const RULE_WIDTH = 0.4;
const MARGIN = 20;

// Strip anything outside basic Latin-1 so jsPDF's core fonts don't choke
const clean = (text: unknown): string =>
  String(text ?? '').replace(/[^\x00-\xFF]/g, '');

const today = () =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const reportRef = (prefix: string) =>
  `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

// ---------- generic drawing helpers ----------

/** Classic letterhead-style header used on the first page of every report. */
function drawLetterhead(doc: any, pageWidth: number, title: string, subtitle: string, ref: string) {
  const margin = MARGIN;

  doc.setTextColor(...BLACK);
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('CT ANALYSIS SYSTEM', margin, 16);

  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text('Engineering Report', pageWidth - margin, 16, { align: 'right' });

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.8);
  doc.line(margin, 20, pageWidth - margin, 20);

  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.text(title, margin, 32);

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text(subtitle, margin, 40);

  doc.setFontSize(9);
  doc.text(`Report Ref: ${ref}`, margin, 47);
  doc.text(`Date Issued: ${today()}`, pageWidth - margin, 47, { align: 'right' });

  doc.setLineWidth(RULE_WIDTH);
  doc.line(margin, 51, pageWidth - margin, 51);

  return 60; // next available y
}

/** Footer with a rule, system name, page number and timestamp. Call once per page. */
function drawFooter(doc: any, pageWidth: number, pageHeight: number, pageNum: number) {
  const margin = MARGIN;
  const y = pageHeight - 15;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text('CT Analysis System \u2014 Confidential Engineering Report', margin, y + 5);
  doc.text(`Page ${pageNum}`, pageWidth / 2, y + 5, { align: 'center' });
  doc.text(new Date().toLocaleString(), pageWidth - margin, y + 5, { align: 'right' });
}

interface Column {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  bold?: boolean; // bold this column's data cells
}

/**
 * Draws a simple ruled table (header row + data rows) starting at (x, y).
 * Returns the y position immediately below the table.
 * Caller is responsible for page-break checks between rows if needed;
 * use drawTablePaged for automatic pagination.
 */
function drawTableHeader(doc: any, x: number, y: number, columns: Column[], rowHeight: number) {
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);

  doc.setFillColor(...HEADER_FILL);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  doc.rect(x, y, totalWidth, rowHeight, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);

  let cx = x;
  columns.forEach((col) => {
    if (cx > x) doc.line(cx, y, cx, y + rowHeight);
    const tx = col.align === 'right' ? cx + col.width - 2
      : col.align === 'center' ? cx + col.width / 2
      : cx + 2;
    doc.text(col.header, tx, y + rowHeight * 0.68, { align: col.align ?? 'left' });
    cx += col.width;
  });

  return y + rowHeight;
}

function drawTableRow(
  doc: any,
  x: number,
  y: number,
  columns: Column[],
  values: string[],
  rowHeight: number,
  emphasize = false
) {
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  doc.rect(x, y, totalWidth, rowHeight, 'S');

  doc.setFontSize(9);
  let cx = x;
  columns.forEach((col, i) => {
    if (cx > x) doc.line(cx, y, cx, y + rowHeight);
    doc.setFont('times', emphasize || col.bold ? 'bold' : 'normal');
    const tx = col.align === 'right' ? cx + col.width - 2
      : col.align === 'center' ? cx + col.width / 2
      : cx + 2;
    doc.text(clean(values[i]), tx, y + rowHeight * 0.68, { align: col.align ?? 'left' });
    cx += col.width;
  });

  return y + rowHeight;
}

function sectionTitle(doc: any, text: string, x: number, y: number) {
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text(text.toUpperCase(), x, y);
  doc.setLineWidth(RULE_WIDTH);
  doc.line(x, y + 2, x + doc.getTextWidth(text.toUpperCase()), y + 2);
  return y + 10;
}

// ==================================================================
// SINGLE DEVICE REPORT
// ==================================================================

export async function generateDevicePDFReport(
  device: DeviceResult,
  systemParams: StandardParameters
): Promise<void> {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const doc = new jsPDF('portrait', 'mm', 'a4');

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = MARGIN;
  const boxWidth = pageWidth - margin * 2;
  let pageNum = 1;

  doc.setProperties({
    title: `CT Adequacy Report - ${device.device_name}`,
    creator: 'CT Analysis System',
  });

  const newPage = () => {
    drawFooter(doc, pageWidth, pageHeight, pageNum);
    doc.addPage();
    pageNum += 1;
    return 25;
  };

  const ensureSpace = (y: number, needed: number) =>
    y + needed > pageHeight - 25 ? newPage() : y;

  let y = drawLetterhead(
    doc,
    pageWidth,
    'CT ADEQUACY ANALYSIS REPORT',
    `Device: ${clean(device.device_name)}`,
    reportRef('CTA')
  );

  // ---- verdict block ----
  const verdictHeight = device.verdict !== 'NOT APPLICABLE' ? 28 : 16;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, boxWidth, verdictHeight, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.text(device.verdict, margin + boxWidth / 2, y + 10, { align: 'center' });

  if (device.verdict !== 'NOT APPLICABLE') {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(
      `Vk Required: ${device.vk_required} V   |   Vk Available: ${device.vk_available > 0 ? device.vk_available + ' V' : 'N/A'}`,
      margin + boxWidth / 2,
      y + 18,
      { align: 'center' }
    );
    if (device.vk_available > 0) {
      const ratio = ((device.vk_available / device.vk_required) * 100).toFixed(0);
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(`Adequacy Ratio: ${ratio}%`, margin + boxWidth / 2, y + 24, { align: 'center' });
    }
  }
  y += verdictHeight + 15;

  // ---- input parameters table ----
  y = sectionTitle(doc, 'Input Parameters', margin, y);

  const paramCols: Column[] = [
    { header: 'Parameter', width: 70 },
    { header: 'Value', width: 40, align: 'right', bold: true },
    { header: 'Unit', width: 20, align: 'center' },
  ];
  const paramRows: string[][] = [
    ['CT Ratio', `${device.inputs.ct_ratio_primary}/${device.inputs.ct_ratio_secondary}`, 'A'],
    ['Accuracy Class', device.inputs.accuracy_class || 'N/A', ''],
    ['CT Resistance', device.inputs.rct?.toString() || 'N/A', 'ohm'],
    ['Lead Resistance', device.inputs.lead_resistance?.toString() || 'N/A', 'ohm'],
    ['Relay Burden', device.inputs.relay_burden_va?.toString() || 'N/A', 'VA'],
    ['Bus Voltage', device.inputs.bus_voltage_kv?.toString() || 'N/A', 'kV'],
    ['Fault Level', device.inputs.max_bus_fault_kA?.toString() || 'N/A', 'kA'],
    ['Route Length', device.inputs.route_length_km?.toString() || 'N/A', 'km'],
  ];

  const rowH = 8;
  y = ensureSpace(y, rowH * (paramRows.length + 1));
  y = drawTableHeader(doc, margin, y, paramCols, rowH);
  paramRows.forEach((row) => {
    y = ensureSpace(y, rowH);
    y = drawTableRow(doc, margin, y, paramCols, row, rowH);
  });
  y += 14;

  // ---- calculation breakdown table ----
  y = ensureSpace(y, rowH * 2);
  y = sectionTitle(doc, 'Calculation Breakdown', margin, y);

  const calcCols: Column[] = [
    { header: 'Fault Condition', width: 90 },
    { header: 'Ealreq (V)', width: 40, align: 'right' },
    { header: 'Vk Req (V)', width: 40, align: 'right' },
  ];
  y = ensureSpace(y, rowH * (device.vk_breakdown.length + 1));
  y = drawTableHeader(doc, margin, y, calcCols, rowH);
  device.vk_breakdown.forEach((row) => {
    y = ensureSpace(y, rowH);
    const label = row.isMax ? `${row.label}  (MAX)` : row.label;
    y = drawTableRow(doc, margin, y, calcCols, [label, row.ealreq.toString(), row.vk.toString()], rowH, row.isMax);
  });
  y += 12;

  // ---- final result ----
  y = ensureSpace(y, 16);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, boxWidth, 15, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text(
    `FINAL RESULT:  Ealreq Max = ${device.ealreq_max} V     Vk Required = ${device.vk_required} V`,
    margin + boxWidth / 2,
    y + 9.5,
    { align: 'center' }
  );

  drawFooter(doc, pageWidth, pageHeight, pageNum);

  const deviceName = clean(device.device_name).replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`CT_Adequacy_Report_${deviceName}_${timestamp}.pdf`);
}

// ==================================================================
// CONSOLIDATED MULTI-DEVICE REPORT
// ==================================================================

export async function generateConsolidatedPDFReport(
  devices: DeviceResult[],
  systemParams: StandardParameters
): Promise<void> {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const doc = new jsPDF('landscape', 'mm', 'a4');

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = MARGIN;
  let pageNum = 1;

  doc.setProperties({
    title: 'CT Adequacy Analysis - Consolidated Report',
    creator: 'CT Analysis System',
  });

  const newPage = () => {
    drawFooter(doc, pageWidth, pageHeight, pageNum);
    doc.addPage();
    pageNum += 1;
    return 25;
  };

  let y = drawLetterhead(
    doc,
    pageWidth,
    'CT ADEQUACY ANALYSIS \u2014 CONSOLIDATED REPORT',
    `${devices.length} device(s) analyzed`,
    reportRef('CTA-CONS')
  );

  y = sectionTitle(doc, 'Devices Overview', margin, y);

  const cols: Column[] = [
    { header: '#', width: 12, align: 'center' },
    { header: 'Device Name', width: 85 },
    { header: 'CT Ratio', width: 35, align: 'center' },
    { header: 'Verdict', width: 40, align: 'center', bold: true },
    { header: 'Vk Req', width: 25, align: 'right' },
    { header: 'Vk Avail', width: 25, align: 'right' },
    { header: 'Ratio %', width: 22, align: 'right' },
  ];
  const rowH = 9;

  y = drawTableHeader(doc, margin, y, cols, rowH);

  devices.forEach((device, index) => {
    if (y + rowH > pageHeight - 40) {
      y = newPage();
      y = drawTableHeader(doc, margin, y, cols, rowH);
    }

    const ratio =
      device.vk_available > 0 ? `${((device.vk_available / device.vk_required) * 100).toFixed(0)}%` : 'N/A';
    const name = device.device_name.length > 34 ? device.device_name.slice(0, 31) + '...' : device.device_name;

    y = drawTableRow(
      doc,
      margin,
      y,
      cols,
      [
        (index + 1).toString(),
        clean(name),
        `${device.inputs.ct_ratio_primary}/${device.inputs.ct_ratio_secondary}`,
        device.verdict === 'SUITABLY DIMENSIONED' ? 'SUITABLE' : 'UNDER DIM.',
        `${device.vk_required} V`,
        device.vk_available > 0 ? `${device.vk_available} V` : 'N/A',
        ratio,
      ],
      rowH
    );
  });

  y += 15;

  // ---- summary box ----
  const suitable = devices.filter((d) => d.verdict === 'SUITABLY DIMENSIONED').length;
  const underDim = devices.length - suitable;
  const summaryHeight = 22;

  if (y + summaryHeight > pageHeight - 25) y = newPage();

  const summaryWidth = 210;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, summaryWidth, summaryHeight, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('ANALYSIS SUMMARY', margin + 5, y + 9);

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Total Devices: ${devices.length}     Suitable: ${suitable}     Under Dimensioned: ${underDim}`,
    margin + 5,
    y + 17
  );

  drawFooter(doc, pageWidth, pageHeight, pageNum);

  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`CT_Adequacy_Consolidated_Report_${timestamp}.pdf`);
}