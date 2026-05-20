'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle2, XCircle, Download, Loader2, AlertCircle } from 'lucide-react';

export default function ExcelProcessingPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [processedData, setProcessedData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setDebugData(null);
      setProcessedData(null);
      setError('');
    }
  };

  const debugExcel = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/debug/excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setDebugData(result.debug);
      } else {
        setError(result.error || 'Failed to debug Excel file');
      }
    } catch (err) {
      setError('Failed to upload and debug Excel file');
      console.error('Debug error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processExcel = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/workspaces/${workspaceId}/import-excel-ct`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setProcessedData(result);

      if (!result.success) {
        setError(result.error || 'Failed to process Excel file');
      }
    } catch (err) {
      setError('Failed to process Excel file');
      console.error('Process error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createComputation = async () => {
    if (!processedData?.success || !processedData?.data) return;
    
    try {
      // Navigate to CT computation page with pre-filled data
      const queryParams = new URLSearchParams({
        imported: 'true',
        data: JSON.stringify(processedData.data)
      });
      
      window.location.href = `/workspaces/${workspaceId}/computations/new?${queryParams}`;
    } catch (err) {
      setError('Failed to create computation');
      console.error('Computation creation error:', err);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Excel Data Processing</h1>
        <p className="text-muted-foreground mt-2">
          Upload and process Excel files for CT/VT adequacy analysis
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Upload your Excel file containing CT/VT adequacy data for processing
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
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={debugExcel} disabled={!file || loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              {loading ? 'Processing...' : 'Debug Raw Data'}
            </Button>
            <Button onClick={processExcel} disabled={!file || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {loading ? 'Processing...' : 'Process Excel Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processed Data JSON Display */}
      {processedData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Processed Data (JSON Format)</CardTitle>
            <CardDescription>
              Complete processed data from your Excel file in JSON format
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Extraction Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">📊 Extraction Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="font-medium">Standard Parameters:</span> {processedData.summary?.standard_parameters_found || 0}/17+
                </div>
                <div>
                  <span className="font-medium">Devices Found:</span> {processedData.summary?.devices_found || 0}
                </div>
                <div>
                  <span className="font-medium">Device Types:</span> {processedData.summary?.device_types?.length || 0}
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  <span className={processedData.success ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                    {processedData.success ? "✅ Success" : "❌ Issues"}
                  </span>
                </div>
              </div>
            </div>

            {/* Standard Parameters Breakdown */}
            {processedData.data?.standard_parameters && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-800">📋 Standard Parameters Extracted</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {Object.entries(processedData.data.standard_parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between bg-white p-2 rounded">
                      <span className="font-medium text-gray-600">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-gray-800">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Device Parameters Breakdown */}
            {processedData.data?.devices && processedData.data.devices.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <h4 className="font-semibold mb-2 text-green-800">🔌 Device Parameters Extracted</h4>
                <div className="space-y-3">
                  {processedData.data.devices.map((device: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-lg mb-2">{device.device_name}</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div><span className="font-medium">Core:</span> {device.core}</div>
                        <div><span className="font-medium">CT Ratio:</span> {device.ct_ratio}</div>
                        <div><span className="font-medium">Accuracy:</span> {device.accuracy_class}</div>
                        <div><span className="font-medium">Resistance:</span> {device.ct_resistance}Ω</div>
                        <div><span className="font-medium">Vk:</span> {device.vk_knee_point_voltage}V</div>
                        <div><span className="font-medium">Burden:</span> {device.burden}VA</div>
                        <div><span className="font-medium">Magnetizing:</span> {device.magnetizing_current}mA</div>
                        <div><span className="font-medium">Used For:</span> {device.ct_core_used_for}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96 border">
              {JSON.stringify(processedData, null, 2)}
            </pre>

            {/* Simple Action Button */}
            <div className="mt-4">
              <Button onClick={createComputation} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Create CT Adequacy Computation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw Debug Data */}
      {debugData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Raw Excel Data</CardTitle>
            <CardDescription>
              Raw data extracted from Excel file for debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">File Info:</h4>
                <p>Name: {debugData.filename}</p>
                <p>Size: {(debugData.fileSize / 1024).toFixed(1)} KB</p>
                <p>Sheets: {debugData.sheetNames.join(', ')}</p>
              </div>

              {Object.entries(debugData.sheets).map(([sheetName, sheetData]: [string, any]) => (
                <div key={sheetName} className="border rounded p-4">
                  <h4 className="font-semibold mb-2">Sheet: {sheetName}</h4>
                  <p>Rows: {sheetData.totalRows}, Columns: {sheetData.totalColumns}</p>
                  
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">First 10 Rows:</h5>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border text-xs">
                        <tbody>
                          {sheetData.firstTenRows.map((row: any[], index: number) => (
                            <tr key={index} className="border-b">
                              <td className="border px-2 py-1 font-mono text-xs">{index}</td>
                              {row.map((cell: any, cellIndex: number) => (
                                <td key={cellIndex} className="border px-2 py-1 max-w-32 truncate">
                                  {cell !== null && cell !== undefined ? String(cell) : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
