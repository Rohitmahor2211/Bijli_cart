import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// Authentication is cookie-based. Access tokens are never stored in browser storage.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && original && !original._authRetry
      && !original.url?.includes('/auth/refresh')
      && !original.url?.includes('/buyer-auth/refresh')
      && !original.url?.includes('/platform-admin/refresh')) {
      original._authRetry = true;
      const isBuyerRequest = original.url?.startsWith('/marketplace-checkout')
        || original.url?.startsWith('/buyer-orders')
        || original.url?.startsWith('/buyer-notifications')
        || original.url === '/buyer-auth/me';
      const isPlatformAdminRequest = original.url?.startsWith('/platform-admin/');
      try {
        await api.post(isPlatformAdminRequest ? '/platform-admin/refresh' : isBuyerRequest ? '/buyer-auth/refresh' : '/auth/refresh');
        return api(original);
      } catch {
        if (isBuyerRequest) {
          localStorage.removeItem('bijlikartCustomerAuth');
          localStorage.removeItem('bijlikartCustomerName');
        } else if (!isPlatformAdminRequest) {
          localStorage.removeItem('avnishSellerAuth');
          localStorage.removeItem('avnishSellerId');
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
