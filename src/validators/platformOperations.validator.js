import { z } from 'zod';

export const operationsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().trim().max(40).optional(),
  search: z.string().trim().max(80).optional(),
  action: z.string().trim().max(80).optional(),
  actorType: z.enum(['RETAILER', 'PLATFORM_ADMIN', 'SYSTEM']).optional(),
  type: z.enum(['SUPPORT', 'DISPUTE']).optional(),
});

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'A valid staff phone number is required.'),
  role: z.enum(['OPERATIONS_ADMIN', 'CATALOG_ADMIN', 'SUPPORT_ADMIN']),
});

export const updateStaffSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['OPERATIONS_ADMIN', 'CATALOG_ADMIN', 'SUPPORT_ADMIN']).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one staff field must be provided.');

export const bannerSchema = z.object({
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(240).optional().default(''),
  ctaLabel: z.string().trim().max(40).optional().default('Shop now'),
  ctaHref: z.string().trim().max(200).optional().default('/c/mobiles'),
  imageUrl: z.string().trim().max(500).optional().default(''),
  position: z.coerce.number().int().min(1).max(99).optional().default(1),
  isActive: z.boolean().optional().default(true),
});

export const updateBannerSchema = bannerSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one banner field must be provided.');

export const featuredBrandSchema = z.object({
  name: z.string().trim().min(2).max(80),
  position: z.coerce.number().int().min(1).max(99).optional().default(1),
  isActive: z.boolean().optional().default(true),
});

export const updateBrandSchema = featuredBrandSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one brand field must be provided.');

export const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  adminNote: z.string().trim().max(2000).optional(),
  resolution: z.string().trim().max(2000).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one ticket field must be provided.');
