import { env } from '../config/env.js';

const checks = [
  ['Razorpay payment keys', env.PAYMENT_PROVIDER === 'razorpay' ? Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) : true],
  ['Razorpay webhook secret', env.PAYMENT_PROVIDER === 'razorpay' ? Boolean(env.RAZORPAY_WEBHOOK_SECRET) : true],
  ['RazorpayX payout account', env.AUTO_PAYOUT_ENABLED ? Boolean(env.RAZORPAYX_ACCOUNT_NUMBER) : true],
  ['RazorpayX webhook secret', env.AUTO_PAYOUT_ENABLED ? Boolean(env.RAZORPAYX_WEBHOOK_SECRET || env.RAZORPAY_WEBHOOK_SECRET) : true],
  ['SMS provider', env.NODE_ENV === 'production' ? env.SMS_PROVIDER !== 'mock' : true],
  ['Cloudinary account', env.NODE_ENV === 'production' ? env.CLOUDINARY_CLOUD_NAME !== 'demo_cloud' && Boolean(env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) : true],
  ['Shiprocket credentials', env.SHIPPING_PROVIDER === 'shiprocket' ? Boolean(env.SHIPROCKET_EMAIL && env.SHIPROCKET_PASSWORD) : true],
];

let failed = false;
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) failed = true;
}

if (failed) {
  console.error('Provider preflight failed. Configure the missing sandbox values before external testing.');
  process.exitCode = 1;
} else {
  console.log(`Provider preflight passed in ${env.NODE_ENV} mode. No secret values were printed.`);
}
