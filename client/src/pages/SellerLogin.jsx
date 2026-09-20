import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getApiErrorMessage } from '../utils/apiError';

const normalizeIndianPhone = (value) => {
  const digits = value.replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return value.trim();
};

export default function SellerLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const phone = normalizeIndianPhone(form.phone);
      const res = await api.post('/auth/login', { phone, password: form.password });
      const payload = res.data?.data;
      if (!payload?.accessToken || !payload?.retailer) throw new Error('The login service returned an unexpected response.');
      login(payload.accessToken, payload.retailer, payload.refreshToken);
      navigate('/admin');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed. Check your phone number and password.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-3xl font-black text-[#123b7a]">⚡ BiljiKact</div>
            <div className="mt-2 inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
              🏪 Seller Portal
            </div>
          </div>

          <h1 className="text-2xl font-black text-gray-800 mb-1">Seller Login</h1>
          <p className="text-sm text-gray-500 mb-5">Access your seller dashboard with your password.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Registered mobile number <span className="text-red-500">*</span></label>
              <input type="text" value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="9876543210"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <input type="password" value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Your password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-60">
              {loading ? 'Logging in...' : 'Login to Dashboard →'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-2">
            <p className="text-sm text-gray-500">
              New seller? {' '}
              <button onClick={() => navigate('/seller-register')} className="text-blue-600 font-bold hover:underline">
                Register here →
              </button>
            </p>
            <button onClick={() => navigate('/')} className="text-xs text-gray-400 hover:text-gray-600">
              ← Back to store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
