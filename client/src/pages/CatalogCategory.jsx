import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import api from '../api/axios';
import { formatMoney, getMrpIncludingTax, getPriceIncludingTax } from '../utils/pricing';

export default function CatalogCategory() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const applied = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  useEffect(() => {
    setData(null);
    setProducts([]);
    setPagination(null);
    setError('');
    setLoading(true);
    const params = Object.fromEntries(searchParams.entries());
    Promise.all([
      api.get(`/catalog/categories/${slug}`),
      api.get(`/catalog/categories/${slug}/products`, { params }),
    ]).then(([category, listing]) => {
      setData(category.data?.data);
      setProducts(listing.data?.data?.products || []);
      setFilters(listing.data?.data?.filters || []);
      setPagination(listing.data?.data?.meta?.pagination || null);
    }).catch((e) => setError(e.response?.data?.message || 'Category could not be loaded.')).finally(() => setLoading(false));
  }, [slug, searchParams]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || applied[key] === value) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setSearchParams(next);
  };

  const clearFilters = () => setSearchParams({});
  const openCategory = (categorySlug) => {
    navigate(`/c/${categorySlug}`);
  };
  const activeFilterCount = Object.keys(applied).filter((key) => key !== 'sort').length;
  const sort = applied.sort || '';

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* <Navbar cartCount={totalItems} /> */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {error ? <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : loading || !data ? <p className="py-16 text-center text-slate-500">Loading category…</p> : (
          <>
            <div className="rounded-2xl bg-[#071b3d] p-5 text-white shadow-lg md:p-8">
              <p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Shop by category</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">{data.category.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">{data.category.seo?.description || 'Explore verified products from trusted marketplace sellers.'}</p>
            </div>
            {data.children?.length > 0 && (
              <div className="mt-6 overflow-x-auto pb-1">
                <div className="flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  <button
                    onClick={() => openCategory(data.category.slug)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${slug === data.category.slug ? 'bg-[#071b3d] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    All {data.category.name}
                  </button>
                  {data.children.map((child) => (
                    <button
                      key={child._id}
                      onClick={() => openCategory(child.slug)}
                      className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${slug === child.slug ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xl font-black text-slate-900">Products</p><p className="text-sm text-slate-500">{pagination?.total ?? products.length} products found</p></div>
              <div className="flex gap-2">
                <select value={sort} onChange={(event) => setFilter('sort', event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none"><option value="">Sort: Recommended</option><option value="price_asc">Price: Low to high</option><option value="price_desc">Price: High to low</option></select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{Object.entries(applied).map(([key, value]) => key !== 'sort' && <button key={key} onClick={() => setFilter(key, value)} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{value} ×</button>)}{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs font-bold text-red-600">Clear all</button>}</div>
            {filters.length > 0 && (
              <button onClick={() => setShowFilters(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm lg:hidden">
                <span aria-hidden="true">☰</span> Filters {activeFilterCount ? `(${activeFilterCount})` : ''}
              </button>
            )}
            <div className="mt-5 grid gap-6 lg:grid-cols-[250px_1fr]">
              {filters.length > 0 && (
                <aside className={`${showFilters ? 'fixed inset-0 z-[100] flex justify-start bg-slate-950/50' : 'hidden'} lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)]`}>
                  <div className="h-full w-[min(88vw,340px)] overflow-y-auto rounded-r-2xl border border-slate-200 bg-white p-4 shadow-2xl lg:h-full lg:w-full lg:rounded-2xl lg:shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-black text-slate-900">Refine this category</p>
                      <p className="mt-1 text-xs text-slate-500">Filter products instantly.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeFilterCount > 0 && <button onClick={clearFilters} className="rounded-lg px-2 py-1 text-xs font-black text-red-600 hover:bg-red-50">Clear</button>}
                      <button onClick={() => setShowFilters(false)} className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100 lg:hidden">Close</button>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {filters.map((filter) => (
                      <section key={filter.key}>
                        <h3 className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">{filter.label}</h3>
                        <div className="flex flex-wrap gap-2">
                          {filter.values.length ? filter.values.map((value) => (
                            <button key={value} onClick={() => setFilter(filter.key, value)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${applied[filter.key] === value ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'}`}>
                              {value}
                            </button>
                          )) : <span className="text-xs text-slate-400">No options available</span>}
                        </div>
                      </section>
                    ))}
                  </div>
                  <button onClick={() => setShowFilters(false)} className="mt-6 w-full rounded-xl bg-[#071b3d] py-3 text-sm font-black text-white lg:hidden">Apply filters</button>
                  </div>
                </aside>
              )}
              <section>
                {products.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {products.map((product) => (
                      <article key={product._id} onClick={() => navigate(`/product/${product._id}`)} className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 p-2 sm:p-3"><img src={product.images?.[0]?.url || 'https://via.placeholder.com/300x200?text=No+Image'} alt={product.name} className="h-full w-full object-contain transition duration-300 group-hover:scale-105" />{getMrpIncludingTax(product) > getPriceIncludingTax(product) && <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-1.5 py-1 text-[9px] font-black text-white sm:px-2 sm:text-[10px]">{Math.round((1 - getPriceIncludingTax(product) / getMrpIncludingTax(product)) * 100)}% OFF</span>}</div>
                        <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                          <p className="text-[9px] font-black uppercase tracking-wide text-blue-600 sm:text-[10px]">{product.brand || 'bijliKart verified'}</p>
                          <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs font-bold leading-5 text-slate-800 sm:text-sm">{product.name}</h3>
                          <p className="mt-2 text-base font-black text-slate-900 sm:text-lg">{formatMoney(getPriceIncludingTax(product))}</p><p className="text-[10px] font-semibold text-emerald-700">Inclusive of GST</p>
                          <p className={`mt-2 text-[10px] font-bold ${Number(product.inventory?.stockQuantity ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {Number(product.inventory?.stockQuantity ?? 0) > 0 ? `${product.inventory.stockQuantity} available` : 'Out of stock'}
                          </p>
                          <button disabled={Number(product.inventory?.stockQuantity ?? 0) < 1} onClick={(event) => { event.stopPropagation(); addToCart(product); }} className="mt-3 w-full rounded-xl bg-[#071b3d] py-2.5 text-[11px] font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs">Add to cart</button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border bg-white p-10 text-center text-slate-500">No active products match these filters yet.</div>
                )}
                {pagination?.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between rounded-xl border bg-white p-3">
                    <button
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('page', String(pagination.page - 1)); return next; })}
                      className="rounded-lg border px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-bold text-slate-500">Page {pagination.page} of {pagination.totalPages}</span>
                    <button
                      disabled={!pagination.hasNextPage}
                      onClick={() => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('page', String(pagination.page + 1)); return next; })}
                      className="rounded-lg border px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
