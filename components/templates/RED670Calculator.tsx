'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calculator, CheckCircle, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RED670InputData {
  ct_parameters: {
    ct_ratio_tap1: number;
    ct_ratio_tap2: number;
    ct_ratio_secondary: number;
    class_of_accuracy: string;
    ct_resistance_tap1: number;
    ct_resistance_tap2: number;
    knee_point_voltage_tap1: number;
    knee_point_voltage_tap2: number;
    magnetizing_current_tap1: number;
    magnetizing_current_tap2: number;
  };
  system_parameters: {
    system_frequency: number;
    hv_bus_voltage: number;
    mv_bus_voltage: number;
    max_hv_fault_current: number;
    max_through_fault_3ph: number;
    max_through_fault_1ph: number;
    max_endzone1_3ph: number;
    max_endzone1_1ph: number;
    xr_ratio: number;
    system_time_constant_3ph: number;
    system_time_constant_1ph_through: number;
    system_time_constant_1ph_endzone: number;
  };
  wiring_parameters: {
    total_lead_resistance: number;
    conductor_length: number;
    conductor_cross_section: number;
    resistance_per_km: number;
  };
  connected_devices: {
    red670_burden: number;
    other_devices_burden: number;
  };
  cable_parameters: {
    positive_sequence_resistance: number;
    positive_sequence_reactance: number;
    zero_sequence_resistance: number;
    zero_sequence_reactance: number;
    route_length: number;
  };
}
interface RED670CalculationResult {
  final_verdict: string;
  differential_calculations: any;
  distance_calculations: any;
  ct_adequacy_check: any;
  tap_comparison: any;
  validation: any;
}

export function RED670Calculator() {
  const [inputData, setInputData] = useState<RED670InputData>({
    // Default values from Hitachi document
    ct_parameters: {
      ct_ratio_tap1: 3200,
      ct_ratio_tap2: 1800,
      ct_ratio_secondary: 1,
      class_of_accuracy: 'PX',
      ct_resistance_tap1: 9.8,
      ct_resistance_tap2: 5.6,
      knee_point_voltage_tap1: 2000,
      knee_point_voltage_tap2: 1250,
      magnetizing_current_tap1: 10,
      magnetizing_current_tap2: 20
    },
    system_parameters: {
      system_frequency: 50,
      hv_bus_voltage: 132,
      mv_bus_voltage: 132,
      max_hv_fault_current: 50000,
      max_through_fault_3ph: 42230,
      max_through_fault_1ph: 43475,
      max_endzone1_3ph: 43585,
      max_endzone1_1ph: 44648,
      xr_ratio: 15,
      system_time_constant_3ph: 47.73,
      system_time_constant_1ph_through: 27.37,
      system_time_constant_1ph_endzone: 29.64
    },
    wiring_parameters: {
      total_lead_resistance: 1.10,
      conductor_length: 120,
      conductor_cross_section: 6.0,
      resistance_per_km: 4.48759
    },
    connected_devices: {
      red670_burden: 0.02,
      other_devices_burden: 0
    },
    cable_parameters: {
      positive_sequence_resistance: 0.0221,
      positive_sequence_reactance: 0.1600,
      zero_sequence_resistance: 0.1300,
      zero_sequence_reactance: 0.0600,
      route_length: 1.74
    }
  });

  const [result, setResult] = useState<RED670CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/relay-formulas/red670', {
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

  const updateInput = (section: keyof RED670InputData, field: string, value: number | string) => {
    setInputData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: typeof value === 'string' ? value : Number(value)
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle>RED670 CT Adequacy Calculator</CardTitle>
              <CardDescription>
                132kV Cable Feeders - Line Differential & Distance Protection per Hitachi Standards N-19957 2-DF4W
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary">132kV Cable Feeders</Badge>
            <Badge variant="secondary">Line Differential</Badge>
            <Badge variant="outline">Distance Protection</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Input Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CT Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CT Parameters</CardTitle>
            <CardDescription>Current transformer specifications for both taps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CT Ratio Tap-1 (A)</Label>
                <Input
                  type="number"
                  value={inputData.ct_parameters.ct_ratio_tap1}
                  onChange={(e) => updateInput('ct_parameters', 'ct_ratio_tap1', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>CT Ratio Tap-2 (A) *Recommended</Label>
                <Input
                  type="number"
                  value={inputData.ct_parameters.ct_ratio_tap2}
                  onChange={(e) => updateInput('ct_parameters', 'ct_ratio_tap2', parseFloat(e.target.value))}
                  className="border-green-300 bg-green-50"
                />
              </div>
              <div>
                <Label>CT Resistance Tap-1 (Ω)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={inputData.ct_parameters.ct_resistance_tap1}
                  onChange={(e) => updateInput('ct_parameters', 'ct_resistance_tap1', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>CT Resistance Tap-2 (Ω)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={inputData.ct_parameters.ct_resistance_tap2}
                  onChange={(e) => updateInput('ct_parameters', 'ct_resistance_tap2', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Vk Tap-1 (V)</Label>
                <Input
                  type="number"
                  value={inputData.ct_parameters.knee_point_voltage_tap1}
                  onChange={(e) => updateInput('ct_parameters', 'knee_point_voltage_tap1', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Vk Tap-2 (V)</Label>
                <Input
                  type="number"
                  value={inputData.ct_parameters.knee_point_voltage_tap2}
                  onChange={(e) => updateInput('ct_parameters', 'knee_point_voltage_tap2', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* System Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Parameters</CardTitle>
            <CardDescription>Power system fault current parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>HV Bus Voltage (kV)</Label>
                <Input
                  type="number"
                  value={inputData.system_parameters.hv_bus_voltage}
                  onChange={(e) => updateInput('system_parameters', 'hv_bus_voltage', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>System Frequency (Hz)</Label>
                <Input
                  type="number"
                  value={inputData.system_parameters.system_frequency}
                  onChange={(e) => updateInput('system_parameters', 'system_frequency', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Max HV Fault Current (A)</Label>
                <Input
                  type="number"
                  value={inputData.system_parameters.max_hv_fault_current}
                  onChange={(e) => updateInput('system_parameters', 'max_hv_fault_current', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Through Fault 3-ph (A)</Label>
                <Input
                  type="number"
                  value={inputData.system_parameters.max_through_fault_3ph}
                  onChange={(e) => updateInput('system_parameters', 'max_through_fault_3ph', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Through Fault 1-ph (A)</Label>
                <Input
                  type="number"
                  value={inputData.system_parameters.max_through_fault_1ph}
                  onChange={(e) => updateInput('system_parameters', 'max_through_fault_1ph', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Endzone-1 3-ph (A)</Label>
                <Input
                  type="number"
                  value={inputData.system_parameters.max_endzone1_3ph}
                  onChange={(e) => updateInput('system_parameters', 'max_endzone1_3ph', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Wiring Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wiring Parameters</CardTitle>
            <CardDescription>CT to relay wiring specifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Lead Resistance RL (Ω)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputData.wiring_parameters.total_lead_resistance}
                  onChange={(e) => updateInput('wiring_parameters', 'total_lead_resistance', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Conductor Length (m)</Label>
                <Input
                  type="number"
                  value={inputData.wiring_parameters.conductor_length}
                  onChange={(e) => updateInput('wiring_parameters', 'conductor_length', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connected Device Burdens</CardTitle>
            <CardDescription>Burden values for devices connected to CT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>RED670 Burden (VA)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputData.connected_devices.red670_burden}
                  onChange={(e) => updateInput('connected_devices', 'red670_burden', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Other Devices Burden (VA)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={inputData.connected_devices.other_devices_burden}
                  onChange={(e) => updateInput('connected_devices', 'other_devices_burden', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Calculate Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleCalculate} 
          disabled={loading}
          size="lg"
          className="min-w-48 bg-green-600 hover:bg-green-700"
        >
          <Calculator className="mr-2 h-4 w-4" />
          {loading ? 'Calculating...' : 'Calculate CT Adequacy'}
        </Button>
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
                <CardTitle>RED670 Calculation Results</CardTitle>
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
                  132kV Cable Feeder protection CT adequacy per Hitachi standards
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Tap Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {result.tap_comparison && Object.entries(result.tap_comparison).map(([tapKey, tapData]: [string, any]) => (
              <Card key={tapKey} className={tapKey === 'tap2' ? 'border-green-300 bg-green-50' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {tapData.tap_info.name} 
                    {tapKey === 'tap2' && <Badge className="ml-2 bg-green-600">Recommended</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Primary Current:</span>
                      <span className="font-mono">{tapData.tap_info.primary_current} A</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CT Resistance:</span>
                      <span className="font-mono">{tapData.tap_info.ct_resistance} Ω</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available Vk:</span>
                      <span className="font-mono">{tapData.tap_info.available_vk} V</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between">
                        <span>Required Vk:</span>
                        <span className="font-mono">{tapData.overall_assessment.required_vk?.toFixed(2)} V</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Safety Margin:</span>
                        <span className="font-mono text-green-600">
                          +{tapData.overall_assessment.safety_margin?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-medium">Verdict:</span>
                        <Badge variant={tapData.overall_assessment.suitable ? "default" : "destructive"}>
                          {tapData.overall_assessment.verdict}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Detailed Results for Recommended Tap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Differential Protection Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Differential Protection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Close-in Faults:</span>
                    <span className="font-mono">{result.differential_calculations?.close_in_faults?.toFixed(2)} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Through Faults (3-ph):</span>
                    <span className="font-mono">{result.differential_calculations?.through_faults_3ph?.toFixed(2)} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Through Faults (1-ph):</span>
                    <span className="font-mono">{result.differential_calculations?.through_faults_1ph?.toFixed(2)} V</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="font-medium">Controlling:</span>
                      <span className="text-sm">{result.differential_calculations?.controlling_equation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Highest Ealreq:</span>
                      <span className="font-mono font-bold">{result.differential_calculations?.highest_ealreq?.toFixed(2)} V</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Distance Protection Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distance Protection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Close-in Faults:</span>
                    <span className="font-mono">{result.distance_calculations?.close_in_faults?.toFixed(2)} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Endzone-1 (3-ph):</span>
                    <span className="font-mono">{result.distance_calculations?.endzone1_3ph?.toFixed(2)} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Endzone-1 (1-ph):</span>
                    <span className="font-mono text-green-600 font-bold">
                      {result.distance_calculations?.endzone1_1ph?.toFixed(2)} V
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="font-medium">Controlling:</span>
                      <span className="text-sm">{result.distance_calculations?.controlling_equation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Highest Ealreq:</span>
                      <span className="font-mono font-bold">{result.distance_calculations?.highest_ealreq?.toFixed(2)} V</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Document Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Reference & Validation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Document:</strong> N-19957 2-DF4W</p>
                  <p><strong>Application:</strong> 132kV Cable Feeders</p>
                  <p><strong>Device:</strong> Line Differential & Distance Protection</p>
                </div>
                <div>
                  <p><strong>Functions:</strong> 87L, 21, 50/51, 50BF</p>
                  <p><strong>Validation:</strong> 
                    <Badge variant={result.validation?.validation ? "default" : "destructive"} className="ml-2">
                      {result.validation?.validation ? 'PASSED' : 'FAILED'}
                    </Badge>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {result.validation?.summary}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}