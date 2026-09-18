import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import useLiveRefresh from '../hooks/useLiveRefresh';

const periods = [
  ['daily', 'Daily (last 30 days)'],
  ['weekly', 'Weekly (last 12 weeks)'],
  ['monthly', 'Monthly (last 12 months)'],
  ['quarterly', 'Quarterly (last 2 years)'],
  ['half-yearly', 'Half-yearly (last 3 years)'],
  ['yearly', 'Yearly (last 5 years)'],
];

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const maxValue = (values) => Math.max(...values, 1);

function BarChart({ title, data, valueKey, color, mode }) {
  const max = maxValue(data.map((item) => Number(item[valueKey] || 0)));
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-900">{title}</h2>
      {!data.length ? <p className="mt-8 text-sm text-slate-500">No data for this period.</p> : (
        <div className={mode === 'horizontal' ? 'mt-6 space-y-3' : 'mt-6 flex h-56 items-end gap-2 overflow-x-auto pb-7'}>
          {data.map((item) => (
            <div key={item.label} className={mode === 'horizontal' ? 'grid grid-cols-[90px_1fr_60px] items-center gap-2 text-xs' : 'flex h-full min-w-[38px] flex-1 flex-col items-center justify-end gap-2'}>
              <span className="text-[10px] font-bold text-slate-500">{valueKey === 'commission' ? money(item[valueKey]) : item[valueKey]}</span>
              <div className={`${mode === 'horizontal' ? 'h-3 rounded-r-md' : 'w-full rounded-t-md'} ${color}`} style={mode === 'horizontal' ? { width: `${Math.max((Number(item[valueKey] || 0) / max) * 100, 3)}%` } : { height: `${Math.max((Number(item[valueKey] || 0) / max) * 100, 3)}%` }} title={`${item.label}: ${item[valueKey]}`} />
              <span className="max-w-16 truncate text-[10px] text-slate-400" title={item.label}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function PlatformAdminAnalytics() {
  const navigate = useNavigate();
  const { sellerId } = useParams();
  const [period, setPeriod] = useState('monthly');
  const [chartMode, setChartMode] = useState('bars');
  const [report, setReport] = useState({ summary: {}, sellers: [], series: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.get(`/platform-operations/analytics?period=${period}${sellerId ? `&sellerId=${sellerId}` : ''}`)
      .then((response) => setReport(response.data?.data || { summary: {}, sellers: [], series: [] }))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Analytics could not be loaded.'))
      .finally(() => setLoading(false));
  }, [period, sellerId]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  const summaryCards = useMemo(() => [
    ['Total orders', report.summary.totalOrders, 'text-slate-900'],
    ['Pending', report.summary.pending, 'text-amber-700'],
    ['Accepted', report.summary.accepted, 'text-blue-700'],
    ['Cancelled', report.summary.cancelled, 'text-red-700'],
    ['Delivered', report.summary.delivered, 'text-green-700'],
    ['Commission income', money(report.summary.totalCommission), 'text-emerald-700'],
  ], [report]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Platform intelligence</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{sellerId ? 'Seller performance detail' : 'Seller orders & commission analytics'}</h1>
            <p className="mt-1 text-sm text-slate-500">Filter seller performance and platform commission income by reporting period.</p>
          </div>
          <div className="flex flex-wrap gap-2"><select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">{periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{sellerId && <><select value={chartMode} onChange={(event) => setChartMode(event.target.value)} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200"><option value="bars">Bar chart</option><option value="horizontal">Horizontal bars</option></select><button onClick={() => navigate('/platform-admin/analytics')} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">All sellers</button></>}</div>
        </div>

        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {loading ? <p className="mt-8 text-sm text-slate-500">Loading analytics...</p> : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {summaryCards.map(([label, value, color]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${color}`}>{value || 0}</p></div>)}
            </div>
            {sellerId && <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <BarChart title="Seller order trend" data={report.series} valueKey="orders" color="bg-blue-500" mode={chartMode} />
              <BarChart title="Seller commission trend" data={report.series} valueKey="commission" color="bg-emerald-500" mode={chartMode} />
            </div>}
            <section className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
              <div className="p-5"><h2 className="font-black text-slate-900">{sellerId ? 'Seller order statement' : 'Seller performance'}</h2><p className="mt-1 text-sm text-slate-500">{sellerId ? 'Order outcomes for this seller across the selected period.' : 'Select a seller to open their detailed performance workspace.'}</p></div>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Seller</th><th className="p-4 text-right">Total</th><th className="p-4 text-right">Pending</th><th className="p-4 text-right">Accepted</th><th className="p-4 text-right">Cancelled</th><th className="p-4 text-right">Delivered</th></tr></thead>
                <tbody className="divide-y">{report.sellers.length ? report.sellers.map((seller) => <tr key={seller.sellerId} onClick={() => navigate(`/platform-admin/analytics/seller/${seller.sellerId}`)} className="cursor-pointer hover:bg-blue-50"><td className="p-4 font-bold text-slate-800">{seller.sellerName}</td><td className="p-4 text-right font-bold">{seller.total}</td><td className="p-4 text-right text-amber-700">{seller.pending}</td><td className="p-4 text-right text-blue-700">{seller.accepted}</td><td className="p-4 text-right text-red-700">{seller.cancelled}</td><td className="p-4 text-right text-green-700">{seller.delivered}</td></tr>) : <tr><td colSpan="6" className="p-8 text-center text-slate-500">No seller orders found for this period.</td></tr>}</tbody>
              </table>
            </section>
            {sellerId && <section className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><div className="p-5"><h2 className="font-black text-slate-900">Products and category performance</h2><p className="mt-1 text-sm text-slate-500">Units sold and revenue for the selected seller.</p></div><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Product</th><th className="p-4">Category</th><th className="p-4 text-right">Units</th><th className="p-4 text-right">Revenue</th></tr></thead><tbody className="divide-y">{(report.products || []).map((product) => <tr key={product.productId}><td className="p-4 font-bold">{product.productName}</td><td className="p-4">{product.category}</td><td className="p-4 text-right">{product.units}</td><td className="p-4 text-right font-bold text-emerald-700">{money(product.revenue)}</td></tr>)}</tbody></table></div><div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-black">Seller product mix</h2><p className="mt-1 text-sm text-slate-500">Revenue contribution by product.</p><div className="mt-6 space-y-5">{(report.products || []).slice(0, 6).map((product) => { const max = Math.max(...(report.products || []).map((item) => item.revenue), 1); return <div key={product.productId}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="truncate font-semibold">{product.productName}</span><span className="font-bold text-emerald-700">{money(product.revenue)}</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${Math.max((product.revenue / max) * 100, 4)}%` }} /></div></div>; })}</div></div></section>}
          </>
        )}
      </div>
    </main>
  );
}
