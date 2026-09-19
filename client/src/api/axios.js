import axios from 'axios';

let platformAdminAccessToken = '';
let platformAdminRefreshToken =
  typeof window !== 'undefined'
    ? window.sessionStorage.getItem('bijlikartPlatformAdminRefreshToken') || ''
    : '';
let sellerAccessToken =
  typeof window !== 'undefined'
    ? window.sessionStorage.getItem('bijlikartSellerAccessToken') || ''
    : '';
let sellerRefreshToken =
  typeof window !== 'undefined'
    ? window.sessionStorage.getItem('bijlikartSellerRefreshToken') || ''
    : '';
let buyerAccessToken =
  typeof window !== 'undefined'
    ? window.sessionStorage.getItem('bijlikartBuyerAccessToken') || ''
    : '';
let buyerRefreshToken =
  typeof window !== 'undefined'
    ? window.sessionStorage.getItem('bijlikartBuyerRefreshToken') || ''
    : '';

const isPlatformAdminUrl = (url = '') =>
  url.startsWith('/platform-admin/') || url.startsWith('/platform-operations/');
const isBuyerUrl = (url = '') =>
  url.startsWith('/buyer-auth/') ||
  url.startsWith('/buyer-orders') ||
  url.startsWith('/buyer-notifications') ||
  url.startsWith('/marketplace-checkout') ||
  url.startsWith('/product-reviews') ||
  url.includes('/reviews');

export const setPlatformAdminTokens = ({ accessToken, refreshToken }) => {
  platformAdminAccessToken = accessToken || '';
  platformAdminRefreshToken = refreshToken || '';
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(
      'bijlikartPlatformAdminRefreshToken',
      platformAdminRefreshToken,
    );
  }
};

export const setBuyerTokens = ({ accessToken, refreshToken }) => {
  buyerAccessToken = accessToken || '';
  buyerRefreshToken = refreshToken || '';
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('bijlikartBuyerAccessToken', buyerAccessToken);
    window.sessionStorage.setItem('bijlikartBuyerRefreshToken', buyerRefreshToken);
  }
};

export const clearBuyerTokens = () => {
  buyerAccessToken = '';
  buyerRefreshToken = '';
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('bijlikartBuyerAccessToken');
    window.sessionStorage.removeItem('bijlikartBuyerRefreshToken');
  }
};

export const clearPlatformAdminTokens = () => {
  platformAdminAccessToken = '';
  platformAdminRefreshToken = '';
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('bijlikartPlatformAdminRefreshToken');
  }
};

export const setSellerTokens = ({ accessToken, refreshToken }) => {
  sellerAccessToken = accessToken || '';
  sellerRefreshToken = refreshToken || '';
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('bijlikartSellerAccessToken', sellerAccessToken);
    window.sessionStorage.setItem('bijlikartSellerRefreshToken', sellerRefreshToken);
  }
};

export const clearSellerTokens = () => {
  sellerAccessToken = '';
  sellerRefreshToken = '';
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('bijlikartSellerAccessToken');
    window.sessionStorage.removeItem('bijlikartSellerRefreshToken');
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (platformAdminAccessToken && isPlatformAdminUrl(config.url)) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${platformAdminAccessToken}`;
  } else if (buyerAccessToken && isBuyerUrl(config.url)) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${buyerAccessToken}`;
  } else if (sellerAccessToken && !isPlatformAdminUrl(config.url) && !isBuyerUrl(config.url)) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${sellerAccessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (
      err.response?.status === 401 &&
      original &&
      !original._authRetry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/buyer-auth/refresh') &&
      !original.url?.includes('/platform-admin/refresh')
    ) {
      original._authRetry = true;
      const isBuyerRequest =
        original.url?.startsWith('/marketplace-checkout') ||
        original.url?.startsWith('/buyer-orders') ||
        original.url?.startsWith('/buyer-notifications') ||
        original.url === '/buyer-auth/me' ||
        original.url?.includes('/reviews');
      const isPlatformAdminRequest = isPlatformAdminUrl(original.url);
      try {
        const refreshResponse = await api.post(
          isPlatformAdminRequest
            ? '/platform-admin/refresh'
            : isBuyerRequest
              ? '/buyer-auth/refresh'
              : '/auth/refresh',
          isPlatformAdminRequest && platformAdminRefreshToken
            ? { refreshToken: platformAdminRefreshToken }
            : isBuyerRequest && buyerRefreshToken
              ? { refreshToken: buyerRefreshToken }
            : !isBuyerRequest && sellerRefreshToken
              ? { refreshToken: sellerRefreshToken }
              : undefined,
        );
        const nextAccessToken = refreshResponse.data?.data?.accessToken;
        if (isPlatformAdminRequest && nextAccessToken) {
          platformAdminAccessToken = nextAccessToken;
        } else if (isBuyerRequest && nextAccessToken) {
          buyerAccessToken = nextAccessToken;
          const nextRefreshToken = refreshResponse.data?.data?.refreshToken;
          if (nextRefreshToken) buyerRefreshToken = nextRefreshToken;
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('bijlikartBuyerAccessToken', buyerAccessToken);
            if (nextRefreshToken) {
              window.sessionStorage.setItem('bijlikartBuyerRefreshToken', nextRefreshToken);
            }
          }
        } else if (!isBuyerRequest && nextAccessToken) {
          sellerAccessToken = nextAccessToken;
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(
              'bijlikartSellerAccessToken',
              sellerAccessToken,
            );
          }
        }
        return api(original);
      } catch {
        if (isBuyerRequest) {
          clearBuyerTokens();
          localStorage.removeItem('bijlikartCustomerAuth');
          localStorage.removeItem('bijlikartCustomerName');
        } else if (isPlatformAdminRequest) {
          clearPlatformAdminTokens();
        } else {
          clearSellerTokens();
          localStorage.removeItem('avnishSellerAuth');
          localStorage.removeItem('avnishSellerId');
        }
      }
    }
    return Promise.reject(err);
  },
);

export default api;
