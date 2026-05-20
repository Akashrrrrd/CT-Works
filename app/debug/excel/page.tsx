'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText } from 'lucide-react';

export default function ExcelDebugPage() {
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

      const response = await fetch('/api/workspaces/test/import-excel-ct', {
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Excel Debug Tool</h1>
        <p className="text-muted-foreground mt-2">
          Upload your Excel file to debug the parsing process
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Upload the Excel file you want to debug
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
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
            <Button onClick={debugExcel} disabled={!file || loading}>
              {loading ? 'Processing...' : 'Debug Raw Data'}
            </Button>
            <Button onClick={processExcel} disabled={!file || loading} variant="outline">
              {loading ? 'Processing...' : 'Process with Parser'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {debugData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Raw Excel Data</CardTitle>
            <CardDescription>
              Raw data extracted from Excel file
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

      {processedData && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Data</CardTitle>
            <CardDescription>
              Data processed by the Excel parser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(processedData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}