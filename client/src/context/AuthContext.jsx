import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api/auth.api';
import { clearSellerTokens, setSellerTokens } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the seller session from the httpOnly cookie.
  useEffect(() => {
    const isPlatformAdminPath =
      window.location.pathname === '/platform-admin' ||
      window.location.pathname.startsWith('/platform-admin/');
    if (
      isPlatformAdminPath ||
      localStorage.getItem('avnishSellerAuth') !== 'true'
    ) {
      setLoading(false);
      return undefined;
    }
    getMe()
      .then((res) => setSeller(res.data?.data?.retailer || res.data?.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function login(accessToken, sellerData, refreshToken) {
    setSellerTokens({ accessToken, refreshToken });
    localStorage.setItem('avnishSellerAuth', 'true');
    localStorage.setItem('avnishSellerId', sellerData._id || sellerData.id || '');
    setSeller(sellerData);
  }

  function logout() {
    clearSellerTokens();
    localStorage.removeItem('avnishSellerAuth');
    localStorage.removeItem('avnishSellerId');
    setSeller(null);
  }

  return (
    <AuthContext.Provider value={{ seller, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
