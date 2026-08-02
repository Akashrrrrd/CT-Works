'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calculator, CheckCircle, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ABBRET670InputData {
 ct_parameters: {
 ct_ratio_tap1: number;
 ct_ratio_tap2: number;
 ct_ratio_tap3: number;
 ct_ratio_secondary: number;
 class_of_accuracy: string;
 ct_resistance: number;
 knee_point_voltage: number;
 magnetizing_current: number;
 };
 system_parameters: {
 system_frequency: number;
 hv_bus_voltage: number;
 mv_bus_voltage: number;
 max_hv_fault_current: number;
 max_mv_fault_current: number;
 transformer_rating_mva: number;
 percentage_impedance: number;
 };
 wiring_parameters: {
 total_lead_resistance: number;
 conductor_length: number;
 conductor_cross_section: number;
 resistance_per_km: number;
 };
 connected_devices: {
 ret670_burden: number;
 other_devices_burden: number;
 };
}

interface RET670CalculationResult {
 final_verdict: string;
 transformer_calculations: any;
 ealreq_calculations: any;
 ct_adequacy_check: any;
 validation: any;
}

export function ABBRET670Calculator() {
 const [inputData, setInputData] = useState<ABBRET670InputData>({
 // Default values from standard document
 ct_parameters: {
 ct_ratio_tap1: 3200,
 ct_ratio_tap2: 600,
 ct_ratio_tap3: 0,
 ct_ratio_secondary: 1,
 class_of_accuracy: 'PX',
 ct_resistance: 16,
 knee_point_voltage: 1600,
 magnetizing_current: 10
 },
 system_parameters: {
 system_frequency: 50,
 hv_bus_voltage: 132,
 mv_bus_voltage: 33,
 max_hv_fault_current: 50000,
 max_mv_fault_current: 40000,
 transformer_rating_mva: 100,
 percentage_impedance: 25
 },
 wiring_parameters: {
 total_lead_resistance: 1.10,
 conductor_length: 120,
 conductor_cross_section: 6.0,
 resistance_per_km: 3.69
 },
 connected_devices: {
 ret670_burden: 0.02,
 other_devices_burden: 0
 }
 });

 const [result, setResult] = useState<RET670CalculationResult | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const handleCalculate = async () => {
 setLoading(true);
 setError(null);
 
 try {
 const response = await fetch('/api/relay-formulas/abb-ret670', {
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

 const updateInput = (section: keyof ABBRET670InputData, field: string, value: number | string) => {
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
 <Zap className="h-6 w-6 text-red-600" />
 <div>
 <CardTitle>ABB RET670 CT Adequacy Calculator</CardTitle>
 <CardDescription>
 Multi-Function Transformer Protection Relay</CardDescription>
 </div>
 </div>
 <div className="flex gap-2 mt-4">
 <Badge variant="secondary">132kV/33kV Transformer</Badge>
 <Badge variant="secondary">100MVA Rating</Badge>
 <Badge variant="outline">Differential + REF Protection</Badge>
 </div>
 </CardHeader>
 </Card>

 {/* Input Sections */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 
 {/* CT Parameters */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">CT Parameters</CardTitle>
 <CardDescription>Current transformer specifications and ratios</CardDescription>
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
 <Label>CT Ratio Tap-2 (A) *Used</Label>
 <Input
 type="number"
 value={inputData.ct_parameters.ct_ratio_tap2}
 onChange={(e) => updateInput('ct_parameters', 'ct_ratio_tap2', parseFloat(e.target.value))}
 className="border-blue-300 bg-blue-50"
 />
 </div>
 <div>
 <Label>CT Secondary (A)</Label>
 <Input
 type="number"
 value={inputData.ct_parameters.ct_ratio_secondary}
 onChange={(e) => updateInput('ct_parameters', 'ct_ratio_secondary', parseFloat(e.target.value))}
 />
 </div>
 <div>
 <Label>Class of Accuracy</Label>
 <Input
 type="text"
 value={inputData.ct_parameters.class_of_accuracy}
 onChange={(e) => updateInput('ct_parameters', 'class_of_accuracy', e.target.value)}
 />
 </div>
 <div>
 <Label>CT Resistance Rct (Ω)</Label>
 <Input
 type="number"
 value={inputData.ct_parameters.ct_resistance}
 onChange={(e) => updateInput('ct_parameters', 'ct_resistance', parseFloat(e.target.value))}
 />
 </div>
 <div>
 <Label>Knee Point Voltage Vk (V)</Label>
 <Input
 type="number"
 value={inputData.ct_parameters.knee_point_voltage}
 onChange={(e) => updateInput('ct_parameters', 'knee_point_voltage', parseFloat(e.target.value))}
 />
 </div>
 </div>
 </CardContent>
 </Card>

 {/* System Parameters */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">System Parameters</CardTitle>
 <CardDescription>Power system and transformer characteristics</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>System Frequency (Hz)</Label>
 <Input
 type="number"
 value={inputData.system_parameters.system_frequency}
 onChange={(e) => updateInput('system_parameters', 'system_frequency', parseFloat(e.target.value))}
 />
 </div>
 <div>
 <Label>Transformer Rating (MVA)</Label>
 <Input
 type="number"
 value={inputData.system_parameters.transformer_rating_mva}
 onChange={(e) => updateInput('system_parameters', 'transformer_rating_mva', parseFloat(e.target.value))}
 />
 </div>
 <div>
 <Label>HV Bus Voltage (kV)</Label>
 <Input
 type="number"
 value={inputData.system_parameters.hv_bus_voltage}
 onChange={(e) => updateInput('system_parameters', 'hv_bus_voltage', parseFloat(e.target.value))}
 />
 </div>
 <div>
 <Label>MV Bus Voltage (kV)</Label>
 <Input
 type="number"
 value={inputData.system_parameters.mv_bus_voltage}
 onChange={(e) => updateInput('system_parameters', 'mv_bus_voltage', parseFloat(e.target.value))}
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
 <Label>Max MV Fault Current (A)</Label>
 <Input
 type="number"
 value={inputData.system_parameters.max_mv_fault_current}
 onChange={(e) => updateInput('system_parameters', 'max_mv_fault_current', parseFloat(e.target.value))}
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
 <div>
 <Label>Conductor Cross Section (mm²)</Label>
 <Input
 type="number"
 step="0.1"
 value={inputData.wiring_parameters.conductor_cross_section}
 onChange={(e) => updateInput('wiring_parameters', 'conductor_cross_section', parseFloat(e.target.value))}
 />
 </div>
 <div>
 <Label>Resistance per km (Ω/km)</Label>
 <Input
 type="number"
 step="0.01"
 value={inputData.wiring_parameters.resistance_per_km}
 onChange={(e) => updateInput('wiring_parameters', 'resistance_per_km', parseFloat(e.target.value))}
 />
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Connected Devices */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Connected Device Burdens</CardTitle>
 <CardDescription>Burden values for devices connected to CT core</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>RET670 Burden (VA)</Label>
 <Input
 type="number"
 step="0.01"
 value={inputData.connected_devices.ret670_burden}
 onChange={(e) => updateInput('connected_devices', 'ret670_burden', parseFloat(e.target.value))}
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
 className="min-w-48 bg-red-600 hover:bg-red-700"
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
 <CardTitle>RET670 Calculation Results</CardTitle>
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
 Transformer differential protection CT adequacy per Standard Engineering standards
 </p>
 </div>
 </CardContent>
 </Card>

 {/* Detailed Results */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 
 {/* Transformer Calculations */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Transformer Calculations</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <div className="flex justify-between">
 <span>Transformer Rating:</span>
 <span className="font-mono">{result.transformer_calculations?.rated_mva} MVA</span>
 </div>
 <div className="flex justify-between">
 <span>HV Full Load Current:</span>
 <span className="font-mono">{result.transformer_calculations?.hv_full_load_current?.toFixed(2)} A</span>
 </div>
 <div className="flex justify-between">
 <span>MV Full Load Current:</span>
 <span className="font-mono">{result.transformer_calculations?.mv_full_load_current?.toFixed(2)} A</span>
 </div>
 <div className="flex justify-between">
 <span>Percentage Impedance:</span>
 <span className="font-mono">{result.transformer_calculations?.percentage_impedance}%</span>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Ealreq Calculations */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Ealreq Calculations</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <div className="flex justify-between">
 <span>Equation (1) Result:</span>
 <span className="font-mono">{result.ealreq_calculations?.equation_1_result?.toFixed(2)} V</span>
 </div>
 <div className="flex justify-between">
 <span>Equation (2) Result:</span>
 <span className="font-mono">{result.ealreq_calculations?.equation_2_result?.toFixed(2)} V</span>
 </div>
 <div className="flex justify-between">
 <span>Equation (3) Result:</span>
 <span className="font-mono text-red-600 font-bold">
 {result.ealreq_calculations?.equation_3_result?.toFixed(2)} V
 </span>
 </div>
 <div className="pt-2 border-t">
 <div className="flex justify-between">
 <span className="font-medium">Controlling Equation:</span>
 <Badge variant="destructive">
 Equation ({result.ealreq_calculations?.controlling_equation})
 </Badge>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* CT Adequacy Check */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">CT Adequacy Check</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <div className="flex justify-between">
 <span>Required Vk:</span>
 <span className="font-mono">{result.ct_adequacy_check?.required_vk?.toFixed(2)} V</span>
 </div>
 <div className="flex justify-between">
 <span>Available Vk:</span>
 <span className="font-mono">{result.ct_adequacy_check?.available_vk} V</span>
 </div>
 <div className="flex justify-between">
 <span>Safety Margin:</span>
 <span className="font-mono text-green-600">
 +{result.ct_adequacy_check?.safety_margin?.toFixed(1)}%
 </span>
 </div>
 <div className="pt-2 border-t">
 <div className="flex justify-between items-center">
 <span className="font-medium">Check:</span>
 <Badge variant={result.ct_adequacy_check?.suitable ? "default" : "destructive"}>
 Available {result.ct_adequacy_check?.suitable ? '>' : '<'} Required
 </Badge>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Validation Results */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Document Validation</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span>Validation Status:</span>
 <Badge variant={result.validation?.validation ? "default" : "destructive"}>
 {result.validation?.validation ? 'PASSED' : 'FAILED'}
 </Badge>
 </div>
 <div className="text-sm text-gray-600">
 <p className="font-medium">Expected Values (Standard Doc):</p>
 <p>• Transformer Current: 437.39 A</p>
 <p>• Controlling Ealreq: 274.47 V</p>
 <p>• Required Vk: 219.57 V</p>
 </div>
 <div className="text-xs text-gray-500">
 {result.validation?.summary}
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Document Reference */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Document Reference</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <p><strong></strong> </p>
 <p><strong>Title:</strong> CT/VT ADEQUACY CHECK</p>
 <p><strong>Application:</strong> 132kV_100MVA TR. FEEDERS</p>
 </div>
 <div>
 <p><strong>Date:</strong> 4/22/2026</p>
 <p><strong>Contractor:</strong> STANDARD</p>
 <p><strong>Device:</strong> Multi Func. Trans. Protection +HV REF</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 )}
 </div>
 );
}