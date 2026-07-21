'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calculator, CheckCircle, FileText, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Siemens7SJ85InputData {
  ct_wiring: {
    conductor_cross_section: number;
    resistance_w_km_20c: number;
    specific_resistance_20c: number;
    conductor_length_m: number;
  };
  vt_wiring: {
    conductor_cross_section: number;
    resistance_w_km_20c: number;
    specific_resistance_20c: number;
    conductor_length_m: number;
    primary_voltage: number;
    secondary_voltage: number;
  };
  system: {
    system_frequency: number;
    bus_voltage_level: number;
    max_bus_fault_level: number;
    xr_ratio: number;
    mv_bus_voltage_level: number;
    mv_max_bus_fault_rating: number;
  };
  power_line: {
    assumed_cable: number;
    cable_type: string;
    cable_mm2: number;
    cables_per_phase: number;
    positive_seq_resistance_r1: number;
    positive_seq_reactance_x1: number;
    zero_seq_resistance_r0: number;
    zero_seq_reactance_x0: number;
    route_length: number;
    source_impedance_zs: number;  // pu - User provided source impedance
  };
  ct_core: {
    ct_ratio_primary: number;
    ct_ratio_secondary: number;
    class_of_accuracy: string;
    ct_resistance: number;
    rated_burden: number;
    accuracy_limit_factor?: number; // User override for CT Accuracy Limit Factor
  };
  connected_devices: {
    device_7sj85: number;
    device_sel751: number;
    device_fms: number;
    device_avr: number;
  };
}

interface CalculationResult {
  final_verdict: string;
  required_kssc: number;
  available_kssc: number;
  ct_calculations: any;
  vt_calculations: any;
  fault_calculations: any;
  burden_calculations: any;
  adequacy_check: any;
}

export function Siemens7SJ85Calculator() {
  const [inputData, setInputData] = useState<Siemens7SJ85InputData>({
    // Default values from Hitachi document
    ct_wiring: {
      conductor_cross_section: 6.00,
      resistance_w_km_20c: 3.69,
      specific_resistance_20c: 0.00393,
      conductor_length_m: 120
    },
    vt_wiring: {
      conductor_cross_section: 2.50,
      resistance_w_km_20c: 8.87,
      specific_resistance_20c: 0.00393,
      conductor_length_m: 120,
      primary_voltage: 132,
      secondary_voltage: 0.11
    },
    system: {
      system_frequency: 50,
      bus_voltage_level: 132,
      max_bus_fault_level: 50,
      xr_ratio: 15,
      mv_bus_voltage_level: 132,
      mv_max_bus_fault_rating: 40
    },
    power_line: {
      assumed_cable: 3,
      cable_type: 'CU HDPE',
      cable_mm2: 240,
      cables_per_phase: 1,
      positive_seq_resistance_r1: 0.0221,
      positive_seq_reactance_x1: 0.1600,
      zero_seq_resistance_r0: 0.1300,
      zero_seq_reactance_x0: 0.0600,
      route_length: 1.74,
      source_impedance_zs: 1.0  // Default source impedance in pu
    },
    ct_core: {
      ct_ratio_primary: 3150,
      ct_ratio_secondary: 1,
      class_of_accuracy: '5P 20',
      ct_resistance: 9,
      rated_burden: 7.5,
      accuracy_limit_factor: 20 // Default ALF, user can override
    },
    connected_devices: {
      device_7sj85: 0.02,
      device_sel751: 0.02,
      device_fms: 0.06,
      device_avr: 0.20
    }
  });

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/relay-formulas/siemens-7sj85', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData)
      });

      if (!response.ok) {
        throw new Error(`Calculation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const updateInput = (section: keyof Siemens7SJ85InputData, field: string, value: number | string | undefined) => {
    setInputData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value === undefined ? undefined : (typeof value === 'string' ? value : Number(value))
      }
    }));
  };

  const downloadReport = () => {
    if (!result) return;

    // Generate HTML report
    const reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SIEMENS 7SJ85 CT/VT Adequacy Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { margin: 0; color: #0066cc; }
    .header p { margin: 5px 0; color: #666; }
    .verdict { font-size: 24px; font-weight: bold; margin: 20px 0; padding: 15px; border-radius: 8px; text-align: center; }
    .verdict.adequate { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .verdict.inadequate { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .section { margin: 25px 0; padding: 15px; border-left: 4px solid #0066cc; background-color: #f9f9f9; }
    .section h2 { margin: 0 0 15px 0; color: #0066cc; font-size: 18px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .table th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold; }
    .table td { padding: 8px; border-bottom: 1px solid #ddd; }
    .table tr:hover { background-color: #f5f5f5; }
    .label { font-weight: bold; color: #333; min-width: 200px; }
    .value { color: #0066cc; font-weight: bold; }
    .unit { color: #666; font-size: 0.9em; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media print { body { margin: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SIEMENS 7SJ85 CT/VT Adequacy Calculator</h1>
      <p>Multi-function Protection Relay - Per Hitachi Standards N-19957 2-DF4W</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="verdict ${result.final_verdict === 'SUITABLY DIMENSIONED' ? 'adequate' : 'inadequate'}">
      ${result.final_verdict}
    </div>

    <div class="section">
      <h2>CT Adequacy Check</h2>
      <table class="table">
        <tr>
          <td class="label">Required Kssc:</td>
          <td class="value">${result.required_kssc?.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">Available Kssc:</td>
          <td class="value">${result.available_kssc?.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">Status:</td>
          <td class="value">${result.available_kssc > result.required_kssc ? 'PASS ✓' : 'FAIL ✗'}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2>CT Wiring Calculations</h2>
      <table class="table">
        <tr>
          <td class="label">Resistance at 75°C:</td>
          <td class="value">${result.ct_calculations?.resistance_at_75c?.toFixed(5)} <span class="unit">Ω/km</span></td>
        </tr>
        <tr>
          <td class="label">Lead Resistance (RL):</td>
          <td class="value">${result.ct_calculations?.lead_resistance?.toFixed(2)} <span class="unit">Ω</span></td>
        </tr>
        <tr>
          <td class="label">Loop Resistance (2RL):</td>
          <td class="value">${result.ct_calculations?.loop_resistance?.toFixed(2)} <span class="unit">Ω</span></td>
        </tr>
        <tr>
          <td class="label">VA Consumption (Pl):</td>
          <td class="value">${result.ct_calculations?.va_consumption?.toFixed(2)} <span class="unit">VA</span></td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2>Fault Current Calculations</h2>
      <table class="table">
        <tr>
          <td class="label">System Time Constant (tp):</td>
          <td class="value">${result.fault_calculations?.system_tp_ms?.toFixed(2)} <span class="unit">ms</span></td>
        </tr>
        <tr>
          <td class="label">Through Fault Current:</td>
          <td class="value">${result.fault_calculations?.through_fault_current_a?.toFixed(0)} <span class="unit">A</span></td>
        </tr>
        <tr>
          <td class="label">X/R Ratio (Through):</td>
          <td class="value">${result.fault_calculations?.xr_ratio_through?.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2>Burden Calculations</h2>
      <table class="table">
        <tr>
          <td class="label">Internal Burden (PE):</td>
          <td class="value">${result.burden_calculations?.internal_burden_va?.toFixed(2)} <span class="unit">VA</span></td>
        </tr>
        <tr>
          <td class="label">Total Load Burden:</td>
          <td class="value">${result.burden_calculations?.total_load_burden_va?.toFixed(2)} <span class="unit">VA</span></td>
        </tr>
        <tr>
          <td class="label">Total Load Other Burden:</td>
          <td class="value">${result.burden_calculations?.total_load_other_burden_va?.toFixed(2)} <span class="unit">VA</span></td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2>Input Parameters</h2>
      <table class="table">
        <tr>
          <td class="label">CT Ratio Primary:</td>
          <td class="value">${inputData.ct_core.ct_ratio_primary} <span class="unit">A</span></td>
        </tr>
        <tr>
          <td class="label">CT Ratio Secondary:</td>
          <td class="value">${inputData.ct_core.ct_ratio_secondary} <span class="unit">A</span></td>
        </tr>
        <tr>
          <td class="label">CT Resistance:</td>
          <td class="value">${inputData.ct_core.ct_resistance} <span class="unit">Ω</span></td>
        </tr>
        <tr>
          <td class="label">Rated Burden:</td>
          <td class="value">${inputData.ct_core.rated_burden} <span class="unit">VA</span></td>
        </tr>
        <tr>
          <td class="label">Accuracy Limit Factor:</td>
          <td class="value">${inputData.ct_core.accuracy_limit_factor || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Bus Voltage Level:</td>
          <td class="value">${inputData.system.bus_voltage_level} <span class="unit">kV</span></td>
        </tr>
        <tr>
          <td class="label">Max Bus Fault Level:</td>
          <td class="value">${inputData.system.max_bus_fault_level} <span class="unit">kA</span></td>
        </tr>
        <tr>
          <td class="label">CT Lead Length:</td>
          <td class="value">${inputData.ct_wiring.conductor_length_m} <span class="unit">m</span></td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h2>Document Reference</h2>
      <table class="table">
        <tr>
          <td class="label">Document No:</td>
          <td class="value">N-19957 2-DF4W</td>
        </tr>
        <tr>
          <td class="label">Title:</td>
          <td class="value">CT/VT ADEQUACY CHECK</td>
        </tr>
        <tr>
          <td class="label">Substation:</td>
          <td class="value">132/33kV DF4W at Al Dhafra Area</td>
        </tr>
        <tr>
          <td class="label">Contractor:</td>
          <td class="value">HITACHI</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <p>This report was generated by the SIEMENS 7SJ85 CT/VT Adequacy Calculator</p>
      <p>Report generated on: ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Create blob and download
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `7SJ85_Report_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>SIEMENS 7SJ85 CT/VT Adequacy Calculator</CardTitle>
              <CardDescription>
                Multi-function Protection Relay - Per Hitachi Standards N-19957 2-DF4W
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary">132/33kV Substation</Badge>
            <Badge variant="secondary">Al Dhafra Area</Badge>
            <Badge variant="outline">Differential + Distance + OC Protection</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Input Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CT Wiring Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CT Wiring Parameters</CardTitle>
            <CardDescription>Conductor specifications and wiring details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Conductor Cross Section (mm²)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputData.ct_wiring.conductor_cross_section}
                  onChange={(e) => updateInput('ct_wiring', 'conductor_cross_section', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Resistance W/km at 20°C (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputData.ct_wiring.resistance_w_km_20c}
                  onChange={(e) => updateInput('ct_wiring', 'resistance_w_km_20c', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Specific Resistance at 20°C (/K⁻¹)</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={inputData.ct_wiring.specific_resistance_20c}
                  onChange={(e) => updateInput('ct_wiring', 'specific_resistance_20c', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Conductor Length (m)</Label>
                <Input
                  type="number"
                  value={inputData.ct_wiring.conductor_length_m}
                  onChange={(e) => updateInput('ct_wiring', 'conductor_length_m', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VT Wiring Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">VT Wiring Parameters</CardTitle>
            <CardDescription>Voltage transformer wiring specifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>VT Conductor Cross Section (mm²)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputData.vt_wiring.conductor_cross_section}
                  onChange={(e) => updateInput('vt_wiring', 'conductor_cross_section', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>VT Resistance W/km at 20°C (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputData.vt_wiring.resistance_w_km_20c}
                  onChange={(e) => updateInput('vt_wiring', 'resistance_w_km_20c', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>VT Primary Voltage (kV)</Label>
                <Input
                  type="number"
                  value={inputData.vt_wiring.primary_voltage}
                  onChange={(e) => updateInput('vt_wiring', 'primary_voltage', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>VT Secondary Voltage (kV)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputData.vt_wiring.secondary_voltage}
                  onChange={(e) => updateInput('vt_wiring', 'secondary_voltage', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Parameters</CardTitle>
            <CardDescription>Power system electrical characteristics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>System Frequency (Hz)</Label>
                <Input
                  type="number"
                  value={inputData.system.system_frequency}
                  onChange={(e) => updateInput('system', 'system_frequency', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Bus Voltage Level (kV)</Label>
                <Input
                  type="number"
                  value={inputData.system.bus_voltage_level}
                  onChange={(e) => updateInput('system', 'bus_voltage_level', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Max Bus Fault Level (kA)</Label>
                <Input
                  type="number"
                  value={inputData.system.max_bus_fault_level}
                  onChange={(e) => updateInput('system', 'max_bus_fault_level', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>X/R Ratio</Label>
                <Input
                  type="number"
                  value={inputData.system.xr_ratio}
                  onChange={(e) => updateInput('system', 'xr_ratio', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Power Line Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Power Line Parameters</CardTitle>
            <CardDescription>Cable and transmission line specifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cable Type</Label>
                <Input
                  type="text"
                  value={inputData.power_line.cable_type}
                  onChange={(e) => updateInput('power_line', 'cable_type', e.target.value)}
                />
              </div>
              <div>
                <Label>Cable Cross Section (mm²)</Label>
                <Input
                  type="number"
                  value={inputData.power_line.cable_mm2}
                  onChange={(e) => updateInput('power_line', 'cable_mm2', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Cables per Phase</Label>
                <Input
                  type="number"
                  value={inputData.power_line.cables_per_phase}
                  onChange={(e) => updateInput('power_line', 'cables_per_phase', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Route Length (km)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputData.power_line.route_length}
                  onChange={(e) => updateInput('power_line', 'route_length', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Positive Seq. Resistance R1 (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={inputData.power_line.positive_seq_resistance_r1}
                  onChange={(e) => updateInput('power_line', 'positive_seq_resistance_r1', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Positive Seq. Reactance X1 (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={inputData.power_line.positive_seq_reactance_x1}
                  onChange={(e) => updateInput('power_line', 'positive_seq_reactance_x1', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Zero Seq. Resistance R0 (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={inputData.power_line.zero_seq_resistance_r0}
                  onChange={(e) => updateInput('power_line', 'zero_seq_resistance_r0', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Zero Seq. Reactance X0 (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={inputData.power_line.zero_seq_reactance_x0}
                  onChange={(e) => updateInput('power_line', 'zero_seq_reactance_x0', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">Z</span>
                </div>
                <div className="flex-1">
                  <Label className="text-yellow-800 font-medium">
                    Source Impedance Zs (per unit)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputData.power_line.source_impedance_zs}
                    onChange={(e) => updateInput('power_line', 'source_impedance_zs', parseFloat(e.target.value))}
                    className="mt-2 bg-white border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
                  />
                  <p className="text-sm text-yellow-700 mt-2 leading-relaxed">
                    ⚡ <strong>Source impedance in per unit:</strong> Typically 0.05 to 1.0 pu<br/>
                    📐 <strong>Used for fault current calculations</strong>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CT Core Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CT Core Parameters</CardTitle>
            <CardDescription>Current transformer specifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CT Ratio Primary (A)</Label>
                <Input
                  type="number"
                  value={inputData.ct_core.ct_ratio_primary}
                  onChange={(e) => updateInput('ct_core', 'ct_ratio_primary', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>CT Ratio Secondary (A)</Label>
                <Input
                  type="number"
                  value={inputData.ct_core.ct_ratio_secondary}
                  onChange={(e) => updateInput('ct_core', 'ct_ratio_secondary', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Class of Accuracy</Label>
                <Input
                  type="text"
                  value={inputData.ct_core.class_of_accuracy}
                  onChange={(e) => updateInput('ct_core', 'class_of_accuracy', e.target.value)}
                />
              </div>
              <div>
                <Label>CT Resistance Rct (Ω)</Label>
                <Input
                  type="number"
                  value={inputData.ct_core.ct_resistance}
                  onChange={(e) => updateInput('ct_core', 'ct_resistance', parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            {/* Accuracy Limit Factor - Special highlighted section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <div className="flex-1">
                  <Label className="text-blue-800 font-medium">
                    Accuracy Limit Factor (ALF) - User Override
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="20"
                    value={inputData.ct_core.accuracy_limit_factor || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      updateInput('ct_core', 'accuracy_limit_factor', isNaN(value) ? undefined : value);
                    }}
                    className="mt-2 bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-sm text-blue-700 mt-2 leading-relaxed">
                    📋 <strong>Enter your CT test certificate ALF:</strong> This will override the default value from CT class<br/>
                    💡 <strong>Leave blank to use default from CT accuracy class</strong>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connected Device Burdens</CardTitle>
          <CardDescription>Burden values for devices connected to the same CT core</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>7SJ85 Burden (VA)</Label>
              <Input
                type="number"
                step="0.01"
                value={inputData.connected_devices.device_7sj85}
                onChange={(e) => updateInput('connected_devices', 'device_7sj85', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>SEL751 Burden (VA)</Label>
              <Input
                type="number"
                step="0.01"
                value={inputData.connected_devices.device_sel751}
                onChange={(e) => updateInput('connected_devices', 'device_sel751', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>FMS Burden (VA)</Label>
              <Input
                type="number"
                step="0.01"
                value={inputData.connected_devices.device_fms}
                onChange={(e) => updateInput('connected_devices', 'device_fms', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>AVR Burden (VA)</Label>
              <Input
                type="number"
                step="0.01"
                value={inputData.connected_devices.device_avr}
                onChange={(e) => updateInput('connected_devices', 'device_avr', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculate Button */}
      <div className="flex justify-center gap-4">
        <Button 
          onClick={handleCalculate} 
          disabled={loading}
          size="lg"
          className="min-w-48"
        >
          <Calculator className="mr-2 h-4 w-4" />
          {loading ? 'Calculating...' : 'Calculate CT/VT Adequacy'}
        </Button>
        {result && (
          <Button 
            onClick={() => downloadReport()}
            variant="outline"
            size="lg"
            className="min-w-48"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Overall Verdict */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                {result.final_verdict === 'SUITABLY DIMENSIONED' ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                )}
                <CardTitle>Calculation Results</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <h2 className={`text-2xl font-bold ${
                  result.final_verdict === 'SUITABLY DIMENSIONED' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {result.final_verdict}
                </h2>
                <p className="text-gray-600 mt-2">
                  CT adequacy assessment based on Hitachi calculation standards
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CT Calculations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CT Wiring Calculations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Resistance at 75°C:</span>
                    <span className="font-mono">{result.ct_calculations?.resistance_at_75c?.toFixed(5)} Ω/km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lead Resistance RL:</span>
                    <span className="font-mono">{result.ct_calculations?.lead_resistance?.toFixed(2)} Ω</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loop Resistance 2RL:</span>
                    <span className="font-mono">{result.ct_calculations?.loop_resistance?.toFixed(2)} Ω</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VA Consumption Pl:</span>
                    <span className="font-mono">{result.ct_calculations?.va_consumption?.toFixed(2)} VA</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fault Calculations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fault Current Calculations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>System tp:</span>
                    <span className="font-mono">{result.fault_calculations?.system_tp_ms?.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Through Fault Current:</span>
                    <span className="font-mono">{result.fault_calculations?.through_fault_current_a?.toFixed(0)} A</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Endzone-1 Fault Current:</span>
                    <span className="font-mono">{result.fault_calculations?.endzone1_fault_current_a?.toFixed(0)} A</span>
                  </div>
                  <div className="flex justify-between">
                    <span>X/R Ratio (Through):</span>
                    <span className="font-mono">{result.fault_calculations?.xr_ratio_through?.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adequacy Check */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CT Adequacy Check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Required Kssc:</span>
                    <span className="font-mono">{result.required_kssc?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Kssc:</span>
                    <span className="font-mono">{result.available_kssc?.toFixed(2)}</span>
                  </div>
                  
                  {/* Show if user's ALF is being used */}
                  {inputData.ct_core.accuracy_limit_factor && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="text-sm text-blue-800">
                        <strong>✅ Using Your ALF:</strong> {inputData.ct_core.accuracy_limit_factor}
                      </div>
                      <div className="text-xs text-blue-600">
                        (Overriding default from CT accuracy class)
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Check:</span>
                      <Badge variant={result.available_kssc > result.required_kssc ? "default" : "destructive"}>
                        Available {result.available_kssc > result.required_kssc ? '>' : '<'} Required
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Document:</strong> N-19957 2-DF4W</div>
                  <div><strong>Title:</strong> CT/VT ADEQUACY CHECK</div>
                  <div><strong>Substation:</strong> 132/33kV DF4W at Al Dhafra Area</div>
                  <div><strong>Date:</strong> 4/22/2026</div>
                  <div><strong>Contractor:</strong> HITACHI</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}