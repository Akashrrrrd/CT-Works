/**
 * CT/VT ADEQUACY CHECK - MAIN WIZARD COMPONENT
 * Step-by-step interface that collects only essential parameters
 * Automatically calculates all derived values
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight, 
  Calculator,
  Plus,
  Trash2,
  Download,
  Eye
} from 'lucide-react';

import type { 
  CTVTAdequacyInput,
  BasicSystemParameters,
  CTWiringParameters,
  VTWiringParameters,
  TransmissionLineParameters,
  IEDParameters,
  CTVTAdequacyReport
} from '@/lib/types/ct-vt-adequacy-types';

import { AutomatedCalculationEngine } from '@/lib/services/automated-calculation-engine';
import { IEDDatabaseService } from '@/lib/services/ied-database';

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}
const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: "Project Info", description: "Basic project details", icon: <CheckCircle className="w-5 h-5" /> },
  { id: 2, title: "System Parameters", description: "Electrical system basics", icon: <CheckCircle className="w-5 h-5" /> },
  { id: 3, title: "Wiring Configuration", description: "CT & VT cable details", icon: <CheckCircle className="w-5 h-5" /> },
  { id: 4, title: "Line Parameters", description: "Transmission line data", icon: <CheckCircle className="w-5 h-5" /> },
  { id: 5, title: "IED Selection", description: "Connected devices", icon: <CheckCircle className="w-5 h-5" /> },
  { id: 6, title: "Results", description: "Calculation results", icon: <Calculator className="w-5 h-5" /> }
];

// Standard cable resistances (Ω/km at 20°C)
const CABLE_RESISTANCES: Record<number, number> = {
  1.5: 12.1,
  2.5: 7.41,  
  4: 4.61,
  6: 3.08,
  10: 1.83,
  16: 1.15,
  25: 0.727,
  35: 0.524,
  50: 0.387
};

// Standard CT ratios
const STANDARD_CT_RATIOS = [
  "50/1A", "100/1A", "150/1A", "200/1A", "300/1A", "400/1A", "600/1A", "800/1A",
  "1000/1A", "1200/1A", "1500/1A", "1600/1A", "2000/1A", "2500/1A", "3000/1A", "3200/1A",
  "50/5A", "100/5A", "150/5A", "200/5A", "300/5A", "400/5A", "600/5A", "800/5A"
];

export function AdequacyWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<CTVTAdequacyReport | null>(null);
  
  // ... existing state variables ...

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center space-x-2">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300
                ${currentStep === step.id 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg scale-110' 
                  : currentStep > step.id 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }
              `}>
                {currentStep > step.id ? '✓' : step.id}
              </div>
              <div className="ml-2 mr-4">
                <div className={`text-sm font-medium ${
                  currentStep === step.id ? 'text-blue-600' : 
                  currentStep > step.id ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                } mr-4`} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
  
  // Form data state
  const [projectInfo, setProjectInfo] = useState({
    name: "",
    substation: "",
    engineer: "",
    date: new Date().toISOString().split('T')[0]
  });

  const [systemParams, setSystemParams] = useState<BasicSystemParameters>({
    bus_fault_level: 31.5,
    system_frequency: 50,
    bus_voltage_level: 132,
    xr_ratio: 15
  });

  const [ctWiring, setCTWiring] = useState<CTWiringParameters>({
    conductor_cross_section: 6,
    resistance_w_km_20c: 3.08,
    lead_length_ct_to_relay: 120
  });

  const [vtWiring, setVTWiring] = useState<VTWiringParameters>({
    conductor_cross_section: 2.5,
    resistance_w_km_20c: 7.41,
    lead_length_vt_to_relay: 120
  });

  const [lineParams, setLineParams] = useState<TransmissionLineParameters>({
    positive_sequence_resistance: 0.0271,
    positive_sequence_reactance: 0.1600,
    zero_sequence_resistance: 0.1300,
    zero_sequence_reactance: 0.0600,
    route_length: 1.74,
    source_impedance_zs: 1.0
  });
  const [ieds, setIEDs] = useState<IEDParameters[]>([
    {
      ied_name: "SIEMENS 7SJ85",
      ct_ratio: "3200/1A",
      accuracy_class: "5P20",
      ct_resistance: 2.5,
      magnetizing_current: 10,
      knee_point_voltage: 2000,
      accuracy_limit_factor: 20
    }
  ]);

  // Auto-update cable resistance when cross-section changes
  useEffect(() => {
    setCTWiring(prev => ({
      ...prev,
      resistance_w_km_20c: CABLE_RESISTANCES[prev.conductor_cross_section] || 3.08
    }));
  }, [ctWiring.conductor_cross_section]);

  useEffect(() => {
    setVTWiring(prev => ({
      ...prev,
      resistance_w_km_20c: CABLE_RESISTANCES[prev.conductor_cross_section] || 7.41
    }));
  }, [vtWiring.conductor_cross_section]);

  // Auto-update X/R ratio based on voltage level
  useEffect(() => {
    let defaultXR = 15;
    if (systemParams.bus_voltage_level >= 220) defaultXR = 40;
    else if (systemParams.bus_voltage_level >= 110) defaultXR = 30;
    else if (systemParams.bus_voltage_level >= 33) defaultXR = 15;
    else defaultXR = 10;
    
    setSystemParams(prev => ({ ...prev, xr_ratio: defaultXR }));
  }, [systemParams.bus_voltage_level]);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    
    try {
      const input: CTVTAdequacyInput = {
        system: systemParams,
        ct_wiring: ctWiring,
        vt_wiring: vtWiring,
        transmission_line: lineParams,
        ieds: ieds
      };

      const report = AutomatedCalculationEngine.performCompleteAnalysis(input);
      setResults(report);
      setCurrentStep(6); // Go to results step
    } catch (error) {
      console.error('Calculation error:', error);
      alert('Calculation failed. Please check your inputs and try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const addIED = () => {
    setIEDs([...ieds, {
      ied_name: "",
      ct_ratio: "1600/1A",
      accuracy_class: "5P20", 
      ct_resistance: 1.5,
      magnetizing_current: 10,
      knee_point_voltage: 1000,
      accuracy_limit_factor: 20
    }]);
  };

  const removeIED = (index: number) => {
    setIEDs(ieds.filter((_, i) => i !== index));
  };

  const updateIED = (index: number, field: keyof IEDParameters, value: string | number) => {
    const updatedIEDs = [...ieds];
    updatedIEDs[index] = { ...updatedIEDs[index], [field]: value };
    setIEDs(updatedIEDs);
  };
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Project Information</h2>
              <p className="text-muted-foreground">Enter basic project details to get started</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input 
                  id="project-name"
                  placeholder="e.g., Alpha Substation 132kV"
                  value={projectInfo.name}
                  onChange={(e) => setProjectInfo({...projectInfo, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="substation">Substation</Label>
                <Input 
                  id="substation"
                  placeholder="e.g., Alpha Switching Station"
                  value={projectInfo.substation}
                  onChange={(e) => setProjectInfo({...projectInfo, substation: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="engineer">Engineer</Label>
                <Input 
                  id="engineer"
                  placeholder="Your name"
                  value={projectInfo.engineer}
                  onChange={(e) => setProjectInfo({...projectInfo, engineer: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date"
                  type="date"
                  value={projectInfo.date}
                  onChange={(e) => setProjectInfo({...projectInfo, date: e.target.value})}
                />
              </div>
            </div>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                💡 <strong>Quick Templates:</strong> Select a common configuration to pre-fill typical values
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSystemParams({bus_fault_level: 31.5, system_frequency: 50, bus_voltage_level: 132, xr_ratio: 40});
                  setCTWiring({conductor_cross_section: 10, resistance_w_km_20c: 1.83, lead_length_ct_to_relay: 150});
                  setLineParams({...lineParams, source_impedance_zs: 1.0});
                }}
              >
                132kV Transmission
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setSystemParams({bus_fault_level: 25, system_frequency: 50, bus_voltage_level: 33, xr_ratio: 15});
                  setCTWiring({conductor_cross_section: 6, resistance_w_km_20c: 3.08, lead_length_ct_to_relay: 120});
                  setLineParams({...lineParams, source_impedance_zs: 1.0});
                }}
              >
                33kV Sub-transmission  
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setSystemParams({bus_fault_level: 20, system_frequency: 50, bus_voltage_level: 11, xr_ratio: 10});
                  setCTWiring({conductor_cross_section: 4, resistance_w_km_20c: 4.61, lead_length_ct_to_relay: 100});
                  setLineParams({...lineParams, source_impedance_zs: 1.0});
                }}
              >
                11kV Distribution
              </Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">System Parameters</h2>
              <p className="text-muted-foreground">Basic electrical system characteristics</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="bus-voltage">Bus Voltage Level (kV)</Label>
                <Input 
                  id="bus-voltage"
                  type="number"
                  placeholder="132"
                  value={systemParams.bus_voltage_level}
                  onChange={(e) => setSystemParams({...systemParams, bus_voltage_level: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="frequency">System Frequency (Hz)</Label>
                <Select 
                  value={systemParams.system_frequency.toString()} 
                  onValueChange={(value) => setSystemParams({...systemParams, system_frequency: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 Hz</SelectItem>
                    <SelectItem value="60">60 Hz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="fault-level">Bus Fault Level (kA)</Label>
                <Input 
                  id="fault-level"
                  type="number"
                  step="0.1"
                  placeholder="31.5"
                  value={systemParams.bus_fault_level}
                  onChange={(e) => setSystemParams({...systemParams, bus_fault_level: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="xr-ratio">X/R Ratio</Label>
                <Input 
                  id="xr-ratio"
                  type="number"
                  placeholder="15"
                  value={systemParams.xr_ratio}
                  onChange={(e) => setSystemParams({...systemParams, xr_ratio: parseFloat(e.target.value) || 0})}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Auto-updated based on voltage level: {systemParams.bus_voltage_level >= 110 ? "30-40" : systemParams.bus_voltage_level >= 33 ? "15-20" : "10-15"}
                </p>
              </div>
            </div>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                💡 <strong>Common Values:</strong> 132kV: 31.5kA X/R=40 | 33kV: 25kA X/R=15 | 11kV: 20kA X/R=10
              </AlertDescription>
            </Alert>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Wiring Configuration</h2>
              <p className="text-muted-foreground">CT and VT cable specifications</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* CT Wiring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🔌 CT Wiring (Current Transformer)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ct-cross-section">Cable Cross Section (mm²)</Label>
                    <Select 
                      value={ctWiring.conductor_cross_section.toString()} 
                      onValueChange={(value) => setCTWiring({...ctWiring, conductor_cross_section: parseFloat(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CABLE_RESISTANCES).map(size => (
                          <SelectItem key={size} value={size}>
                            {size} mm² - {CABLE_RESISTANCES[parseFloat(size)]} Ω/km
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="ct-resistance">Resistance @ 20°C (Ω/km)</Label>
                    <Input 
                      id="ct-resistance"
                      type="number"
                      step="0.01"
                      value={ctWiring.resistance_w_km_20c}
                      onChange={(e) => setCTWiring({...ctWiring, resistance_w_km_20c: parseFloat(e.target.value) || 0})}
                      disabled
                    />
                    <p className="text-sm text-muted-foreground">Auto-filled from cross section</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="ct-length">Lead Length (meters)</Label>
                    <Input 
                      id="ct-length"
                      type="number"
                      placeholder="120"
                      value={ctWiring.lead_length_ct_to_relay}
                      onChange={(e) => setCTWiring({...ctWiring, lead_length_ct_to_relay: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* VT Wiring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📐 VT Wiring (Voltage Transformer)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="vt-cross-section">Cable Cross Section (mm²)</Label>
                    <Select 
                      value={vtWiring.conductor_cross_section.toString()} 
                      onValueChange={(value) => setVTWiring({...vtWiring, conductor_cross_section: parseFloat(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CABLE_RESISTANCES).map(size => (
                          <SelectItem key={size} value={size}>
                            {size} mm² - {CABLE_RESISTANCES[parseFloat(size)]} Ω/km
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="vt-resistance">Resistance @ 20°C (Ω/km)</Label>
                    <Input 
                      id="vt-resistance"
                      type="number"
                      step="0.01"
                      value={vtWiring.resistance_w_km_20c}
                      onChange={(e) => setVTWiring({...vtWiring, resistance_w_km_20c: parseFloat(e.target.value) || 0})}
                      disabled
                    />
                    <p className="text-sm text-muted-foreground">Auto-filled from cross section</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="vt-length">Lead Length (meters)</Label>
                    <Input 
                      id="vt-length"
                      type="number"
                      placeholder="120"
                      value={vtWiring.lead_length_vt_to_relay}
                      onChange={(e) => setVTWiring({...vtWiring, lead_length_vt_to_relay: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                💡 <strong>Cable Selection:</strong> 2.5mm² (short runs) | 6mm² (typical) | 16mm² (long runs/high current)
              </AlertDescription>
            </Alert>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Line Parameters</h2>
              <p className="text-muted-foreground">Transmission line electrical characteristics</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="r1">Positive Sequence Resistance R1 (Ω/km)</Label>
                <Input 
                  id="r1"
                  type="number"
                  step="0.0001"
                  placeholder="0.0271"
                  value={lineParams.positive_sequence_resistance}
                  onChange={(e) => setLineParams({...lineParams, positive_sequence_resistance: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="x1">Positive Sequence Reactance X1 (Ω/km)</Label>
                <Input 
                  id="x1"
                  type="number"
                  step="0.0001"
                  placeholder="0.1600"
                  value={lineParams.positive_sequence_reactance}
                  onChange={(e) => setLineParams({...lineParams, positive_sequence_reactance: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="r0">Zero Sequence Resistance R0 (Ω/km)</Label>
                <Input 
                  id="r0"
                  type="number"
                  step="0.0001"
                  placeholder="0.1300"
                  value={lineParams.zero_sequence_resistance}
                  onChange={(e) => setLineParams({...lineParams, zero_sequence_resistance: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="x0">Zero Sequence Reactance X0 (Ω/km)</Label>
                <Input 
                  id="x0"
                  type="number"
                  step="0.0001"
                  placeholder="0.0600"
                  value={lineParams.zero_sequence_reactance}
                  onChange={(e) => setLineParams({...lineParams, zero_sequence_reactance: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="route-length">Route Length (km)</Label>
                <Input 
                  id="route-length"
                  type="number"
                  step="0.01"
                  placeholder="1.74"
                  value={lineParams.route_length}
                  onChange={(e) => setLineParams({...lineParams, route_length: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="source-impedance">Source Impedance (Zs) - pu</Label>
                <Input 
                  id="source-impedance"
                  type="number"
                  step="0.01"
                  placeholder="1.0"
                  value={lineParams.source_impedance_zs}
                  onChange={(e) => setLineParams({...lineParams, source_impedance_zs: parseFloat(e.target.value) || 0})}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Per unit source impedance considering voltage level
                </p>
              </div>
            </div>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                💡 <strong>Typical Cable Types:</strong> XLPE 132kV | CU HDPE | Overhead | Gas Insulated - Values from cable manufacturer data. Source impedance typically 1.0 pu for fault studies.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">👥</span>
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-800">IED Selection & Configuration</h2>
                  <p className="text-muted-foreground">Configure protection, metering, and control devices</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {ieds.map((ied, index) => (
                <Card key={index} className="border-2 border-gray-200 hover:border-blue-300 transition-colors shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                        <span className="text-gray-800">IED Configuration #{index + 1}</span>
                        {ied.ied_name && (
                          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                            {ied.ied_name}
                          </Badge>
                        )}
                      </div>
                      {ieds.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeIED(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`ied-name-${index}`}>IED Name</Label>
                        <Select 
                          value={ied.ied_name} 
                          onValueChange={(value) => updateIED(index, 'ied_name', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select IED" />
                          </SelectTrigger>
                          <SelectContent>
                            {IEDDatabaseService.getAllAvailableIEDs().map(iedName => (
                              <SelectItem key={iedName} value={iedName}>
                                {iedName} - {IEDDatabaseService.getIEDBurden(iedName)}VA
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor={`ct-ratio-${index}`}>CT Ratio</Label>
                        <Select 
                          value={ied.ct_ratio} 
                          onValueChange={(value) => updateIED(index, 'ct_ratio', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select CT Ratio" />
                          </SelectTrigger>
                          <SelectContent>
                            {STANDARD_CT_RATIOS.map(ratio => (
                              <SelectItem key={ratio} value={ratio}>
                                {ratio}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor={`accuracy-${index}`}>Accuracy Class</Label>
                        <Select 
                          value={ied.accuracy_class} 
                          onValueChange={(value) => updateIED(index, 'accuracy_class', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Accuracy" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5P10">5P10</SelectItem>
                            <SelectItem value="5P20">5P20</SelectItem>
                            <SelectItem value="5P30">5P30</SelectItem>
                            <SelectItem value="PX">PX</SelectItem>
                            <SelectItem value="0.2">0.2</SelectItem>
                            <SelectItem value="0.5">0.5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`ct-resistance-${index}`}>CT Resistance (Ω)</Label>
                        <Input 
                          id={`ct-resistance-${index}`}
                          type="number"
                          step="0.1"
                          placeholder="2.5"
                          value={ied.ct_resistance}
                          onChange={(e) => updateIED(index, 'ct_resistance', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`knee-point-${index}`}>Knee Point Voltage (V)</Label>
                        <Input 
                          id={`knee-point-${index}`}
                          type="number"
                          step="1"
                          placeholder="2000"
                          value={ied.knee_point_voltage}
                          onChange={(e) => updateIED(index, 'knee_point_voltage', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`mag-current-${index}`}>Magnetizing Current (mA)</Label>
                        <Input 
                          id={`mag-current-${index}`}
                          type="number"
                          step="1"
                          placeholder="10"
                          value={ied.magnetizing_current}
                          onChange={(e) => updateIED(index, 'magnetizing_current', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-sm font-bold">!</span>
                        </div>
                        <div className="flex-1">
                          <Label htmlFor={`accuracy-limit-${index}`} className="text-blue-800 font-medium">
                            Accuracy Limit Factor (ALF)
                          </Label>
                          <Input 
                            id={`accuracy-limit-${index}`}
                            type="number"
                            step="1"
                            placeholder="20"
                            value={ied.accuracy_limit_factor}
                            onChange={(e) => updateIED(index, 'accuracy_limit_factor', parseFloat(e.target.value) || 0)}
                            className="mt-2 bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <p className="text-sm text-blue-700 mt-2 leading-relaxed">
                            📋 <strong>Find this value on:</strong> CT Test Certificate, Nameplate, or Manufacturer Datasheet<br/>
                            💡 <strong>Common values:</strong> Protection CTs (10-30), Metering CTs (5-10)
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {ied.ied_name && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-sm">
                          <strong>✅ Auto-filled from database:</strong>
                        </div>
                        <div className="text-sm text-green-700">
                          Burden: {IEDDatabaseService.getIEDBurden(ied.ied_name)} VA |
                          Type: {IEDDatabaseService.getIEDType(ied.ied_name)} |
                          Method: {IEDDatabaseService.getCalculationMethod(ied.ied_name)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={addIED} 
                  className="w-full max-w-md bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-medium py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Another IED Device
                </Button>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-800 mb-2">💡 IED Parameter Guidelines</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Burden values:</strong> Automatically retrieved from our comprehensive IED database</p>
                    <p><strong>CT specifications:</strong> From CT test certificates or manufacturer datasheets</p>
                    <p><strong>Accuracy Limit Factor:</strong> Critical parameter - always verify from official documentation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <p className="text-muted-foreground">CT/VT adequacy check results</p>
            </div>
            
            {results ? (
              <div className="space-y-6">
                {/* Overall Summary */}
                <Card className={`border-2 ${
                  results.overall_summary.overall_verdict === 'ALL_SUITABLE' ? 'border-green-500 bg-green-50' :
                  results.overall_summary.overall_verdict === 'MAJOR_ISSUES' ? 'border-red-500 bg-red-50' :
                  'border-yellow-500 bg-yellow-50'
                }`}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-2">
                        {results.overall_summary.overall_verdict === 'ALL_SUITABLE' ? '✅ ALL SUITABLE' :
                         results.overall_summary.overall_verdict === 'MAJOR_ISSUES' ? '❌ MAJOR ISSUES' :
                         '⚠️ SOME ISSUES'}
                      </div>
                      <div className="text-lg">
                        {results.overall_summary.suitable_ieds}/{results.overall_summary.total_ieds_checked} IEDs are suitably dimensioned
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Individual IED Results */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Individual IED Results</h3>
                  {results.ied_results.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{result.ied_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {result.ct_ratio_primary}/{result.ct_ratio_secondary}A, {result.accuracy_class}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={result.verdict === 'SUITABLE' ? 'default' : 'destructive'}
                              className="text-sm"
                            >
                              {result.verdict}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              Safety: {result.safety_margin > 0 ? '+' : ''}{result.safety_margin}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">CT Burden:</span>
                            <p className="font-medium">{result.ct_internal_burden} VA</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Lead Burden:</span>
                            <p className="font-medium">{result.lead_burden} VA</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">IED Burden:</span>
                            <p className="font-medium">{result.ied_burden} VA</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-medium">{result.total_burden} VA</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {/* TODO: Open detailed view */}}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Detailed Calculations
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Recommendations */}
                {results.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>💡 Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {results.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <Button onClick={() => handleDownloadReport()}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setCurrentStep(1);
                    setResults(null);
                  }}>
                    🔄 New Analysis
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p>No results available. Please complete the calculation first.</p>
              </div>
            )}
          </div>
        );

      default:
        return <div>Step {currentStep} - Coming Soon</div>;
    }
  };

  const handleDownloadReport = () => {
    if (!results) return;

    const iedResults = results.ied_results.map(r => `
    <div style="margin: 15px 0; padding: 10px; border-left: 3px solid ${r.verdict === 'SUITABLE' ? '#28a745' : '#dc3545'};">
      <strong>${r.ied_name}</strong> - ${r.verdict}
      <table style="font-size: 12px;">
        <tr><td>CT Ratio:</td><td>${r.ct_ratio_primary}/${r.ct_ratio_secondary}A</td></tr>
        <tr><td>Total Burden:</td><td>${r.total_burden} VA</td></tr>
        <tr><td>Required Vk:</td><td>${r.required_vk} V</td></tr>
        <tr><td>Available Vk:</td><td>${r.available_vk} V</td></tr>
        <tr><td>Safety Margin:</td><td>${r.safety_margin}%</td></tr>
      </table>
    </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>CT/VT Adequacy Report</title>
  <style>
    body { font-family: Arial; margin: 20px; }
    .header { text-align: center; border-bottom: 2px solid #0066cc; padding: 20px 0; }
    .verdict { font-size: 32px; font-weight: bold; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .suitable { background: #d4edda; color: #155724; }
    .section { margin: 20px 0; padding: 15px; border-left: 4px solid #0066cc; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: #0066cc; color: white; padding: 10px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    tr:hover { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CT/VT Adequacy Analysis Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="verdict suitable">
    ${results.overall_summary.overall_verdict === 'ALL_SUITABLE' ? '✅ ALL SUITABLE' : '⚠️ ISSUES FOUND'}
  </div>

  <div class="section">
    <h2>Summary</h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Suitable IEDs</td><td>${results.overall_summary.suitable_ieds}/${results.overall_summary.total_ieds_checked}</td></tr>
      <tr><td>Success Rate</td><td>${Math.round((results.overall_summary.suitable_ieds / results.overall_summary.total_ieds_checked) * 100)}%</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Individual Results</h2>
    ${iedResults}
  </div>

  <div class="section">
    <p style="font-size: 12px; color: #666;">Report generated by CT/VT Adequacy Analysis System</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CT_VT_Report_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="bg-card rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Progress</h3>
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {WIZARD_STEPS.length}
          </span>
        </div>
        
        <Progress value={(currentStep / WIZARD_STEPS.length) * 100} className="mb-4" />
        
        <div className="flex justify-between text-sm">
          {WIZARD_STEPS.map((step) => (
            <div 
              key={step.id} 
              className={`flex flex-col items-center space-y-1 ${
                step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step.id <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step.icon}
              </div>
              <span className="hidden md:block">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="min-h-[600px]">
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep < WIZARD_STEPS.length - 1 ? (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : currentStep === WIZARD_STEPS.length - 1 ? (
          <Button onClick={handleCalculate} disabled={isCalculating}>
            {isCalculating ? (
              <>
                <Calculator className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Calculate
              </>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}