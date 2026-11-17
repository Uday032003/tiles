import { z } from 'zod';

const optionalDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null));

const optionalText = (maxLen = 2000) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v));

export const listBuildingsQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(''),
  sortBy: z.enum(['created_at', 'updated_at', 'name', 'total_area']).optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const createBuildingSchema = z.object({
  name: z.string().trim().min(2, 'Building name is required').max(160),
  customerName: z.string().trim().min(2, 'Customer name is required').max(160),
  customerPhone: optionalText(30),
  location: z.string().trim().min(2, 'Location is required').max(160),
  address: optionalText(1000),
  description: optionalText(2000),
  startDate: optionalDateSchema,
  expectedCompletionDate: optionalDateSchema,
  notes: optionalText(2000),
  initialLayout: z.enum(['NONE', 'STANDARD_RESIDENTIAL', 'TWO_FLOOR']).optional().default('NONE'),
});

export const initBuildingLayoutSchema = z.object({
  layout: z.enum(['STANDARD_RESIDENTIAL', 'TWO_FLOOR']).default('STANDARD_RESIDENTIAL'),
});

export const updateBuildingSchema = z.object({
  name: z.string().trim().min(2, 'Building name must be at least 2 characters').max(160).optional(),
  customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(160).optional(),
  customerPhone: optionalText(30),
  location: z.string().trim().min(2, 'Location must be at least 2 characters').max(160).optional(),
  address: optionalText(1000),
  description: optionalText(2000),
  startDate: optionalDateSchema,
  expectedCompletionDate: optionalDateSchema,
  notes: optionalText(2000),
});
