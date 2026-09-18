const normalizeErrors = (errors) => {
  if (!errors) return [];

  if (typeof errors === 'string') {
    return [{ code: 'REQUEST_ERROR', message: errors }];
  }

  if (Array.isArray(errors)) {
    return errors.map((error) =>
      typeof error === 'string' ? { code: 'REQUEST_ERROR', message: error } : error
    );
  }

  if (Array.isArray(errors.errors)) {
    return normalizeErrors(errors.errors);
  }

  if (errors.details && Array.isArray(errors.details)) {
    return normalizeErrors(errors.details);
  }

  return [errors];
};

export const sendSuccess = (res, message = 'Success', data = null, statusCode = 200, pagination = null) => {
  const responseData = pagination ? { ...(data || {}), meta: { pagination } } : data;

  return res.status(statusCode).json({
    success: true,
    data: responseData,
    message,
    errors: [],
  });
};

export const sendError = (res, message = 'An error occurred', errors = null, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors: normalizeErrors(errors),
  });
};
