import { z } from 'zod';

export const stockUpdateSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  reason: z.string().optional().default(''),
  type: z.enum(['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE', 'CANCELLATION']).optional(),
});

export const stockAdjustSchema = z.object({
  newQuantity: z.number().int().min(0, 'New quantity must be 0 or greater'),
  reason: z.string().optional().default('Manual stock adjustment'),
});
