import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'identifier is required'),
  masterPassword: z.string().min(1, 'masterPassword is required'),
});

export const registerSchema = z.object({
  username: z
    .string()
    .regex(/^[a-z0-9_-]{3,20}$/, 'Username must be 3–20 chars: lowercase letters, numbers, _ or -'),
  email: z.string().email('Invalid email address'),
  displayName: z.string().max(50).optional(),
  masterPassword: z.string().min(8, 'Master password must be at least 8 characters'),
});

export const unlockSchema = z.object({
  masterPassword: z.string().min(1, 'masterPassword is required'),
});

export const credentialCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  url: z.string().max(2000).optional(),
  username: z.string().min(1, 'username is required').max(500),
  password: z.string().min(1, 'password is required').max(1000),
  notes: z.string().max(5000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  scope: z.enum(['personal', 'team']).optional(),
  teamId: z.string().optional(),
});

export const credentialUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().max(2000).optional(),
  username: z.string().min(1).max(500).optional(),
  password: z.string().min(1).max(1000).optional(),
  notes: z.string().max(5000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

/** Extracts a user-friendly message from a ZodError. */
export function zodErrorMessage(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join('; ');
}
