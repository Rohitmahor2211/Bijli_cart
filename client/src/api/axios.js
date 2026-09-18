import axios from 'axios';

let platformAdminAccessToken = '';
let platformAdminRefreshToken = '';

export const setPlatformAdminTokens = ({ accessToken, refreshToken }) => {
  platformAdminAccessToken = accessToken || '';
  platformAdminRefreshToken = refreshToken || '';
};

export const clearPlatformAdminTokens = () => {
  platformAdminAccessToken = '';
  platformAdminRefreshToken = '';
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (platformAdminAccessToken && config.url?.startsWith('/platform-admin/')) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${platformAdminAccessToken}`;
  }
  return config;
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
        const refreshResponse = await api.post(
          isPlatformAdminRequest ? '/platform-admin/refresh' : isBuyerRequest ? '/buyer-auth/refresh' : '/auth/refresh',
          isPlatformAdminRequest && platformAdminRefreshToken
            ? { refreshToken: platformAdminRefreshToken }
            : undefined,
        );
        if (isPlatformAdminRequest && refreshResponse.data?.data?.accessToken) {
          platformAdminAccessToken = refreshResponse.data.data.accessToken;
        }
        return api(original);
      } catch {
        if (isBuyerRequest) {
          localStorage.removeItem('bijlikartCustomerAuth');
          localStorage.removeItem('bijlikartCustomerName');
        } else if (isPlatformAdminRequest) {
          clearPlatformAdminTokens();
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
