import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  description: z.string().optional(),
  formula: z.string().min(1, 'Formula is required'),
  inputSchema: z.record(z.any()),
  outputSchema: z.record(z.any()),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const createComputationSchema = z.object({
  templateId: z.string(),
  inputData: z.record(z.any()),
});

export type CreateComputationInput = z.infer<typeof createComputationSchema>;
