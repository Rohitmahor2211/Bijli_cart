import { z } from 'zod';

export const createSupportTicketSchema = z.object({
  type: z.enum(['SUPPORT', 'DISPUTE']).optional().default('SUPPORT'),
  subject: z.string().trim().min(4).max(160),
  description: z.string().trim().min(8).max(4000),
  orderId: z.string().min(24).optional(),
});
