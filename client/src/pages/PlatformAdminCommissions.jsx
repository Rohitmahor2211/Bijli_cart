import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import useLiveRefresh from '../hooks/useLiveRefresh';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const emptyReport = { commissions: [], totalCommission: 0, transactionCount: 0 };

export default function PlatformAdminCommissions() {
  const [report, setReport] = useState(emptyReport);
  const [error, setError] = useState('');
  const load = useCallback(() => api.get('/platform-operations/commissions')
      .then((response) => setReport(response.data?.data || emptyReport))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load commission report.')), []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);
  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Platform finance</p><h1 className="mt-2 text-3xl font-black text-slate-900">Commission report</h1><p className="mt-1 text-sm text-slate-500">Every recorded platform commission with order, seller, amount and timestamp.</p>{error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total commission</p><p className="mt-2 text-3xl font-black text-emerald-700">{money(report.totalCommission)}</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Commission transactions</p><p className="mt-2 text-3xl font-black text-slate-900">{report.transactionCount}</p></div></div><div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Date & time</th><th className="p-4">Order</th><th className="p-4">Seller</th><th className="p-4">Status</th><th className="p-4 text-right">Commission</th></tr></thead><tbody className="divide-y">{report.commissions.length ? report.commissions.map((entry) => <tr key={entry._id}><td className="p-4">{new Date(entry.createdAt).toLocaleString('en-IN')}</td><td className="p-4 font-semibold">{entry.orderId?.orderNumber || '—'}</td><td className="p-4">{entry.retailerId?.shopName || '—'}</td><td className="p-4">{entry.status}</td><td className="p-4 text-right font-bold text-emerald-700">{money(Math.abs(entry.amount))}</td></tr>) : <tr><td className="p-8 text-center text-slate-500" colSpan="5">No commission transactions yet.</td></tr>}</tbody></table></div></div></main>;
}
