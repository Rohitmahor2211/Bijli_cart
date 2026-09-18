import { sendError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  console.error('🔥 DETAILED API ERROR:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for '${field}'. Must be unique.`;
    errors = Object.entries(err.keyValue || {}).map(([field, value]) => ({
      field,
      code: 'DUPLICATE_VALUE',
      message: `The value '${value}' is already in use.`,
    }));
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Database Validation Failed';
    errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      code: 'VALIDATION_ERROR',
      message: el.message,
    }));
  }

  // Handle Zod validation errors
  // if (err.name === 'ZodError') {
  //   statusCode = 400;
  //   message = 'Invalid Request Data';
  //   details = err.errors.map((e) => ({
  //     field: e.path.join('.'),
  //     message: e.message,
  //   }));
  // }

  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Invalid Request Data';

    errors = (Array.isArray(err.issues) ? err.issues : []).map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : 'unknown',
      code: e.code || 'VALIDATION_ERROR',
      message: e.message,
    }));
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
  }

  if (env.NODE_ENV === 'development' && err.stack) {
    logger.debug('Request failed', { method: req.method, path: req.originalUrl, stack: err.stack });
  }

  return sendError(res, message, errors, statusCode);
};
