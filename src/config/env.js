import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CLIENT_URL: z.string().default("http://localhost:3000"),

  MONGO_URI: z.string().default("mongodb://127.0.0.1:27017/retailer_ecommerce"),
  MONGO_TEST_URI: z
    .string()
    .default("mongodb://127.0.0.1:27017/retailer_ecommerce_test"),

  JWT_ACCESS_SECRET: z
    .string()
    .default("super_secret_access_key_retailer_2026_change_in_prod"),
  JWT_REFRESH_SECRET: z
    .string()
    .default("super_secret_refresh_key_retailer_2026_change_in_prod"),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  PLATFORM_ADMIN_REGISTRATION_KEY: z.string().optional().default(""),

  CLOUDINARY_CLOUD_NAME: z.string().default("demo_cloud"),
  CLOUDINARY_API_KEY: z.string().default("123456789012345"),
  CLOUDINARY_API_SECRET: z.string().default("abcdefghijklmnopqrstuvwxyz123456"),
  CLOUDINARY_UPLOAD_TIMEOUT_MS: z
    .string()
    .default("60000")
    .transform((val) => parseInt(val, 10)),

  SMS_PROVIDER: z.enum(["mock", "twilio", "fast2sms"]).default("mock"),
  SMS_DELIVERY_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),
  SMS_API_KEY: z.string().optional().default("mock_api_key"),
  SMS_SENDER_ID: z.string().optional().default("RETAIL"),
  TWILIO_ACCOUNT_SID: z
    .string()
    .optional()
    .default("AC_mock_twilio_account_sid"),
  TWILIO_AUTH_TOKEN: z.string().optional().default("mock_twilio_auth_token"),
  TWILIO_PHONE_NUMBER: z.string().optional().default("+1234567890"),

  OTP_EXPIRY_MINUTES: z
    .string()
    .default("10")
    .transform((val) => parseInt(val, 10)),
  OTP_MAX_ATTEMPTS: z
    .string()
    .default("3")
    .transform((val) => parseInt(val, 10)),
  OTP_RESEND_COOLDOWN_SECONDS: z
    .string()
    .default("60")
    .transform((val) => parseInt(val, 10)),
  OTP_EXPOSE_CODE_FOR_TESTS: z
    .enum(["true", "false"])
    .default(process.env.NODE_ENV === "test" ? "true" : "false")
    .transform((val) => val === "true"),
  OTP_LOCAL_BYPASS_CODE: z
    .string()
    .regex(/^\d{6}$/)
    .default("123456"),

  PAYMENT_PROVIDER: z.enum(["mock", "razorpay"]).default("mock"),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  RAZORPAYX_WEBHOOK_SECRET: z.string().optional().default(""),
  PLATFORM_COMMISSION_PERCENT: z
    .string()
    .default("10")
    .transform((val) => Number(val)),
  SETTLEMENT_HOLD_DAYS: z
    .string()
    .default("3")
    .transform((val) => parseInt(val, 10)),
  AUTO_PAYOUT_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),
  RAZORPAYX_ACCOUNT_NUMBER: z.string().optional().default(""),
  BANK_DATA_ENCRYPTION_KEY: z
    .string()
    .default(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ),
  SHIPPING_PROVIDER: z.enum(["mock", "shiprocket"]).default("mock"),
  SHIPROCKET_EMAIL: z.string().optional().default(""),
  SHIPROCKET_PASSWORD: z.string().optional().default(""),
  SHIPROCKET_PICKUP_LOCATION: z.string().default("Primary"),
  SHIPPING_DEFAULT_WEIGHT_KG: z.string().default("0.5").transform(Number),
  SHIPPING_DEFAULT_LENGTH_CM: z.string().default("20").transform(Number),
  SHIPPING_DEFAULT_BREADTH_CM: z.string().default("15").transform(Number),
  SHIPPING_DEFAULT_HEIGHT_CM: z.string().default("10").transform(Number),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  throw new Error("Invalid environment variables");
}

const configuredEnv = parsedEnv.data;

if (
  configuredEnv.AUTO_PAYOUT_ENABLED &&
  configuredEnv.PAYMENT_PROVIDER === "razorpay" &&
  (!configuredEnv.RAZORPAYX_ACCOUNT_NUMBER ||
    !configuredEnv.RAZORPAYX_WEBHOOK_SECRET)
) {
  throw new Error(
    "Automatic RazorpayX payouts require RAZORPAYX_ACCOUNT_NUMBER and RAZORPAYX_WEBHOOK_SECRET.",
  );
}

if (configuredEnv.NODE_ENV === "production") {
  const requiredProductionValues = [
    "MONGO_URI",
    "CLIENT_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
  ];
  const missingValues = requiredProductionValues.filter((key) => {
    const value = process.env[key];
    return (
      !value || value.startsWith("replace_") || value.includes("change_in_prod")
    );
  });

  if (missingValues.length > 0) {
    throw new Error(
      `Missing or placeholder production configuration: ${missingValues.join(", ")}`,
    );
  }

  if (
    configuredEnv.SMS_DELIVERY_ENABLED &&
    configuredEnv.SMS_PROVIDER === "mock"
  ) {
    throw new Error(
      "SMS_PROVIDER=mock is not permitted in production. Configure a real SMS provider.",
    );
  }

  if (
    configuredEnv.SMS_DELIVERY_ENABLED &&
    configuredEnv.SMS_PROVIDER === "twilio" &&
    (!configuredEnv.TWILIO_ACCOUNT_SID ||
      !configuredEnv.TWILIO_AUTH_TOKEN ||
      !configuredEnv.TWILIO_PHONE_NUMBER ||
      configuredEnv.TWILIO_ACCOUNT_SID.startsWith("AC_mock_") ||
      configuredEnv.TWILIO_AUTH_TOKEN === "mock_twilio_auth_token")
  ) {
    throw new Error(
      "Twilio production configuration is incomplete. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
    );
  }

  if (
    configuredEnv.SMS_DELIVERY_ENABLED &&
    configuredEnv.SMS_PROVIDER === "fast2sms" &&
    (!configuredEnv.SMS_API_KEY ||
      configuredEnv.SMS_API_KEY === "mock_api_key" ||
      configuredEnv.SMS_API_KEY.startsWith("replace_"))
  ) {
    throw new Error(
      "Fast2SMS production configuration is incomplete. Set SMS_API_KEY.",
    );
  }

  if (
    configuredEnv.PAYMENT_PROVIDER === "razorpay" &&
    (!configuredEnv.RAZORPAY_KEY_ID ||
      !configuredEnv.RAZORPAY_KEY_SECRET ||
      !configuredEnv.RAZORPAY_WEBHOOK_SECRET)
  ) {
    throw new Error(
      "Razorpay production configuration is incomplete. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET.",
    );
  }

  if (
    configuredEnv.PAYMENT_PROVIDER === "razorpay" &&
    configuredEnv.AUTO_PAYOUT_ENABLED &&
    !configuredEnv.RAZORPAYX_ACCOUNT_NUMBER
  ) {
    throw new Error(
      "Automatic RazorpayX payouts require RAZORPAYX_ACCOUNT_NUMBER.",
    );
  }

  if (
    configuredEnv.PAYMENT_PROVIDER === "razorpay" &&
    configuredEnv.AUTO_PAYOUT_ENABLED &&
    !configuredEnv.RAZORPAYX_WEBHOOK_SECRET
  ) {
    throw new Error(
      "Automatic RazorpayX payouts require RAZORPAYX_WEBHOOK_SECRET.",
    );
  }

  if (
    configuredEnv.SHIPPING_PROVIDER === "shiprocket" &&
    (!configuredEnv.SHIPROCKET_EMAIL || !configuredEnv.SHIPROCKET_PASSWORD)
  ) {
    throw new Error(
      "Shiprocket shipping requires SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.",
    );
  }

  if (
    configuredEnv.CLOUDINARY_CLOUD_NAME === "demo_cloud" ||
    !configuredEnv.CLOUDINARY_API_KEY ||
    !configuredEnv.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Production uploads require a configured Cloudinary account.",
    );
  }

  if (
    !process.env.BANK_DATA_ENCRYPTION_KEY ||
    process.env.BANK_DATA_ENCRYPTION_KEY ===
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" ||
    process.env.BANK_DATA_ENCRYPTION_KEY.startsWith("replace_")
  ) {
    throw new Error(
      "Set a unique BANK_DATA_ENCRYPTION_KEY before production startup.",
    );
  }
}

// Tests must never reuse the development database. Keeping the resolved URI in
// one place prevents test setup and application code from drifting apart.
export const env = {
  ...configuredEnv,
  MONGO_URI:
    configuredEnv.NODE_ENV === "test"
      ? configuredEnv.MONGO_TEST_URI
      : configuredEnv.MONGO_URI,
};
