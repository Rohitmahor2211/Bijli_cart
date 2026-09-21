import { useEffect, useState } from 'react';
import api from '../../api/axios';
export default function Categories() {
  const [items, setItems] = useState([]); const [name, setName] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const load = () => api.get('/categories?flat=true').then((r) => setItems(r.data?.data?.categories || [])).catch((e) => setError(e.response?.data?.message || 'Unable to load categories.'));
  useEffect(() => { load(); }, []);
  const create = async (e) => { e.preventDefault(); setSaving(true); setError(''); try { await api.post('/categories', { name }); setName(''); await load(); } catch (err) { setError(err.response?.data?.message || 'Unable to create category.'); } finally { setSaving(false); } };
  return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-slate-900">Categories</h1><p className="text-sm text-slate-500">Organize your catalog.</p></div><form onSubmit={create} className="flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} required minLength="2" placeholder="New category name" className="border rounded-lg px-3 py-2 flex-1"/><button disabled={saving} className="bg-[#2b59ff] text-white px-4 rounded-lg disabled:opacity-60">{saving ? 'Adding…' : 'Add'}</button></form>{error && <p className="text-red-600 text-sm">{error}</p>}<div className="bg-white rounded-2xl border divide-y">{items.length ? items.map((item) => <div key={item._id} className="p-4 flex justify-between"><span>{item.name}</span><span>{item.isActive ? 'Active' : 'Inactive'}</span></div>) : <p className="p-4 text-slate-500">No categories yet.</p>}</div></div>;
}
