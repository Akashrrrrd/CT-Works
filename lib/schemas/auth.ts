import { z } from 'zod';

export const signupSchema = z.object({
  email:            z.string().email('Invalid email address'),
  password:         z.string().min(8, 'Password must be at least 8 characters'),
  name:             z.string().min(2, 'Name must be at least 2 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  role:             z.enum(['ENGINEER', 'ADMIN', 'MANAGER']).default('ENGINEER'),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  password:   z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  description: z.string().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
