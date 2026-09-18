import { z } from 'zod';

export const createOfferSchema = z.object({
  name: z.string().min(2, 'Offer name is required'),
  code: z.string().min(2, 'Promo code is required'),
  type: z.enum(['PERCENTAGE', 'FIXED', 'PRODUCT', 'CATEGORY']),
  value: z.number().min(0, 'Discount value must be 0 or greater'),
  products: z.array(z.string().min(24)).optional().default([]),
  categories: z.array(z.string().min(24)).optional().default([]),
  minimumOrderValue: z.number().min(0).optional().default(0),
  maximumDiscount: z.number().min(0).optional().default(0),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  isActive: z.boolean().optional().default(true),
});

export const updateOfferSchema = createOfferSchema.partial();

export const validateOfferSchema = z.object({
  code: z.string().min(1, 'Offer code is required'),
  orderValue: z.number().min(0, 'Order value is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(24),
        categoryId: z.string().optional(),
        price: z.number().min(0),
        quantity: z.number().int().min(1),
      })
    )
    .optional(),
});
