import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  isDefault: z.boolean().optional().default(false),
});

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  phone: z.string().min(10, 'Valid customer phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  addresses: z.array(addressSchema).optional().default([]),
});

export const updateCustomerSchema = createCustomerSchema.partial();
