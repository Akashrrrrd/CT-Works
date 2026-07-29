'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calculator, CheckCircle2, ShieldAlert, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function RED670Calculator() {
  const [formData, setFormData] = useState({
    // 1. General System Parameters
    bus_fault_level_ka: 31.5,
    system_frequency: 50,
    bus_voltage_kv: 33,
    xr_ratio: 40,
    // 2. CT Wiring
    ct_conductor_cross_section: 2.5,
    ct_resistance_20c_per_km: 7.41,
    ct_lead_length: 150,
    // 3. VT Wiring
    vt_conductor_cross_section: 2.5,
    vt_resistance_20c_per_km: 7.41,
    vt_lead_length: 150,
    // 4. Common Line / Cable Parameters
    positive_sequence_resistance: 0.0221,
    positive_sequence_reactance: 0.1600,
    zero_sequence_resistance: 0.1300,
    zero_sequence_reactance: 0.0600,
    route_length: 0.2,
    // 5. RED670 IED CT Specifications (Taps)
    tap1_primary: 2500,
    tap1_rct: 5.0,
    tap1_vk: 3750,
    tap2_primary: 1500,
    tap2_rct: 3.0,
    tap2_vk: 200,
    active_tap: 'tap1' as 'tap1' | 'tap2',
    ied_burden: 0.02,
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);

    const payload = {
      system: {
        bus_fault_level_ka: Number(formData.bus_fault_level_ka),
        system_frequency: Number(formData.system_frequency),
        bus_voltage_kv: Number(formData.bus_voltage_kv),
        xr_ratio: Number(formData.xr_ratio),
      },
      ct_wiring: {
        conductor_cross_section: Number(formData.ct_conductor_cross_section),
        resistance_20c_per_km: Number(formData.ct_resistance_20c_per_km),
        lead_length: Number(formData.ct_lead_length),
      },
      vt_wiring: {
        conductor_cross_section: Number(formData.vt_conductor_cross_section),
        resistance_20c_per_km: Number(formData.vt_resistance_20c_per_km),
        lead_length: Number(formData.vt_lead_length),
      },
      cable: {
        positive_sequence_resistance: Number(formData.positive_sequence_resistance),
        positive_sequence_reactance: Number(formData.positive_sequence_reactance),
        zero_sequence_resistance: Number(formData.zero_sequence_resistance),
        zero_sequence_reactance: Number(formData.zero_sequence_reactance),
        route_length: Number(formData.route_length),
      },
      ied_burden: Number(formData.ied_burden),
      active_tap: formData.active_tap,
      taps: {
        tap1: {
          ct_ratio_primary: Number(formData.tap1_primary),
          ct_ratio_secondary: 1,
          class_of_accuracy: 'PX',
          ct_resistance: Number(formData.tap1_rct),
          magnetizing_current: 60,
          knee_point_voltage: Number(formData.tap1_vk),
        },
        tap2: {
          ct_ratio_primary: Number(formData.tap2_primary),
          ct_ratio_secondary: 1,
          class_of_accuracy: 'PX',
          ct_resistance: Number(formData.tap2_rct),
          magnetizing_current: 100,
          knee_point_voltage: Number(formData.tap2_vk),
        },
      },
    };

    try {
      const res = await fetch('/api/relay-formulas/red670', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || 'Calculation failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Calculation error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header */}
      <Card className="border-l-4 border-l-emerald-600 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Zap className="h-7 w-7 text-emerald-600" />
              <div>
                <CardTitle className="text-xl font-bold">RED670 CT Adequacy Engineering Engine</CardTitle>
                <CardDescription>
                  Line Differential (87L) & Distance Protection (21) CT Dimensioning per Hitachi N-19957 Standards
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 px-3 py-1">
              Deterministic Engine
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Input Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System & Bus Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Bus & System Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Bus Fault Level (kA)</Label>
              <Input
                type="number"
                value={formData.bus_fault_level_ka}
                onChange={(e) => handleInputChange('bus_fault_level_ka', e.target.value)}
              />
            </div>
            <div>
              <Label>System Frequency (Hz)</Label>
              <Input
                type="number"
                value={formData.system_frequency}
                onChange={(e) => handleInputChange('system_frequency', e.target.value)}
              />
            </div>
            <div>
              <Label>Bus Voltage Level (kV)</Label>
              <Input
                type="number"
                value={formData.bus_voltage_kv}
                onChange={(e) => handleInputChange('bus_voltage_kv', e.target.value)}
              />
            </div>
            <div>
              <Label>System X/R Ratio</Label>
              <Input
                type="number"
                value={formData.xr_ratio}
                onChange={(e) => handleInputChange('xr_ratio', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* CT & VT Wiring Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. CT & VT Wiring Loop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>CT Cross Section (mm²)</Label>
              <Input
                type="number"
                value={formData.ct_conductor_cross_section}
                onChange={(e) => handleInputChange('ct_conductor_cross_section', e.target.value)}
              />
            </div>
            <div>
              <Label>CT Resistance at 20°C (Ω/km)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.ct_resistance_20c_per_km}
                onChange={(e) => handleInputChange('ct_resistance_20c_per_km', e.target.value)}
              />
            </div>
            <div>
              <Label>CT Lead Length (m)</Label>
              <Input
                type="number"
                value={formData.ct_lead_length}
                onChange={(e) => handleInputChange('ct_lead_length', e.target.value)}
              />
            </div>
            <div className="pt-2 border-t text-xs text-muted-foreground">
              VT Lead Length: <span className="font-semibold">{formData.vt_lead_length} m</span> ({formData.vt_conductor_cross_section} mm²)
            </div>
          </CardContent>
        </Card>

        {/* Common Line Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Line / Cable Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>R1 (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.positive_sequence_resistance}
                  onChange={(e) => handleInputChange('positive_sequence_resistance', e.target.value)}
                />
              </div>
              <div>
                <Label>X1 (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.positive_sequence_reactance}
                  onChange={(e) => handleInputChange('positive_sequence_reactance', e.target.value)}
                />
              </div>
              <div>
                <Label>R0 (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.zero_sequence_resistance}
                  onChange={(e) => handleInputChange('zero_sequence_resistance', e.target.value)}
                />
              </div>
              <div>
                <Label>X0 (Ω/km)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.zero_sequence_reactance}
                  onChange={(e) => handleInputChange('zero_sequence_reactance', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Route Length (km)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.route_length}
                onChange={(e) => handleInputChange('route_length', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* IED CT Specifications */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">4. RED670 CT Taps & Relay Burden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tap 1 */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Tap-1 Specification</span>
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="active_tap"
                      checked={formData.active_tap === 'tap1'}
                      onChange={() => handleInputChange('active_tap', 'tap1')}
                    />
                    Active Tap
                  </Label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Primary Ratio (A)</Label>
                    <Input
                      type="number"
                      value={formData.tap1_primary}
                      onChange={(e) => handleInputChange('tap1_primary', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Rct @ 75°C (Ω)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.tap1_rct}
                      onChange={(e) => handleInputChange('tap1_rct', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Available Vk (V)</Label>
                    <Input
                      type="number"
                      value={formData.tap1_vk}
                      onChange={(e) => handleInputChange('tap1_vk', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Tap 2 */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Tap-2 Specification</span>
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="active_tap"
                      checked={formData.active_tap === 'tap2'}
                      onChange={() => handleInputChange('active_tap', 'tap2')}
                    />
                    Active Tap
                  </Label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Primary Ratio (A)</Label>
                    <Input
                      type="number"
                      value={formData.tap2_primary}
                      onChange={(e) => handleInputChange('tap2_primary', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Rct @ 75°C (Ω)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.tap2_rct}
                      onChange={(e) => handleInputChange('tap2_rct', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Available Vk (V)</Label>
                    <Input
                      type="number"
                      value={formData.tap2_vk}
                      onChange={(e) => handleInputChange('tap2_vk', e.target.value)}
                    />
                  </div>
                </div>
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
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-64 font-semibold shadow"
        >
          <Calculator className="mr-2 h-5 w-5" />
          {loading ? 'Calculating...' : 'Run RED670 Adequacy Analysis'}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Calculation Output Results */}
      {result && (
        <div className="space-y-6 pt-4">
          {/* Main Verdict Card */}
          <Card className={result.verdict === 'SUITABLY DIMENSIONED' ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {result.verdict === 'SUITABLY DIMENSIONED' ? (
                    <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="h-12 w-12 text-red-600" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{result.verdict}</h2>
                    <p className="text-sm text-slate-600">
                      Active Tap: <span className="font-semibold text-slate-900">{result.active_tap.toUpperCase()}</span> | Lead Resistance Rl: <span className="font-semibold text-slate-900">{result.lead_resistance_rl} Ω</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <div className="text-xs uppercase text-slate-500 font-semibold">Required Vk</div>
                    <div className="text-2xl font-mono font-bold text-slate-900">{result.vk_required} V</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-500 font-semibold">Available Vk</div>
                    <div className="text-2xl font-mono font-bold text-slate-900">{result.vk_available} V</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-500 font-semibold">Safety Margin</div>
                    <div className={`text-2xl font-mono font-bold ${result.safety_margin_percent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {result.safety_margin_percent > 0 ? '+' : ''}{result.safety_margin_percent}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voltage Requirements Breakdown ($E_{\text{alreq}}$ & $V_k$)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-xs">
                    <tr>
                      <th className="p-3">Protection Mode / Fault Scenario</th>
                      <th className="p-3 text-right">Ealreq (V)</th>
                      <th className="p-3 text-right">Vk Required = Ealreq × 0.8 (V)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.vk_breakdown.map((row: any, idx: number) => (
                      <tr key={idx} className={row.isMax ? 'bg-amber-50 font-semibold' : ''}>
                        <td className="p-3">{row.label}</td>
                        <td className="p-3 text-right font-mono">{row.ealreq.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">{row.vk.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          {row.isMax && <Badge className="bg-amber-600 text-white text-xs">Controlling</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
