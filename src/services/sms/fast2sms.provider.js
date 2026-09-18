import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const sendFast2SMS = async ({ to, message }) => {
  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: env.SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        numbers: to.replace(/\D/g, ''), // clean non-digits
        variables_values: message,
        flash: 0,
      }),
    });

    const data = await response.json();
    if (data.return) {
      return { success: true, provider: 'fast2sms', messageId: data.request_id };
    }
    throw new Error(data.message || 'Fast2SMS API returned failure');
  } catch (error) {
    logger.error('[FAST2SMS PROVIDER] Error sending SMS:', error);
    throw new Error(`Failed to send SMS via Fast2SMS: ${error.message}`);
  }
};
