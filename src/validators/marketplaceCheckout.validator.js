import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid product identifier.");
const shippingAddress = z.object({
  street: z.string().trim().min(5, "Address is required."),
  city: z.string().trim().min(2, "City is required."),
  state: z.string().trim().min(2, "State is required."),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code."),
});
export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1),
  shippingAddress,
});
export const verifyPaymentSchema = z.object({
  checkoutReference: z.string().regex(/^CHK-[A-Z\d]{18}$/),
  razorpayPaymentId: z.string().optional().default(""),
  razorpayOrderId: z.string().optional().default(""),
  razorpaySignature: z.string().optional().default(""),
  mock: z.boolean().optional().default(false),
});

export const cancelPaymentSchema = z.object({
  checkoutReference: z.string().trim().min(1),
});
