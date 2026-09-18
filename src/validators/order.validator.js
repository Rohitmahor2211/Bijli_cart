import { z } from 'zod';

export const orderItemInputSchema = z.object({
  productId: z.string().min(24, 'Valid productId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const shippingAddressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(1, 'Pincode is required'),
});

export const updateShippingAddressSchema = z.object({
  shippingAddress: shippingAddressSchema,
});

export const createOrderSchema = z.object({
  customerId: z.string().min(24, 'Valid customerId is required'),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least 1 item'),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER']).optional().default('CASH'),
  discount: z.number().min(0).optional().default(0),
  shipping: z.number().min(0).optional().default(0),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED']),
  comment: z.string().optional().default(''),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'OTHER']).optional(),
});

export const fulfilmentUpdateSchema = z.object({
  status: z.enum(['ACCEPTED', 'DELIVERED']),
  carrier: z.string().trim().max(100).optional().default(''),
  trackingNumber: z.string().trim().max(100).optional().default(''),
  trackingUrl: z.string().url().optional().or(z.literal('')).default(''),
  comment: z.string().trim().max(500).optional().default(''),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(10, 'Please provide a cancellation reason of at least 10 characters.').max(500),
});

export const sellerPaymentSchema = z.object({
  amount: z.coerce.number().positive('Seller payment amount must be positive'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'ONLINE']),
  reference: z.string().trim().min(1, 'Payment reference is required').max(120),
  paidAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional().default(''),
});

export const returnDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().max(500).optional().default(''),
});
