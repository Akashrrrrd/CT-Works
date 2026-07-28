'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Zap, Copy, Check } from 'lucide-react';

const TEST_CASES = {
  siemens_7sj85: [
    {
      name: 'Test Case 1 - 7SJ85',
      inputs: {
        ct_ratio_primary: 600,
        ct_ratio_secondary: 1,
        ct_resistance: 8,
        lead_resistance: 0.35,
        relay_burden_va: 7.5,
        accuracy_limit_factor: 20,
        frequency: 50,
        bus_voltage_kv: 33,
        max_bus_fault_kA: 31.5,
      },
      expected_kssc_required: 52.50,
      expected_kssc_available: 28.91,
    },
    {
      name: 'Test Case 2 - 7SJ85',
      inputs: {
        ct_ratio_primary: 1200,
        ct_ratio_secondary: 1,
        ct_resistance: 10,
        lead_resistance: 0.40,
        relay_burden_va: 10,
        accuracy_limit_factor: 20,
        frequency: 50,
        bus_voltage_kv: 33,
        max_bus_fault_kA: 31.5,
      },
      expected_kssc_required: 26.25,
      expected_kssc_available: 24.50,
    },
    {
      name: 'Test Case 3 - 7SJ85',
      inputs: {
        ct_ratio_primary: 2000,
        ct_ratio_secondary: 1,
        ct_resistance: 12,
        lead_resistance: 0.50,
        relay_burden_va: 12,
        accuracy_limit_factor: 20,
        frequency: 50,
        bus_voltage_kv: 33,
        max_bus_fault_kA: 31.5,
      },
      expected_kssc_required: 15.75,
      expected_kssc_available: 20.80,
    },
  ],
  red670: [
    {
      name: 'Test Case 1 - RED670',
      inputs: {
        ct_ratio_primary: 800,
        ct_ratio_secondary: 1,
        ct_resistance: 6,
        lead_resistance: 0.30,
        relay_burden_va: 5,
        frequency: 50,
        bus_voltage_kv: 33,
        max_bus_fault_kA: 31.5,
      },
      expected_vk_required: 703.90,
      expected_vk_available: 1189.02,
    },
    {
      name: 'Test Case 2 - RED670',
      inputs: {
        ct_ratio_primary: 1000,
        ct_ratio_secondary: 1,
        ct_resistance: 8,
        lead_resistance: 0.35,
        relay_burden_va: 7.5,
        frequency: 50,
        bus_voltage_kv: 33,
        max_bus_fault_kA: 31.5,
      },
      expected_vk_required: 763.45,
      expected_vk_available: 1224.09,
    },
    {
      name: 'Test Case 3 - RED670',
      inputs: {
        ct_ratio_primary: 2500,
        ct_ratio_secondary: 1,
        ct_resistance: 15,
        lead_resistance: 0.60,
        relay_burden_va: 15,
        frequency: 50,
        bus_voltage_kv: 33,
        max_bus_fault_kA: 31.5,
      },
      expected_vk_required: 1245.80,
      expected_vk_available: 1350.50,
    },
  ],
};

interface InputField {
  name: string;
  label: string;
  type: 'number' | 'text';
  step?: string;
}

const SIEMENS_INPUTS: InputField[] = [
  { name: 'ct_ratio_primary', label: 'CT Ratio Primary', type: 'number', step: '0.01' },
  { name: 'ct_ratio_secondary', label: 'CT Ratio Secondary', type: 'number', step: '0.01' },
  { name: 'ct_resistance', label: 'CT Resistance (Ω)', type: 'number', step: '0.01' },
  { name: 'lead_resistance', label: 'Lead Resistance (Ω)', type: 'number', step: '0.01' },
  { name: 'relay_burden_va', label: 'Relay Burden (VA)', type: 'number', step: '0.01' },
  { name: 'accuracy_limit_factor', label: 'Accuracy Limit Factor (n)', type: 'number', step: '0.01' },
];

export default function CalculationValidatorPage() {
  const [selectedMethod, setSelectedMethod] = useState<'siemens_7sj85' | 'red670'>('siemens_7sj85');
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const [inputs, setInputs] = useState(TEST_CASES.siemens_7sj85[0].inputs);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const testCases = TEST_CASES[selectedMethod];
  const currentTestCase = testCases[selectedTestCase];

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const loadTestCase = (index: number) => {
    setSelectedTestCase(index);
    setInputs(testCases[index].inputs);
    setResults(null);
  };

  const runCalculation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/validate-calculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          inputs,
        }),
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({
        error: error instanceof Error ? error.message : 'Calculation failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const tolerance = 0.01;
  const isMatch = (actual: number, expected: number) => {
    return Math.abs(actual - expected) <= tolerance;
  };

  const getIsKssc = selectedMethod === 'siemens_7sj85';

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dynamic Calculation Validator</h1>
        <p className="text-muted-foreground">Test any input values and verify calculations are dynamic</p>
      </div>

      {/* Method Selection */}
      <div className="grid grid-cols-2 gap-4">
        {['siemens_7sj85', 'red670'].map((method) => (
          <Button
            key={method}
            variant={selectedMethod === method ? 'default' : 'outline'}
            onClick={() => {
              setSelectedMethod(method as 'siemens_7sj85' | 'red670');
              setSelectedTestCase(0);
              setInputs(TEST_CASES[method as keyof typeof TEST_CASES][0].inputs);
              setResults(null);
            }}
            className="h-12"
          >
            {method === 'siemens_7sj85' ? '7SJ85 (KSSC Method)' : 'RED670 (Vk Method)'}
          </Button>
        ))}
      </div>

      {/* Test Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Test Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {testCases.map((tc, index) => (
              <Button
                key={index}
                variant={selectedTestCase === index ? 'default' : 'outline'}
                onClick={() => loadTestCase(index)}
                className="text-sm"
              >
                {tc.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Input Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(inputs).map(([key, value]) => (
              <div key={key}>
                <label className="text-sm font-medium block mb-1">
                  {key.replace(/_/g, ' ').toUpperCase()}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                />
              </div>
            ))}

            <Button onClick={runCalculation} disabled={loading} className="w-full gap-2">
              {loading ? 'Calculating...' : 'Run Calculation'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results ? (
              results.error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{results.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {/* KSSC Results */}
                  {getIsKssc && (
                    <>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-2">Available Kssc</div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">{results.kssc_available?.toFixed(2)}</span>
                          <div className="flex gap-2">
                            {isMatch(results.kssc_available || 0, currentTestCase.expected_kssc_available) ? (
                              <span className="text-green-600 font-semibold">✓ Match</span>
                            ) : (
                              <span className="text-red-600 font-semibold">✗ Mismatch</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(String(results.kssc_available), 'kssc_available')}
                            >
                              {copied === 'kssc_available' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expected: {currentTestCase.expected_kssc_available}
                        </p>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-2">Required Kssc</div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">{results.kssc_required?.toFixed(2)}</span>
                          <div className="flex gap-2">
                            {isMatch(results.kssc_required || 0, currentTestCase.expected_kssc_required) ? (
                              <span className="text-green-600 font-semibold">✓ Match</span>
                            ) : (
                              <span className="text-red-600 font-semibold">✗ Mismatch</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(String(results.kssc_required), 'kssc_required')}
                            >
                              {copied === 'kssc_required' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expected: {currentTestCase.expected_kssc_required}
                        </p>
                      </div>
                    </>
                  )}

                  {/* VK Results */}
                  {!getIsKssc && (
                    <>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-2">Available Vk</div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">{results.vk_available?.toFixed(2)}</span>
                          <div className="flex gap-2">
                            {isMatch(results.vk_available || 0, currentTestCase.expected_vk_available) ? (
                              <span className="text-green-600 font-semibold">✓ Match</span>
                            ) : (
                              <span className="text-red-600 font-semibold">✗ Mismatch</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(String(results.vk_available), 'vk_available')}
                            >
                              {copied === 'vk_available' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expected: {currentTestCase.expected_vk_available}
                        </p>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-2">Required Vk</div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">{results.vk_required?.toFixed(2)}</span>
                          <div className="flex gap-2">
                            {isMatch(results.vk_required || 0, currentTestCase.expected_vk_required) ? (
                              <span className="text-green-600 font-semibold">✓ Match</span>
                            ) : (
                              <span className="text-red-600 font-semibold">✗ Mismatch</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(String(results.vk_required), 'vk_required')}
                            >
                              {copied === 'vk_required' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expected: {currentTestCase.expected_vk_required}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Verdict: {results.verdict}</p>
                    <p className="text-xs text-muted-foreground">Method: {results.calculation_method}</p>
                  </div>

                  {/* Intermediates */}
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">Show All Intermediates ({Object.keys(results.intermediates || {}).length})</summary>
                    <div className="mt-2 max-h-96 overflow-y-auto bg-background p-2 rounded border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left px-2 py-1">Key</th>
                            <th className="text-right px-2 py-1">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(results.intermediates || {}).map(([key, value]) => (
                            <tr key={key} className="border-b">
                              <td className="px-2 py-1">{key}</td>
                              <td className="px-2 py-1 text-right font-mono">{String(value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              )
            ) : (
              <p className="text-muted-foreground text-center py-8">Click "Run Calculation" to see results</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expected Values Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reference Expected Values</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {testCases.map((tc, index) => (
              <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-2">{tc.name}</p>
                {getIsKssc ? (
                  <>
                    <p>Available: {tc.expected_kssc_available}</p>
                    <p>Required: {tc.expected_kssc_required}</p>
                  </>
                ) : (
                  <>
                    <p>Available Vk: {tc.expected_vk_available}</p>
                    <p>Required Vk: {tc.expected_vk_required}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
