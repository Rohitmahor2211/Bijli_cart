import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const normalizeIndianPhone = (value) => {
  const digits = value.replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return value.trim();
};

export default function SellerLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [form, setForm] = useState({ phone: '', password: '' });
  const [otpPhone, setOtpPhone] = useState('');
  const [otp, setOtp] = useState('');
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

      if (!payload?.requiresOtp) {
        throw new Error('The login service returned an unexpected response.');
      }

      setOtpPhone(phone);
      setOtp('');
      setStep('otp');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp(e) {
    e.preventDefault();
    setError('');
    const phone = normalizeIndianPhone(otpPhone);
    if (!/^\+91[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit Indian mobile number.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setOtpPhone(phone);
      setOtp('');
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone: normalizeIndianPhone(otpPhone), otp });
      const { retailer } = res.data?.data || {};
      if (!retailer) {
        throw new Error('The verification service returned an unexpected response.');
      }
      login(null, retailer);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
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
            <div className="text-3xl font-black text-[#123b7a]">⚡ AVNISH</div>
            <div className="mt-2 inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
              🏪 Seller Portal
            </div>
          </div>

          {step === 'credentials' && (
            <>
              <h1 className="text-2xl font-black text-gray-800 mb-1">Seller Login</h1>
              <p className="text-sm text-gray-500 mb-5">Access your seller dashboard.</p>

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

              <div className="my-5 flex items-center gap-3">
                <span className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or login with OTP</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={sendOtp} className="flex gap-2">
                <input type="tel" inputMode="numeric" maxLength={10} value={otpPhone}
                  onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Mobile for OTP"
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 transition" />
                <button type="submit" disabled={loading}
                  className="px-4 py-2.5 bg-gray-800 text-white text-sm font-bold rounded-xl hover:bg-gray-900 transition disabled:opacity-60">
                  Send OTP
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">📱</div>
                <h2 className="text-xl font-black text-gray-800">Enter OTP</h2>
                <p className="text-sm text-gray-500 mt-1">Sent to <strong className="text-blue-600">{otpPhone}</strong></p>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
              )}
              <input type="text" inputMode="numeric" maxLength={6} autoFocus value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                className="w-full border-2 border-blue-200 rounded-xl px-4 py-4 text-center text-2xl font-black tracking-[10px] focus:border-blue-500 transition" />
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-black rounded-xl hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-60">
                {loading ? 'Verifying...' : '✓ Verify & Login'}
              </button>
              <button type="button" onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                className="w-full py-2 text-blue-600 font-bold text-sm hover:underline">
                ← Back
              </button>
            </form>
          )}

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
