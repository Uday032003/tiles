import { z } from 'zod';

const stepItemSchema = z.object({
  treadWidthFt: z.coerce.number().min(0),
  treadDepthFt: z.coerce.number().min(0),
  riserHeightFt: z.coerce.number().min(0),
  hasTread: z.boolean().default(true),
  hasRiser: z.boolean().default(true),
});

export const upsertStaircaseSchema = z.object({
  name: z.string().trim().min(1, 'Staircase name is required').max(120),
  isUniformSteps: z.boolean().default(true),
  treadCount: z.coerce.number().int().min(0).max(500).default(0),
  riserCount: z.coerce.number().int().min(0).max(500).default(0),
  treadWidthFt: z.coerce.number().min(0).max(100).default(0),
  treadDepthFt: z.coerce.number().min(0).max(50).default(0),
  riserHeightFt: z.coerce.number().min(0).max(50).default(0),
  landingLengthFt: z.coerce.number().min(0).max(200).default(0),
  landingWidthFt: z.coerce.number().min(0).max(200).default(0),
  skirtingLengthFt: z.coerce.number().min(0).max(500).default(0),
  stepsData: z.array(stepItemSchema).optional().default([]),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
});

