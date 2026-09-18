import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function StaffLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/platform-admin/login', form);
      navigate('/staff', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in.');
    } finally {
      setSaving(false);
    }
  };

  return <main className="min-h-screen bg-slate-950 px-4 py-12 flex items-center justify-center"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><p className="text-xs font-black tracking-[.18em] text-blue-600">BIJLICART OPERATIONS</p><h1 className="mt-2 text-2xl font-black text-slate-900">Staff sign in</h1><p className="mt-1 text-sm text-slate-500">Access is controlled by server-side platform roles.</p>{error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label className="mt-5 block text-sm font-bold text-slate-700">Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label><label className="mt-4 block text-sm font-bold text-slate-700">Password<input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label><button disabled={saving} className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Signing in…' : 'Sign in securely'}</button></form></main>;
}
