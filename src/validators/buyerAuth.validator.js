import { z } from "zod";

const phone = z
  .string()
  .regex(
    /^\+?[1-9]\d{9,14}$/,
    "Enter a valid mobile number including country code.",
  );
export const buyerRegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  phone,
  email: z
    .string()
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().min(2, "City is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
export const buyerSendOtpSchema = z.object({ phone });
export const buyerLoginSchema = z.object({
  phone,
  password: z.string().min(1, "Password is required."),
});
export const buyerVerifyOtpSchema = z.object({
  phone,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
});
export const buyerOrderReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Please provide a reason of at least 10 characters.")
    .max(500),
});
