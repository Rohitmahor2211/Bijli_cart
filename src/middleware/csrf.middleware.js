import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const configuredOrigin = () => {
  try {
    return new URL(env.CLIENT_URL).origin;
  } catch {
    return null;
  }
};

export const requireTrustedOrigin = (req, res, next) => {
  if (env.NODE_ENV !== 'production' || !unsafeMethods.has(req.method)) return next();

  const expectedOrigin = configuredOrigin();
  let requestOrigin = req.get('origin') || '';
  if (!requestOrigin && req.get('referer')) {
    try {
      requestOrigin = new URL(req.get('referer')).origin;
    } catch {
      requestOrigin = '';
    }
  }

  if (!expectedOrigin || requestOrigin !== expectedOrigin) {
    return sendError(res, 'Request origin is not trusted.', null, 403);
  }

  return next();
};
