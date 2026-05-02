'use client';

import type { ReportData } from '@/lib/services/pdf-report';

// ─────────────────────────────────────────────────────────────────────────────
// Safe string — strip characters jsPDF helvetica cannot encode
// ─────────────────────────────────────────────────────────────────────────────
const s = (t: unknown) =>
  String(t)
    .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, '=>')
    .replace(/×/g, 'x').replace(/√/g, 'sqrt').replace(/Ω/g, 'Ohm')
    .replace(/⁶/g, '^6').replace(/³/g, '^3').replace(/²/g, '^2')
    .replace(/—/g, '-').replace(/[^\x00-\xFF]/g, '?');

// ─────────────────────────────────────────────────────────────────────────────
export async function downloadPDF(data: ReportData) {
  const [{ default: jsPDF }] = await Promise.all([import('jspdf')]);

  // ── Page constants (A4 portrait, mm) ──────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW  = doc.internal.pageSize.getWidth();   // 210
  const PH  = doc.internal.pageSize.getHeight();  // 297
  const ML  = 12;
  const MR  = 12;
  const CW  = PW - ML - MR;

  // ── Data shortcuts ─────────────────────────────────────────────────────────
  const ok    = data.result.verdict === 'SUITABLY DIMENSIONED';
  const Ipn   = data.sheet1.ct_ratio_primary;
  const Isn   = data.sheet1.ct_ratio_secondary;
  const Ir    = data.sheet1.ct_ratio_secondary;
  const Rct   = data.sheet1.rct;
  const Rl    = data.sheet2.lead_resistance;
  const Sr    = data.sheet2.relay_burden_va;
  const Vk    = data.sheet1.vk_available;
  const Ikmax = +(data.result.intermediates['Ikmax (A)'] as number);
  const SnIr2 = +(Sr / (Ir * Ir)).toFixed(4);     // Sr / Ir²
  const burden= +(Rct + Rl + SnIr2).toFixed(4);   // total burden

  // ── Cursor ────────────────────────────────────────────────────────────────
  let y = 0;

  // ── Primitives ────────────────────────────────────────────────────────────
  const bold   = () => doc.setFont('helvetica', 'bold');
  const normal = () => doc.setFont('helvetica', 'normal');
  const sz     = (n: number) => doc.setFontSize(n);
  const tc     = (r: number, g = r, b = r) => doc.setTextColor(r, g, b);
  const dc     = (r: number, g = r, b = r) => doc.setDrawColor(r, g, b);
  const lw     = (n: number) => doc.setLineWidth(n);
  const R = (x: number, yy: number, w: number, h: number, style: 'S'|'F'|'FD'='S') =>
    doc.rect(x, yy, w, h, style);
  const L = (x1: number, y1: number, x2: number, y2: number) =>
    doc.line(x1, y1, x2, y2);
  const T = (
    t: string, x: number, yy: number,
    align: 'left'|'right'|'center' = 'left',
    maxW?: number,
  ) => doc.text(s(t), x, yy, { align, ...(maxW ? { maxWidth: maxW } : {}) });

  const needY = (h: number) => {
    if (y + h > PH - 18) { doc.addPage(); y = 0; drawHeader(); }
  };

  const gap = (n = 4) => { y += n; };

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER — 3-row bordered table exactly matching Hitachi layout
  // ══════════════════════════════════════════════════════════════════════════
  const drawHeader = () => {
    dc(0); lw(0.3); tc(0);

    // Column x-positions
    const x0 = ML;           // HITACHI company cell: w=36
    const x1 = ML + 36;      // CT/VT title cell: w=74
    const x2 = ML + 110;     // meta block: remaining width
    const mW  = CW - 110;    // meta block total width
    const mH  = mW / 2;      // half-width for each meta sub-cell

    // ── Row 0: company | title | meta (2x2 sub-grid) ──────────────────────
    const r0y = 8;
    const r0h = 20;

    R(x0, r0y, 36,  r0h);   // HITACHI
    R(x1, r0y, 74,  r0h);   // CT/VT block
    // meta 4 sub-cells
    R(x2,      r0y,          mH, r0h / 2);
    R(x2 + mH, r0y,          mH, r0h / 2);
    R(x2,      r0y + r0h/2,  mH, r0h / 2);
    R(x2 + mH, r0y + r0h/2,  mH, r0h / 2);

    // Company name
    sz(15); bold(); tc(0);
    T(s(data.companyName ?? 'COMPANY'), x0 + 18, r0y + 14, 'center');

    // CT/VT three lines
    sz(9); bold();
    T('CT / VT',        x1 + 37, r0y + 7,  'center');
    T('ADEQUACY CHECK', x1 + 37, r0y + 13, 'center');
    sz(8.5); bold();
    T(s(data.substationName ?? `${data.sheet2.bus_voltage_kv}kV Substation`), x1 + 37, r0y + 19, 'center');

    // Meta labels (small, gray)
    sz(6.5); normal(); tc(80);
    T('Contract No.',  x2 + 1.5,      r0y + 4.5);
    T('Date',          x2 + 1.5,      r0y + r0h/2 + 4.5);
    T('Document No.',  x2 + mH + 1.5, r0y + 4.5);
    T('Revision No.',  x2 + mH + 1.5, r0y + r0h/2 + 4.5);

    // Meta values (bold, black, right-aligned in each cell)
    const contractNo = data.contractNo ?? '-';
    const dateStr    = new Date(data.createdAt).toLocaleDateString('en-US', {
      month: 'numeric', day: 'numeric', year: 'numeric',
    });
    sz(7); bold(); tc(0);
    T(s(contractNo),              x2 + mH  - 2,   r0y + 9,           'right');
    T(dateStr,                    x2 + mH  - 2,   r0y + r0h/2 + 9,   'right');
    T('-',                        x2 + mW  - 2,   r0y + 9,           'right');
    T(s(data.revisionNo ?? 'A'),  x2 + mW  - 2,   r0y + r0h/2 + 9,   'right');

    // ── Row 1: Prep.By / Checked By | subject | Contractor ─────────────────
    const r1y = r0y + r0h;
    const r1h = 8;

    R(x0,      r1y, 10, r1h);  // "Prep. By"
    R(x0 + 10, r1y, 12, r1h);  // initials AP
    R(x0 + 22, r1y, 14, r1h);  // "Checked By"
    R(x0 + 36, r1y, 74, r1h);  // subject — same width as title above
    R(x2,      r1y, mH, r1h);  // "Contractor" label
    R(x2 + mH, r1y, mH, r1h);  // contractor value

    sz(6); normal(); tc(80);
    T('Prep. By',   x0 + 1,  r1y + 5.5);
    T('Checked By', x0 + 23, r1y + 5.5);
    sz(7); bold(); tc(0);
    T(s(data.createdBy?.substring(0,2).toUpperCase() ?? 'EN'), x0 + 16, r1y + 5.5, 'center');
    T('—',         x0 + 36 - 4, r1y + 5.5, 'center');

    sz(8); bold(); tc(0);
    T(s(data.projectName ?? `${data.sheet2.bus_voltage_kv}kV CABLE FEEDERS`), x0 + 36 + 37, r1y + 5.5, 'center');

    sz(6.5); normal(); tc(80);
    T('Contractor', x2 + 1.5, r1y + 5.5);
    sz(7.5); bold(); tc(0);
    T(s(data.companyName ?? 'COMPANY'), x2 + mW - 2, r1y + 5.5, 'right');

    y = r1y + r1h + 7;
  };

  drawHeader();

  // ══════════════════════════════════════════════════════════════════════════
  // CT NAMEPLATE BLOCK — Image 4 style
  // ══════════════════════════════════════════════════════════════════════════
  const drawCTNameplate = () => {
    needY(56);
    lw(0.3); dc(0); tc(0);

    // Tab row: [T1] [Core1]  (Diff. + Dist.)   Connected devices: [relay]
    const tabY = y;
    R(ML, tabY, 14, 7);
    bold(); sz(8); T('T1', ML + 7, tabY + 5, 'center');
    R(ML + 16, tabY, 20, 7);
    T('Core1', ML + 26, tabY + 5, 'center');
    normal(); sz(8);
    T('(Diff. + Dist.)', ML + 40, tabY + 5);
    T('Connected devices:', ML + 100, tabY + 5);
    R(ML + 135, tabY, 25, 7);
    bold(); T(s(data.templateName?.split(/[\s–-]/)[0] ?? 'IED'), ML + 147, tabY + 5, 'center');
    y += 10;

    // Tap header
    sz(7.5); normal(); tc(0);
    T('Tap-1', ML + 36, y);
    T('Tap-2', ML + 62, y);
    T('Tap-3', ML + 88, y);
    y += 6;

    // CT Ratio
    normal(); sz(8);
    T('CT Ratio:', ML, y + 2);
    R(ML + 30, y - 3.5, 20, 7);
    bold(); sz(9); T(`${Ipn}`, ML + 40, y + 2, 'center');
    normal(); sz(8);
    T('-', ML + 53, y + 2);
    T('-', ML + 78, y + 2);
    T('/', ML + 96, y + 2);
    R(ML + 100, y - 3.5, 14, 7);
    bold(); sz(9); T(`${Isn}`, ML + 107, y + 2, 'center');
    normal(); sz(8); T('A', ML + 116, y + 2);
    y += 8;

    // Class of Accuracy
    normal(); sz(8); T('Class of Accuracy:', ML, y + 2);
    R(ML + 30, y - 3.5, 20, 7);
    bold(); sz(8.5); T(s(data.sheet1.accuracy_class), ML + 40, y + 2, 'center');
    y += 8;

    // CT Resistance
    normal(); sz(8); T('CT Resistance:', ML, y + 2);
    T('Rct <', ML + 30, y + 2);
    R(ML + 44, y - 3.5, 16, 7);
    bold(); sz(9); T(`${Rct}`, ML + 52, y + 2, 'center');
    normal(); sz(8); T('Ohm', ML + 62, y + 2);
    y += 8;

    // Knee Point Voltage
    normal(); sz(8); T('Knee Point Voltage:', ML, y + 2);
    T('Vk >', ML + 30, y + 2);
    R(ML + 44, y - 3.5, 16, 7);
    bold(); sz(9); T(`${Vk}`, ML + 52, y + 2, 'center');
    normal(); sz(8); T('V', ML + 62, y + 2);
    y += 8;

    // Magnetizing Current
    normal(); sz(8); T('Magnetizing Current:', ML, y + 2);
    T('Io <', ML + 30, y + 2);
    R(ML + 44, y - 3.5, 16, 7);
    bold(); sz(9); T(`${data.sheet1.io_at_vk}`, ML + 52, y + 2, 'center');
    normal(); sz(8); T('mA at Vk', ML + 62, y + 2);
    y += 10;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // BURDENS TABLE — Image 4 "Other Burdens on same CT core"
  // ══════════════════════════════════════════════════════════════════════════
  const drawBurdensTable = () => {
    needY(50);
    sz(8); bold(); tc(0);
    T('Other Burdens on same CT core:', ML, y);
    y += 5;

    // Cell widths for left burden table
    const cw0 = 60; const cw1 = 14; const cw2 = 14; const cw3 = 10;
    const bRows = [
      [`Burden of RED670`,          `Sr'  =`, `0.02`, 'VA'],
      [`Burden of`,                 `      =`, ``,     'VA'],
      [`Burden of`,                 `      =`, ``,     'VA'],
      [`Total lead burden`,         `      =`, `0.45`, 'VA'],
      [`Total lead + other burden`, `SI   =`,  `0.47`, 'VA'],
    ];
    lw(0.25); dc(0);
    bRows.forEach((row, i) => {
      const ry = y + i * 7;
      R(ML,                 ry, cw0, 7);
      R(ML + cw0,           ry, cw1, 7);
      R(ML + cw0 + cw1,     ry, cw2, 7);
      R(ML + cw0 + cw1 + cw2, ry, cw3, 7);
      normal(); sz(7.5); tc(0);
      T(row[0], ML + 1.5, ry + 5);
      T(row[1], ML + cw0 + 1, ry + 5);
      bold(); sz(8);
      T(row[2], ML + cw0 + cw1 + cw2 / 2, ry + 5, 'center');
      normal(); sz(7.5);
      T(row[3], ML + cw0 + cw1 + cw2 + 1.5, ry + 5);
    });

    // Right: Lead resistance calculation
    const rx = ML + 112;
    sz(7.5); normal(); tc(0);
    T('Lead + Other resistance connected',           rx, y + 5);
    T(`RI  =  SI / ( Isn  x  Isn )`,                rx, y + 12);
    T(`    =  0.47 / ( ${Isn}  x  ${Isn} )`,        rx, y + 19);
    T(`    =  ${Rl}  Ohm`,                           rx, y + 26);

    y += bRows.length * 7 + 9;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  // Bold underlined heading (e.g. "A. CT ADEQUECY CHECK FOR DIFFERENTIAL FUNCTION:")
  const sectionHead = (text: string) => {
    needY(12);
    sz(8.5); bold(); tc(0);
    T(s(text), ML, y);
    lw(0.3); dc(0);
    L(ML, y + 0.8, ML + doc.getTextWidth(s(text)), y + 0.8);
    y += 7;
  };

  // Plain body paragraph
  const para = (text: string) => {
    needY(10);
    sz(8); normal(); tc(0);
    const lines = doc.splitTextToSize(s(text), CW);
    doc.text(lines, ML, y);
    y += lines.length * 4.5 + 2;
  };

  // Underlined fault condition label ("For Close-in faults:")
  const faultHead = (text: string) => {
    needY(8);
    sz(8); normal(); tc(0);
    T(s(text), ML, y);
    lw(0.25); dc(0);
    L(ML, y + 0.8, ML + doc.getTextWidth(s(text)), y + 0.8);
    y += 6;
  };

  // ── Inline fraction helper — draws  num / den  as stacked text ──────────
  // Returns the x-coordinate AFTER the fraction
  const fraction = (
    num: string, den: string,
    startX: number, baseY: number,
  ): number => {
    sz(8); normal(); tc(0);
    const nw  = doc.getTextWidth(s(num));
    const dw  = doc.getTextWidth(s(den));
    const fw  = Math.max(nw, dw) + 2;
    const cx  = startX + fw / 2;
    T(s(num), cx, baseY - 3, 'center');
    lw(0.25); dc(0);
    L(startX, baseY + 0.5, startX + fw, baseY + 0.5);
    T(s(den), cx, baseY + 6, 'center');
    return startX + fw + 2;
  };

  // ── Standard formula line with literal fraction rendering ─────────────────
  // label  x  Ikmax  x  Isn/Ipn  x  ( Rct + RI + Sr/(IrxIr) )   —(n)
  const formulaLine = (
    label: string,           // "Ealreq"
    multiplier: string,      // "5" or "2 x Itmax" etc.
    eqNum: string,           // "—(1)"
  ) => {
    needY(14);
    sz(8); normal(); tc(0);

    let cx = ML + 4;

    // "Ealreq ="
    T(`${s(label)}  =`, cx, y);
    cx += doc.getTextWidth(`${s(label)}  =`) + 3;

    // multiplier  e.g. "Ikmax  x" or "2  x  Itmax  x"
    T(`${s(multiplier)}  x`, cx, y);
    cx += doc.getTextWidth(`${s(multiplier)}  x`) + 4;

    // Isn/Ipn fraction
    cx = fraction(`Isn`, `Ipn`, cx, y);
    cx += 2;

    // "x  ( Rct  +  RI  +"
    T(`x  ( Rct  +  RI  +`, cx, y);
    cx += doc.getTextWidth(`x  ( Rct  +  RI  +`) + 2;

    // Sr / (Ir x Ir) fraction
    cx = fraction(`Sr`, `Ir  x  Ir`, cx, y);

    // " )"
    T(` )`, cx, y);

    // equation number right aligned
    sz(7.5); tc(80);
    T(eqNum, PW - MR, y, 'right');
    tc(0);

    y += 12;
  };

  // ── Simple text formula:  label = expr  ─────────────────────────────────
  const fLine = (label: string, expr: string, eqNum?: string) => {
    needY(7);
    sz(8); normal(); tc(0);
    T(s(label), ML + 4, y);
    T('=', ML + 40, y);
    T(s(expr), ML + 46, y);
    if (eqNum) { sz(7.5); tc(80); T(s(eqNum), PW - MR, y, 'right'); tc(0); }
    y += 6.5;
  };

  // Continuation: =  value
  const fCont = (expr: string) => {
    needY(7);
    sz(8); normal(); tc(0);
    T('=', ML + 40, y);
    T(s(expr), ML + 46, y);
    y += 6.5;
  };

  // Boxed result:  =  [ value ]  unit
  const boxed = (val: string, unit = '') => {
    needY(11);
    sz(8); normal(); tc(0);
    T('=', ML + 40, y);
    const vw = doc.getTextWidth(s(val)) + 8;
    lw(0.35); dc(0);
    R(ML + 46, y - 5.5, vw, 7.5, 'S');
    bold(); sz(9); T(s(val), ML + 50, y);
    normal(); sz(8);
    if (unit) T(s(unit), ML + 46 + vw + 2, y);
    y += 10;
  };

  // ── Right-side parameter list (label = value unit) ────────────────────────
  const paramList = (rows: [string, string, string][]) => {
    const px = ML + 108;
    const ex = px + 28;
    rows.forEach(([label, val, unit]) => {
      needY(6);
      sz(8); normal(); tc(0);
      if (label) T(s(label), px, y);
      if (val) {
        T('=', ex, y);
        bold(); T(s(val), ex + 5, y);
        normal();
        if (unit) T(s(unit), ex + 5 + doc.getTextWidth(s(val)) + 2, y);
      }
      y += 5.5;
    });
    y += 2;
  };

  // Underlined "Therefore" sentence
  const therefore = (text: string) => {
    needY(9);
    sz(8); bold(); tc(0);
    T(s(text), ML, y);
    lw(0.3); dc(0);
    L(ML, y + 0.8, ML + doc.getTextWidth(s(text)), y + 0.8);
    y += 7;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Nameplate + Burdens + Section A (Differential)
  // ══════════════════════════════════════════════════════════════════════════
  drawCTNameplate();
  drawBurdensTable();

  sectionHead('A. CT ADEQUECY CHECK FOR DIFFERENTIAL FUNCTION:');
  para('The CT secondary limiting e.m.f (Eal) should meet the following requirements as per Relay manufacturer.');
  gap(3);

  faultHead('For Close-in faults:');
  formulaLine('Ealreq', 'Ikmax', '—(1)');

  faultHead('For Through faults:');
  formulaLine('Ealreq', '2  x  Itmax', '—(2)');

  gap(4);

  // Parameter list (right column) — rendered at current y
  const Itmax3 = data.result.intermediates['Itmax 3ph (A)'];
  const Itmax1 = data.result.intermediates['Itmax 1ph (A)'];

  const pRows: [string, string, string][] = [
    ['Ealreq', '', ''],
    ['Ipn',    `${Ipn}`,   'A'],
    ['Ikmax',  `${Ikmax}`, 'A'],
    ['Itmax',  s(Itmax3 ?? ''),  '3-phase'],
    ['',       s(Itmax1 ?? ''),  '1-phase'],
    ['Isn',    `${Isn}`,   'A'],
    ['Ir',     `${Ir}`,    'A'],
    ['Rct',    `${Rct}`,   'Ohm'],
    ['RI',     `${Rl}`,    'Ohm'],
    ['Sr',     `${Sr}`,    'VA'],
  ];
  paramList(pRows);

  gap(4);

  // Substituted calculations for each fault condition
  data.result.vk_breakdown.forEach((row) => {
    needY(30);
    const label = row.label ?? 'Close-in faults';
    faultHead(`For ${s(label)}:`);
    fLine('Ealreq',
      `${row.ealreq_ikmax ?? Ikmax}  x  (1/${Ipn})  x  ( ${Rct}  +  ${Rl}  +  ${SnIr2} )`);
    fCont(`${row.ealreq_ikmax ?? Ikmax}  x  (1/${Ipn})  x  ( ${burden} )`);
    boxed(`${row.ealreq}`, 'V');
    gap(2);
  });

  gap(3);

  therefore('Therefore, the required knee point voltage of the CT.');
  sz(8); normal(); tc(0);
  T('(Vk in terms of Ealreq as per the Manufacturer)', ML, y);
  y += 7;

  fLine('Vk', 'Ealreq  x  0.8');
  fCont(`${data.result.ealreq_max}  x  0.8`);
  boxed(`${data.result.vk_required}`, 'V');
  gap(4);

  // Final comparison
  sz(8); normal(); tc(0);
  T('Available Vk', ML + 4, y);
  T(ok ? '>=' : '<', ML + 36, y);
  T('Required Vk', ML + 50, y);
  y += 6;
  sz(9); bold();
  T(`${Vk}`, ML + 10, y, 'center');
  normal(); sz(8);
  T(ok ? '>=' : '<', ML + 36, y);
  bold(); sz(9);
  T(`${data.result.vk_required}`, ML + 55, y, 'center');
  y += 7;
  sz(8.5); bold();
  T('Hence CT is:', ML, y);
  T(ok ? 'Suitably Dimensioned' : 'Under Dimensioned', ML + 28, y);
  y += 10;

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Section B: Distance function (Image 2 & 3)
  // ══════════════════════════════════════════════════════════════════════════
  if (data.templateName.includes('Distance') ||
      !!data.result.intermediates['Ikzone1 3ph (A)']) {

    doc.addPage(); y = 0; drawHeader();

    sectionHead('B. CT ADEQUECY CHECK FOR DISTANCE FUNCTION:');
    para('The CT secondary limiting e.m.f (Eal) should meet the following requirements as per Relay manufacturer.');
    gap(3);

    faultHead('For Close-in faults:');
    formulaLine('Ealreq', 'Ikmax', '—(1)');
    gap(2);

    faultHead('For Endzone-1 faults (3-ph):');
    formulaLine('Ealreq', 'Ikzone-1  x  k', '—(2)');
    gap(2);

    faultHead('For Endzone-1 faults (1-ph to earth):');
    formulaLine('Ealreq', 'Ikzone-1  x  k', '—(2)');
    gap(4);

    const ik3 = data.result.intermediates['Ikzone1 3ph (A)'];
    const ik1 = data.result.intermediates['Ikzone1 1ph (A)'];

    paramList([
      ['Ealreq',       '', ''],
      ['Ipn',          `${Ipn}`,   'A'],
      ['Ikmax',        `${Ikmax}`, 'A'],
      ['Ikzone-1',     s(ik3 ?? ''), '3-phase'],
      ['',             s(ik1 ?? ''), '1-phase'],
      ['Isn',          `${Isn}`,   'A'],
      ['Ir',           `${Ir}`,    'A'],
      ['Rct',          `${Rct}`,   'Ohm'],
      ['RI',           `${Rl}`,    'Ohm'],
      ['Sr',           `${Sr}`,    'VA'],
    ]);

    gap(4);

    faultHead('For Close-in faults:');
    const eal0 = data.result.vk_breakdown[0]?.ealreq ?? '-';
    fLine('Ealreq', `${Ikmax}  x  (1/${Ipn})  x  ( ${Rct}  +  ${Rl}  +  ${SnIr2} )`);
    boxed(`${eal0}`, 'V');
    gap(3);

    const ez3row = data.result.vk_breakdown.find(r => /3.?ph/i.test(r.label));
    faultHead('For Endzone-1 3-ph tp for this fault:');
    sz(8); normal(); tc(0);
    T(`Since 3-ph tp for this fault`, ML + 4, y); y += 6;
    fLine('Ealreq',
      `${ik3 ?? ''}  x  (1/${Ipn})  x  ( ${Rct}  +  ${Rl}  +  ${SnIr2} )`);
    boxed(`${ez3row?.ealreq ?? '-'}`, 'V');
    gap(3);

    const ez1row = data.result.vk_breakdown.find(r => /1.?ph/i.test(r.label));
    faultHead('For Endzone-1 1-ph tp for this fault:');
    sz(8); normal(); tc(0);
    T(`Since 1-ph tp for this fault`, ML + 4, y); y += 6;
    fLine('Ealreq',
      `${ik1 ?? ''}  x  (1/${Ipn})  x  ( ${Rct}  +  ${Rl}  +  ${SnIr2} )`);
    boxed(`${ez1row?.ealreq ?? '-'}`, 'V');
    gap(5);

    sz(8); normal(); tc(0);
    T(
      `Hence, highest Ealreq for Differential & Distance functions at`,
      ML, y,
    );
    const tbox = `${Vk}`;
    lw(0.3); dc(0);
    const tbw = doc.getTextWidth(tbox) + 6;
    R(ML + CW * 0.62, y - 5, tbw, 7, 'S');
    bold(); T(tbox, ML + CW * 0.62 + 3, y);
    normal(); T('A  Tap =', ML + CW * 0.62 + tbw + 2, y);
    y += 8;

    // Ealreq right-side derivation (as image 2 bottom-right)
    const vkx2 = ML + 100;
    sz(8); normal(); tc(0);
    T('Vk',  vkx2,      y); T('=', vkx2 + 10, y);
    T('Ealreq  x  0.8', vkx2 + 16, y); y += 6;
    T('',    vkx2,      y); T('=', vkx2 + 10, y);
    T(`${data.result.ealreq_max}  x  0.8`, vkx2 + 16, y); y += 6;
    T('',    vkx2,      y); T('=', vkx2 + 10, y);
    const rvw = doc.getTextWidth(`${data.result.vk_required}`) + 8;
    lw(0.35); dc(0);
    R(vkx2 + 16, y - 5.5, rvw, 7.5, 'S');
    bold(); sz(9); T(`${data.result.vk_required}`, vkx2 + 20, y);
    normal(); sz(8); T('V', vkx2 + 16 + rvw + 2, y);
    y += 12;

    sz(8); normal(); tc(0);
    T('Available Vk', ML + 4, y);
    T('>', ML + 36, y);
    T('Required Vk', ML + 50, y);
    y += 6;
    sz(9); bold();
    T(`${Vk}`, ML + 10, y, 'center');
    sz(8); normal();
    T('>', ML + 36, y);
    bold(); sz(9);
    T(`${data.result.vk_required}`, ML + 55, y, 'center');
    y += 8;
    sz(8.5); bold();
    T('Hence CT is:', ML, y);
    T('Suitably Dimensioned', ML + 28, y);
    y += 10;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — Section C: Breaker Failure function (Image 1)
  // ══════════════════════════════════════════════════════════════════════════
  if (data.templateName.includes('Breaker') ||
      !!data.result.intermediates['Iop (A)']) {

    doc.addPage(); y = 0; drawHeader();

    sectionHead('C. CT ADEQUECY CHECK FOR BREAKER FAILURE FUNCTION:');
    para(
      'The CTs must have a rated equivalent secondary e.m.f. Eal that is larger than the maximum of the required ' +
      'secondary em.f. Ealreq as per below equation (1) (Refer : Annexure-G)',
    );
    gap(4);

    // ── "Ealreq = 5 x Iop x Isr/Ipr x ( Rct + RI + Sr/IrxIr )"  ---(1) ──
    sz(8); normal(); tc(0);
    let cx = ML + 4;
    T('Ealreq  =  5  x', cx, y);
    cx += doc.getTextWidth('Ealreq  =  5  x') + 4;
    T('Iop', cx, y);
    cx += doc.getTextWidth('Iop') + 4;
    T('x', cx, y); cx += doc.getTextWidth('x') + 2;
    cx = fraction('Isr', 'Ipr', cx, y);
    cx += 2;
    T('x  ( Rct  +  RI  +', cx, y);
    cx += doc.getTextWidth('x  ( Rct  +  RI  +') + 2;
    cx = fraction('Sr', 'Ir  x  Ir', cx, y);
    T(' )', cx, y);
    sz(7.5); tc(80); T('—(1)', PW - MR, y, 'right'); tc(0);
    y += 14;

    // ── Left glossary ──────────────────────────────────────────────────────
    const glossY = y;
    sz(7.5); normal(); tc(0);
    const gloss = [
      'Equivalent Secondary emf. Required',
      'CT primary rated current(A)',
      'Primary operate current',
      'CT secondary rated current',
      'Relay rated current',
      'CT secondary winding resistance.',
      'Total Lead Resistance',
      'Burden of REQ 650 Relay',
      'CT Iopernal Burden  PE = Rct  x  Isr  x  Isr',
      'Rated CT Burden',
      'Rated ALF',
    ];
    gloss.forEach((item, i) => T(item, ML + 4, glossY + i * 5.5));

    // ── Right parameter values ─────────────────────────────────────────────
    const Iop = +(data.result.intermediates['Iop (A)'] as number) || Ikmax;
    const PE  = +(Rct * Isn * Isn).toFixed(2);
    const PN  = +(PE / ((Sr || 0.001)) * 100).toFixed(2);

    const pvRows: [string, string, string][] = [
      ['Ealreq', '', ''],
      ['Ipr',   `${Ipn}`, 'A'],
      ['Iop',   `${Iop}`, 'A'],
      ['Isr',   `${Isn}`, 'A'],
      ['Ir',    `${Ir}`,  'A'],
      ['Rct',   `${Rct}`, 'Ohm'],
      ['RI',    `${Rl}`,  'Ohm'],
      ['Sr',    ``,       'VA'],
      ['PE',    `${PE}`,  'VA'],
      ['PN',    `${PN}`,  'VA'],
      ['n',     ``,       ''],
    ];

    const pxR = ML + 108;
    const exR = pxR + 28;
    pvRows.forEach(([label, val, unit], i) => {
      const ry = glossY + i * 5.5;
      sz(8); normal(); tc(0);
      if (label) T(label, pxR, ry);
      if (val) {
        T('=', exR, ry);
        bold(); T(val, exR + 5, ry);
        normal(); if (unit) T(unit, exR + 5 + doc.getTextWidth(val) + 2, ry);
      } else if (label && label !== 'Ealreq') {
        T('=', exR, ry);
      }
    });

    y = glossY + pvRows.length * 5.5 + 6;

    // ── Substituted line ───────────────────────────────────────────────────
    sz(8); normal(); tc(0);
    fLine(
      'Ealreq',
      `5  x  ${Iop}  x  (1/${Ipn})  x  ( ${Rct}  +  ${Rl}  +  ${SnIr2} )`,
      '—(1)',
    );
    fCont(`5  x  ${Iop}  x  (1/${Ipn})  x  ( ${burden} )`);
    boxed(`${data.result.ealreq_max}`, 'V');
    gap(5);

    // ── Vk derivation (right-aligned block as in Image 1) ─────────────────
    therefore('Therefore, the required knee point voltage of the CT.');
    sz(8); normal(); tc(0);
    T('(Vk in terms of Ealreq as per the Manufacturer Refer Annexure-B)', ML, y);
    y += 8;

    const vkX = ML + 100;
    sz(8); normal(); tc(0);
    T('Vk',  vkX,      y);
    T('=',   vkX + 10, y);
    T('Ealreq  x  0.8', vkX + 16, y); y += 6;
    T('',    vkX,      y);
    T('=',   vkX + 10, y);
    T(`${data.result.ealreq_max}  x  0.8`, vkX + 16, y); y += 6;
    T('',    vkX,      y);
    T('=',   vkX + 10, y);
    const bvw = doc.getTextWidth(`${data.result.vk_required}`) + 8;
    lw(0.35); dc(0);
    R(vkX + 16, y - 5.5, bvw, 7.5, 'S');
    bold(); sz(9); T(`${data.result.vk_required}`, vkX + 20, y);
    normal(); sz(8); T('V', vkX + 16 + bvw + 2, y);
    y += 12;

    // ── Final comparison ───────────────────────────────────────────────────
    sz(8); normal(); tc(0);
    T('Available Vk', ML + 4, y);
    T(ok ? '>=' : '<', ML + 36, y);
    T('Required Vk', ML + 50, y);
    y += 6;
    sz(9); bold();
    T(`${Vk}`, ML + 10, y, 'center');
    sz(8); normal();
    T(ok ? '>=' : '<', ML + 36, y);
    bold(); sz(9);
    T(`${data.result.vk_required}`, ML + 55, y, 'center');
    y += 8;
    sz(8.5); bold();
    T('Hence CT is:', ML, y);
    T(ok ? 'Suitably Dimensioned' : 'Under Dimensioned', ML + 28, y);
    y += 10;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER — all pages (thin rule + tiny gray text, matching Hitachi style)
  // ══════════════════════════════════════════════════════════════════════════
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    lw(0.25); dc(0);
    L(ML, PH - 12, PW - MR, PH - 12);
    sz(7); normal(); tc(120);
    doc.text(s(`${data.companyName ?? 'CT/VT Adequacy'}  —  CT/VT Adequacy Check Report`), ML, PH - 7);
    doc.text(`Page ${i} of ${totalPages}`, PW - MR, PH - 7, { align: 'right' });
  }

  // ── Save file ─────────────────────────────────────────────────────────────
  const fname = s(data.projectName ?? data.templateName).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`ct_adequacy_${fname}_${new Date(data.createdAt).toISOString().split('T')[0]}.pdf`);
}