const validationMessage = (details) => {
  if (!details) return '';
  if (Array.isArray(details)) {
    return details
      .map((detail) => {
        const message = detail?.message || detail?.msg || String(detail);
        return detail?.field ? `${detail.field}: ${message}` : message;
      })
      .filter(Boolean)
      .join(' ');
  }
  if (typeof details === 'object') {
    return Object.entries(details)
      .map(([field, message]) => `${field}: ${typeof message === 'object' ? message.message || JSON.stringify(message) : message}`)
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
