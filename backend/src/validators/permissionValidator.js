import { z } from 'zod';

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().trim().email('Valid email is required').max(180),
  phone: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const upsertPermissionSchema = z.object({
  userId: z.string().uuid('Valid staff user ID is required'),
  canViewMeasurements: z.boolean().default(true),
  canEditMeasurements: z.boolean().default(false),
});

