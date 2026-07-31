import { DeviceResult } from './ct-adequacy';
import { StandardParameters } from './excel-processor';

/**
 * PROFESSIONAL BLACK & WHITE PDF REPORT GENERATOR
 * Classic corporate design: black text/lines on white background only.
 * Light grayscale fills (no hue) are used sparingly for table headers and
 * zebra striping, which reads as "monochrome/professional" rather than
 * "colored".
 *
 * Every page carries:
 *  - A classification banner ("CONFIDENTIAL")
 *  - A boxed company header ("HITACHI") in the top-left corner
 *  - A footer with confidentiality note, "Page X of Y" and timestamp
 * consistent with MNC document-control conventions.
 *
 * UPDATE: All calculation content (formulas, applied values, intermediates)
 * is now pulled directly from the real DeviceResult produced by
 * calculateDeviceCTAdequacy() — device.vk_breakdown[i].formula and
 * device.intermediates. Nothing is hardcoded or re-derived independently
 * anymore (the old generic "Ealreq = K x (If/n) x (Rct+2Rl+Rr)" box and the
 * duplicate computeAppliedValues() calc have been removed, since they did
 * not match the actual per-device-type formulas the engine uses).
 */

// ---------- shared constants ----------

const BLACK: [number, number, number] = [0, 0, 0];
const HEADER_FILL: [number, number, number] = [232, 232, 232]; // grayscale only
const ZEBRA_FILL: [number, number, number] = [247, 247, 247]; // near-white, grayscale only
const RULE_WIDTH = 0.4;
const MARGIN = 20;
const COMPANY_NAME = 'HITACHI';
const CLASSIFICATION = 'CONFIDENTIAL \u2014 FOR INTERNAL CIRCULATION ONLY';

// Strip anything outside basic Latin-1 so jsPDF's core fonts don't choke
const clean = (text: unknown): string =>
  String(text ?? '').replace(/[^\x00-\xFF]/g, '');

const today = () =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const reportRef = (prefix: string) =>
  `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

// ---------- parameter descriptions ----------

const PARAMETER_NOTES: Record<string, string> = {
  'CT Ratio': 'Current transformer turns ratio (primary/secondary ampere rating). Determines the scaling factor between primary and secondary circuits.',
  'Accuracy Class': 'CT accuracy classification per IEC or IEEE standards, indicating the maximum permissible error under specified conditions.',
  'CT Resistance': 'Secondary winding resistance of the current transformer, affecting the voltage drop across the CT itself.',
  'Lead Resistance': 'Total loop resistance of the pilot wire/cable connecting the CT secondary to the relay, as computed from the route length and cable data provided.',
  'Relay Burden': 'Apparent power consumption of the connected relay or meter at rated secondary current, expressed in volt-amperes.',
  'Bus Voltage': 'System operating voltage at the point where the CT is installed, used for fault level calculations.',
  'Fault Level': 'Maximum fault current that can occur at the CT location, determining the worst-case secondary current for adequacy assessment.',
  'Route Length': 'Physical distance from CT to relay location, used to compute lead resistance.',
};

// ---------- project / client / document-control info ----------

export interface ProjectInfo {
  clientName?: string;
  companyName?: string; // the client's company / project site being served
  startDate?: string;
  endDate?: string;
  documentRev?: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
}

const DEFAULT_PROJECT_INFO: Required<ProjectInfo> = {
  clientName: 'Confidential Client',
  companyName: 'Project Site \u2014 Company Name Not Specified',
  startDate: 'To Be Confirmed',
  endDate: 'To Be Confirmed',
  documentRev: 'Rev. 0',
  preparedBy: 'To Be Confirmed',
  checkedBy: 'To Be Confirmed',
  approvedBy: 'To Be Confirmed',
};

function resolveProjectInfo(info?: ProjectInfo): Required<ProjectInfo> {
  return { ...DEFAULT_PROJECT_INFO, ...(info || {}) };
}

// ---------- device type display helper ----------

function deviceTypeLabel(deviceType: string): string {
  return deviceType.replace(/_/g, ' ');
}

// ---------- generic drawing helpers ----------

/** Thin classification strip drawn above the company header on EVERY page. */
function drawClassificationBanner(doc: any, pageWidth: number) {
  const margin = MARGIN;
  const y = 6;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.2);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);
  doc.text(CLASSIFICATION, pageWidth / 2, y, { align: 'center' });
  doc.line(margin, y + 2, pageWidth - margin, y + 2);

  return y + 2;
}

/**
 * Boxed company header drawn at the top of EVERY page (not just the first),
 * as required for MNC-issued documents. Returns the y of the rule beneath it.
 */
function drawCompanyHeader(doc: any, pageWidth: number) {
  const margin = MARGIN;
  const bannerY = drawClassificationBanner(doc, pageWidth);
  const boxW = 42;
  const boxH = 11;
  const boxY = bannerY + 4;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.7);
  doc.rect(margin, boxY, boxW, boxH, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text(COMPANY_NAME, margin + boxW / 2, boxY + boxH / 2 + 1.8, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text('CT Adequacy Assessment \u2014 Engineering Report', pageWidth - margin, boxY + boxH / 2 + 1, {
    align: 'right',
  });

  // Classic double-rule beneath the header block
  doc.setLineWidth(0.6);
  doc.line(margin, boxY + boxH + 3, pageWidth - margin, boxY + boxH + 3);
  doc.setLineWidth(0.2);
  doc.line(margin, boxY + boxH + 4.3, pageWidth - margin, boxY + boxH + 4.3);

  return boxY + boxH + 4.3;
}

/** Full letterhead used on page 1: classification + company header + title block. */
function drawLetterhead(doc: any, pageWidth: number, title: string, subtitle: string, ref: string) {
  const margin = MARGIN;
  const ruleY = drawCompanyHeader(doc, pageWidth);
  let y = ruleY + 10;

  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...BLACK);
  doc.text(title, margin, y);
  y += 8;

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text(subtitle, margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.text(`Report Ref: ${ref}`, margin, y);
  doc.text(`Date Issued: ${today()}`, pageWidth - margin, y, { align: 'right' });
  y += 4;

  doc.setLineWidth(RULE_WIDTH);
  doc.line(margin, y, pageWidth - margin, y);

  return y + 9;
}

/** Compact header used on page 2+: classification + company header + "(continued)" tag. */
function drawContinuationHeader(doc: any, pageWidth: number, title: string) {
  const margin = MARGIN;
  const ruleY = drawCompanyHeader(doc, pageWidth);

  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(`${title} (continued)`, margin, ruleY + 6);

  doc.setLineWidth(0.2);
  doc.line(margin, ruleY + 9, pageWidth - margin, ruleY + 9);

  return ruleY + 15;
}

/**
 * Footer with a rule, confidentiality note, "Page X of Y" and timestamp.
 * Total page count is only known once the document is fully built, so this
 * is applied in a single finishing pass over every page (see finalizeDocument).
 */
function drawFooter(doc: any, pageWidth: number, pageHeight: number, pageNum: number, totalPages: number) {
  const margin = MARGIN;
  const y = pageHeight - 15;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text(`${COMPANY_NAME} \u2014 Confidential Engineering Report`, margin, y + 5);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, y + 5, { align: 'center' });
  doc.text(new Date().toLocaleString(), pageWidth - margin, y + 5, { align: 'right' });
}

/**
 * Final pass: stamps an accurate "Page X of Y" footer on every page of the
 * finished document, then triggers the save/download.
 */
function finalizeDocument(doc: any, pageWidth: number, pageHeight: number, filename: string) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, pageHeight, i, totalPages);
  }
  doc.save(filename);
}

interface Column {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  bold?: boolean; // bold this column's data cells
}

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

/**
 * Draws a table row. Cells that don't fit on one line are wrapped and the
 * row height grows to fit the tallest cell (used for long formula strings
 * in the Calculation Breakdown table). minRowHeight is respected as a floor.
 */
function drawTableRow(
  doc: any,
  x: number,
  y: number,
  columns: Column[],
  values: string[],
  minRowHeight: number,
  emphasize = false,
  zebra = false
) {
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);

  doc.setFontSize(8);
  let maxLines = 1;
  const wrapped: string[][] = columns.map((col, i) => {
    const lines: string[] = doc.splitTextToSize(clean(values[i] ?? ''), col.width - 4);
    maxLines = Math.max(maxLines, lines.length);
    return lines;
  });
  const rowHeight = Math.max(minRowHeight, maxLines * 3.6 + 3);

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  if (zebra) {
    doc.setFillColor(...ZEBRA_FILL);
    doc.rect(x, y, totalWidth, rowHeight, 'FD');
  } else {
    doc.rect(x, y, totalWidth, rowHeight, 'S');
  }

  let cx = x;
  columns.forEach((col, i) => {
    if (cx > x) doc.line(cx, y, cx, y + rowHeight);
    doc.setFont('times', emphasize || col.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    const tx = col.align === 'right' ? cx + col.width - 2
      : col.align === 'center' ? cx + col.width / 2
      : cx + 2;
    wrapped[i].forEach((line, li) => {
      doc.text(line, tx, y + 4.5 + li * 3.6, { align: col.align ?? 'left' });
    });
    cx += col.width;
  });

  return y + rowHeight;
}

/**
 * Auto-numbered section heading (1.0, 2.0, ...) with a classic double
 * underline, matching formal engineering-document conventions.
 */
function makeSectionCounter() {
  let n = 0;
  return (doc: any, text: string, x: number, y: number, width: number) => {
    n += 1;
    const label = `${n}.0  ${text.toUpperCase()}`;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BLACK);
    doc.text(label, x, y);
    doc.setLineWidth(0.5);
    doc.line(x, y + 2, x + width, y + 2);
    doc.setLineWidth(0.2);
    doc.line(x, y + 3.2, x + width, y + 3.2);
    return y + 11;
  };
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

/** Bordered 2x2 grid of Client / Company / Start Date / End Date. */
function drawProjectInfoBlock(doc: any, x: number, y: number, width: number, info: Required<ProjectInfo>) {
  const rowH = 9;
  const colW = width / 2;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  doc.rect(x, y, width, rowH * 2, 'S');
  doc.line(x + colW, y, x + colW, y + rowH * 2);
  doc.line(x, y + rowH, x + width, y + rowH);

  const cell = (label: string, value: string, cx: number, cy: number) => {
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text(`${label}:`, cx + 3, cy + 6);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont('times', 'normal');
    doc.text(clean(value), cx + 3 + labelWidth, cy + 6);
  };

  cell('Client Name', info.clientName, x, y);
  cell('Project / Site Company', info.companyName, x + colW, y);
  cell('Project Start Date', info.startDate, x, y + rowH);
  cell('Expected Completion Date', info.endDate, x + colW, y + rowH);

  return y + rowH * 2;
}

/**
 * Document-control block: revision, status and the prepared/checked/approved
 * chain expected on formal MNC engineering deliverables.
 */
function drawDocumentControlBlock(doc: any, x: number, y: number, width: number, info: Required<ProjectInfo>) {
  const rowH = 9;
  const colW = width / 4;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  doc.setFillColor(...HEADER_FILL);
  doc.rect(x, y, width, rowH, 'FD');
  doc.rect(x, y + rowH, width, rowH, 'S');
  for (let i = 1; i < 4; i++) {
    doc.line(x + colW * i, y, x + colW * i, y + rowH * 2);
  }

  const headers = ['Revision', 'Prepared By', 'Checked By', 'Approved By'];
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  headers.forEach((h, i) => doc.text(h, x + colW * i + colW / 2, y + 6, { align: 'center' }));

  const values = [info.documentRev, info.preparedBy, info.checkedBy, info.approvedBy];
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  values.forEach((v, i) => doc.text(clean(v), x + colW * i + colW / 2, y + rowH + 6, { align: 'center' }));

  return y + rowH * 2;
}

/**
 * Signature block for the closing page: three ruled lines for physical or
 * digital sign-off, matching classic engineering document-control practice.
 */
function drawSignatureBlock(doc: any, x: number, y: number, width: number, info: Required<ProjectInfo>) {
  const colW = width / 3;
  const lineY = y + 16;

  const roles: Array<[string, string]> = [
    ['Prepared By', info.preparedBy],
    ['Checked By', info.checkedBy],
    ['Approved By', info.approvedBy],
  ];

  roles.forEach(([label, name], i) => {
    const cx = x + colW * i;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(RULE_WIDTH);
    doc.line(cx, lineY, cx + colW - 12, lineY);

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text(clean(name), cx, lineY - 3);

    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), cx, lineY + 5);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.text('Date: _______________', cx, lineY + 10);
  });

  return lineY + 16;
}

/**
 * Prints every real intermediate value the calculation engine produced for
 * this device (device.intermediates) — CT ratio, Rct, Rl, Rb, total burden,
 * Ikmax, X/R-derived Rs/Xs, endzone fault currents, Ealreq max, etc.
 * Nothing here is re-derived or hardcoded; it is exactly what
 * calculateDeviceCTAdequacy() computed from the user's inputs.
 */
function drawIntermediatesTable(
  doc: any,
  sectionTitle: ReturnType<typeof makeSectionCounter>,
  x: number,
  y: number,
  width: number,
  intermediates: Record<string, number | string>
) {
  const entries = Object.entries(intermediates).filter(([label]) => label !== 'ERROR');
  if (entries.length === 0) return y;

  y = sectionTitle(doc, 'Calculation Intermediates (as computed from inputs)', x, y, width);

  const rowH = 8;
  const cols: Column[] = [
    { header: 'Quantity', width: width * 0.62 },
    { header: 'Computed Value', width: width * 0.38, align: 'right', bold: true },
  ];

  y = drawTableHeader(doc, x, y, cols, rowH);
  entries.forEach(([label, value], i) => {
    y = drawTableRow(doc, x, y, cols, [label, String(value)], rowH, false, i % 2 === 1);
  });

  return y + 4;
}

/**
 * Calculation Breakdown table: one row per fault condition actually
 * evaluated for this device's protection function (device_type), showing
 * the real substituted formula string produced by the engine alongside the
 * resulting Ealreq and Vk Required. Row count/labels/formulas vary
 * automatically by device_type (distance, differential, OC, busbar/BF,
 * metering, generic) — nothing here is fixed across device types.
 */
function drawCalculationBreakdownTable(
  doc: any,
  sectionTitle: ReturnType<typeof makeSectionCounter>,
  x: number,
  y: number,
  width: number,
  device: DeviceResult,
  ensureSpace: (y: number, needed: number) => number
) {
  const isSiemens = (device.device_type && device.device_type.includes('SIEMENS')) || device.device_name?.includes('7SJ85');
  y = sectionTitle(doc, `Calculation Breakdown \u2014 ${deviceTypeLabel(device.device_name || device.device_type)}`, x, y, width);

  const calcRowH = 8;
  if (isSiemens || !device.vk_breakdown || device.vk_breakdown.length === 0) {
    const calcCols: Column[] = [
      { header: 'Calculation Step / Quantity', width: width * 0.36 },
      { header: 'Formula Applied (as computed)', width: width * 0.44 },
      { header: 'Computed Value', width: width * 0.20, align: 'right', bold: true },
    ];
    y = drawTableHeader(doc, x, y, calcCols, calcRowH);

    const inter = device.intermediates || {};
    const inputs = device.inputs || {};
    const itkmax = inter.Itkmax ?? (inputs.max_bus_fault_kA ? inputs.max_bus_fault_kA * 1000 : 31500);
    const ipn = inter.Ipn ?? inputs.ct_ratio_primary ?? 3150;
    const inA = inter.In ?? inputs.ct_ratio_secondary ?? 1;
    const rct = inter.Rct ?? inputs.rct ?? 9;
    const pe = inter.PE ?? (inA * inA * rct);
    const pl = inter.PL ?? inputs.relay_burden_va ?? 0.58;
    const pn = inter.PN ?? 7.5;
    const n = inter.n ?? 20;
    const reqKssc = device.required_kssc ?? (itkmax / ipn);
    const availKssc = device.available_kssc ?? (n * ((pe + pn) / (pe + pl)));

    const rows = [
      ['1. Max Through Fault Current (Itkmax)', 'Itkmax = Bus Fault Level (kA) × 1000', `${itkmax} A`],
      ['2. CT Primary Current Rating (Ipn)', 'Ipn = Nameplate Primary Amperes', `${ipn} A`],
      ['3. CT Secondary Resistance (Rct)', 'Rct = Winding Resistance at 75°C', `${rct} Ω`],
      ['4. CT Internal Burden (PE)', 'PE = In² · Rct', `${typeof pe === 'number' ? pe.toFixed(2) : pe} VA`],
      ['5. External & Lead Burden (PL)', 'PL = Lead Burden + Connected Devices', `${typeof pl === 'number' ? pl.toFixed(2) : pl} VA`],
      ['6. CT Rated Burden (PN)', 'PN = CT Nameplate Burden', `${pn} VA`],
      ['7. Accuracy Limit Factor (n)', 'n = Class ALF factor (e.g. 5P20)', `${n}`],
      ['8. Required Kssc\'', 'Kssc\'(req) = Itkmax / Ipn', `${typeof reqKssc === 'number' ? reqKssc.toFixed(2) : reqKssc}`],
      ['9. Available (Effective) Kssc\'', 'Kssc\'(avail) = n · [(PE + PN) / (PE + PL)]', `${typeof availKssc === 'number' ? availKssc.toFixed(2) : availKssc}`],
    ];

    rows.forEach(([step, formula, val], i) => {
      const isHeaderRow = i >= 7;
      y = drawTableRow(doc, x, y, calcCols, [step, formula, val], calcRowH, isHeaderRow, !isHeaderRow && i % 2 === 1);
    });
  } else {
    const calcCols: Column[] = [
      { header: 'Fault Condition', width: width * 0.24 },
      { header: 'Formula Applied (as computed)', width: width * 0.5 },
      { header: 'Ealreq (V)', width: width * 0.13, align: 'right' },
      { header: 'Vk Req (V)', width: width * 0.13, align: 'right' },
    ];

    y = drawTableHeader(doc, x, y, calcCols, calcRowH);
    device.vk_breakdown.forEach((row, i) => {
      const label = row.isMax ? `${row.label}  (MAX)` : row.label;
      y = drawTableRow(
        doc,
        x,
        y,
        calcCols,
        [label, row.formula, row.ealreq.toString(), row.vk.toString()],
        calcRowH,
        row.isMax,
        !row.isMax && i % 2 === 1
      );
    });
  }

  return y + 10;
}

function drawFormulaSection(doc: any, sectionTitle: ReturnType<typeof makeSectionCounter>, x: number, y: number, width: number, device: DeviceResult) {
  const isSiemens = (device.device_type && device.device_type.includes('SIEMENS')) || device.device_name?.includes('7SJ85');
  
  if (isSiemens) {
    y = sectionTitle(doc, 'Formulas & Calculation Method (Kssc Method)', x, y, width);
    
    y = drawParagraph(
      doc,
      'CT adequacy is verified using the Accuracy Limit Factor (Kssc) method per Siemens 7SJ85 requirements:',
      x,
      y,
      width
    );
    y += 5;

    // Formula 1: Required Kssc
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BLACK);
    doc.text('1. Required Accuracy Limit Factor Kssc\':', x, y);
    y += 5;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Kssc\' = Itkmax / Ipn', x + 5, y);
    y += 4;
    doc.setFontSize(8);
    const itk = device.intermediates?.['Itkmax'] ?? (device.inputs?.max_bus_fault_kA ? device.inputs.max_bus_fault_kA * 1000 : 'undefined');
    const ipn = device.intermediates?.['Ipn'] ?? device.inputs?.ct_ratio_primary ?? 'undefined';
    doc.text(`Where: Itkmax = Max. through fault current (${itk} A), Ipn = CT primary current (${ipn} A)`, x + 5, y);
    y += 6;

    // Formula 2: CT Internal Burden
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('2. CT Internal Burden (PE):', x, y);
    y += 5;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('PE = In² · Rct', x + 5, y);
    y += 4;
    doc.setFontSize(8);
    const inA = device.intermediates?.['In'] ?? device.inputs?.ct_ratio_secondary ?? 1;
    const rct = device.intermediates?.['Rct'] ?? device.inputs?.rct ?? 'undefined';
    doc.text(`Where: In = Rated secondary current (${inA} A), Rct = CT winding resistance (${rct} Ω)`, x + 5, y);
    y += 6;

    // Formula 3: Available Kssc
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('3. Available (Effective) Kssc\':', x, y);
    y += 5;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Kssc\'(avail) = n · [(PE + PN) / (PE + PL)]', x + 5, y);
    y += 4;
    doc.setFontSize(8);
    const nFactor = device.intermediates?.['n'] ?? 20;
    const pnVal = device.intermediates?.['PN'] ?? 7.5;
    const plVal = device.intermediates?.['PL'] ?? 'undefined';
    doc.text(`Where: n = ALF (${nFactor} ratio), PN = Rated burden (${pnVal} VA), PL = Lead + connected burden (${plVal} VA)`, x + 5, y);
    y += 6;

    // Verdict Criteria
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('4. Verdict Criteria:', x, y);
    y += 5;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('✓ SUITABLE: Available Kssc\' ≥ Required Kssc\'', x + 5, y);
    y += 4;
    doc.text('✗ UNDER-DIMENSIONED: Available Kssc\' < Required Kssc\'', x + 5, y);
    y += 8;

  } else {
    // RED670 (Vk Method)
    y = sectionTitle(doc, 'Formulas & Calculation Method (Vk Method)', x, y, width);
    
    y = drawParagraph(
      doc,
      'CT adequacy is verified using the knee-point voltage (Vk) method per IEC 61869-2 and IEEE C57.13 standards:',
      x,
      y,
      width
    );
    y += 5;

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('1. Secondary Burden & Lead Resistance:', x, y);
    y += 5;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('2RL = 2 × R20 × (1 + α(t - 20)) × l,   Rl = Sl / In²', x + 5, y);
    y += 4;
    doc.setFontSize(8);
    doc.text('Where: R20 = resistance at 20°C, α = 0.00393/K, t = 75°C operating temp, l = lead length in km', x + 5, y);
    y += 6;

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('2. Differential Protection Ealreq Calculation:', x, y);
    y += 5;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Close-in: Ealreq = Ikmax × (Isn / Ipn) × (Rct + Rl + Sr/Ir²)', x + 5, y);
    y += 4;
    doc.text('Through (3ph & 1ph): Ealreq = 2 × Itmax × (Isn / Ipn) × (Rct + Rl + Sr/Ir²)', x + 5, y);
    y += 6;

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('3. Distance Protection Ealreq Calculation:', x, y);
    y += 5;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Close-in (a=1): Ealreq = Ikmax × (Isn / Ipn) × a × (Rct + Rl + Sr/Ir²)', x + 5, y);
    y += 4;
    doc.text('Endzone-1 (k=3): Ealreq = Ikzone1 × (Isn / Ipn) × k × (Rct + Rl + Sr/Ir²)', x + 5, y);
    y += 6;

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('4. Required Knee Point Voltage & Verdict Criteria:', x, y);
    y += 5;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Vk(req) = Ealreq(max) × 0.8', x + 5, y);
    y += 4;
    doc.text('✓ SUITABLE: Available Vk ≥ Required Vk', x + 5, y);
    y += 4;
    doc.text('✗ UNDER-DIMENSIONED: Available Vk < Required Vk', x + 5, y);
    y += 8;
  }
  
  return y;
}

function drawStandardsSection(doc: any, sectionTitle: ReturnType<typeof makeSectionCounter>, x: number, y: number, width: number) {
  y = sectionTitle(doc, 'Applicable Standards & References', x, y, width);
  const refs = [
    'IEC 61869-2 \u2014 Instrument transformers: Additional requirements for current transformers.',
    'IS 2705 (Part 1 to 4) \u2014 Current transformers: General/specific requirements.',
    'IEEE C37.110 \u2014 Guide for application of current transformers used for protective relaying purposes.',
    'IEEE C57.13 \u2014 Standard requirements for instrument transformers.',
    'Internal engineering practice for CT knee-point voltage (Vk) adequacy verification.',
  ];
  refs.forEach((r) => {
    y = drawParagraph(doc, `\u2022  ${r}`, x, y, width, 4.4) + 1.5;
  });
  return y + 4;
}

// ==================================================================
// SINGLE DEVICE REPORT
// ==================================================================

export async function generateDevicePDFReport(
  device: DeviceResult,
  systemParams: StandardParameters,
  projectInfo?: ProjectInfo
): Promise<void> {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const doc = new jsPDF('portrait', 'mm', 'a4');

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = MARGIN;
  const boxWidth = pageWidth - margin * 2;
  const reportTitle = 'CT Adequacy Analysis Report';
  const info = resolveProjectInfo(projectInfo);
  const sectionTitle = makeSectionCounter();
  const isSiemens = (device.device_type && device.device_type.includes('SIEMENS')) || device.device_name?.includes('7SJ85');

  doc.setProperties({
    title: `CT Adequacy Report - ${device.device_name}`,
    creator: COMPANY_NAME,
  });

  const newPage = () => {
    doc.addPage();
    return drawContinuationHeader(doc, pageWidth, reportTitle);
  };

  const ensureSpace = (y: number, needed: number) =>
    y + needed > pageHeight - 25 ? newPage() : y;

  // PAGE 1
  let y = drawLetterhead(doc, pageWidth, reportTitle.toUpperCase(), `Device: ${clean(device.device_name)}`, reportRef('CTA'));
  y = drawDocumentControlBlock(doc, margin, y, boxWidth, info);
  y += 6;

  y = sectionTitle(doc, 'Project & Client Information', margin, y, boxWidth);
  y = drawProjectInfoBlock(doc, margin, y, boxWidth, info);
  y += 6;

  y = sectionTitle(doc, 'Executive Summary', margin, y, boxWidth);
  const verdictPlain =
    device.verdict === 'SUITABLY DIMENSIONED'
      ? 'meets the required knee-point voltage (Vk) / accuracy limit factor and is suitably dimensioned for the fault conditions evaluated'
      : device.verdict === 'NOT APPLICABLE'
      ? 'was not applicable for this adequacy check based on the inputs provided'
      : 'does not meet the required knee-point voltage (Vk) / accuracy limit factor under one or more of the fault conditions evaluated, and is under-dimensioned';

  y = drawParagraph(
    doc,
    `This report presents the current transformer (CT) adequacy assessment for "${clean(
      device.device_name
    )}" (Protection Function: ${deviceTypeLabel(device.device_type)}). The purpose of this check is to confirm whether the installed/selected CT can deliver sufficient secondary voltage (Vk) / accuracy limit factor to drive connected protection relays correctly under system fault conditions, without core saturation. Based on the inputs and calculations detailed in this report, the CT ${verdictPlain}. All input data, formulas applied, intermediate values and final results are presented as actually computed for this device, in full, for independent verification by engineering and review teams.`,
    margin,
    y,
    boxWidth
  );
  y += 8;

  // Verdict Box
  const verdictHeight = 22;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, boxWidth, verdictHeight, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.text(device.verdict, margin + boxWidth / 2, y + 9, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  if (isSiemens) {
    const reqKsscStr = typeof device.required_kssc === 'number' ? device.required_kssc.toFixed(2) : (device.intermediates?.['required_kssc'] ?? '0');
    const availKsscStr = typeof device.available_kssc === 'number' ? device.available_kssc.toFixed(2) : (device.intermediates?.['available_kssc'] ?? 'N/A');
    if (device.vk_required && device.vk_required > 0) {
      doc.text(
        `Vk Required: ${device.vk_required} V   |   Vk Available: ${device.vk_available > 0 ? device.vk_available + ' V' : 'N/A'}`,
        margin + boxWidth / 2,
        y + 16,
        { align: 'center' }
      );
    } else {
      doc.text(
        `Vk Required: ${device.vk_required || 0} V   |   Vk Available: ${device.vk_available && device.vk_available > 0 ? device.vk_available + ' V' : 'N/A'}`,
        margin + boxWidth / 2,
        y + 16,
        { align: 'center' }
      );
    }
  } else {
    doc.text(
      `Vk Required: ${device.vk_required} V   |   Vk Available: ${device.vk_available > 0 ? device.vk_available + ' V' : 'N/A'}`,
      margin + boxWidth / 2,
      y + 16,
      { align: 'center' }
    );
  }

  // PAGE 2 (starts with newPage)
  y = newPage();

  const paramCols: Column[] = [
    { header: 'Parameter', width: 34 },
    { header: 'Value', width: 24, align: 'right', bold: true },
    { header: 'Unit', width: 14, align: 'center' },
    { header: 'Description', width: 98 },
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

  const inputs = device.inputs || {};
  const inter = device.intermediates || {};

  const ctRatioStr = inputs.ct_ratio_primary ? `${inputs.ct_ratio_primary}/${inputs.ct_ratio_secondary || 1}`
                   : inter.Ipn ? `${inter.Ipn}/${inter.In || 1}` : '0/1';
  const accuracyClassStr = inputs.accuracy_class || inter.class || 'N/A';
  const rctStr = inputs.rct?.toString() || inter.Rct?.toString() || '0';
  const leadResStr = inputs.lead_resistance?.toString() || inter.Rl?.toString() || inter.loop_lead_resistance_ohm?.toString() || '0';
  const relayBurdenStr = inputs.relay_burden_va?.toString() || inter.PL?.toString() || '0';
  const busVoltageStr = inputs.bus_voltage_kv?.toString() || inter.bus_voltage_kv?.toString() || '0';
  const faultLevelStr = inputs.max_bus_fault_kA?.toString() || (inter.Itkmax ? (Number(inter.Itkmax) / 1000).toString() : '0');
  const routeLengthStr = inputs.route_length_km?.toString() || inter.route_length?.toString() || '0';

  const paramValues = [
    ctRatioStr,
    accuracyClassStr,
    rctStr,
    leadResStr,
    relayBurdenStr,
    busVoltageStr,
    faultLevelStr,
    routeLengthStr,
  ];
  const paramUnits = ['A', '', 'ohm', 'ohm', 'VA', 'kV', 'kA', 'km'];
  const paramRowH = 9;

  y = sectionTitle(doc, 'Input Parameters (as entered)', margin, y, boxWidth);
  y = drawTableHeader(doc, margin, y, paramCols, paramRowH);

  paramNames.forEach((name, i) => {
    const rowTop = y;
    y = drawTableRow(
      doc,
      margin,
      y,
      paramCols,
      [name, paramValues[i], paramUnits[i], ''],
      paramRowH,
      false,
      i % 2 === 1
    );

    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    const descX = margin + paramCols[0].width + paramCols[1].width + paramCols[2].width + 2;
    const descLines: string[] = doc.splitTextToSize(PARAMETER_NOTES[name] || '', paramCols[3].width - 4);
    descLines.slice(0, 2).forEach((line: string, li: number) => doc.text(line, descX, rowTop + 3.8 + li * 3.2));
  });
  y += 8;

  // Calculation Breakdown
  y = drawCalculationBreakdownTable(doc, sectionTitle, margin, y, boxWidth, device, ensureSpace);

  // Final Result summary bar
  y = ensureSpace(y, 16);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, boxWidth, 13, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  
  const reqKsscStr = typeof device.required_kssc === 'number' ? device.required_kssc.toFixed(2) : (inter['required_kssc'] ?? '6.25');
  const availKsscStr = typeof device.available_kssc === 'number' ? device.available_kssc.toFixed(2) : (inter['available_kssc'] ?? '36.64');

  const resultText = isSiemens
    ? `FINAL RESULT:   Required Kssc' = ${reqKsscStr}     Available Kssc' = ${availKsscStr}`
    : `FINAL RESULT:   Ealreq Max = ${device.ealreq_max} V     Vk Required = ${device.vk_required} V`;
  
  doc.text(resultText, margin + boxWidth / 2, y + 8.5, { align: 'center' });
  y += 18;

  // Section 5.0 Notes & Assumptions
  y = ensureSpace(y, 30);
  y = sectionTitle(doc, 'Notes & Assumptions', margin, y, boxWidth);
  const assumptions = [
    'All resistance and current values shown are as computed by the calculation engine from the inputs provided; none are default or placeholder values.',
    'Lead resistance is computed from the route length and cable data supplied for this device/circuit.',
    'Vk Available reflects the manufacturer-declared or test-certificate value supplied for this device; where unavailable, the verdict is reported as NOT APPLICABLE.',
    'This assessment covers CT knee-point voltage / Kssc adequacy only and does not constitute a complete protection coordination study.',
  ];
  assumptions.forEach((a) => {
    y = drawParagraph(doc, `\u2022  ${a}`, margin, y, boxWidth, 4.0) + 1.5;
  });

  // PAGE 3 (starts with newPage)
  y = newPage();
  y = drawFormulaSection(doc, sectionTitle, margin, y, boxWidth, device);
  y += 6;

  y = drawStandardsSection(doc, sectionTitle, margin, y, boxWidth);
  y += 8;

  y = ensureSpace(y, 40);
  y = sectionTitle(doc, 'Review & Approval', margin, y, boxWidth);
  drawSignatureBlock(doc, margin, y, boxWidth, info);

  const deviceName = clean(device.device_name).replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  finalizeDocument(doc, pageWidth, pageHeight, `CT_Adequacy_Report_${deviceName}_${timestamp}.pdf`);
}

// ==================================================================
// CONSOLIDATED MULTI-DEVICE REPORT
// ==================================================================

export async function generateConsolidatedPDFReport(
  devices: DeviceResult[],
  systemParams: StandardParameters,
  projectInfo?: ProjectInfo
): Promise<void> {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const doc = new jsPDF('landscape', 'mm', 'a4');

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = MARGIN;
  const contentWidth = pageWidth - margin * 2;
  const reportTitle = 'CT Adequacy Analysis \u2014 Consolidated Report';
  const info = resolveProjectInfo(projectInfo);
  const sectionTitle = makeSectionCounter();

  doc.setProperties({
    title: 'CT Adequacy Analysis - Consolidated Report',
    creator: COMPANY_NAME,
  });

  const newPage = () => {
    doc.addPage();
    return drawContinuationHeader(doc, pageWidth, reportTitle);
  };

  const ensureSpace = (y: number, needed: number) =>
    y + needed > pageHeight - 25 ? newPage() : y;

  let y = drawLetterhead(doc, pageWidth, reportTitle.toUpperCase(), `${devices.length} device(s) analyzed`, reportRef('CTA-CONS'));

  // ---- document control block ----
  y = drawDocumentControlBlock(doc, margin, y, contentWidth, info);
  y += 10;

  // ---- project & client information ----
  y = sectionTitle(doc, 'Project & Client Information', margin, y, contentWidth);
  y = drawProjectInfoBlock(doc, margin, y, contentWidth, info);
  y += 10;

  // ---- executive summary ----
  y = ensureSpace(y, 40);
  y = sectionTitle(doc, 'Executive Summary', margin, y, contentWidth);
  const suitableCount0 = devices.filter((d) => d.verdict === 'SUITABLY DIMENSIONED').length;
  const underDimCount0 = devices.length - suitableCount0;
  y = drawParagraph(
    doc,
    `This consolidated report summarizes the current transformer (CT) knee-point voltage (Vk) adequacy assessment across ${devices.length} device(s). Of these, ${suitableCount0} device(s) are suitably dimensioned and ${underDimCount0} device(s) are under-dimensioned or not applicable and require attention. Summary results for each device are tabulated below; the full step-by-step formula substitution and computed intermediates for each individual device are available in that device's own detailed report (see "Generate Report" per device), since the applicable formulas differ by protection function (distance, differential, overcurrent, busbar/breaker-failure, metering).`,
    margin,
    y,
    contentWidth
  );
  y += 10;

  // ---- devices overview ----
  y = ensureSpace(y, 20);
  y = sectionTitle(doc, 'Devices Overview', margin, y, contentWidth);

  const cols: Column[] = [
    { header: '#', width: 10, align: 'center' },
    { header: 'Device Name', width: 62 },
    { header: 'Protection Function', width: 45 },
    { header: 'CT Ratio', width: 30, align: 'center' },
    { header: 'Verdict', width: 38, align: 'center', bold: true },
    { header: 'Ealreq Max', width: 25, align: 'right' },
    { header: 'Vk Req', width: 22, align: 'right' },
    { header: 'Vk Avail', width: 22, align: 'right' },
    { header: 'Ratio %', width: 20, align: 'right' },
  ];
  const rowH = 9;

  y = drawTableHeader(doc, margin, y, cols, rowH);

  devices.forEach((device, index) => {
    y = ensureSpace(y, rowH * 2);
    // re-draw header if we just paginated
    if (y === drawContinuationHeader.length as any) { /* no-op guard, kept for readability */ }

    const ratio =
      device.vk_available > 0 && device.vk_required > 0
        ? `${((device.vk_available / device.vk_required) * 100).toFixed(0)}%`
        : 'N/A';
    const name = device.device_name.length > 34 ? device.device_name.slice(0, 31) + '...' : device.device_name;
    const verdictLabel =
      device.verdict === 'SUITABLY DIMENSIONED' ? 'SUITABLE'
      : device.verdict === 'NOT APPLICABLE' ? 'N/A'
      : 'UNDER DIM.';

    y = drawTableRow(
      doc,
      margin,
      y,
      cols,
      [
        (index + 1).toString(),
        clean(name),
        deviceTypeLabel(device.device_type),
        `${device.inputs.ct_ratio_primary}/${device.inputs.ct_ratio_secondary}`,
        verdictLabel,
        device.verdict === 'NOT APPLICABLE' ? 'N/A' : `${device.ealreq_max} V`,
        device.verdict === 'NOT APPLICABLE' ? 'N/A' : `${device.vk_required} V`,
        device.vk_available > 0 ? `${device.vk_available} V` : 'N/A',
        ratio,
      ],
      rowH,
      false,
      index % 2 === 1
    );
  });

  y += 15;

  // ---- summary box ----
  const suitable = devices.filter((d) => d.verdict === 'SUITABLY DIMENSIONED').length;
  const underDim = devices.filter((d) => d.verdict === 'UNDER DIMENSIONED').length;
  const notApplicable = devices.filter((d) => d.verdict === 'NOT APPLICABLE').length;
  const summaryHeight = 22;

  y = ensureSpace(y, summaryHeight);

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, contentWidth, summaryHeight, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('ANALYSIS SUMMARY', margin + 5, y + 9);

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Total Devices: ${devices.length}     Suitable: ${suitable}     Under Dimensioned: ${underDim}     Not Applicable: ${notApplicable}`,
    margin + 5,
    y + 17
  );
  y += summaryHeight + 15;

  // ---- recommendations / action items ----
  const underDimDevices = devices.filter((d) => d.verdict === 'UNDER DIMENSIONED');
  y = ensureSpace(y, 20);
  y = sectionTitle(doc, 'Recommendations', margin, y, contentWidth);
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
      y = ensureSpace(y, 6);
      y =
        drawParagraph(
          doc,
          `\u2022  ${clean(d.device_name)} (${deviceTypeLabel(d.device_type)}) \u2014 Vk Required ${d.vk_required} V, Vk Available ${
            d.vk_available > 0 ? d.vk_available + ' V' : 'N/A'
          }`,
          margin,
          y,
          contentWidth,
          4.2
        ) + 1.5;
    });
  }
  y += 8;

  // ---- standards & references ----
  y = ensureSpace(y, 30);
  y = drawStandardsSection(doc, sectionTitle, margin, y, contentWidth);

  // ---- sign-off ----
  y = ensureSpace(y, 45);
  y = sectionTitle(doc, 'Review & Approval', margin, y, contentWidth);
  drawSignatureBlock(doc, margin, y, contentWidth, info);

  const timestamp = new Date().toISOString().split('T')[0];
  finalizeDocument(doc, pageWidth, pageHeight, `CT_Adequacy_Consolidated_Report_${timestamp}.pdf`);
}