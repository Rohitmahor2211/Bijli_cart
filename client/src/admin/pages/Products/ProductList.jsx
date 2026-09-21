import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiPackage } from 'react-icons/fi';
import api from '../../../api/axios';
import { formatMoney, getMrpIncludingTax, getPriceIncludingTax } from '../../../utils/pricing';
import { getApiErrorMessage } from '../../../utils/apiError';

const statusStyles = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
};

const statusLabel = {
  ACTIVE: 'Active',
  PENDING_REVIEW: 'Pending review',
  REJECTED: 'Rejected',
  INACTIVE: 'Inactive',
};

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/products');
      setProducts(res.data?.data?.products || res.data?.data || []);
    } catch (error) {
      setError(getApiErrorMessage(error, 'Products could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        setDeleting(id);
        await api.delete(`/products/${id}`);
        setProducts(products.filter((p) => p._id !== id));
      } catch (error) {
        setError(getApiErrorMessage(error, 'Product could not be deleted.'));
      } finally {
        setDeleting('');
      }
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your catalog, pricing, and availability. New products publish immediately after they are saved.</p>
        </div>
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button
          onClick={() => navigate('/admin/products/add')}
          className="flex items-center justify-center gap-2 bg-[#2b59ff] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm"
        >
          <FiPlus size={20} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2b59ff]/20 focus:border-[#2b59ff] transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Visibility</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FiPackage size={48} className="text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-900">No products found</p>
                      <p className="text-sm mt-1">Get started by adding a new product.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50/80 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {product.images?.[0]?.url ? (
                            <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <FiPackage className="text-slate-400" size={24} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[250px]" title={product.name}>
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{product.brand || 'No Brand'}{product.globalCategoryId?.name ? ` · ${product.globalCategoryId.name}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{product.sku}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{formatMoney(getPriceIncludingTax(product))}</p>
                      <p className="text-[10px] font-semibold text-emerald-700">Including GST</p>
                      {getMrpIncludingTax(product) > getPriceIncludingTax(product) && (
                        <p className="text-xs text-slate-400 line-through">{formatMoney(getMrpIncludingTax(product))}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[product.status] || statusStyles.INACTIVE}`}>
                        {statusLabel[product.status] || product.status || 'Pending review'}
                      </span>
                      {product.status === 'REJECTED' && product.rejectionReason ? (
                        <p className="mt-2 max-w-xs text-xs text-red-700">Reason: {product.rejectionReason}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/admin/products/${product._id}/edit`)} className="p-2 text-slate-400 hover:text-[#2b59ff] hover:bg-blue-50 rounded-lg transition">
                          <FiEdit2 size={16} />
                        </button>
                        <button disabled={deleting === product._id} onClick={() => handleDelete(product._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50" aria-label={deleting === product._id ? 'Deleting product' : 'Delete product'}>
                          {deleting === product._id ? '…' : <FiTrash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 bg-white">
          <p>Showing <span className="font-medium text-slate-900">{filteredProducts.length}</span> results</p>
        </div>
      </div>
    </div>
  );
}
