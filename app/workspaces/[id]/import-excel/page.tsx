'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, 
  AlertCircle, Loader2, Download, FileText, Zap 
} from 'lucide-react';

interface ParsedData {
  parsed: {
    ct: {
      ratio_primary?: number;
      ratio_secondary?: number;
      accuracy_class?: string;
      rct?: number;
      vk_available?: number;
      io_at_vk?: number;
    };
    system: {
      frequency?: number;
      bus_voltage_kv?: number;
      fault_current_ka?: number;
    };
    line: {
      r1?: number;
      x1?: number;
      r0?: number;
      x0?: number;
      length_km?: number;
    };
    wiring: {
      cable_length_m?: number;
      cores?: number;
    };
    ieds: Array<{
      name: string;
      burden_va: number;
      type: string;
    }>;
  };
  missing: string[];
  rowCount: number;
  iedCount: number;
  warnings: string[];
}

export default function ImportExcelPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['.xlsx', '.xls', '.csv'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      setError(`Invalid file type. Please upload ${validTypes.join(', ')} files only.`);
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit. Please upload a smaller file.');
      return;
    }

    setUploading(true);
    setError('');
    setParsedData(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`/api/workspaces/${workspaceId}/import-excel`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process Excel file');
      }

      setParsedData(result);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the file');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const proceedToComputation = () => {
    if (!parsedData) return;

    // Convert parsed data to computation format
    const computationData = {
      ct_ratio_primary: parsedData.parsed.ct.ratio_primary || 800,
      ct_ratio_secondary: parsedData.parsed.ct.ratio_secondary || 1,
      accuracy_class: parsedData.parsed.ct.accuracy_class || 'PX',
      rct: parsedData.parsed.ct.rct || 3.5,
      vk_available: parsedData.parsed.ct.vk_available || 540,
      io_at_vk: parsedData.parsed.ct.io_at_vk || 20,
      frequency: parsedData.parsed.system.frequency || 50,
      bus_voltage_kv: parsedData.parsed.system.bus_voltage_kv || 33,
      max_bus_fault_mva: parsedData.parsed.system.fault_current_ka ? 
        (parsedData.parsed.system.fault_current_ka * parsedData.parsed.system.bus_voltage_kv! * Math.sqrt(3) / 1000) : 1800,
      r1: parsedData.parsed.line.r1 || 0.16,
      x1: parsedData.parsed.line.x1 || 0.13,
      r0: parsedData.parsed.line.r0 || 0.96,
      x0: parsedData.parsed.line.x0 || 0.32,
      route_length_km: parsedData.parsed.line.length_km || 0.2,
      relay_burden_va: parsedData.parsed.ieds[0]?.burden_va || 0.02,
      lead_resistance: (parsedData.parsed.wiring.cable_length_m || 200) * 0.00235, // Approximate lead resistance
      relay_type: parsedData.parsed.ieds[0]?.name || 'Imported Relay'
    };

    // Navigate to computation page with imported data
    const dataParam = encodeURIComponent(JSON.stringify(computationData));
    router.push(`/workspaces/${workspaceId}/computations/new?imported=true&data=${dataParam}`);
  };

  const downloadTemplate = () => {
    // Create a sample Excel template
    const csvContent = `Key,Value
CT Ratio Primary,800
CT Ratio Secondary,1
Accuracy Class,PX
CT Resistance,3.5
Knee Point Voltage,540
Magnetizing Current,20
System Frequency,50
Bus Voltage,33
Max Fault Current,31.2
R1,0.16
X1,0.13
R0,0.96
X0,0.32
Cable Length,0.2
Relay Burden,0.02
Lead Resistance,0.47`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CT_Adequacy_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link 
        href={`/workspaces/${workspaceId}/computations`} 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Computations
      </Link>

      <div>
        <h2 className="text-2xl font-bold">Import Excel Data</h2>
        <p className="text-muted-foreground text-sm">
          Upload an Excel file with CT and system parameters to automatically populate computation forms
        </p>
      </div>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Template
          </CardTitle>
          <CardDescription>
            Get a sample Excel template with the correct format and field names
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <FileText className="h-4 w-4" />
            Download CSV Template
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Use this template as a reference for the expected data format and field names
          </p>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Supported formats: .xlsx, .xls, .csv (max 50MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {dragOver ? 'Drop your file here' : 'Drag and drop your Excel file'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse files
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Choose File
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
          </div>

          {uploadProgress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Processing file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Parsed Data Display */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              File Processed Successfully
            </CardTitle>
            <CardDescription>
              {parsedData.rowCount} data rows processed, {parsedData.iedCount} IEDs found
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warnings */}
            {parsedData.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Warnings:</p>
                    <ul className="list-disc list-inside text-sm">
                      {parsedData.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Missing Fields */}
            {parsedData.missing.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Missing Required Fields:</p>
                    <ul className="list-disc list-inside text-sm">
                      {parsedData.missing.map((field, i) => (
                        <li key={i}>{field}</li>
                      ))}
                    </ul>
                    <p className="text-xs mt-2">
                      Default values will be used for missing fields
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Extracted Data Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">CT Parameters</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Primary Ratio:</span>
                    <Badge variant="outline">{parsedData.parsed.ct.ratio_primary || 'Default'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Secondary Ratio:</span>
                    <Badge variant="outline">{parsedData.parsed.ct.ratio_secondary || 'Default'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Accuracy Class:</span>
                    <Badge variant="outline">{parsedData.parsed.ct.accuracy_class || 'Default'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Resistance (Rct):</span>
                    <Badge variant="outline">{parsedData.parsed.ct.rct || 'Default'} Ω</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Knee Point Voltage:</span>
                    <Badge variant="outline">{parsedData.parsed.ct.vk_available || 'Default'} V</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">System Parameters</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Frequency:</span>
                    <Badge variant="outline">{parsedData.parsed.system.frequency || 'Default'} Hz</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Bus Voltage:</span>
                    <Badge variant="outline">{parsedData.parsed.system.bus_voltage_kv || 'Default'} kV</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Fault Current:</span>
                    <Badge variant="outline">{parsedData.parsed.system.fault_current_ka || 'Default'} kA</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* IEDs Found */}
            {parsedData.iedCount > 0 && (
              <div>
                <h4 className="font-medium mb-2">IEDs Found ({parsedData.iedCount})</h4>
                <div className="space-y-2">
                  {parsedData.parsed.ieds.map((ied, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-medium">{ied.name}</span>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{ied.burden_va} VA</Badge>
                        <Badge variant="outline">{ied.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={proceedToComputation}
                className="gap-2"
                disabled={parsedData.missing.length > 0}
              >
                <Zap className="h-4 w-4" />
                Proceed to Computation
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setParsedData(null)}
              >
                Upload Different File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}