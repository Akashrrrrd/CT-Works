/**
 * DETAILED CALCULATION VIEW - Step 11 Implementation
 * Shows complete engineering calculation breakdown for each IED
 * Matches your exact specification for calculation traceability
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowDown, 
  ArrowLeft, 
  Calculator, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Copy,
  Download 
} from 'lucide-react';

import type { IEDAdequacyResult } from '@/lib/types/ct-vt-adequacy-types';

interface DetailedCalculationViewProps {
  result: IEDAdequacyResult;
  onBack: () => void;
}

export function DetailedCalculationView({ result, onBack }: DetailedCalculationViewProps) {
  
  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'SUITABLE':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'UNDER_DIMENSIONED': 
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'SUITABLE':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'UNDER_DIMENSIONED':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Summary
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{result.ied_name} - Detailed Analysis</h1>
            <p className="text-muted-foreground">Complete engineering calculation breakdown</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copy Results
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Input Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Input Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">CT Ratio:</span>
              <p>{result.ct_ratio_primary}/{result.ct_ratio_secondary}A</p>
            </div>
            <div>
              <span className="font-medium">Accuracy Class:</span>
              <p>{result.accuracy_class}</p>
            </div>
            <div>
              <span className="font-medium">CT Resistance:</span>
              <p>{result.inputs.rct} Ω</p>
            </div>
            <div>
              <span className="font-medium">IED Burden:</span>
              <p>{result.ied_burden} VA</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Flow - Exactly as specified in your Step 11 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧮 Calculation Flow
            <Badge variant="outline">Following IEC 61869-2 & IEEE C37.110</Badge>
          </CardTitle>
          <CardDescription>
            Step-by-step engineering calculations with formulas and intermediate values
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Calculation Steps */}
          {result.calculation_steps.map((step, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-semibold">{step.step_name}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
              
              <div className="ml-11 bg-muted/50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="font-mono text-sm bg-white rounded p-2 border">
                    <strong>Formula:</strong> {step.formula}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {Object.entries(step.inputs).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className="font-medium">{typeof value === 'number' ? value.toFixed(4) : value}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Result:</span>
                      <span className="text-lg font-bold text-primary">
                        {step.result.toFixed(4)} {step.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {index < result.calculation_steps.length - 1 && (
                <div className="flex justify-center">
                  <ArrowDown className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

        </CardContent>
      </Card>

      {/* Burden Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Burden Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{result.ct_internal_burden}</div>
                <div className="text-sm text-blue-600">Internal Burden (PE)</div>
                <div className="text-xs text-muted-foreground">VA</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{result.lead_burden}</div>
                <div className="text-sm text-orange-600">Lead Burden (PL)</div>
                <div className="text-xs text-muted-foreground">VA</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{result.ied_burden}</div>
                <div className="text-sm text-purple-600">IED Burden</div>
                <div className="text-xs text-muted-foreground">VA</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{result.total_burden}</div>
                <div className="text-sm text-gray-600">Total Burden</div>
                <div className="text-xs text-muted-foreground">VA</div>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              Total Burden = Internal Burden + Lead Burden + IED Burden
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adequacy Check Results */}
      <Card>
        <CardHeader>
          <CardTitle>✅ Adequacy Check Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            
            {/* KSSC Method (if applicable) */}
            {result.calculation_method === 'KSSC' || result.calculation_method === 'BOTH' ? (
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">🎯 KSSC Method (Protection Relays)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Required Kssc</div>
                    <div className="text-xl font-bold">{result.required_kssc}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Available Kssc</div>
                    <div className="text-xl font-bold text-green-600">{result.available_kssc}</div>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  Safety Margin: <span className={result.safety_margin > 0 ? 'text-green-600' : 'text-red-600'}>
                    {result.safety_margin > 0 ? '+' : ''}{result.safety_margin}%
                  </span>
                </div>
              </div>
            ) : null}

            {/* Vk Method (if applicable) */}
            {result.calculation_method === 'VK_METHOD' || result.calculation_method === 'BOTH' ? (
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">📐 Vk Method (Universal)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Required Vk</div>
                    <div className="text-xl font-bold">{result.required_vk} V</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Available Vk</div>
                    <div className="text-xl font-bold text-green-600">{result.available_vk} V</div>
                  </div>
                </div>
              </div>
            ) : null}

          </div>
        </CardContent>
      </Card>

      {/* Final Verdict */}
      <Card className={`border-2 ${getVerdictColor(result.verdict)}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4">
            {getVerdictIcon(result.verdict)}
            <div className="text-center">
              <div className="text-2xl font-bold">{result.verdict.replace('_', ' ')}</div>
              <div className="text-sm">
                Safety Margin: {result.safety_margin > 0 ? '+' : ''}{result.safety_margin}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}