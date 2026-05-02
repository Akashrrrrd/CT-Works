'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

interface InputField {
  name: string;
  type: 'number' | 'text';
}

export default function NewTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    formula: '',
  });
  const [inputs, setInputs] = useState<InputField[]>([{ name: '', type: 'number' }]);
  const [outputs, setOutputs] = useState<InputField[]>([{ name: 'result', type: 'number' }]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleInputChange = (index: number, field: 'name' | 'type', value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: value as any };
    setInputs(newInputs);
  };

  const addInputField = () => {
    setInputs([...inputs, { name: '', type: 'number' }]);
  };

  const removeInputField = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!formData.name || !formData.formula) {
        throw new Error('Name and formula are required');
      }

      if (inputs.some(i => !i.name)) {
        throw new Error('All input fields must have names');
      }

      // Create input schema
      const inputSchema: Record<string, { type: string }> = {};
      inputs.forEach(input => {
        inputSchema[input.name] = { type: input.type };
      });

      // Create output schema
      const outputSchema: Record<string, { type: string }> = {};
      outputs.forEach(output => {
        outputSchema[output.name] = { type: output.type };
      });

      const response = await fetch(`/api/workspaces/${workspaceId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          formula: formData.formula,
          inputSchema,
          outputSchema,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create template');
      }

      router.push(`/workspaces/${workspaceId}/templates`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href={`/workspaces/${workspaceId}/templates`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Templates
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name *</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="e.g., Loan Calculator"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Describe what this template does"
                disabled={loading}
                className="w-full min-h-20 px-3 py-2 bg-input border border-input rounded-md text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Formula */}
        <Card>
          <CardHeader>
            <CardTitle>Computation Formula</CardTitle>
            <CardDescription>
              Define the formula using input variable names (e.g., principal * rate * time)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              name="formula"
              value={formData.formula}
              onChange={handleFormChange}
              placeholder="e.g., (principal * rate * time) / 100"
              disabled={loading}
              className="w-full min-h-24 px-3 py-2 bg-input border border-input rounded-md text-sm font-mono"
            />
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Input Parameters</CardTitle>
            <CardDescription>Define the input variables for your formula</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inputs.map((input, index) => (
              <div key={index} className="flex gap-3">
                <Input
                  value={input.name}
                  onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                  placeholder="Variable name"
                  disabled={loading}
                  className="flex-1"
                />
                <select
                  value={input.type}
                  onChange={(e) => handleInputChange(index, 'type', e.target.value)}
                  disabled={loading}
                  className="px-3 py-2 bg-input border border-input rounded-md text-sm"
                >
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                </select>
                {inputs.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeInputField(index)}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInputField}
              disabled={loading}
            >
              Add Input
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Template'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/workspaces/${workspaceId}/templates`)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
