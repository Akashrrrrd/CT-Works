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
  if (typeof window === 'undefined') return;
  const [{ default: jsPDF }] = await Promise.all([import('jspdf')]);

  // ── Page constants (A4 portrait, mm) - Hitachi format ──────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW  = doc.internal.pageSize.getWidth();   // 210
  const PH  = doc.internal.pageSize.getHeight();  // 297
  const ML  = 15;  // Increased margins for Hitachi format
  const MR  = 15;
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
  let y = 20;

  // ── Black and white colors only (Hitachi style) ──────────────────────────
  const BLACK = [0, 0, 0] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];

  // ── Helper functions for Hitachi format ──────────────────────────────────
  const txt = (text: string, x: number, yPos: number, options?: { 
    size?: number; 
    bold?: boolean; 
    align?: 'left' | 'center' | 'right' 
  }) => {
    doc.setFontSize(options?.size || 10);
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setTextColor(...BLACK);
    const alignOptions: any = {};
    if (options?.align) alignOptions.align = options.align;
    doc.text(s(text), x, yPos, alignOptions);
  };

  const drawBox = (x: number, yPos: number, width: number, height: number, fill = false) => {
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.5);
    if (fill) {
      doc.setFillColor(...WHITE);
      doc.rect(x, yPos, width, height, 'FD');
    } else {
      doc.rect(x, yPos, width, height);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER SECTION - Exact Hitachi Format
  // ══════════════════════════════════════════════════════════════════════════
  const drawHeader = () => {
    // Company box (top left)
    drawBox(ML, 15, 50, 25, true);
    txt('HITACHI', ML + 25, 30, { size: 12, bold: true, align: 'center' });

    // CT/VT Adequacy Check title (top center)
    drawBox(ML + 55, 15, 80, 25, true);
    txt('CT / VT', ML + 95, 25, { size: 10, bold: true, align: 'center' });
    txt('ADEQUACY CHECK', ML + 95, 32, { size: 10, bold: true, align: 'center' });

    // Contract details (top right)
    drawBox(ML + 140, 15, 55, 25, true);
    txt('Contract No.', ML + 142, 22, { size: 8 });
    txt('N-19957.1-DF5W', ML + 142, 27, { size: 8 });
    txt('Date', ML + 142, 32, { size: 8 });
    txt(new Date().toLocaleDateString(), ML + 142, 37, { size: 8 });

    // Project details row
    drawBox(ML, 45, 50, 15, true);
    txt('Prep. By', ML + 2, 50, { size: 8 });
    txt('AP', ML + 2, 55, { size: 8, bold: true });

    drawBox(ML + 55, 45, 80, 15, true);
    txt('33kV DF5W SS', ML + 95, 50, { size: 10, bold: true, align: 'center' });
    txt('Parameters & Fault Calculations', ML + 95, 55, { size: 8, align: 'center' });

    drawBox(ML + 140, 45, 55, 15, true);
    txt('Document No.', ML + 142, 50, { size: 8 });
    txt('A', ML + 142, 55, { size: 8, bold: true });

    // Substation details
    drawBox(ML, 65, 180, 10, true);
    txt('33kV CABLE FEEDERS', ML + 90, 72, { size: 10, bold: true, align: 'center' });

    y = 85;
  };

  drawHeader();

  // ══════════════════════════════════════════════════════════════════════════
  // CT NAMEPLATE SECTION - Exact Hitachi Format
  // ══════════════════════════════════════════════════════════════════════════
  
  // Table headers row
  drawBox(ML, y, 30, 8, true);
  txt('T1', ML + 15, y + 6, { size: 9, bold: true, align: 'center' });
  
  drawBox(ML + 30, y, 25, 8, true);
  txt('Conn', ML + 42.5, y + 6, { size: 9, bold: true, align: 'center' });
  
  drawBox(ML + 55, y, 35, 8, true);
  txt('(Diff + Dist)', ML + 72.5, y + 6, { size: 8, align: 'center' });
  
  drawBox(ML + 90, y, 40, 8, true);
  txt('Connected devices:', ML + 110, y + 6, { size: 8, align: 'center' });
  
  drawBox(ML + 130, y, 25, 8, true);
  const relayName = data.templateName.includes('REQ650') ? 'REQ650' : 'REQ650';
  txt(relayName, ML + 142.5, y + 6, { size: 9, bold: true, align: 'center' });

  // Second row
  y += 8;
  drawBox(ML + 30, y, 25, 8, true);
  txt('Tab-2', ML + 42.5, y + 6, { size: 8, align: 'center' });
  
  drawBox(ML + 55, y, 35, 8, true);
  txt('Tab-3', ML + 72.5, y + 6, { size: 8, align: 'center' });

  // CT Parameters
  y += 20;
  
  // CT Ratio
  txt('CT Ratio:', ML, y, { size: 9 });
  drawBox(ML + 35, y - 4, 25, 8, true);
  txt(data.sheet1.ct_ratio_primary.toString(), ML + 47.5, y, { size: 9, align: 'center' });
  txt(':', ML + 65, y, { size: 9 });
  drawBox(ML + 70, y - 4, 15, 8, true);
  txt('1', ML + 77.5, y, { size: 9, align: 'center' });
  txt('A', ML + 90, y, { size: 9 });

  y += 12;
  
  // Class of Accuracy
  txt('Class of Accuracy:', ML, y, { size: 9 });
  drawBox(ML + 60, y - 4, 20, 8, true);
  txt(data.sheet1.accuracy_class, ML + 70, y, { size: 9, align: 'center' });

  y += 12;
  
  // CT Resistance
  txt('CT Resistance:', ML, y, { size: 9 });
  txt('Rct =', ML + 60, y, { size: 9 });
  drawBox(ML + 75, y - 4, 20, 8, true);
  txt(data.sheet1.rct.toString(), ML + 85, y, { size: 9, align: 'center' });
  txt('Ohm', ML + 100, y, { size: 9 });

  y += 12;
  
  // Knee Point Voltage
  txt('Knee Point Voltage:', ML, y, { size: 9 });
  txt('Vk =', ML + 60, y, { size: 9 });
  drawBox(ML + 75, y - 4, 20, 8, true);
  txt(data.sheet1.vk_available.toString(), ML + 85, y, { size: 9, align: 'center' });
  txt('V', ML + 100, y, { size: 9 });

  y += 12;
  
  // Magnetizing Current
  txt('Magnetizing Current:', ML, y, { size: 9 });
  txt('Io =', ML + 60, y, { size: 9 });
  drawBox(ML + 75, y - 4, 20, 8, true);
  txt(data.sheet1.io_at_vk.toString(), ML + 85, y, { size: 9, align: 'center' });
  txt('mA at Vk', ML + 100, y, { size: 9 });

  // ═══ OTHER BURDENS SECTION ═══
  y += 20;
  txt('Other Burdens on same CT core:', ML, y, { size: 9, bold: true });

  y += 10;
  
  // Burden table - exact format from Hitachi document
  const burdenRows = [
    ['Burden of REQ650', 'Sr', '=', data.sheet2.relay_burden_va.toFixed(2), 'VA'],
    ['Burden of', '', '=', '', 'VA'],
    ['Burden of', '', '=', '', 'VA'],
    ['Total lead burden:', '', '=', data.sheet2.lead_resistance.toString(), 'VA'],
    ['Total load + Other burden:', 'St', '=', burden.toString(), 'VA']
  ];

  burdenRows.forEach((row, i) => {
    y += 8;
    txt(row[0], ML, y, { size: 8 });
    txt(row[1], ML + 70, y, { size: 8 });
    txt(row[2], ML + 85, y, { size: 8 });
    drawBox(ML + 95, y - 4, 25, 6, true);
    txt(row[3], ML + 107.5, y, { size: 8, align: 'center' });
    txt(row[4], ML + 125, y, { size: 8 });
  });

  // Load + Other resistance calculation (right side)
  const rightY = y - 32;
  txt('Load + Other resistance connected', ML + 100, rightY, { size: 8 });
  txt('Rl = Sr / ( Isn x Isn )', ML + 100, rightY + 8, { size: 8 });
  txt('= 0.47 ( 1 x 1 )', ML + 100, rightY + 16, { size: 8 });
  txt('= 0.47 Ohm', ML + 100, rightY + 24, { size: 8 });

  // ═══ CT ADEQUACY CHECK SECTION ═══
  y += 20;
  txt('A. CT ADEQUACY CHECK FOR DIFFERENTIAL FUNCTION:', ML, y, { size: 10, bold: true });

  y += 10;
  txt('The CT adequacy limiting term (Eal) should meet the following requirements as per Relay manufacturer', ML, y, { size: 9 });

  y += 15;
  
  // Close-in faults calculation
  txt('For Close-in faults:', ML, y, { size: 9 });
  txt('Isn', ML + 80, y, { size: 9 });
  txt('Sr', ML + 100, y, { size: 9 });
  y += 8;
  txt('Ealreq = Ikmax x', ML, y, { size: 9 });
  txt('x ( Rct + Rl + )', ML + 60, y, { size: 9 });
  txt('(1)', ML + 160, y, { size: 9 });
  
  // Subscripts
  doc.setFontSize(7);
  txt('Ipn', ML + 80, y + 3, { size: 7 });
  txt('Isn', ML + 100, y + 3, { size: 7 });
  
  y += 8;
  txt('Isn', ML + 80, y, { size: 9 });
  const ikmax_calc = Ikmax.toFixed(0);
  const ratio = (data.sheet1.ct_ratio_secondary / data.sheet1.ct_ratio_primary).toFixed(6);
  txt(`= ${ikmax_calc} x ${ratio} x ${burden}`, ML + 60, y, { size: 9 });
  doc.setFontSize(7);
  txt('Ipn', ML + 80, y + 3, { size: 7 });

  y += 15;
  
  // Through faults calculation  
  txt('For Through faults:', ML, y, { size: 9 });
  txt('Isn', ML + 80, y, { size: 9 });
  txt('Sr', ML + 100, y, { size: 9 });
  y += 8;
  txt('Ealreq = 2 x Ikmax x', ML, y, { size: 9 });
  txt('x ( Rct + Rl + )', ML + 60, y, { size: 9 });
  txt('(2)', ML + 160, y, { size: 9 });
  
  // Subscripts
  doc.setFontSize(7);
  txt('Ipn', ML + 80, y + 3, { size: 7 });
  txt('Isn', ML + 100, y + 3, { size: 7 });

  // Add calculation results
  y += 15;
  const maxEalreq = data.result.ealreq_max;
  const vkRequired = data.result.vk_required;
  
  txt(`Therefore, X/R ratio = ${data.result.intermediates['X/R ratio'] || 'N/A'}`, ML, y, { size: 9 });
  y += 8;
  txt(`Hence, 3-ph fault current for Endzone-1 faults = ${ikmax_calc} x 1.0`, ML, y, { size: 9 });
  y += 8;
  txt(`= ${ikmax_calc} A`, ML, y, { size: 9 });

  // Final verdict box
  y += 20;
  drawBox(ML, y, 160, 25, true);
  txt('FINAL VERDICT:', ML + 5, y + 8, { size: 10, bold: true });
  const verdict = data.result.verdict === 'SUITABLY DIMENSIONED' ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';
  txt(verdict, ML + 5, y + 16, { size: 12, bold: true });
  txt(`Vk Required: ${vkRequired} V`, ML + 5, y + 22, { size: 9 });
  txt(`Vk Available: ${data.result.vk_available} V`, ML + 80, y + 22, { size: 9 });

  // Save the PDF with Hitachi format
  const fname = s(data.templateName).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`ct_adequacy_${fname}_${new Date(data.createdAt).toISOString().split('T')[0]}.pdf`);
}