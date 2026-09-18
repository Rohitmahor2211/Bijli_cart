import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatMoney, getPriceIncludingTax } from '../utils/pricing';

const TABS = ['Overview', 'Products', 'Orders', 'Profile', 'Settings'];

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { seller, logout } = useAuth();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products').catch(() => ({ data: { data: [] } })),
      api.get('/orders').catch(() => ({ data: { data: [] } })),
      api.get('/dashboard').catch(() => ({ data: { data: {} } })),
    ]).then(([prodRes, ordRes, dashRes]) => {
      const prods = prodRes.data?.data?.products || prodRes.data?.data || [];
      const ords = ordRes.data?.data?.orders || ordRes.data?.data || [];
      const dash = dashRes.data?.data || {};
      setProducts(Array.isArray(prods) ? prods : []);
      setOrders(Array.isArray(ords) ? ords : []);
      setStats({
        products: prods.length || dash.totalProducts || 0,
        orders: ords.length || dash.totalOrders || 0,
        revenue: dash.totalRevenue || ords.reduce((s, o) => s + (o.totalAmount || 0), 0),
      });
    }).finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    if (window.confirm('Are you sure you want to logout?')) { logout(); navigate('/seller-login'); }
  }

  const statCards = [
    { icon: '📦', label: 'Total Products', value: stats.products, color: 'blue' },
    { icon: '🛒', label: 'Total Orders', value: stats.orders, color: 'green' },
    { icon: '💰', label: 'Revenue', value: `₹${(stats.revenue || 0).toLocaleString()}`, color: 'purple' },
    { icon: '⭐', label: 'Rating', value: '4.5/5', color: 'yellow' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-56 bg-[#0f1e3c] text-white shrink-0 min-h-screen">
        <div className="p-5 border-b border-white/10">
          <div className="text-xl font-black">⚡ AVNISH</div>
          <p className="text-xs text-blue-200 mt-0.5">Seller Dashboard</p>
        </div>
        <div className="p-3 flex-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold mb-1 transition ${
                tab === t ? 'bg-yellow-400 text-[#0f1e3c]' : 'text-blue-200 hover:bg-white/10'
              }`}>
              {t === 'Overview' ? '📊' : t === 'Products' ? '📦' : t === 'Orders' ? '🛒' : t === 'Profile' ? '👤' : '⚙️'} {t}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/10">
          <div className="px-4 py-3 mb-2">
            <p className="text-xs text-blue-200">Logged in as</p>
            <p className="text-sm font-bold truncate">{seller?.shopName || seller?.ownerName || 'Seller'}</p>
          </div>
          <button onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-xl text-sm font-bold transition">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-10 bg-[#0f1e3c] text-white px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-black">⚡ Dashboard</div>
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${tab === t ? 'bg-yellow-400 text-[#0f1e3c]' : 'text-blue-200'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-8">
          {/* OVERVIEW */}
          {tab === 'Overview' && (
            <div>
              <h1 className="text-2xl font-black text-gray-800 mb-6">
                Welcome back, {seller?.shopName || seller?.ownerName || 'Seller'}! 👋
              </h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-2xl font-black text-gray-800">{loading ? '–' : s.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-black text-gray-800 mb-4">Recent Orders</h2>
                {loading ? <p className="text-gray-400 text-sm">Loading...</p> :
                  orders.length === 0 ? <p className="text-gray-400 text-sm">No orders yet.</p> :
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o._id} className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                        <span className="text-gray-600 font-mono text-xs">{o._id?.slice(-8)}</span>
                        <span className="font-bold">₹{(o.totalAmount || 0).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          o.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                          o.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{o.status}</span>
                      </div>
                    ))}
                  </div>
                }
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {tab === 'Products' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-gray-800">My Products</h1>
                <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition">
                  + Add Product
                </button>
              </div>
              {loading ? <p className="text-gray-400">Loading...</p> :
                products.length === 0 ?
                <div className="text-center py-16 text-gray-400">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="font-bold">No products yet</p>
                  <p className="text-sm">Add your first product to start selling!</p>
                </div> :
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((p) => (
                    <div key={p._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-start gap-3">
                        <img src={p.images?.[0]?.url || 'https://via.placeholder.com/60'} alt={p.name}
                          className="w-14 h-14 object-cover rounded-lg" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-800 line-clamp-1">{p.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">SKU: {p.sku}</p>
                          <p className="text-sm font-black text-blue-700 mt-1">{formatMoney(getPriceIncludingTax(p))}</p>
                          <p className="text-[10px] font-semibold text-emerald-700">Including GST</p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {/* ORDERS */}
          {tab === 'Orders' && (
            <div>
              <h1 className="text-2xl font-black text-gray-800 mb-6">My Orders</h1>
              {loading ? <p className="text-gray-400">Loading...</p> :
                orders.length === 0 ?
                <div className="text-center py-16 text-gray-400">
                  <div className="text-5xl mb-3">🛒</div>
                  <p className="font-bold">No orders yet</p>
                </div> :
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Order ID', 'Amount', 'Status', 'Date'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left font-bold text-gray-600 text-xs uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orders.map((o) => (
                          <tr key={o._id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o._id?.slice(-8)}</td>
                            <td className="px-4 py-3 font-black text-gray-800">₹{(o.totalAmount || 0).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                o.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                o.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>{o.status}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              }
            </div>
          )}

          {/* PROFILE */}
          {tab === 'Profile' && (
            <div>
              <h1 className="text-2xl font-black text-gray-800 mb-6">My Profile</h1>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#123b7a] flex items-center justify-center text-2xl text-white font-black">
                    {(seller?.shopName || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-800">{seller?.shopName}</h2>
                    <p className="text-sm text-gray-500">{seller?.ownerName}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                      seller?.sellerStatus === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{seller?.sellerStatus || 'PENDING'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Email', value: seller?.email },
                    { label: 'Phone', value: seller?.phone },
                    { label: 'City', value: seller?.city },
                    { label: 'GST', value: seller?.gstNumber || 'Not provided' },
                  ].map((f) => (
                    <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 font-semibold">{f.label}</p>
                      <p className="font-bold text-gray-800 mt-0.5">{f.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab === 'Settings' && (
            <div>
              <h1 className="text-2xl font-black text-gray-800 mb-6">Settings</h1>
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="font-black text-gray-700 mb-3">Account Actions</h2>
                  <div className="space-y-2">
                    <button onClick={() => navigate('/seller-login')}
                      className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700 transition">
                      🔑 Change Password
                    </button>
                    <button onClick={handleLogout}
                      className="w-full text-left px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-semibold text-red-600 transition">
                      🚪 Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
