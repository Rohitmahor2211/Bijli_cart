import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatMoney, getPriceIncludingTax } from '../utils/pricing';

const headers = () => ({});

export default function PlatformAdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('PENDING_REVIEW');
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/platform-admin/products', { headers: headers(), params: { status } });
      setProducts(response.data?.data?.products || []);
    } catch (requestError) {
      if (requestError.response?.status === 401) navigate('/platform-admin/login', { replace: true });
      else setError(requestError.response?.data?.message || 'Unable to load product review queue.');
    }
  }, [navigate, status]);

  useEffect(() => { load(); }, [load]);

  const saveSpecifications = async (product, specifications) => {
    setSavingId(product._id);
    try {
      await api.patch(`/platform-admin/products/${product._id}/specifications`, { specifications }, { headers: headers() });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update specifications.');
    } finally {
      setSavingId('');
    }
  };

  const decide = async (product, decision) => {
    const reason = decision === 'REJECTED' ? window.prompt('Enter the required rejection reason:') : '';
    if (decision === 'REJECTED' && !reason?.trim()) return;
    if (!window.confirm(`${decision === 'APPROVED' ? 'Approve' : 'Reject'} ${product.name}?`)) return;
    setSavingId(product._id);
    try {
      await api.patch(`/platform-admin/products/${product._id}/moderation`, { decision, reason }, { headers: headers() });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update product.');
    } finally {
      setSavingId('');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-blue-600">BIJLIKART OPERATIONS</p>
            <h1 className="text-3xl font-black">Product moderation</h1>
            <p className="mt-1 text-sm text-slate-500">Only approved products become visible to buyers.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/platform-admin/categories')} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold">Categories</button>
            <button onClick={() => navigate('/platform-admin/sellers')} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold">Sellers</button>
          </div>
        </header>
        <div className="mb-5 flex flex-wrap gap-2">
          {['PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'INACTIVE'].map((value) => (
            <button key={value} onClick={() => setStatus(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${status === value ? 'bg-blue-600 text-white' : 'border bg-white text-slate-600'}`}>
              {value.replace('_', ' ')}
            </button>
          ))}
        </div>
        {error && <p className="mb-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        <div className="grid gap-5">
          {products.map((product) => {
            const specifications = product.specifications || {};
            const specificationEntries = Object.entries(specifications);
            return (
              <article key={product._id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row">
                  <img src={product.images?.[0]?.url || 'https://via.placeholder.com/180x140?text=No+Image'} alt={product.name} className="h-32 w-full rounded-lg bg-slate-50 object-contain md:w-44" />
                  <div className="flex-1">
                    <p className="text-xs font-black text-blue-600">{product.globalCategoryId?.name || 'CATEGORY MISSING'}</p>
                    <h2 className="text-xl font-black text-slate-900">{product.name}</h2>
                    <p className="text-sm text-slate-500">{product.brand || 'No brand'} · SKU: {product.sku} · Seller: {product.retailerId?.shopName || 'Unknown'}</p>
                    <p className="mt-3 text-sm text-slate-700">{product.description || 'No description supplied.'}</p>
                    {product.rejectionReason ? <p className="mt-2 text-sm font-bold text-red-700">Rejection reason: {product.rejectionReason}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <span><strong>Final price (incl. GST):</strong> {formatMoney(getPriceIncludingTax(product))}</span>
                      <span><strong>Stock:</strong> {product.inventory?.stockQuantity}</span>
                      <span><strong>Images:</strong> {product.images?.length || 0}</span>
                    </div>
                    {specificationEntries.length > 0 && (
                      <form
                        className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm md:grid-cols-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const next = Object.fromEntries(specificationEntries.map(([key]) => [key, event.target.elements[key].value]));
                          saveSpecifications(product, next);
                        }}
                      >
                        {specificationEntries.map(([key, value]) => (
                          <label key={key} className="block">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{key}</span>
                            <input name={key} defaultValue={value} className="mt-1 w-full rounded border bg-white px-2 py-1 font-semibold text-slate-800" />
                          </label>
                        ))}
                        <div className="md:col-span-3">
                          <button disabled={savingId === product._id} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-60">Save specifications</button>
                        </div>
                      </form>
                    )}
                    {status === 'PENDING_REVIEW' && (
                      <div className="mt-5 flex gap-3">
                        <button disabled={savingId === product._id} onClick={() => decide(product, 'APPROVED')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Approve product</button>
                        <button disabled={savingId === product._id} onClick={() => decide(product, 'REJECTED')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">Reject product</button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {!products.length && <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">No products in this queue.</div>}
        </div>
      </div>
    </main>
  );
}
