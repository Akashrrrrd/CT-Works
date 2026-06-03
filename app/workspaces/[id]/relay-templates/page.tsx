'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload, FileText, CheckCircle2, XCircle, Download,
  Loader2, AlertCircle, Calculator, FileDown
} from 'lucide-react';
import { calculateAllDevices, type DeviceInput, type SystemParameters, type DeviceResult } from '@/lib/services/ct-adequacy';

export default function ExcelProcessingPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [file, setFile]                       = useState<File | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [processedData, setProcessedData]     = useState<any>(null);
  const [deviceResults, setDeviceResults]     = useState<DeviceResult[] | null>(null);
  const [error, setError]                     = useState('');

  // ── file pick ────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setProcessedData(null); setDeviceResults(null); setError(''); }
  };

  // ── process Excel ────────────────────────────────────────────────────────
  const processExcel = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setDeviceResults(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch(`/api/workspaces/${workspaceId}/import-excel-ct`, { method: 'POST', body: fd });
      const data = await res.json();
      setProcessedData(data);
      if (!data.success) setError(data.error || 'Failed to process Excel file');
    } catch (err) {
      setError('Failed to process Excel file');
    } finally {
      setLoading(false);
    }
  };

  // ── compute CT for all devices ───────────────────────────────────────────
  const computeAllDevices = () => {
    if (!processedData?.success || !processedData?.data) return;
    const data = processedData.data;

    const sys: SystemParameters = {
      bus_fault_level:             data.standard_parameters?.bus_fault_level             || String(data.max_bus_fault_mva) + 'kA',
      system_frequency:            data.standard_parameters?.system_frequency             || String(data.frequency),
      bus_voltage_level:           data.standard_parameters?.bus_voltage_level            || String(data.bus_voltage_kv) + 'kV',
      xr_ratio:                    data.standard_parameters?.xr_ratio                    || 'N/A',
      ct_wiring_conductor_cross_section_1: data.standard_parameters?.ct_wiring_conductor_cross_section_1,
      resistance_w_km_20c_1:       data.standard_parameters?.resistance_w_km_20c_1,
      specific_resistance_20c_1:   data.standard_parameters?.specific_resistance_20c_1,
      lead_length_vt_to_relay_1:   data.standard_parameters?.lead_length_vt_to_relay_1,
      ct_wiring_conductor_cross_section_2: data.standard_parameters?.ct_wiring_conductor_cross_section_2,
      resistance_w_km_20c_2:       data.standard_parameters?.resistance_w_km_20c_2,
      specific_resistance_20c_2:   data.standard_parameters?.specific_resistance_20c_2,
      lead_length_vt_to_relay_2:   data.standard_parameters?.lead_length_vt_to_relay_2,
      route_length:                data.standard_parameters?.route_length                || String(data.route_length_km),
      positive_seq_resistance_r1:  data.standard_parameters?.positive_seq_resistance_r1  || String(data.r1),
      positive_seq_reactance_z1:   data.standard_parameters?.positive_seq_reactance_z1   || String(data.x1),
      negative_seq_resistance_r0:  data.standard_parameters?.negative_seq_resistance_r0  || String(data.r0),
      negative_seq_reactance_z0:   data.standard_parameters?.negative_seq_reactance_z0   || String(data.x0),
      power_rating:                data.standard_parameters?.power_rating,
      impedance:                   data.standard_parameters?.impedance,
      rated_voltage:               data.standard_parameters?.rated_voltage,
    };

    const devices: DeviceInput[] = (data.devices || []).map((d: any) => ({
      device_name:            d.device_name,
      core:                   d.core,
      ct_core_used_for:       d.ct_core_used_for,
      ct_ratio:               d.ct_ratio,
      accuracy_class:         d.accuracy_class,
      ct_resistance:          d.ct_resistance,
      vk_knee_point_voltage:  d.vk_knee_point_voltage,
      burden:                 d.burden,
      magnetizing_current:    d.magnetizing_current,
    }));

    const results = calculateAllDevices(devices, sys);
    setDeviceResults(results);
  };

  // ── download individual PDF for one device ───────────────────────────────
  const downloadDeviceReport = async (result: DeviceResult) => {
    const { generateDevicePDFReport } = await import('@/lib/services/pdf-report');
    generateDevicePDFReport(result, processedData.data.standard_parameters);
  };

  // ── download consolidated PDF ────────────────────────────────────────────
  const downloadConsolidatedReport = async () => {
    if (!deviceResults) return;
    const { generateConsolidatedPDFReport } = await import('@/lib/services/pdf-report');
    generateConsolidatedPDFReport(deviceResults, processedData.data.standard_parameters);
  };

  const verdictColor = (v: DeviceResult['verdict']) =>
    v === 'SUITABLY DIMENSIONED' ? 'text-green-700 bg-green-50 border-green-200'
    : v === 'UNDER DIMENSIONED'   ? 'text-red-700 bg-red-50 border-red-200'
    : 'text-gray-600 bg-gray-50 border-gray-200';

  const verdictBadge = (v: DeviceResult['verdict']) =>
    v === 'SUITABLY DIMENSIONED' ? 'bg-green-100 text-green-800'
    : v === 'UNDER DIMENSIONED'   ? 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-700';

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Excel CT Adequacy Processing</h1>
        <p className="text-muted-foreground mt-2">
          Upload your Excel file — the system will detect all devices and compute CT adequacy for each one independently.
        </p>
      </div>

      {/* ── Upload Card ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Supports the standard 17-parameter + N-device format (.xlsx / .xls)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="cursor-pointer" />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <Button onClick={processExcel} disabled={!file || loading} className="w-full">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
              : <><Upload className="h-4 w-4 mr-2" />Process Excel Data</>}
          </Button>
        </CardContent>
      </Card>

      {/* ── JSON + Compute button ── */}
      {processedData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Processed Data (JSON)</CardTitle>
            <CardDescription>
              {processedData.summary?.devices_found || 0} devices detected · {processedData.summary?.standard_parameters_found || 0} standard parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-72 border">
              {JSON.stringify(processedData, null, 2)}
            </pre>

            <Button
              onClick={computeAllDevices}
              disabled={!processedData.success}
              className="w-full"
              size="lg"
            >
              <Calculator className="h-5 w-5 mr-2" />
              Compute CT Data for All {processedData.summary?.devices_found || 0} Devices
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Per-device results ── */}
      {deviceResults && deviceResults.length > 0 && (
        <div className="space-y-6">
          {/* Consolidated summary row */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              CT Adequacy Results — {deviceResults.length} Device{deviceResults.length > 1 ? 's' : ''}
            </h2>
            <Button onClick={downloadConsolidatedReport} variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Download Consolidated Report
            </Button>
          </div>

          {/* Status overview chips */}
          <div className="flex flex-wrap gap-3">
            {deviceResults.map((r, i) => (
              <span
                key={i}
                className={`px-3 py-1 rounded-full text-sm font-medium border ${verdictColor(r.verdict)}`}
              >
                {r.device_name}: {r.verdict}
              </span>
            ))}
          </div>

          {/* Individual device cards */}
          {deviceResults.map((result, idx) => (
            <Card key={idx} className={`border-2 ${result.verdict === 'SUITABLY DIMENSIONED' ? 'border-green-200' : result.verdict === 'UNDER DIMENSIONED' ? 'border-red-200' : 'border-gray-200'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-3">
                      Device {idx + 1}: {result.device_name}
                      <Badge className={verdictBadge(result.verdict)}>
                        {result.verdict === 'SUITABLY DIMENSIONED'
                          ? <><CheckCircle2 className="h-3 w-3 mr-1 inline" />SUITABLE</>
                          : result.verdict === 'UNDER DIMENSIONED'
                          ? <><XCircle className="h-3 w-3 mr-1 inline" />UNDER DIMENSIONED</>
                          : 'NOT APPLICABLE'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Type: {result.device_type.replace(/_/g, ' ')} &nbsp;|&nbsp; Core: {(processedData.data.devices[idx]?.core) || 'N/A'}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadDeviceReport(result)}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF Report
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Verdict banner */}
                <div className={`rounded-lg border p-4 ${verdictColor(result.verdict)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg">{result.verdict}</div>
                      <div className="text-sm mt-1">
                        Vk Required: <strong>{result.vk_required} V</strong> &nbsp;|&nbsp;
                        Vk Available: <strong>{result.vk_available > 0 ? result.vk_available + ' V' : 'N/A'}</strong>
                      </div>
                    </div>
                    {result.verdict !== 'NOT APPLICABLE' && (
                      <div className="text-right">
                        <div className="text-3xl font-bold">{result.vk_available > 0 ? ((result.vk_available / result.vk_required) * 100).toFixed(0) : '—'}%</div>
                        <div className="text-xs">Vk ratio</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CT Inputs used */}
                <div>
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">CT Input Parameters Used</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {[
                      ['CT Ratio', `${result.inputs.ct_ratio_primary}/${result.inputs.ct_ratio_secondary}A`],
                      ['Accuracy Class', result.inputs.accuracy_class],
                      ['Rct (Ω)', result.inputs.rct],
                      ['Lead Resistance (Ω)', result.inputs.lead_resistance],
                      ['Relay Burden (VA)', result.inputs.relay_burden_va],
                      ['Bus Voltage (kV)', result.inputs.bus_voltage_kv],
                      ['Fault Level (kA)', result.inputs.max_bus_fault_kA],
                      ['Route Length (km)', result.inputs.route_length_km],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="bg-muted rounded p-2">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="font-semibold">{value !== undefined && value !== null ? String(value) : 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vk breakdown table */}
                <div>
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">Calculation Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left p-3 font-semibold">Fault Condition</th>
                          <th className="text-left p-3 font-semibold text-xs">Formula</th>
                          <th className="text-right p-3 font-semibold">Ealreq (V)</th>
                          <th className="text-right p-3 font-semibold">Vk Req (V)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.vk_breakdown.map((row, ri) => (
                          <tr key={ri} className={`border-t ${row.isMax ? 'bg-yellow-50 font-semibold' : ''}`}>
                            <td className="p-3">
                              {row.label}
                              {row.isMax && <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-1 rounded">MAX</span>}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground max-w-xs truncate" title={row.formula}>{row.formula}</td>
                            <td className="p-3 text-right">{row.ealreq}</td>
                            <td className="p-3 text-right">{row.vk}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted font-bold">
                          <td className="p-3" colSpan={2}>Maximum Ealreq → Vk Required (× 0.8)</td>
                          <td className="p-3 text-right">{result.ealreq_max}</td>
                          <td className="p-3 text-right">{result.vk_required}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Intermediate values (collapsed) */}
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                    View All Intermediate Values
                  </summary>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {Object.entries(result.intermediates).map(([k, v]) => (
                      <div key={k} className="bg-muted rounded p-2">
                        <div className="text-xs text-muted-foreground">{k}</div>
                        <div className="font-mono text-sm">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
