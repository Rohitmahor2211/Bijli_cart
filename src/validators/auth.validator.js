import { z } from 'zod';

export const registerSchema = z.object({
  shopName: z.string().trim().min(2, 'Shop name must be at least 2 characters'),
  ownerName: z.string().trim().min(2, 'Owner name must be at least 2 characters'),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, 'Phone number must be valid format (10-15 digits)'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Password must contain an uppercase letter').regex(/[a-z]/, 'Password must contain a lowercase letter').regex(/\d/, 'Password must contain a number'),
  address: z.string().trim().min(10, 'Business address must be at least 10 characters'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  gstNumber: z.preprocess((value) => String(value || '').trim(), z.union([
    z.literal(''),
    z.string().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid GSTIN'),
  ])),
  panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Enter a valid PAN number'),
  mainCategory: z.string().trim().min(2, 'Main business category is required'),
  deliveryPreference: z.enum(['SELLER_DELIVERY', 'AVNISH_DELIVERY']),
  accountHolderName: z.string().trim().min(2, 'Account holder name is required'),
  accountNumber: z.string().regex(/^\d{9,18}$/, 'Account number must contain 9 to 18 digits'),
  confirmAccountNumber: z.string(),
  ifscCode: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code'),
  bankName: z.string().trim().min(2, 'Bank name is required'),
  branchName: z.string().trim().min(2, 'Branch name is required'),
  upiId: z.preprocess((value) => String(value || '').trim().toLowerCase(), z.union([
    z.literal(''),
    z.string().regex(/^[\w.-]+@[\w.-]+$/, 'Enter a valid UPI ID'),
  ])),
  agreementAccepted: z.preprocess(
    (value) => value === true || value === 'true',
    z.literal(true, { errorMap: () => ({ message: 'You must accept the seller agreement' }) }),
  ),
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
  path: ['confirmAccountNumber'],
  message: 'Account numbers do not match',
});

export const loginSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

export const sendOtpSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  purpose: z.enum(['LOGIN', 'VERIFICATION', 'PASSWORD_RESET']).optional().default('LOGIN'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  purpose: z.enum(['LOGIN', 'VERIFICATION', 'PASSWORD_RESET']).optional().default('LOGIN'),
});
