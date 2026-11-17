import { z } from 'zod';

export const createFloorSchema = z.object({
  name: z.string().trim().min(1, 'Floor name is required').max(120),
  floorNumber: z.coerce.number().int().min(-10).max(200).optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
});

export const updateFloorSchema = z.object({
  name: z.string().trim().min(1, 'Floor name cannot be empty').max(120).optional(),
  floorNumber: z.coerce.number().int().min(-10).max(200).optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
});

export const duplicateFloorSchema = z.object({
  name: z.string().trim().min(1, 'Target floor name is required').max(120).optional(),
  floorNumber: z.coerce.number().int().min(-10).max(200).optional(),
  copyMeasurements: z.boolean().optional().default(true),
});

export const reorderFloorsSchema = z.object({
  floorIds: z.array(z.string().uuid('Invalid floor ID')).min(1, 'floorIds array is required'),
});

