import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import useLiveRefresh from '../hooks/useLiveRefresh';

const initialPayment = { amount: '', method: 'BANK_TRANSFER', reference: '', notes: '' };

export default function PlatformAdminOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [payment, setPayment] = useState(initialPayment);
  const [saving, setSaving] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(
    () => api.get(`/platform-operations/orders?${new URLSearchParams({ ...(status ? { status } : {}), ...(search ? { search } : {}) })}`)
      .then((response) => setOrders(response.data?.data?.orders || []))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Orders could not be loaded.')),
    [search, status],
  );
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  const deliver = async (order) => {
    setSaving(order._id); setError('');
    try { await api.post(`/platform-operations/orders/${order._id}/deliver`); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Delivery could not be confirmed.'); }
    finally { setSaving(''); }
  };

  const confirmPayment = async (event) => {
    event.preventDefault(); setSaving(paymentOrder._id); setError('');
    try {
      await api.post(`/platform-operations/orders/${paymentOrder._id}/seller-payment`, payment);
      setPaymentOrder(null); setPayment(initialPayment); await load();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Seller payment could not be confirmed.'); }
    finally { setSaving(''); }
  };

  return (
    <main className="p-5 md:p-8">
      <h1 className="text-2xl font-black text-slate-900">Order operations</h1>
      <p className="mt-1 text-sm text-slate-500">Admin delivery confirmation and manual seller payments. No Shiprocket or automatic payout is used.</p>
      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order number" className="rounded-lg border px-3 py-2 text-sm md:w-72" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border px-3 py-2 text-sm md:w-52">
          <option value="">All order statuses</option><option value="PENDING">Pending</option><option value="ACCEPTED">Accepted</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {paymentOrder && (
        <form onSubmit={confirmPayment} className="mt-5 grid gap-3 rounded-xl bg-white p-5 shadow-sm md:grid-cols-4">
          <h2 className="md:col-span-4 font-bold">Confirm seller payment: {paymentOrder.orderNumber} (₹{Number(paymentOrder.sellerPayableAmount || 0).toLocaleString('en-IN')})</h2>
          <input required type="number" min="0.01" step="0.01" placeholder="Amount" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} className="rounded border p-2" />
          <select value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value })} className="rounded border p-2"><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash</option><option value="ONLINE">Online</option></select>
          <input required placeholder="Payment reference" value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} className="rounded border p-2" />
          <input placeholder="Notes" value={payment.notes} onChange={(event) => setPayment({ ...payment, notes: event.target.value })} className="rounded border p-2" />
          <div className="flex gap-2 md:col-span-4"><button disabled={saving === paymentOrder._id} className="rounded bg-blue-600 px-4 py-2 font-bold text-white">Confirm payment</button><button type="button" onClick={() => setPaymentOrder(null)} className="rounded border px-4 py-2">Close</button></div>
        </form>
      )}
      <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Order / product category</th><th className="p-3">Buyer</th><th className="p-3">Retailer</th><th className="p-3">Amount</th><th className="p-3">Order status</th><th className="p-3">Seller payment</th><th className="p-3">Action</th></tr></thead>
          <tbody>{orders.map((order) => {
            const cancelled = order.orderStatus === 'CANCELLED';
            const paid = order.sellerPaymentStatus === 'COMPLETED';
            return <tr key={order._id} className={`border-t ${cancelled ? 'bg-red-50/60' : ''}`}><td className="p-3"><div className="font-bold">{order.orderNumber}</div><div className="text-xs text-slate-500">({order.productCategories?.join(', ') || 'Uncategorized'})</div></td><td className="p-3">{order.buyerId?.name || '—'}</td><td className="p-3">{order.retailerId?.shopName || '—'}</td><td className="p-3"><div className="font-bold">₹{Number(order.sellerPayableAmount || 0).toLocaleString('en-IN')}</div><div className="text-xs text-slate-400">Seller amount</div></td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${cancelled ? 'bg-red-600 text-white' : order.orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{order.orderStatus}</span></td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${cancelled ? 'bg-red-600 text-white' : paid ? 'bg-green-600 text-white' : 'bg-amber-100 text-amber-800'}`}>{cancelled ? 'CANCELLED' : order.sellerPaymentStatus || 'PENDING'}</span></td><td className="p-3 whitespace-nowrap">{cancelled ? <span className="font-black text-red-700">Payment cancelled</span> : order.orderStatus === 'ACCEPTED' && <button onClick={() => deliver(order)} disabled={saving === order._id} className="mr-2 rounded bg-green-600 px-3 py-2 text-xs font-bold text-white">Mark delivered</button>}{!cancelled && order.orderStatus === 'DELIVERED' && !paid && <button onClick={() => { setPaymentOrder(order); setPayment({ ...initialPayment, amount: String(order.sellerPayableAmount || 0) }); }} className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white">Pay seller</button>}{paid && <span className="font-black text-green-700">Paid ✓</span>}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </main>
  );
}
