import { logger } from '../../utils/logger.js';

export const sendMockSMS = async ({ to, message }) => {
  logger.info(`[MOCK SMS PROVIDER] 📱 Sent to ${to}: "${message}"`);
  return { success: true, provider: 'mock', messageId: `mock_${Date.now()}` };
};
