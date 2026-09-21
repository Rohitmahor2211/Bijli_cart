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
  const [step, setStep] = useState('credentials');
  const [form, setForm] = useState({ phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCredentials(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        phone: normalizeIndianPhone(form.phone),
        password: form.password,
      });
      if (!response.data?.data?.otpRequired) {
        throw new Error('The login service did not request OTP verification.');
      }
      setStep('otp');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Login failed. Check your phone number and password.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        phone: normalizeIndianPhone(form.phone),
        otp,
        purpose: 'LOGIN',
      });
      const payload = response.data?.data;
      login(payload.accessToken, payload.retailer, payload.refreshToken);
      navigate('/admin');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'OTP verification failed. For local testing, use 123456.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-3xl font-black text-[#123b7a]">⚡ BiljiKact</div>
          <div className="mt-2 inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">🏪 Seller Portal</div>
        </div>
        <h1 className="text-2xl font-black text-gray-800 mb-1">Seller Login</h1>
        <p className="text-sm text-gray-500 mb-5">
          {step === 'credentials' ? 'Enter your phone number and password.' : 'Enter the OTP sent to your registered phone.'}
        </p>
        {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}
        {step === 'credentials' ? (
          <form onSubmit={handleCredentials} className="space-y-4">
            <input required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Registered mobile number" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
            <input required type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
            <button disabled={loading} className="w-full py-3 bg-blue-600 text-white font-black rounded-xl disabled:opacity-60">{loading ? 'Verifying password…' : 'Continue to OTP →'}</button>
          </form>
        ) : (
          <form onSubmit={handleOtp} className="space-y-4">
            <input required autoFocus inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter OTP (local: 123456)" className="w-full border border-blue-300 rounded-xl px-4 py-3 text-center text-xl tracking-widest" />
            <p className="text-xs text-slate-500">Local testing OTP: <strong>123456</strong></p>
            <button disabled={loading} className="w-full py-3 bg-green-600 text-white font-black rounded-xl disabled:opacity-60">{loading ? 'Verifying…' : 'Verify OTP & Login'}</button>
            <button type="button" onClick={() => { setStep('credentials'); setOtp(''); setError(''); }} className="w-full text-sm text-blue-600 font-bold">Change credentials</button>
          </form>
        )}
        <button onClick={() => navigate('/')} className="mt-6 w-full text-xs text-gray-400">← Back to store</button>
      </div>
    </div>
  );
}
