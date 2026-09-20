import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getApiErrorMessage } from '../utils/apiError';

export default function CustomerSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', mobile: '', email: '', city: '', password: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2) { alert('Enter a valid name.'); return; }
    if (!/^[6-9]\d{9}$/.test(form.mobile)) { alert('Enter a valid 10-digit mobile number.'); return; }
    if (form.city.trim().length < 2) { alert('Enter your city.'); return; }
    if (form.password.length < 8) { alert('Password must be at least 8 characters.'); return; }
    try { await api.post('/buyer-auth/register', { name: form.name, phone: `+91${form.mobile}`, email: form.email, city: form.city, password: form.password }); setDone(true); }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'Unable to create your account. Check each required field and try again.')); }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Account Created!</h2>
          <p className="text-sm text-gray-500 mb-6">Welcome to BiljiKact, <strong>{form.name}</strong>! Sign in to verify your mobile number.</p>
          <button onClick={() => navigate('/login')}
            className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition">
            Go to Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-8">
        <div className="text-center mb-6">
          <div className="text-3xl font-black text-[#071b3d]">⚡ BILJIKACT</div>
          <p className="text-xs text-gray-400 mt-1">Electronics Marketplace</p>
        </div>

        <h1 className="text-2xl font-black text-gray-800 mb-1">Create Account</h1>
        <p className="text-sm text-gray-500 mb-6">Shop from thousands of electronics products.</p>
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Enter your full name', required: true },
            { name: 'email', label: 'Email (optional)', type: 'email', placeholder: 'your@email.com', required: false },
            { name: 'city', label: 'City', type: 'text', placeholder: 'Your city', required: true },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              <input type={f.type} name={f.name} value={form[f.name]} onChange={handleChange} required={f.required}
                placeholder={f.placeholder}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition" />
            </div>
          ))}
          <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8}
            placeholder="Create password (minimum 8 characters)"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition" />
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-gray-600">🇮🇳 +91</span>
              <input type="tel" inputMode="numeric" maxLength={10} name="mobile" value={form.mobile}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="10-digit number"
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-blue-500 transition" />
            </div>
          </div>
          <button type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg">
            Create Account →
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">Already have an account?</span>
          <span className="flex-1 h-px bg-gray-200" />
        </div>
        <button onClick={() => navigate('/login')}
          className="w-full py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">
          Login Instead
        </button>
        <button onClick={() => navigate('/')} className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600 text-center">
          ← Back to BiljiKact
        </button>
      </div>
    </div>
  );
}
