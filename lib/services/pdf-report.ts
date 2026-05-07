// Browser-only module — always use dynamic import() from client components
import type { Sheet1Inputs, Sheet2Inputs, CTAdequacyResult } from './ct-adequacy';

export interface ReportData {
  templateName: string;
  createdAt:    string;
  createdBy:    string;
  sheet1:       Sheet1Inputs;
  sheet2:       Sheet2Inputs;
  result:       CTAdequacyResult;
  // Optional branding / project metadata
  companyName?:   string;
  projectName?:   string;
  contractNo?:    string;
  substationName?:string;
  revisionNo?:    string;
}

const safe = (t: string) =>
  String(t)
    .replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/→/g,'=>').replace(/←/g,'<-')
    .replace(/×/g,'x').replace(/√/g,'sqrt').replace(/Ω/g,'Ohm')
    .replace(/⁶/g,'^6').replace(/³/g,'^3').replace(/²/g,'^2')
    .replace(/—/g,'-').replace(/[^\x00-\xFF]/g,'?');

export async function generatePDFReport(data: ReportData): Promise<void> {
  const jsPDFModule   = await import('jspdf');
  const autoTableMod  = await import('jspdf-autotable');
  const jsPDF         = jsPDFModule.default;
  const autoTable     = autoTableMod.default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 20;

  // Black and white colors only - matching Hitachi document
  const BLACK = [0, 0, 0] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];

  // Helper functions
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
    doc.text(safe(text), x, yPos, alignOptions);
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

  // Calculate values from the adequacy result
  const burden = +(data.sheet1.rct + data.sheet2.lead_resistance + 
    data.sheet2.relay_burden_va / (data.sheet1.ct_ratio_secondary ** 2)).toFixed(4);
  const ikmax = +(data.result.intermediates['Ikmax (A)'] || 0);
  const verdict = data.result.verdict === 'SUITABLY DIMENSIONED' ? 'SUITABLY DIMENSIONED' : 'UNDER DIMENSIONED';

  // ═══ HEADER SECTION - Exact Hitachi Format ═══
  
  // Company box (top left)
  drawBox(15, 15, 50, 25, true);
  txt('HITACHI', 40, 30, { size: 12, bold: true, align: 'center' });

  // CT/VT Adequacy Check title (top center)
  drawBox(70, 15, 80, 25, true);
  txt('CT / VT', 110, 25, { size: 10, bold: true, align: 'center' });
  txt('ADEQUACY CHECK', 110, 32, { size: 10, bold: true, align: 'center' });

  // Contract details (top right)
  drawBox(155, 15, 40, 25, true);
  txt('Contract No.', 160, 22, { size: 8 });
  txt('N-19957.1-DF5W', 160, 27, { size: 8 });
  txt('Date', 160, 32, { size: 8 });
  txt(new Date().toLocaleDateString(), 160, 37, { size: 8 });

  // Project details row
  y = 45;
  drawBox(15, y, 50, 15, true);
  txt('Prep. By', 18, y + 5, { size: 8 });
  txt('AP', 18, y + 10, { size: 8, bold: true });

  drawBox(70, y, 80, 15, true);
  txt('33kV DF5W SS', 110, y + 5, { size: 10, bold: true, align: 'center' });
  txt('Parameters & Fault Calculations', 110, y + 10, { size: 8, align: 'center' });

  drawBox(155, y, 40, 15, true);
  txt('Document No.', 160, y + 5, { size: 8 });
  txt('A', 160, y + 10, { size: 8, bold: true });
  txt('Revision No.', 160, y + 12, { size: 8 });

  // Substation details
  y = 65;
  drawBox(15, y, 180, 10, true);
  txt('33kV CABLE FEEDERS', 105, y + 7, { size: 10, bold: true, align: 'center' });

  // ═══ CT DATA TABLE - Exact Hitachi Layout ═══
  y = 85;
  
  // Table headers
  drawBox(15, y, 30, 8, true);
  txt('T1', 30, y + 6, { size: 9, bold: true, align: 'center' });
  
  drawBox(45, y, 25, 8, true);
  txt('Conn', 57.5, y + 6, { size: 9, bold: true, align: 'center' });
  
  drawBox(70, y, 35, 8, true);
  txt('(Diff + Dist)', 87.5, y + 6, { size: 8, align: 'center' });
  
  drawBox(105, y, 40, 8, true);
  txt('Connected devices:', 125, y + 6, { size: 8, align: 'center' });
  
  drawBox(145, y, 25, 8, true);
  txt(data.templateName.includes('REQ650') ? 'REQ650' : 'REQ650', 157.5, y + 6, { size: 9, bold: true, align: 'center' });

  // Second row
  y += 8;
  drawBox(45, y, 25, 8, true);
  txt('Tab-2', 57.5, y + 6, { size: 8, align: 'center' });
  
  drawBox(70, y, 35, 8, true);
  txt('Tab-3', 87.5, y + 6, { size: 8, align: 'center' });

  // CT Parameters Section
  y += 20;
  
  // CT Ratio
  txt('CT Ratio:', 20, y, { size: 9 });
  drawBox(50, y - 4, 25, 8, true);
  txt(data.sheet1.ct_ratio_primary.toString(), 62.5, y, { size: 9, align: 'center' });
  txt(':', 75, y, { size: 9 });
  drawBox(80, y - 4, 15, 8, true);
  txt('1', 87.5, y, { size: 9, align: 'center' });
  txt('A', 100, y, { size: 9 });

  y += 12;
  
  // Class of Accuracy
  txt('Class of Accuracy:', 20, y, { size: 9 });
  drawBox(70, y - 4, 20, 8, true);
  txt(data.sheet1.accuracy_class, 80, y, { size: 9, align: 'center' });

  y += 12;
  
  // CT Resistance
  txt('CT Resistance:', 20, y, { size: 9 });
  txt('Rct =', 70, y, { size: 9 });
  drawBox(85, y - 4, 20, 8, true);
  txt(data.sheet1.rct.toString(), 95, y, { size: 9, align: 'center' });
  txt('Ohm', 110, y, { size: 9 });

  y += 12;
  
  // Knee Point Voltage
  txt('Knee Point Voltage:', 20, y, { size: 9 });
  txt('Vk =', 70, y, { size: 9 });
  drawBox(85, y - 4, 20, 8, true);
  txt(data.sheet1.vk_available.toString(), 95, y, { size: 9, align: 'center' });
  txt('V', 110, y, { size: 9 });

  y += 12;
  
  // Magnetizing Current
  txt('Magnetizing Current:', 20, y, { size: 9 });
  txt('Io =', 70, y, { size: 9 });
  drawBox(85, y - 4, 20, 8, true);
  txt(data.sheet1.io_at_vk.toString(), 95, y, { size: 9, align: 'center' });
  txt('mA at Vk', 110, y, { size: 9 });

  // ═══ OTHER BURDENS SECTION ═══
  y += 20;
  txt('Other Burdens on same CT core:', 20, y, { size: 9, bold: true });

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
    txt(row[0], 20, y, { size: 8 });
    txt(row[1], 90, y, { size: 8 });
    txt(row[2], 105, y, { size: 8 });
    drawBox(115, y - 4, 25, 6, true);
    txt(row[3], 127.5, y, { size: 8, align: 'center' });
    txt(row[4], 145, y, { size: 8 });
  });

  // Load + Other resistance calculation (right side)
  const rightY = y - 32;
  txt('Load + Other resistance connected', 120, rightY, { size: 8 });
  txt('Rl = Sr / ( Isn x Isn )', 120, rightY + 8, { size: 8 });
  txt('= 0.47 ( 1 x 1 )', 120, rightY + 16, { size: 8 });
  txt('= 0.47 Ohm', 120, rightY + 24, { size: 8 });

  // ═══ CT ADEQUACY CHECK SECTION ═══
  y += 20;
  txt('A. CT ADEQUACY CHECK FOR DIFFERENTIAL FUNCTION:', 20, y, { size: 10, bold: true });

  y += 10;
  txt('The CT adequacy limiting term (Eal) should meet the following requirements as per Relay manufacturer', 20, y, { size: 9 });

  y += 15;
  
  // Close-in faults calculation
  txt('For Close-in faults:', 20, y, { size: 9 });
  txt('Isn', 100, y, { size: 9 });
  txt('Sr', 120, y, { size: 9 });
  y += 8;
  txt('Ealreq = Ikmax x', 20, y, { size: 9 });
  txt('x ( Rct + Rl + )', 80, y, { size: 9 });
  txt('(1)', 180, y, { size: 9 });
  
  // Subscripts
  doc.setFontSize(7);
  txt('Ipn', 100, y + 3, { size: 7 });
  txt('Isn', 120, y + 3, { size: 7 });
  
  y += 8;
  txt('Isn', 100, y, { size: 9 });
  const ikmax_calc = ikmax.toFixed(0);
  const ratio = (data.sheet1.ct_ratio_secondary / data.sheet1.ct_ratio_primary).toFixed(6);
  txt(`= ${ikmax_calc} x ${ratio} x ${burden}`, 80, y, { size: 9 });
  doc.setFontSize(7);
  txt('Ipn', 100, y + 3, { size: 7 });

  y += 15;
  
  // Through faults calculation  
  txt('For Through faults:', 20, y, { size: 9 });
  txt('Isn', 100, y, { size: 9 });
  txt('Sr', 120, y, { size: 9 });
  y += 8;
  txt('Ealreq = 2 x Ikmax x', 20, y, { size: 9 });
  txt('x ( Rct + Rl + )', 80, y, { size: 9 });
  txt('(2)', 180, y, { size: 9 });
  
  // Subscripts
  doc.setFontSize(7);
  txt('Ipn', 100, y + 3, { size: 7 });
  txt('Isn', 120, y + 3, { size: 7 });

  // Add calculation results
  y += 15;
  const maxEalreq = data.result.ealreq_max;
  const vkRequired = data.result.vk_required;
  
  txt(`Therefore, X/R ratio = ${data.result.intermediates['X/R ratio'] || 'N/A'}`, 20, y, { size: 9 });
  y += 8;
  txt(`Hence, 3-ph fault current for Endzone-1 faults = ${ikmax_calc} x 1.0`, 20, y, { size: 9 });
  y += 8;
  txt(`= ${ikmax_calc} A`, 20, y, { size: 9 });

  // Final verdict box
  y += 20;
  drawBox(20, y, 160, 25, true);
  txt('FINAL VERDICT:', 25, y + 8, { size: 10, bold: true });
  txt(verdict, 25, y + 16, { size: 12, bold: true });
  txt(`Vk Required: ${vkRequired} V`, 25, y + 22, { size: 9 });
  txt(`Vk Available: ${data.result.vk_available} V`, 100, y + 22, { size: 9 });

  const fname = safe(data.templateName).replace(/[^a-z0-9]/gi,'_').toLowerCase();
  const date = new Date(data.createdAt).toISOString().split('T')[0];
  doc.save(`ct_adequacy_${fname}_${date}.pdf`);
}