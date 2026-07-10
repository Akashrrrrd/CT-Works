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

interface ImportResponse {
  success: boolean;
  data?: {
    standard_parameters: any;
    devices: Array<{
      device_name: string;
      core?: string;
      ct_core_used_for: string;
      ct_ratio?: string;
      accuracy_class?: string;
      ct_resistance?: string;
      vk_knee_point_voltage?: string;
      burden?: string;
      magnetizing_current?: string;
    }>;
    total_devices: number;
    device_types: string[];
    // Legacy compatibility fields
    ct_ratio_primary?: number;
    ct_ratio_secondary?: number;
    accuracy_class?: string;
    rct?: number;
    vk_available?: number;
    io_at_vk?: number;
    frequency?: number;
    bus_voltage_kv?: number;
    max_bus_fault_mva?: number;
    r1?: number;
    x1?: number;
    r0?: number;
    x0?: number;
    route_length_km?: number;
    relay_burden_va?: number;
    lead_resistance?: number;
    relay_type?: string;
    relay_model?: string;
  };
  message?: string;
  summary?: {
    standard_parameters_found: number;
    devices_found: number;
    device_types: string[];
    ai_confidence?: number;
    processing_method?: string;
    ai_notes?: string[];
    warnings: string[];
  };
  errors?: string[];
  warnings?: string[];
  fileInfo?: {
    name: string;
    size: number;
    lastModified: string;
  };
}

export default function ImportExcelPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importResponse, setImportResponse] = useState<ImportResponse | null>(null);
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
    setImportResponse(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`/api/workspaces/${workspaceId}/import-excel-ct`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to process Excel file');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Failed to process Excel file');
      }

      setImportResponse(result);
      
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
    if (!importResponse?.data) return;

    const data = importResponse.data;

    // Convert new structured data to computation format - use first device if multiple devices
    const firstDevice = data.devices?.[0];
    const ctRatioMatch = firstDevice?.ct_ratio?.match(/(\d+)\/(\d+)/);
    
    const computationData = {
      ct_ratio_primary: data.ct_ratio_primary || (ctRatioMatch ? parseInt(ctRatioMatch[1]) : undefined),
      ct_ratio_secondary: data.ct_ratio_secondary || (ctRatioMatch ? parseInt(ctRatioMatch[2]) : undefined),
      accuracy_class: data.accuracy_class || firstDevice?.accuracy_class,
      rct: data.rct || (firstDevice?.ct_resistance ? parseFloat(firstDevice.ct_resistance) : undefined),
      vk_available: data.vk_available || (firstDevice?.vk_knee_point_voltage ? parseFloat(firstDevice.vk_knee_point_voltage) : undefined),
      io_at_vk: data.io_at_vk || (firstDevice?.magnetizing_current ? parseFloat(firstDevice.magnetizing_current) : undefined),
      frequency: data.frequency,
      bus_voltage_kv: data.bus_voltage_kv,
      max_bus_fault_mva: data.max_bus_fault_mva,
      r1: data.r1,
      x1: data.x1,
      r0: data.r0,
      x0: data.x0,
      route_length_km: data.route_length_km,
      relay_burden_va: data.relay_burden_va,
      lead_resistance: data.lead_resistance,
      relay_type: data.relay_type || firstDevice?.device_name || 'Imported Relay'
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

      {/* Import Response Display */}
      {importResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              File Processed Successfully
            </CardTitle>
            <CardDescription>
              {importResponse.summary?.devices_found || 0} devices found, {importResponse.summary?.standard_parameters_found || 0} parameters extracted
              {importResponse.summary?.ai_confidence !== undefined && (
                <span className="ml-2 text-blue-600 font-medium">
                  • AI Confidence: {(importResponse.summary.ai_confidence * 100).toFixed(0)}%
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Processing Info */}
            {importResponse.summary?.ai_confidence !== undefined && (
              <Alert className={importResponse.summary.ai_confidence > 0.7 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <div>
                    <p className="font-medium">AI-Enhanced Processing</p>
                    <p className="text-sm">
                      Method: {importResponse.summary.processing_method?.replace(/_/g, ' ')} • 
                      Confidence: {(importResponse.summary.ai_confidence * 100).toFixed(0)}%
                    </p>
                    {importResponse.summary.ai_notes && importResponse.summary.ai_notes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium">AI Notes:</p>
                        <ul className="list-disc list-inside text-xs">
                          {importResponse.summary.ai_notes.map((note, i) => (
                            <li key={i}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            {/* Warnings */}
            {importResponse.warnings && importResponse.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Warnings:</p>
                    <ul className="list-disc list-inside text-sm">
                      {importResponse.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {importResponse.errors && importResponse.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Errors Found:</p>
                    <ul className="list-disc list-inside text-sm">
                      {importResponse.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Extracted Data Summary */}
            {importResponse.data && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Standard Parameters</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Bus Voltage:</span>
                      <Badge variant="outline">{importResponse.data.bus_voltage_kv || 'N/A'} kV</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Frequency:</span>
                      <Badge variant="outline">{importResponse.data.frequency || 'N/A'} Hz</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Fault Level:</span>
                      <Badge variant="outline">{importResponse.data.max_bus_fault_mva || 'N/A'} MVA</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Route Length:</span>
                      <Badge variant="outline">{importResponse.data.route_length_km || 'N/A'} km</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">CT Parameters (First Device)</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>CT Ratio:</span>
                      <Badge variant="outline">{importResponse.data.ct_ratio_primary || 'N/A'}/{importResponse.data.ct_ratio_secondary || 'N/A'}A</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Accuracy Class:</span>
                      <Badge variant="outline">{importResponse.data.accuracy_class || 'N/A'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Resistance (Rct):</span>
                      <Badge variant="outline">{importResponse.data.rct || 'N/A'} Ω</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Knee Point Voltage:</span>
                      <Badge variant="outline">{importResponse.data.vk_available || 'N/A'} V</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Devices Found */}
            {importResponse.data?.devices && importResponse.data.devices.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Devices Found ({importResponse.data.devices.length})</h4>
                <div className="space-y-2">
                  {importResponse.data.devices.map((device, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-medium">{device.device_name}</span>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{device.ct_ratio || 'N/A'}</Badge>
                        <Badge variant="outline">{device.accuracy_class || 'N/A'}</Badge>
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
                disabled={!importResponse.data}
              >
                <Zap className="h-4 w-4" />
                Proceed to Computation
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setImportResponse(null)}
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