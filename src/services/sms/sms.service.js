import { env } from '../../config/env.js';
import { sendMockSMS } from './mock.provider.js';
import { sendFast2SMS } from './fast2sms.provider.js';
import { sendTwilioSMS } from './twilio.provider.js';

export const sendSMS = async ({ to, message, context = {} }) => {
  if (env.NODE_ENV !== 'production' || !env.SMS_DELIVERY_ENABLED || env.SMS_PROVIDER === 'mock') {
    return sendMockSMS({ to, message });
  }

  if (env.SMS_PROVIDER === 'twilio') return sendTwilioSMS({ to, message, context });
  if (env.SMS_PROVIDER === 'fast2sms') return sendFast2SMS({ to, message, context });
  throw new Error('SMS provider is not configured. Set SMS_PROVIDER to twilio or fast2sms.');
};
