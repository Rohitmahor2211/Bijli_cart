import { env } from '../../config/env.js';
import { sendFast2SMS } from './fast2sms.provider.js';
import { sendTwilioSMS } from './twilio.provider.js';

export const sendSMS = async ({ to, message }) => {
  if (env.NODE_ENV === 'test') {
    return { success: true, provider: 'test', messageId: `test_${Date.now()}` };
  }

  if (env.SMS_PROVIDER === 'twilio') return sendTwilioSMS({ to, message });
  if (env.SMS_PROVIDER === 'fast2sms') return sendFast2SMS({ to, message });
  throw new Error('SMS provider is not configured. Set SMS_PROVIDER to twilio or fast2sms.');
};
