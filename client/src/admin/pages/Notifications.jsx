import { useEffect, useState } from 'react'; import api from '../../api/axios';
export default function Notifications() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    const load = () => api.get('/notifications')
      .then((response) => { if (!disposed) setItems(response.data?.data?.notifications || []); })
      .catch((requestError) => { if (!disposed) setError(requestError.response?.data?.message || 'Unable to load notifications.'); });
    load();
    const interval = window.setInterval(load, 10000);
    return () => { disposed = true; window.clearInterval(interval); };
  }, []);
  return <div className="space-y-5"><div><h1 className="text-2xl font-bold">Notifications</h1><p className="text-slate-500 text-sm">Store activity alerts update automatically.</p></div>{error&&<p className="text-red-600 text-sm">{error}</p>}<div className="bg-white border rounded-2xl divide-y">{items.length?items.map(n=><div key={n._id} className="p-4"><p className="font-semibold">{n.title}</p><p className="text-sm text-slate-600">{n.message}</p><p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p></div>):<p className="p-6 text-slate-500">No notifications yet.</p>}</div></div>;
}
