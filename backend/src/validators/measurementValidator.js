import { z } from 'zod';

const DIMENSION_UNITS = ['FEET_INCHES', 'DECIMAL_FEET', 'INCHES', 'NA'];
const OUTPUT_UNITS = ['SQ_FT', 'RUNNING_FT', 'PIECES', 'FIXED'];
const INPUT_METHODS = ['DIMENSIONS', 'DIRECT_AREA', 'SEGMENTS'];
const SURFACE_ROLES = ['FLOOR', 'WALL', 'GRANITE', 'SKIRTING', 'STAIRCASE', 'ELEVATION', 'OTHER'];
const DEDUCTION_TYPES = ['DOOR', 'WINDOW', 'OPENING', 'UNTILED', 'SINK_CUTOUT', 'OTHER'];

export const segmentInputSchema = z.object({
  label: z.string().trim().min(1, 'Section label is required').max(120),
  dimensionUnit: z.enum(['FEET_INCHES', 'DECIMAL_FEET', 'INCHES']).default('DECIMAL_FEET'),
  lengthRaw: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  widthRaw: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  quantity: z.coerce.number().positive('Quantity must be > 0').default(1),
});

export const deductionInputSchema = z.object({
  label: z.string().trim().min(1, 'Deduction label is required').max(120),
  deductionType: z.enum(DEDUCTION_TYPES).default('OPENING'),
  dimensionUnit: z.enum(['FEET_INCHES', 'DECIMAL_FEET', 'INCHES']).default('DECIMAL_FEET'),
  lengthRaw: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  widthRaw: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  quantity: z.coerce.number().positive('Quantity must be > 0').default(1),
});

export const createMeasurementSchema = z.object({
  workTypeId: z.string().uuid('Valid work type is required'),
  name: z.string().trim().min(1, 'Measurement name is required').max(160),
  inputMethod: z.enum(INPUT_METHODS),
  dimensionUnit: z.enum(DIMENSION_UNITS).default('DECIMAL_FEET'),
  outputUnit: z.enum(OUTPUT_UNITS).default('SQ_FT'),
  surfaceRole: z.enum(SURFACE_ROLES).optional(),
  lengthRaw: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((v) => (v === null || v === undefined || v === '' ? null : String(v).trim())),
  widthRaw: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((v) => (v === null || v === undefined || v === '' ? null : String(v).trim())),
  heightRaw: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((v) => (v === null || v === undefined || v === '' ? null : String(v).trim())),
  quantity: z.coerce.number().positive('Quantity must be > 0').default(1),
  directArea: z.coerce.number().positive().nullable().optional(),
  billableQuantity: z.coerce.number().min(0).nullable().optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  changeNote: z.string().trim().max(300).optional(),
  segments: z.array(segmentInputSchema).optional().default([]),
  deductions: z.array(deductionInputSchema).optional().default([]),
});

export const updateMeasurementSchema = createMeasurementSchema;

export const listMeasurementsQuerySchema = z.object({
  buildingId: z.string().uuid().optional(),
  floorId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  surfaceRole: z.enum(['ALL', ...SURFACE_ROLES]).optional().default('ALL'),
  search: z.string().trim().max(120).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

