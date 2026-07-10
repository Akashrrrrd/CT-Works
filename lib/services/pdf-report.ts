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
  'Lead Resistance': 'One-way resistance of the pilot wire or cable connecting the CT secondary to the relay. Total loop resistance is 2 x this value.',
  'Relay Burden': 'Apparent power consumption of the connected relay or meter at rated secondary current, expressed in volt-amperes.',
  'Bus Voltage': 'System operating voltage at the point where the CT is installed, used for fault level calculations.',
  'Fault Level': 'Maximum fault current that can occur at the CT location, determining the worst-case secondary current for adequacy assessment.',
  'Route Length': 'Physical distance from CT to relay location, used to estimate lead resistance when not directly specified.',
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

function drawTableRow(
  doc: any,
  x: number,
  y: number,
  columns: Column[],
  values: string[],
  rowHeight: number,
  emphasize = false,
  zebra = false
) {
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  if (zebra) {
    doc.setFillColor(...ZEBRA_FILL);
    doc.rect(x, y, totalWidth, rowHeight, 'FD');
  } else {
    doc.rect(x, y, totalWidth, rowHeight, 'S');
  }

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
 * Symbol reference + formula used for the Vk adequacy calculation.
 * Presented in general form (K factor varies by protection scheme); the
 * exact per-condition Ealreq/Vk figures are those already computed by the
 * analysis engine and shown in the Calculation Breakdown table, so this
 * section explains the basis without re-deriving numbers independently.
 */
function drawFormulaSection(doc: any, sectionTitle: ReturnType<typeof makeSectionCounter>, x: number, y: number, width: number) {
  y = sectionTitle(doc, 'Formulas & Calculation Basis', x, y, width);

  y = drawParagraph(
    doc,
    'The required secondary EMF (Ealreq) and the resulting Vk Required for each fault condition are derived from the general CT knee-point voltage adequacy relationship used for protection CT sizing:',
    x,
    y,
    width
  );
  y += 6;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(RULE_WIDTH);
  doc.rect(x, y, width, 14, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('Ealreq  =  K  x  ( If / n )  x  ( Rct + 2Rl + Rr )', x + width / 2, y + 9, { align: 'center' });
  y += 22;

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('Where:', x, y);
  y += 5;

  const symbols: Array<[string, string]> = [
    ['K', 'Multiplying factor determined by the protection scheme applied (e.g. overcurrent, differential, restricted earth fault).'],
    ['If', 'Maximum fault current at the point being protected (from Fault Level input).'],
    ['n', 'CT turns ratio (secondary rated current), taken from the CT Ratio input.'],
    ['Rct', 'CT secondary winding resistance.'],
    ['Rl', 'One-way lead/pilot wire resistance between CT and relay (loop counted as 2Rl).'],
    ['Rr', 'Relay/meter burden resistance, calculated as VA / (Isec)\u00B2.'],
  ];
  symbols.forEach(([sym, def]) => {
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${sym}`, x + 2, y);
    doc.setFont('times', 'normal');
    const lines: string[] = doc.splitTextToSize(def, width - 20);
    doc.text(lines[0], x + 14, y);
    y += 4.3;
    for (let li = 1; li < lines.length; li++) {
      doc.text(lines[li], x + 14, y);
      y += 4.3;
    }
  });
  y += 3;

  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  y = drawParagraph(
    doc,
    'Vk Required is taken as the highest Ealreq value across all fault conditions evaluated for the device (marked MAX in the Calculation Breakdown table). Note: the exact value of K and the specific fault conditions considered depend on the protection philosophy applied to this device; refer to the Calculation Breakdown table for the resulting Ealreq and Vk figures used in the final verdict.',
    x,
    y,
    width,
    4.2
  );

  return y + 4;
}

function drawStandardsSection(doc: any, sectionTitle: ReturnType<typeof makeSectionCounter>, x: number, y: number, width: number) {
  y = sectionTitle(doc, 'Applicable Standards & References', x, y, width);
  const refs = [
    'IEC 61869-2 \u2014 Instrument transformers: Additional requirements for current transformers.',
    'IS 2705 (Part 1 to 4) \u2014 Current transformers: General/specific requirements.',
    'IEEE C57.13 \u2014 Standard requirements for instrument transformers.',
    'Internal engineering practice for CT knee-point voltage (Vk) adequacy verification.',
  ];
  refs.forEach((r) => {
    y = drawParagraph(doc, `\u2022  ${r}`, x, y, width, 4.4) + 1.5;
  });
  return y + 4;
}

/** Directly-computable intermediate values (pure arithmetic from the given inputs). */
function computeAppliedValues(device: DeviceResult) {
  const rct = device.inputs.rct;
  const rl = device.inputs.lead_resistance;
  const va = device.inputs.relay_burden_va;
  const isec = device.inputs.ct_ratio_secondary;

  const rr = va != null && isec ? va / (isec * isec) : undefined;
  const loop =
    rct != null && rl != null && rr != null ? rct + 2 * rl + rr : undefined;

  return {
    rr: rr != null ? rr.toFixed(3) : 'N/A',
    loop: loop != null ? loop.toFixed(3) : 'N/A',
  };
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

  let y = drawLetterhead(doc, pageWidth, reportTitle.toUpperCase(), `Device: ${clean(device.device_name)}`, reportRef('CTA'));

  // ---- document control block ----
  y = drawDocumentControlBlock(doc, margin, y, boxWidth, info);
  y += 10;

  // ---- project & client information ----
  y = ensureSpace(y, 30);
  y = sectionTitle(doc, 'Project & Client Information', margin, y, boxWidth);
  y = drawProjectInfoBlock(doc, margin, y, boxWidth, info);
  y += 10;

  // ---- executive summary ----
  y = ensureSpace(y, 30);
  y = sectionTitle(doc, 'Executive Summary', margin, y, boxWidth);
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
    )}". The purpose of this check is to confirm whether the installed/selected CT can deliver sufficient secondary voltage (Vk) to drive connected protection relays correctly under system fault conditions, without core saturation. Based on the inputs and calculations detailed in this report, the CT ${verdictPlain}. All input data, formulas applied, and intermediate results are presented in full for independent verification by engineering and review teams, and to keep the assessment fully transparent between all stakeholders.`,
    margin,
    y,
    boxWidth
  );
  y += 10;

  // ---- verdict block ----
  y = ensureSpace(y, 30);
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

  // Calculate total table height needed and ensure space for the entire section
  const paramRowH = 11;
  const totalTableHeight = paramRowH * (paramNames.length + 1) + 25; // +25 for section title and spacing

  y = ensureSpace(y, totalTableHeight);
  y = sectionTitle(doc, 'Input Parameters', margin, y, boxWidth);
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

    // Overlay the wrapped description text into the last cell
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    const descX = margin + paramCols[0].width + paramCols[1].width + paramCols[2].width + 2;
    const descLines: string[] = doc.splitTextToSize(PARAMETER_NOTES[name] || '', paramCols[3].width - 4);
    descLines.slice(0, 2).forEach((line: string, li: number) => doc.text(line, descX, rowTop + 4.5 + li * 3.6));
  });
  y += 14;

  // ---- applied values table ----
  const applied = computeAppliedValues(device);
  const appliedRowH = 11;
  const appliedCols: Column[] = [
    { header: 'Applied Calculation Values', width: 140 },
    { header: 'Result', width: 30, align: 'right', bold: true },
  ];

  y = drawTableHeader(doc, margin, y, appliedCols, appliedRowH);
  y = drawTableRow(doc, margin, y, appliedCols, ['Relay Burden Resistance, Rr = VA / (Isec)\u00B2', `${applied.rr} ohm`], appliedRowH);
  y = drawTableRow(doc, margin, y, appliedCols, ['Total Secondary Loop Resistance, Rct + 2Rl + Rr', `${applied.loop} ohm`], appliedRowH, false, true);
  y += 14;

  // ---- calculation breakdown table ----
  y = ensureSpace(y, 20);
  y = sectionTitle(doc, 'Calculation Breakdown', margin, y, boxWidth);

  const calcRowH = 8;
  const calcCols: Column[] = [
    { header: 'Fault Condition', width: 90 },
    { header: 'Ealreq (V)', width: 40, align: 'right' },
    { header: 'Vk Req (V)', width: 40, align: 'right' },
  ];
  y = ensureSpace(y, calcRowH * (device.vk_breakdown.length + 1));
  y = drawTableHeader(doc, margin, y, calcCols, calcRowH);
  device.vk_breakdown.forEach((row, i) => {
    y = ensureSpace(y, calcRowH);
    const label = row.isMax ? `${row.label}  (MAX)` : row.label;
    y = drawTableRow(doc, margin, y, calcCols, [label, row.ealreq.toString(), row.vk.toString()], calcRowH, row.isMax, !row.isMax && i % 2 === 1);
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
  y += 25;

  // ---- notes & assumptions ----
  y = ensureSpace(y, 30);
  y = sectionTitle(doc, 'Notes & Assumptions', margin, y, boxWidth);
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
  y += 6;

  // ---- standards & references ----
  y = ensureSpace(y, 30);
  y = drawStandardsSection(doc, sectionTitle, margin, y, boxWidth);

  // ---- sign-off ----
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

  let y = drawLetterhead(doc, pageWidth, reportTitle.toUpperCase(), `${devices.length} device(s) analyzed`, reportRef('CTA-CONS'));

  // ---- document control block ----
  y = drawDocumentControlBlock(doc, margin, y, contentWidth, info);
  y += 10;

  // ---- project & client information ----
  y = sectionTitle(doc, 'Project & Client Information', margin, y, contentWidth);
  y = drawProjectInfoBlock(doc, margin, y, contentWidth, info);
  y += 10;

  // ---- executive summary ----
  if (y + 40 > pageHeight - 25) y = newPage();
  y = sectionTitle(doc, 'Executive Summary', margin, y, contentWidth);
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

  // ---- formulas & calculation basis ----
  if (y + 90 > pageHeight - 25) y = newPage();
  y = drawFormulaSection(doc, sectionTitle, margin, y, contentWidth);

  // ---- devices overview ----
  if (y + 20 > pageHeight - 25) y = newPage();
  y = sectionTitle(doc, 'Devices Overview', margin, y, contentWidth);

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
      rowH,
      false,
      index % 2 === 1
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
      if (y + 6 > pageHeight - 25) y = newPage();
      y =
        drawParagraph(
          doc,
          `\u2022  ${clean(d.device_name)} \u2014 Vk Required ${d.vk_required} V, Vk Available ${
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
  if (y + 30 > pageHeight - 25) y = newPage();
  y = drawStandardsSection(doc, sectionTitle, margin, y, contentWidth);

  // ---- sign-off ----
  if (y + 45 > pageHeight - 25) y = newPage();
  y = sectionTitle(doc, 'Review & Approval', margin, y, contentWidth);
  drawSignatureBlock(doc, margin, y, contentWidth, info);

  const timestamp = new Date().toISOString().split('T')[0];
  finalizeDocument(doc, pageWidth, pageHeight, `CT_Adequacy_Consolidated_Report_${timestamp}.pdf`);
}