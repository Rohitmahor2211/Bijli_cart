import { z } from 'zod';

export const platformAdminLoginSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'A valid administrator phone number is required.'),
  password: z.string().min(1, 'Password is required.').optional(),
});

export const platformAdminSendOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'A valid administrator phone number is required.'),
});

export const platformAdminVerifyOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'A valid administrator phone number is required.'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits.'),
});

export const platformAdminRegistrationSchema = z.object({
  name: z.string().trim().min(2, 'Administrator name is required.').max(100),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'A valid administrator phone number is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const sellerComplianceSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  reason: z.string().trim().max(1000).optional().default(''),
}).superRefine((value, context) => {
  if (value.decision === 'REJECTED' && !value.reason) context.addIssue({ code: 'custom', path: ['reason'], message: 'A rejection reason is required.' });
});

export const createGlobalCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  parentId: z.string().min(24).optional().nullable(),
  showInHeader: z.boolean().optional().default(false),
  headerPosition: z.coerce.number().int().min(1).max(999).optional().default(999),
  description: z.string().trim().max(300).optional().default(''),
  commissionPercent: z.coerce.number().min(0).max(100).optional().nullable().default(null),
  specificationDefinitions: z.array(z.object({
    key: z.string().trim().min(1).max(60),
    label: z.string().trim().min(1).max(100),
    type: z.enum(['text', 'number', 'select', 'boolean']).optional().default('text'),
    required: z.boolean().optional().default(true),
    options: z.array(z.string().trim().max(100)).max(50).optional().default([]),
  })).max(50).optional().default([]),
});

export const updateGlobalCategorySchema = z.object({
  isActive: z.boolean().optional(),
  showInHeader: z.boolean().optional(),
  headerPosition: z.coerce.number().int().min(1).max(999).optional(),
  description: z.string().trim().max(300).optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  specificationDefinitions: z.array(z.object({
    key: z.string().trim().min(1).max(60),
    label: z.string().trim().min(1).max(100),
    type: z.enum(['text', 'number', 'select', 'boolean']).optional().default('text'),
    required: z.boolean().optional().default(true),
    options: z.array(z.string().trim().max(100)).max(50).optional().default([]),
  })).max(50).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one category field must be provided.');

export const productModerationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().max(1000).optional().default(''),
}).superRefine((value, context) => {
  if (value.decision === 'REJECTED' && !value.reason) context.addIssue({ code: 'custom', path: ['reason'], message: 'A rejection reason is required.' });
});

export const updateProductSpecificationsSchema = z.object({
  specifications: z.record(z.string(), z.string().trim().max(120)),
});
