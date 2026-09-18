import { env } from '../config/env.js';

const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (message, meta = {}) => {
    console.log(`[${getTimestamp()}] [INFO]: ${message}`, Object.keys(meta).length ? meta : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[${getTimestamp()}] [WARN]: ${message}`, Object.keys(meta).length ? meta : '');
  },
  error: (message, meta = {}) => {
    console.error(`[${getTimestamp()}] [ERROR]: ${message}`, Object.keys(meta).length ? meta : '');
  },
  debug: (message, meta = {}) => {
    if (env.NODE_ENV === 'development') {
      console.log(`[${getTimestamp()}] [DEBUG]: ${message}`, Object.keys(meta).length ? meta : '');
    }
  },
};
