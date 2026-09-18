import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicProducts } from '../api/products.api';
import { staticProducts } from '../data/products';
import { formatMoney, getMrpIncludingTax, getPriceIncludingTax } from '../utils/pricing';

export default function Products({ addToCart, searchText = '', searchCategory = 'all', clearSearch }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicProducts({ limit: 40 })
      .then((res) => {
        const data = res.data?.data?.products || res.data?.data || res.data || [];
        setProducts(Array.isArray(data) ? data : staticProducts);
      })
      .catch(() => setProducts(staticProducts))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const name = (p.name || '').toLowerCase();
    const brand = (p.brand || '').toLowerCase();
    const matchText = !searchText || name.includes(searchText.toLowerCase()) || brand.includes(searchText.toLowerCase());
    const matchCat = searchCategory === 'all' || (p.category?.name || p.category || '').toLowerCase().includes(searchCategory.toLowerCase());
    return matchText && matchCat;
  });

  if (loading) {
    return (
      <section id="products" className="py-10 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
              <div className="bg-gray-200 rounded-lg h-40 mb-3" />
              <div className="bg-gray-200 h-3 rounded mb-2" />
              <div className="bg-gray-200 h-3 rounded w-2/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-black text-[#071b3d] tracking-tight">
          {searchText ? `Results for "${searchText}"` : 'Featured Products'}
        </h2>
        {searchText && clearSearch && (
          <button onClick={clearSearch} className="text-sm text-blue-600 hover:underline">
            Clear search ✕
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-lg font-semibold">No products found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p._id || p.id} product={p} addToCart={addToCart} navigate={navigate} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProductCard({ product: p, addToCart, navigate }) {
  const price = getPriceIncludingTax(p);
  const mrp = getMrpIncludingTax(p);
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const image = p.images?.[0]?.url || p.image || 'https://via.placeholder.com/300x200?text=No+Image';
  const name = p.name || 'Unknown Product';
  const brand = p.brand || '';

  return (
    <div
    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-950/10 transition-all hover:-translate-y-1 cursor-pointer group flex flex-col overflow-hidden"
      onClick={() => navigate(`/product/${p._id || p.id}`)}
    >
      <div className="relative overflow-hidden rounded-t-xl bg-gray-50 p-2">
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
            -{discount}%
          </span>
        )}
        <img src={image} alt={name}
          className="w-full h-44 object-contain group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="p-3 flex-1 flex flex-col">
        {brand && <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wide mb-0.5">{brand}</span>}
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 flex-1 mb-2">{name}</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base font-black text-gray-900">{formatMoney(price)}</span>
          {mrp > price && <span className="text-xs text-gray-400 line-through">{formatMoney(mrp)}</span>}
        </div>
        <p className="mb-2 text-[10px] font-semibold text-emerald-700">Inclusive of GST</p>
        <button
          onClick={(e) => { e.stopPropagation(); if (addToCart) addToCart(p); }}
          className="w-full py-2 bg-[#071b3d] text-white text-xs font-black rounded-xl hover:bg-[#155eef] transition-all hover:shadow-md"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
