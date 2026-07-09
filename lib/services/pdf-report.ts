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

/** Wraps and draws a body paragraph, returning the y position below it. */
function drawParagraph(doc: any, text: string, x: number, y: number, width: number, lineHeight = 5) {
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BLACK);
  const lines: string[] = doc.splitTextToSize(clean(text), width);
  lines.forEach((line: string, i: number) => doc.text(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

/**
 * Formal three-way sign-off block (Prepared / Reviewed / Approved) with
 * signature and date lines — a standard requirement for MNC-issued
 * engineering documents to establish accountability and traceability.
 */
function drawSignOffBlock(doc: any, x: number, y: number, totalWidth: number) {
  const colWidth = totalWidth / 3;
  const boxHeight = 32;
  const roles = ['PREPARED BY', 'REVIEWED BY', 'APPROVED BY'];

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  doc.rect(x, y, totalWidth, boxHeight, 'S');

  roles.forEach((role, i) => {
    const cx = x + i * colWidth;
    if (i > 0) doc.line(cx, y, cx, y + boxHeight);

    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text(role, cx + 4, y + 6);

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text('Name:', cx + 4, y + 15);
    doc.text('Designation:', cx + 4, y + 21);
    doc.text('Date:', cx + 4, y + 27);

    doc.setLineWidth(0.2);
    doc.line(cx + 18, y + 13.5, cx + colWidth - 4, y + 13.5);
    doc.line(cx + 26, y + 19.5, cx + colWidth - 4, y + 19.5);
    doc.line(cx + 14, y + 25.5, cx + colWidth - 4, y + 25.5);
  });

  return y + boxHeight;
}

/** Reference text describing each captured input, shown to keep the
 *  report self-explanatory for readers who are not CT-protection specialists. */
const PARAMETER_NOTES: Record<string, string> = {
  'CT Ratio': 'Transformation ratio between the CT primary and secondary windings.',
  'Accuracy Class': 'Protection/metering accuracy classification of the CT core (per IEC/IS standards).',
  'CT Resistance': "Internal resistance of the CT secondary winding (Rct), included in the burden calculation.",
  'Lead Resistance': 'Resistance of the wiring between the CT terminals and the connected relay/meter.',
  'Relay Burden': 'VA burden drawn by the connected protection relay or metering device.',
  'Bus Voltage': 'Nominal system voltage at the point of measurement.',
  'Fault Level': 'Maximum expected bus fault current used as the basis for the adequacy check.',
  'Route Length': 'Physical cable route length between the CT terminal box and the relay panel.',
};

const GLOSSARY: Array<[string, string]> = [
  ['CT', 'Current Transformer — steps down primary current to a measurable secondary value.'],
  ['Vk', 'Knee-point voltage: the CT secondary EMF at which core saturation begins.'],
  ['Vk Required', 'Minimum knee-point voltage the CT must provide for correct relay operation under the worst-case fault condition evaluated.'],
  ['Vk Available', 'Knee-point voltage declared or tested for the installed/selected CT.'],
  ['Ealreq', 'Required secondary EMF for a given fault condition, used to derive Vk Required.'],
  ['Adequacy Ratio', 'Vk Available expressed as a percentage of Vk Required; values at or above 100% indicate the CT meets the requirement.'],
  ['Rct', 'CT secondary winding resistance.'],
  ['VA', 'Volt-Amperes — unit of apparent power used to express relay/meter burden.'],
];

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

  // ---- executive summary ----
  y = sectionTitle(doc, 'Executive Summary', margin, y);
  const verdictPlain =
    device.verdict === 'SUITABLY DIMENSIONED'
      ? 'meets the required knee-point voltage (Vk) and is suitably dimensioned for the fault conditions evaluated'
      : device.verdict === 'NOT APPLICABLE'
      ? 'was not applicable for this adequacy check based on the inputs provided'
      : 'does not meet the required knee-point voltage (Vk) under one or more of the fault conditions evaluated, and is under-dimensioned';
  y = drawParagraph(
    doc,
    `This report presents the current transformer (CT) adequacy assessment for "${clean(
      device.device_name
    )}". The purpose of this check is to confirm whether the installed/selected CT can deliver sufficient secondary voltage (Vk) to drive connected protection relays correctly under system fault conditions, without core saturation. Based on the inputs and calculations detailed below, the CT ${verdictPlain}. All input data, formulas applied, and intermediate results are presented in full for independent verification by engineering and review teams.`,
    margin,
    y,
    boxWidth
  );
  y += 10;

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
    { header: 'Parameter', width: 34 },
    { header: 'Value', width: 22, align: 'right', bold: true },
    { header: 'Unit', width: 14, align: 'center' },
    { header: 'Description', width: 100 },
  ];
  const paramNames = [
    'CT Ratio',
    'Accuracy Class',
    'CT Resistance',
    'Lead Resistance',
    'Relay Burden',
    'Bus Voltage',
    'Fault Level',
    'Route Length',
  ];
  const paramValues = [
    `${device.inputs.ct_ratio_primary}/${device.inputs.ct_ratio_secondary}`,
    device.inputs.accuracy_class || 'N/A',
    device.inputs.rct?.toString() || 'N/A',
    device.inputs.lead_resistance?.toString() || 'N/A',
    device.inputs.relay_burden_va?.toString() || 'N/A',
    device.inputs.bus_voltage_kv?.toString() || 'N/A',
    device.inputs.max_bus_fault_kA?.toString() || 'N/A',
    device.inputs.route_length_km?.toString() || 'N/A',
  ];
  const paramUnits = ['A', '', 'ohm', 'ohm', 'VA', 'kV', 'kA', 'km'];

  // Description text can wrap to 2 lines within a 100mm column at 8pt — use a taller row.
  const paramRowH = 11;
  y = ensureSpace(y, paramRowH * (paramNames.length + 1));
  y = drawTableHeader(doc, margin, y, paramCols, paramRowH);
  paramNames.forEach((name, i) => {
    y = ensureSpace(y, paramRowH);
    const rowTop = y;
    y = drawTableRow(
      doc,
      margin,
      y,
      paramCols,
      [name, paramValues[i], paramUnits[i], ''],
      paramRowH
    );
    // Overlay the wrapped description text into the last cell (kept small for fit).
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    const descX = margin + paramCols[0].width + paramCols[1].width + paramCols[2].width + 2;
    const descLines: string[] = doc.splitTextToSize(PARAMETER_NOTES[name] || '', paramCols[3].width - 4);
    descLines.slice(0, 2).forEach((line: string, li: number) => doc.text(line, descX, rowTop + 4.5 + li * 3.6));
  });
  y += 14;

  // ---- calculation breakdown table ----
  const calcRowH = 8;
  y = ensureSpace(y, calcRowH * 2);
  y = sectionTitle(doc, 'Calculation Breakdown', margin, y);

  const calcCols: Column[] = [
    { header: 'Fault Condition', width: 90 },
    { header: 'Ealreq (V)', width: 40, align: 'right' },
    { header: 'Vk Req (V)', width: 40, align: 'right' },
  ];
  y = ensureSpace(y, calcRowH * (device.vk_breakdown.length + 1));
  y = drawTableHeader(doc, margin, y, calcCols, calcRowH);
  device.vk_breakdown.forEach((row) => {
    y = ensureSpace(y, calcRowH);
    const label = row.isMax ? `${row.label}  (MAX)` : row.label;
    y = drawTableRow(doc, margin, y, calcCols, [label, row.ealreq.toString(), row.vk.toString()], calcRowH, row.isMax);
  });
  y += 8;

  // ---- methodology note ----
  y = ensureSpace(y, 24);
  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  y = drawParagraph(
    doc,
    'Methodology: Ealreq is evaluated for each fault condition listed above using the CT ratio, secondary loop resistance (CT winding + lead + relay burden) and the corresponding fault current. Vk Required is taken as the highest Ealreq value across all evaluated conditions (marked MAX), in line with standard protection CT knee-point voltage adequacy checks. The verdict is determined by comparing this Vk Required against the declared/tested Vk Available for the CT.',
    margin,
    y,
    boxWidth,
    4.2
  );
  y += 8;

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
  y += 25;

  // ---- notes & assumptions ----
  y = ensureSpace(y, 30);
  y = sectionTitle(doc, 'Notes & Assumptions', margin, y);
  const assumptions = [
    'All resistance values are taken at the reference temperature stated in the source input data unless otherwise noted.',
    'Lead resistance accounts for the full CT-to-relay wiring loop for the route length specified.',
    'Vk Available reflects the manufacturer-declared or test-certificate value supplied for this device; where unavailable, the verdict is reported as NOT APPLICABLE.',
    'This assessment covers CT knee-point voltage adequacy only and does not constitute a complete protection coordination study.',
  ];
  assumptions.forEach((a) => {
    y = ensureSpace(y, 10);
    y = drawParagraph(doc, `\u2022  ${a}`, margin, y, boxWidth, 4.2) + 2;
  });
  y += 4;

  // ---- glossary ----
  y = ensureSpace(y, 20);
  y = sectionTitle(doc, 'Glossary of Terms', margin, y);
  GLOSSARY.forEach(([term, def]) => {
    y = ensureSpace(y, 8);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${term}:`, margin, y);
    const termWidth = doc.getTextWidth(`${term}: `);
    doc.setFont('times', 'normal');
    const lines: string[] = doc.splitTextToSize(def, boxWidth - termWidth - 2);
    doc.text(lines[0], margin + termWidth, y);
    y += 4.4;
    for (let li = 1; li < lines.length; li++) {
      y = ensureSpace(y, 5);
      doc.text(lines[li], margin, y);
      y += 4.4;
    }
  });
  y += 8;

  // ---- sign-off ----
  y = ensureSpace(y, 40);
  y = sectionTitle(doc, 'Review & Approval', margin, y);
  y = drawSignOffBlock(doc, margin, y, boxWidth);

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

  const contentWidth = pageWidth - margin * 2;

  // ---- executive summary ----
  y = sectionTitle(doc, 'Executive Summary', margin, y);
  const suitableCount0 = devices.filter((d) => d.verdict === 'SUITABLY DIMENSIONED').length;
  const underDimCount0 = devices.length - suitableCount0;
  y = drawParagraph(
    doc,
    `This consolidated report summarizes the current transformer (CT) knee-point voltage (Vk) adequacy assessment across ${devices.length} device(s). Of these, ${suitableCount0} device(s) are suitably dimensioned and ${underDimCount0} device(s) are under-dimensioned and require attention. Full input data, calculation results and pass/fail status for each device are tabulated below for transparency and cross-verification between engineering, review and site teams.`,
    margin,
    y,
    contentWidth
  );
  y += 10;

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

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, contentWidth, summaryHeight, 'S');

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
  y += summaryHeight + 15;

  // ---- recommendations / action items ----
  const underDimDevices = devices.filter((d) => d.verdict !== 'SUITABLY DIMENSIONED');
  if (y + 20 > pageHeight - 25) y = newPage();
  y = sectionTitle(doc, 'Recommendations', margin, y);
  if (underDimDevices.length === 0) {
    y = drawParagraph(
      doc,
      'All evaluated devices meet the required knee-point voltage (Vk). No corrective action is required at this time.',
      margin,
      y,
      contentWidth
    );
  } else {
    y = drawParagraph(
      doc,
      `The following ${underDimDevices.length} device(s) do not meet the required Vk and should be reviewed for CT replacement, burden reduction, or re-routing to shorten lead length:`,
      margin,
      y,
      contentWidth
    );
    y += 3;
    underDimDevices.forEach((d) => {
      if (y + 6 > pageHeight - 25) y = newPage();
      y = drawParagraph(doc, `\u2022  ${clean(d.device_name)} \u2014 Vk Required ${d.vk_required} V, Vk Available ${d.vk_available > 0 ? d.vk_available + ' V' : 'N/A'}`, margin, y, contentWidth, 4.2) + 1.5;
    });
  }
  y += 8;

  // ---- sign-off ----
  if (y + 40 > pageHeight - 25) y = newPage();
  y = sectionTitle(doc, 'Review & Approval', margin, y);
  y = drawSignOffBlock(doc, margin, y, contentWidth);

  drawFooter(doc, pageWidth, pageHeight, pageNum);

  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`CT_Adequacy_Consolidated_Report_${timestamp}.pdf`);
}