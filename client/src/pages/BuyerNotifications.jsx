import { useEffect, useState } from 'react';
import Footer from '../components/Footer';
import api from '../api/axios';
import useLiveRefresh from '../hooks/useLiveRefresh';

export default function BuyerNotifications() {
  const [items, setItems] = useState([]); const [error, setError] = useState('');
  const load = () => api.get('/buyer-notifications').then((res) => setItems(res.data?.data?.notifications || [])).catch((err) => setError(err.response?.status === 401 ? 'Please sign in to view notifications.' : err.response?.data?.message || 'Unable to load notifications.'));
  useEffect(() => { load(); }, []);
  useLiveRefresh(load);
  const read = async (notification) => { if (notification.isRead) return; try { await api.patch(`/buyer-notifications/${notification._id}/read`); setItems((previous) => previous.map((item) => item._id === notification._id ? { ...item, isRead: true } : item)); } catch { /* Notification reading is non-critical. */ } };
  return <div className="min-h-screen flex flex-col bg-slate-50"><main className="flex-1 mx-auto w-full max-w-4xl px-4 py-10"><p className="text-xs font-black uppercase tracking-[.2em] text-[#155eef]">Account updates</p><h1 className="mt-2 text-3xl font-black text-[#071b3d]">Notifications</h1>{error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">{items.length ? items.map((item) => <button key={item._id} onClick={() => read(item)} className={`w-full border-b p-5 text-left last:border-0 ${item.isRead ? 'bg-white' : 'bg-blue-50/60'}`}><div className="flex justify-between gap-4"><p className="font-bold text-slate-900">{item.title}</p>{!item.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-[#155eef]" />}</div><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p></button>) : <p className="p-8 text-center text-slate-500">No notifications yet.</p>}</div></main><Footer /></div>;
}
