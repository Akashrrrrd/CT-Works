'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Info, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ExcelDebugTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [processingResult, setProcessingResult] = useState<any>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setDebugResult(null);
      setProcessingResult(null);
    }
  };

  const runDebugTest = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      // Test the debug endpoint
      const debugFormData = new FormData();
      debugFormData.append('file', file);
      
      const debugResponse = await fetch('/api/workspaces/test-workspace/debug-excel', {
        method: 'POST',
        body: debugFormData,
      });
      
      const debugData = await debugResponse.json();
      setDebugResult(debugData);
      
      // Test the actual processing endpoint
      const processFormData = new FormData();
      processFormData.append('file', file);
      
      const processResponse = await fetch('/api/workspaces/test-workspace/import-excel-ct', {
        method: 'POST',
        body: processFormData,
      });
      
      const processData = await processResponse.json();
      setProcessingResult(processData);
      
    } catch (error) {
      console.error('Debug test failed:', error);
      setDebugResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Excel Processing Debug Test</h1>
        <p className="text-muted-foreground">Upload an Excel file to debug the extraction process</p>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          
          {file && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                Size: {Math.round(file.size / 1024)}KB | Modified: {new Date(file.lastModified).toLocaleString()}
              </p>
            </div>
          )}
          
          <Button 
            onClick={runDebugTest} 
            disabled={!file || loading}
            className="gap-2"
          >
            {loading ? (
              <>Processing...</>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Run Debug Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Debug Results */}
      {debugResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Debug Results - Raw Excel Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {debugResult.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">File Info</h4>
                    <div className="text-sm space-y-1">
                      <p>Name: {debugResult.fileInfo?.name}</p>
                      <p>Size: {debugResult.fileInfo?.size} bytes</p>
                      <p>Modified: {debugResult.fileInfo?.lastModified}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Sheet Info</h4>
                    <div className="text-sm space-y-1">
                      <p>Sheet: {debugResult.sheetInfo?.sheetName}</p>
                      <p>Rows: {debugResult.sheetInfo?.totalRows}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">CT Ratio Analysis</h4>
                  <div className={`p-3 rounded-lg ${debugResult.ctRatioAnalysis?.found ? 'bg-green-950/20 border border-green-800' : 'bg-red-950/20 border border-red-800'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {debugResult.ctRatioAnalysis?.found ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">
                        {debugResult.ctRatioAnalysis?.found ? 'CT Ratio row found' : 'CT Ratio row NOT found'}
                      </span>
                    </div>
                    
                    {debugResult.ctRatioAnalysis?.found && (
                      <div className="text-sm space-y-2">
                        <p>Row index: {debugResult.ctRatioAnalysis.rowIndex}</p>
                        <div>
                          <p className="font-medium">Expected vs Actual Values:</p>
                          <div className="grid grid-cols-2 gap-4 mt-1">
                            <div>
                              <p className="text-xs text-muted-foreground">Expected:</p>
                              <div className="text-xs space-y-1">
                                <p>Col2: {debugResult.ctRatioAnalysis.expectedValues?.col2}</p>
                                <p>Col3: {debugResult.ctRatioAnalysis.expectedValues?.col3}</p>
                                <p>Col4: {debugResult.ctRatioAnalysis.expectedValues?.col4}</p>
                                <p>Col5: {debugResult.ctRatioAnalysis.expectedValues?.col5}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Actual:</p>
                              <div className="text-xs space-y-1 font-mono">
                                <p>Col2: "{debugResult.ctRatioAnalysis.actualValues?.col2}"</p>
                                <p>Col3: "{debugResult.ctRatioAnalysis.actualValues?.col3}"</p>
                                <p>Col4: "{debugResult.ctRatioAnalysis.actualValues?.col4}"</p>
                                <p>Col5: "{debugResult.ctRatioAnalysis.actualValues?.col5}"</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {debugResult.contextRows && debugResult.contextRows.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Context Rows Around CT Ratio</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border px-2 py-1">Row #</th>
                            <th className="border px-2 py-1">Col 0</th>
                            <th className="border px-2 py-1">Col 1</th>
                            <th className="border px-2 py-1">Col 2</th>
                            <th className="border px-2 py-1">Col 3</th>
                            <th className="border px-2 py-1">Col 4</th>
                            <th className="border px-2 py-1">Col 5</th>
                            <th className="border px-2 py-1">Col 6</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debugResult.contextRows.map((row: any, i: number) => (
                            <tr key={i} className={row.isCTRatioRow ? 'bg-primary/10 font-semibold' : ''}>
                              <td className="border px-2 py-1">{row.rowIndex}</td>
                              <td className="border px-2 py-1 font-mono">{row.col0}</td>
                              <td className="border px-2 py-1 font-mono">{row.col1}</td>
                              <td className="border px-2 py-1 font-mono">{row.col2}</td>
                              <td className="border px-2 py-1 font-mono">{row.col3}</td>
                              <td className="border px-2 py-1 font-mono">{row.col4}</td>
                              <td className="border px-2 py-1 font-mono">{row.col5}</td>
                              <td className="border px-2 py-1 font-mono">{row.col6}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Debug test failed: {debugResult.error || 'Unknown error'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Results */}
      {processingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Processing Results - Structured Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processingResult.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <div className="text-sm space-y-1">
                      <p>Standard Parameters: {processingResult.summary?.standard_parameters_found}</p>
                      <p>Devices Found: {processingResult.summary?.devices_found}</p>
                      <p>Device Types: {processingResult.summary?.device_types?.join(', ')}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Processing Info</h4>
                    <div className="text-sm space-y-1">
                      <p>Timestamp: {new Date(processingResult.timestamp).toLocaleString()}</p>
                      <p>Warnings: {processingResult.summary?.warnings?.length || 0}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">File Verification</h4>
                    <div className="text-sm space-y-1">
                      <p>Name: {processingResult.fileInfo?.name}</p>
                      <p>Size: {processingResult.fileInfo?.size} bytes</p>
                      <p>Modified: {new Date(processingResult.fileInfo?.lastModified).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {processingResult.data && (
                  <div>
                    <h4 className="font-medium mb-2">Extracted Devices</h4>
                    <div className="space-y-2">
                      {processingResult.data.devices?.map((device: any, i: number) => (
                        <div key={i} className="p-3 bg-muted rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">{device.device_name}</p>
                              <p>CT Ratio: {device.ct_ratio}</p>
                              <p>Accuracy: {device.accuracy_class}</p>
                              <p>Core: {device.core}</p>
                            </div>
                            <div>
                              <p>CT Resistance: {device.ct_resistance}Ω</p>
                              <p>Vk: {device.vk_knee_point_voltage}V</p>
                              <p>Burden: {device.burden}VA</p>
                              <p>Magnetizing: {device.magnetizing_current}mA</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <details className="text-sm">
                  <summary className="cursor-pointer font-medium mb-2">Raw Processing Data</summary>
                  <pre className="bg-muted p-3 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(processingResult, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Processing failed: {processingResult.error || 'Unknown error'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}