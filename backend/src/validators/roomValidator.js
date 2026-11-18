import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required').max(120),
  roomTypeId: z
    .string()
    .uuid('Invalid room type ID')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  displayOrder: z.coerce.number().int().min(0).optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  initialMeasurement: z.any().optional(),
});

export const updateRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name cannot be empty').max(120).optional(),
  roomTypeId: z
    .string()
    .uuid('Invalid room type ID')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  displayOrder: z.coerce.number().int().min(0).optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
});

export const reorderRoomsSchema = z.object({
  roomIds: z.array(z.string().uuid('Invalid room ID')).min(1, 'roomIds array is required'),
});

