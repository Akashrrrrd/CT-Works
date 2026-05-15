'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle2, XCircle, Trash2, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface RelayTemplate {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  functions: {
    differential: boolean;
    distance: boolean;
    breakerFailure: boolean;
  };
  uploadedFile?: string;
  createdAt: string;
}

const PREDEFINED_TEMPLATES: RelayTemplate[] = [
  {
    id: 'red670',
    name: 'RED670',
    manufacturer: 'ABB',
    model: 'Transformer Differential + Distance + Breaker Failure',
    functions: { differential: true, distance: true, breakerFailure: true },
    createdAt: '2024-01-01',
  },
  {
    id: 'reb670',
    name: 'REB670',
    manufacturer: 'ABB',
    model: 'Busbar Differential Protection',
    functions: { differential: true, distance: false, breakerFailure: false },
    createdAt: '2024-01-01',
  },
  {
    id: 'ref615',
    name: 'REF615',
    manufacturer: 'ABB',
    model: 'Feeder Differential Protection',
    functions: { differential: true, distance: false, breakerFailure: false },
    createdAt: '2024-01-01',
  },
  {
    id: 'rel670',
    name: 'REL670',
    manufacturer: 'ABB',
    model: 'Line Distance Protection',
    functions: { differential: false, distance: true, breakerFailure: false },
    createdAt: '2024-01-01',
  },
  {
    id: 'req650',
    name: 'REQ650',
    manufacturer: 'ABB',
    model: 'Breaker Failure Protection',
    functions: { differential: false, distance: false, breakerFailure: true },
    createdAt: '2024-01-01',
  },
];

export default function RelayTemplatesPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [customTemplates, setCustomTemplates] = useState<RelayTemplate[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [importedData, setImportedData] = useState<any>(null);

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    manufacturer: '',
    model: '',
    differential: false,
    distance: false,
    breakerFailure: false,
    file: null as File | null,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or Excel file');
      return;
    }

    // If it's an Excel file, parse it for CT data
    if (file.type.includes('excel') || file.type.includes('spreadsheetml')) {
      setUploading(true);
      setError('');
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`/api/workspaces/${workspaceId}/import-excel-ct`, {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        
        if (result.success) {
          setImportedData(result.data);
          
          // Auto-fill the form with extracted data
          setNewTemplate({
            name: result.data.relay_type || result.data.relay_model?.split(' ')[0] || '',
            manufacturer: result.data.relay_model?.includes('ABB') ? 'ABB' : 
                         result.data.relay_model?.includes('SEL') ? 'SEL' :
                         result.data.relay_model?.includes('SIEMENS') ? 'SIEMENS' : 'ABB',
            model: result.data.relay_model || 'Custom Relay',
            differential: result.data.protection_functions?.includes('differential') || false,
            distance: result.data.protection_functions?.includes('distance') || false,
            breakerFailure: result.data.protection_functions?.includes('breaker_failure') || false,
            file: file,
          });
          
          setError('');
        } else {
          setError(result.error || 'Failed to parse Excel file');
        }
      } catch (err) {
        setError('Failed to upload and parse Excel file');
        console.error('Excel upload error:', err);
      } finally {
        setUploading(false);
      }
    } else {
      // Handle PDF files (existing logic)
      setNewTemplate({ ...newTemplate, file });
      setError('');
    }
  };

  const handleAddTemplate = () => {
    if (!newTemplate.name || !newTemplate.manufacturer) {
      setError('Please fill in relay name and manufacturer');
      return;
    }

    if (!newTemplate.differential && !newTemplate.distance && !newTemplate.breakerFailure) {
      setError('Please select at least one protection function');
      return;
    }

    const template: RelayTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplate.name,
      manufacturer: newTemplate.manufacturer,
      model: newTemplate.model || 'Custom Relay',
      functions: {
        differential: newTemplate.differential,
        distance: newTemplate.distance,
        breakerFailure: newTemplate.breakerFailure,
      },
      uploadedFile: newTemplate.file?.name,
      createdAt: new Date().toISOString(),
    };

    setCustomTemplates([...customTemplates, template]);
    setNewTemplate({
      name: '',
      manufacturer: '',
      model: '',
      differential: false,
      distance: false,
      breakerFailure: false,
      file: null,
    });
    setError('');
    setImportedData(null);
  };

  const handleCreateComputation = () => {
    if (!importedData) return;
    
    // Navigate to CT computation page with pre-filled data
    const queryParams = new URLSearchParams({
      imported: 'true',
      data: JSON.stringify(importedData)
    });
    
    window.location.href = `/workspaces/${workspaceId}/computations/new?${queryParams}`;
  };

  const handleDeleteTemplate = (id: string) => {
    setCustomTemplates(customTemplates.filter(t => t.id !== id));
  };

  const getFunctionBadges = (functions: RelayTemplate['functions']) => {
    const badges = [];
    if (functions.differential) badges.push('Differential');
    if (functions.distance) badges.push('Distance');
    if (functions.breakerFailure) badges.push('Breaker Failure');
    return badges;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Relay Templates</h1>
        <p className="text-muted-foreground mt-2">
          Manage predefined and custom relay protection templates
        </p>
      </div>

      {/* Add Custom Template */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Add Custom Relay Template
          </CardTitle>
          <CardDescription>
            Upload relay datasheet (PDF/Excel) and specify protection functions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Relay Name *</Label>
              <Input
                id="name"
                placeholder="e.g., 7SJ85"
                value={newTemplate.name}
                onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer *</Label>
              <Input
                id="manufacturer"
                placeholder="e.g., SIEMENS"
                value={newTemplate.manufacturer}
                onChange={e => setNewTemplate({ ...newTemplate, manufacturer: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="model">Model / Description</Label>
              <Input
                id="model"
                placeholder="e.g., Feeder Protection Relay"
                value={newTemplate.model}
                onChange={e => setNewTemplate({ ...newTemplate, model: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Protection Functions Required *</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="diff"
                  checked={newTemplate.differential}
                  onCheckedChange={checked => setNewTemplate({ ...newTemplate, differential: !!checked })}
                />
                <label htmlFor="diff" className="text-sm font-medium cursor-pointer">
                  Differential (k=1, k=2)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dist"
                  checked={newTemplate.distance}
                  onCheckedChange={checked => setNewTemplate({ ...newTemplate, distance: !!checked })}
                />
                <label htmlFor="dist" className="text-sm font-medium cursor-pointer">
                  Distance Protection (Zone-1)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bf"
                  checked={newTemplate.breakerFailure}
                  onCheckedChange={checked => setNewTemplate({ ...newTemplate, breakerFailure: !!checked })}
                />
                <label htmlFor="bf" className="text-sm font-medium cursor-pointer">
                  Breaker Failure (k=5)
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Upload Datasheet (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".pdf,.xls,.xlsx"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              {newTemplate.file && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {newTemplate.file.name}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, Excel (.xls, .xlsx)
            </p>
          </div>

          <Button onClick={handleAddTemplate} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Add Relay Template
          </Button>

          {/* Excel Import Success - Show Extracted Data */}
          {importedData && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ Excel Data Extracted Successfully!</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-green-700 mb-3">
                <div>CT Ratio: {importedData.ct_ratio_primary}/{importedData.ct_ratio_secondary}</div>
                <div>Accuracy: {importedData.accuracy_class}</div>
                <div>Vk Available: {importedData.vk_available}V</div>
                <div>Bus Voltage: {importedData.bus_voltage_kv}kV</div>
                <div>Fault Level: {importedData.max_bus_fault_mva}MVA</div>
                <div>Relay: {importedData.relay_type || 'Custom'}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateComputation} className="flex-1" variant="default">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create CT Computation
                </Button>
                <Button onClick={() => setImportedData(null)} variant="outline" size="sm">
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {uploading && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Parsing Excel file...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predefined Templates */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Predefined Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PREDEFINED_TEMPLATES.map(template => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {template.manufacturer}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Built-in
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{template.model}</p>
                <div className="flex flex-wrap gap-1">
                  {getFunctionBadges(template.functions).map(fn => (
                    <Badge key={fn} variant="secondary" className="text-xs">
                      {fn}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Custom Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map(template => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {template.manufacturer}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{template.model}</p>
                  <div className="flex flex-wrap gap-1">
                    {getFunctionBadges(template.functions).map(fn => (
                      <Badge key={fn} variant="secondary" className="text-xs">
                        {fn}
                      </Badge>
                    ))}
                  </div>
                  {template.uploadedFile && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {template.uploadedFile}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
