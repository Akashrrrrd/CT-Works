// Browser-only — always use dynamic import() from client components
import type { DeviceResult, SystemParameters } from './ct-adequacy';

// Legacy types kept for backward compatibility
import type { Sheet1Inputs, Sheet2Inputs, CTAdequacyResult } from './ct-adequacy';
export interface ReportData {
  templateName: string; createdAt: string; createdBy: string;
  sheet1: Sheet1Inputs; sheet2: Sheet2Inputs; result: CTAdequacyResult;
  companyName?: string; projectName?: string; contractNo?: string;
  substationName?: string; revisionNo?: string;
}

// Safe ASCII encoder for jsPDF
const safe = (t: string) =>
  String(t)
    .replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/Ω/g,'Ohm').replace(/×/g,'x')
    .replace(/√/g,'sqrt').replace(/[^\x00-\xFF]/g,'?');

// ── helpers ──────────────────────────────────────────────────────────────────
function colorFor(verdict: DeviceResult['verdict']): [number,number,number] {
  return verdict === 'SUITABLY DIMENSIONED' ? [22,163,74]
       : verdict === 'UNDER DIMENSIONED'    ? [220,38,38]
       : [107,114,128];
}

// ── Per-device PDF ────────────────────────────────────────────────────────────
export async function generateDevicePDFReport(
  result: DeviceResult,
  sysParams: SystemParameters
): Promise<void> {
  const { default: jsPDF }     = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  const BLACK: [number,number,number] = [0,0,0];
  const LIGHT_GRAY: [number,number,number] = [245,245,245];

  const h1 = (text: string, yy: number) => {
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(...BLACK);
    doc.text(safe(text), 15, yy);
  };
  const h2 = (text: string, yy: number) => {
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...BLACK);
    doc.text(safe(text), 15, yy);
  };
  const body = (text: string, x: number, yy: number, size = 9) => {
    doc.setFontSize(size); doc.setFont('helvetica','normal'); doc.setTextColor(...BLACK);
    doc.text(safe(text), x, yy);
  };

  // ── Header ──
  doc.setFillColor(30,30,30);
  doc.rect(0, 0, W, 20, 'F');
  doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text('CT ADEQUACY ANALYSIS REPORT', 15, 13);
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - 15, 13, { align: 'right' });

  y = 28;

  // ── Device info ──
  h1(`Device: ${result.device_name}`, y); y += 7;
  body(`Type: ${result.device_type.replace(/_/g,' ')}   |   Core: ${sysParams ? '' : 'N/A'}`, 15, y); y += 10;

  // ── Verdict banner ──
  const vc = colorFor(result.verdict);
  doc.setFillColor(...vc);
  doc.roundedRect(15, y, W - 30, 18, 3, 3, 'F');
  doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text(safe(result.verdict), 20, y + 7);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text(`Vk Required: ${result.vk_required} V   |   Vk Available: ${result.vk_available > 0 ? result.vk_available + ' V' : 'N/A'}`, 20, y + 14);
  y += 24;

  // ── CT Input Parameters ──
  h2('CT Input Parameters', y); y += 6;
  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    headStyles: { fillColor: [50,50,50], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    head: [['Parameter', 'Value', 'Parameter', 'Value']],
    body: [
      ['CT Ratio', `${result.inputs.ct_ratio_primary}/${result.inputs.ct_ratio_secondary} A`,
       'Accuracy Class', result.inputs.accuracy_class],
      ['CT Resistance (Rct)', `${result.inputs.rct} Ohm`,
       'Lead Resistance (Rl)', `${result.inputs.lead_resistance} Ohm`],
      ['Relay Burden (Sr)', `${result.inputs.relay_burden_va} VA`,
       'Bus Voltage', `${result.inputs.bus_voltage_kv} kV`],
      ['Bus Fault Level', `${result.inputs.max_bus_fault_kA} kA`,
       'Route Length', `${result.inputs.route_length_km} km`],
      ['R1', `${result.inputs.r1} Ohm/km`,
       'X1', `${result.inputs.x1} Ohm/km`],
      ['R0', `${result.inputs.r0} Ohm/km`,
       'X0', `${result.inputs.x0} Ohm/km`],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── System Parameters ──
  if (sysParams) {
    h2('System Parameters (17 Standard Inputs)', y); y += 6;
    const sysPairs = Object.entries(sysParams)
      .filter(([,v]) => v && v !== 'N/A')
      .map(([k, v]) => [k.replace(/_/g,' '), String(v)]);
    const sysRows: string[][] = [];
    for (let i = 0; i < sysPairs.length; i += 2) {
      sysRows.push([
        ...(sysPairs[i]   ?? ['','']),
        ...(sysPairs[i+1] ?? ['','']),
      ]);
    }
    autoTable(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      headStyles: { fillColor: [70,130,180], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      head: [['Parameter', 'Value', 'Parameter', 'Value']],
      body: sysRows,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Calculation Breakdown ──
  h2('Calculation Breakdown (per fault condition)', y); y += 6;
  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    headStyles: { fillColor: [50,50,50], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    head: [['Fault Condition', 'Formula Used', 'Ealreq (V)', 'Vk Req (V)', '']],
    body: result.vk_breakdown.map(row => [
      row.label,
      row.formula,
      row.ealreq.toString(),
      row.vk.toString(),
      row.isMax ? 'MAX' : '',
    ]),
    didParseCell: (data: any) => {
      if (data.column.index === 4 && data.cell.raw === 'MAX') {
        data.cell.styles.fillColor = [255,251,204];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Intermediates ──
  if (y > 240) { doc.addPage(); y = 15; }
  h2('Intermediate Calculation Values', y); y += 6;
  const intPairs = Object.entries(result.intermediates).map(([k, v]) => [k, String(v)]);
  const intRows: string[][] = [];
  for (let i = 0; i < intPairs.length; i += 2) {
    intRows.push([
      ...(intPairs[i]   ?? ['','']),
      ...(intPairs[i+1] ?? ['','']),
    ]);
  }
  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    headStyles: { fillColor: [80,80,80], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    head: [['Parameter', 'Value', 'Parameter', 'Value']],
    body: intRows,
  });

  const fname = safe(result.device_name).replace(/[^a-z0-9]/gi,'_').toLowerCase();
  doc.save(`ct_adequacy_${fname}.pdf`);
}

// ── Consolidated PDF (all devices) ───────────────────────────────────────────
export async function generateConsolidatedPDFReport(
  results: DeviceResult[],
  sysParams: SystemParameters
): Promise<void> {
  const { default: jsPDF }     = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const BLACK: [number,number,number] = [0,0,0];
  const LIGHT_GRAY: [number,number,number] = [245,245,245];
  let y = 15;

  // ── Cover header ──
  doc.setFillColor(20,20,20);
  doc.rect(0,0,W,22,'F');
  doc.setFontSize(15); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text('CT ADEQUACY ANALYSIS — CONSOLIDATED REPORT', 15, 14);
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text(`${results.length} devices evaluated  |  ${new Date().toLocaleString()}`, W-15, 14, { align:'right' });

  y = 30;

  // ── System Parameters summary ──
  doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...BLACK);
  doc.text('System Parameters (17 Standard Inputs — Same for All Devices)', 15, y); y += 6;

  const sysPairs = Object.entries(sysParams)
    .filter(([,v]) => v && v !== 'N/A')
    .map(([k,v]) => [k.replace(/_/g,' '), String(v)]);
  const sysRows: string[][] = [];
  for (let i = 0; i < sysPairs.length; i += 3) {
    sysRows.push([
      ...(sysPairs[i]   ?? ['','']),
      ...(sysPairs[i+1] ?? ['','']),
      ...(sysPairs[i+2] ?? ['','']),
    ]);
  }
  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    headStyles: { fillColor: [50,100,160], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    head: [['Parameter','Value','Parameter','Value','Parameter','Value']],
    body: sysRows,
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Summary table ──
  doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...BLACK);
  doc.text('Devices Summary', 15, y); y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    headStyles: { fillColor: [50,50,50], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    head: [['#','Device Name','Type','CT Ratio','Rct(Ω)','Vk Avail(V)','Vk Req(V)','Ealreq Max(V)','Verdict']],
    body: results.map((r,i) => [
      i+1,
      r.device_name,
      r.device_type.replace(/_/g,' '),
      `${r.inputs.ct_ratio_primary}/${r.inputs.ct_ratio_secondary}`,
      r.inputs.rct,
      r.vk_available > 0 ? r.vk_available : 'N/A',
      r.vk_required,
      r.ealreq_max,
      r.verdict,
    ]),
    didParseCell: (data: any) => {
      if (data.column.index === 8) {
        const val = data.cell.raw;
        if (val === 'SUITABLY DIMENSIONED')  { data.cell.styles.fillColor = [209,250,229]; data.cell.styles.textColor = [22,101,52]; }
        if (val === 'UNDER DIMENSIONED')     { data.cell.styles.fillColor = [254,226,226]; data.cell.styles.textColor = [153,27,27]; }
        if (val === 'NOT APPLICABLE')        { data.cell.styles.fillColor = [243,244,246]; data.cell.styles.textColor = [75,85,99]; }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Detailed breakdown per device (one section each) ──
  for (const result of results) {
    if (y > 155) { doc.addPage(); y = 15; }

    const vc = colorFor(result.verdict);
    doc.setFillColor(...vc);
    doc.roundedRect(15, y, W-30, 10, 2, 2, 'F');
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    doc.text(
      safe(`Device ${result.device_index+1}: ${result.device_name} — ${result.verdict}  |  Vk Req: ${result.vk_required} V  |  Vk Avail: ${result.vk_available > 0 ? result.vk_available + ' V' : 'N/A'}`),
      20, y+7
    );
    y += 14;

    autoTable(doc, {
      startY: y,
      margin: { left: 15, right: 15 },
      headStyles: { fillColor: [80,80,80], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      head: [['Fault Condition','Formula','Ealreq (V)','Vk Req (V)','']],
      body: result.vk_breakdown.map(row => [
        row.label, row.formula, row.ealreq, row.vk, row.isMax ? 'MAX' : '',
      ]),
      didParseCell: (data: any) => {
        if (data.column.index === 4 && data.cell.raw === 'MAX') {
          data.cell.styles.fillColor = [255,251,204];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  doc.save(`ct_adequacy_consolidated_${Date.now()}.pdf`);
}

// ── Legacy PDF (single-device via old ReportData shape) ──────────────────────
export async function generatePDFReport(data: ReportData): Promise<void> {
  // Wrap legacy data into the new per-device format
  const fakeResult: DeviceResult = {
    device_name:  data.templateName,
    device_index: 0,
    device_type:  'GENERIC',
    verdict:      data.result.verdict as DeviceResult['verdict'],
    vk_available: data.result.vk_available,
    vk_required:  data.result.vk_required,
    ealreq_max:   data.result.ealreq_max,
    vk_breakdown: data.result.vk_breakdown.map(v => ({ ...v, formula: v.label })),
    intermediates: data.result.intermediates,
    inputs: {
      ct_ratio_primary:   data.sheet1.ct_ratio_primary,
      ct_ratio_secondary: data.sheet1.ct_ratio_secondary,
      accuracy_class:     data.sheet1.accuracy_class,
      rct:                data.sheet1.rct,
      lead_resistance:    data.sheet2.lead_resistance,
      relay_burden_va:    data.sheet2.relay_burden_va,
      frequency:          data.sheet2.frequency,
      bus_voltage_kv:     data.sheet2.bus_voltage_kv,
      max_bus_fault_kA:   data.sheet2.max_bus_fault_mva,
      r1: data.sheet2.r1, x1: data.sheet2.x1,
      r0: data.sheet2.r0, x0: data.sheet2.x0,
      route_length_km:    data.sheet2.route_length_km,
    },
  };
  const sys: SystemParameters = {
    bus_fault_level: String(data.sheet2.max_bus_fault_mva),
    system_frequency: String(data.sheet2.frequency),
    bus_voltage_level: `${data.sheet2.bus_voltage_kv}kV`,
    xr_ratio: 'N/A',
    route_length: String(data.sheet2.route_length_km),
    positive_seq_resistance_r1: String(data.sheet2.r1),
    positive_seq_reactance_z1: String(data.sheet2.x1),
    negative_seq_resistance_r0: String(data.sheet2.r0),
    negative_seq_reactance_z0: String(data.sheet2.x0),
  };
  await generateDevicePDFReport(fakeResult, sys);
}
