import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OTP } from "../models/otp.model.js";
import { sendSMS } from "./sms/sms.service.js";
import { env } from "../config/env.js";

const generateDigits = (length = 6) => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return crypto.randomInt(min, max + 1).toString();
};

export const createAndSendOTP = async ({
  phone,
  purpose = "LOGIN",
  audience = "RETAILER",
  displayName = "",
  shopName = "",
}) => {
  // Check resend cooldown
  const existingOTP = await OTP.findOne({ phone, purpose, audience });
  if (existingOTP) {
    if (env.NODE_ENV !== "test") {
      const secondsSinceLastSent =
        (Date.now() - new Date(existingOTP.lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSent < env.OTP_RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(
          env.OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSent,
        );
        const error = new Error(
          `Please wait ${waitSeconds} seconds before requesting another OTP.`,
        );
        error.statusCode = 429;
        throw error;
      }
    }
    // Remove previous OTP record
    await OTP.deleteOne({ _id: existingOTP._id });
  }

  const rawOTP = generateDigits(6);
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(rawOTP, salt);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await OTP.create({
    phone,
    otpHash,
    purpose,
    audience,
    expiresAt,
    lastSentAt: new Date(),
  });

  const message = `Your Shop Admin verification OTP code is ${rawOTP}. Valid for ${env.OTP_EXPIRY_MINUTES} minutes. Do not share with anyone.`;
  await sendSMS({
    to: phone,
    message,
    context: { audience, purpose },
  });

  // OTP disclosure is test-only. Local development uses the mock provider log,
  // while deployed environments must never receive a verification code in JSON.
  const devMeta =
    env.NODE_ENV === "test" &&
    env.OTP_EXPOSE_CODE_FOR_TESTS
      ? { devOtp: rawOTP }
      : {};

  return { success: true, expiresAt, ...devMeta };
};

export const verifyOTP = async ({
  phone,
  otp,
  purpose = "LOGIN",
  audience = "RETAILER",
}) => {
  const otpRecord = await OTP.findOne({ phone, purpose, audience });

  if (!otpRecord) {
    const error = new Error(
      "No active OTP found or OTP expired. Please request a new one.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (new Date() > new Date(otpRecord.expiresAt)) {
    await OTP.deleteOne({ _id: otpRecord._id });
    const error = new Error("OTP has expired. Please request a new one.");
    error.statusCode = 400;
    throw error;
  }

  if (otpRecord.attempts >= env.OTP_MAX_ATTEMPTS) {
    await OTP.deleteOne({ _id: otpRecord._id });
    const error = new Error(
      "Maximum OTP verification attempts exceeded. Please request a new OTP.",
    );
    error.statusCode = 429;
    throw error;
  }

  const isValid = await bcrypt.compare(otp, otpRecord.otpHash);

  if (!isValid) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const attemptsLeft = env.OTP_MAX_ATTEMPTS - otpRecord.attempts;
    const error = new Error(
      `Invalid OTP. ${attemptsLeft} attempt(s) remaining.`,
    );
    error.statusCode = 400;
    throw error;
  }

  // OTP verified successfully, clean up
  await OTP.deleteOne({ _id: otpRecord._id });
  return true;
};
