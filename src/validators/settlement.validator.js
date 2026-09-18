import { z } from 'zod';
export const payoutRequestSchema = z.object({ amount: z.number().positive('Payout amount must be greater than zero.').finite() });
