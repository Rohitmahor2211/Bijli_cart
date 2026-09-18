import twilio from 'twilio';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const sendTwilioSMS = async ({ to, message }) => {
  try {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    const result = await client.messages.create({
      body: message,
      from: env.TWILIO_PHONE_NUMBER,
      to,
    });
    return { success: true, provider: 'twilio', messageId: result.sid };
  } catch (error) {
    logger.error('[TWILIO SMS PROVIDER] Error sending SMS:', error);
    throw new Error(`Failed to send SMS via Twilio: ${error.message}`);
  }
};
