const validationMessage = (details) => {
  if (!details) return '';
  if (Array.isArray(details)) {
    return details
      .map((detail) => detail?.message || detail?.msg || String(detail))
      .filter(Boolean)
      .join(' ');
  }
  if (typeof details === 'object') {
    return Object.entries(details)
      .map(([field, message]) => `${field}: ${message}`)
      .join(' ');
  }
  return String(details);
};

export function getApiErrorMessage(error, fallback = 'Please check the form and try again.') {
  const response = error?.response?.data;
  const message = response?.message || response?.error;
  const details = validationMessage(response?.errors || response?.details);
  if (message && details && !String(message).includes(details)) {
    return `${message} ${details}`;
  }
  return message || details || error?.message || fallback;
}
