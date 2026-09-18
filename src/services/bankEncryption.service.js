import crypto from 'crypto';
import { env } from '../config/env.js';

const getKey = () => {
  const key = Buffer.from(env.BANK_DATA_ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) throw new Error('BANK_DATA_ENCRYPTION_KEY must be a 64-character hexadecimal key.');
  return key;
};

export const encryptBankAccount = (accountNumber) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(accountNumber, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
};

export const decryptBankAccount = (encryptedValue) => {
  const [version, ivText, tagText, valueText] = String(encryptedValue).split('.');
  if (version !== 'v1' || !ivText || !tagText || !valueText) throw new Error('Bank account data is not encrypted in the supported format.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(valueText, 'base64')), decipher.final()]).toString('utf8');
};

export const maskBankAccount = (last4) => last4 ? `XXXXXX${last4}` : 'Hidden';
