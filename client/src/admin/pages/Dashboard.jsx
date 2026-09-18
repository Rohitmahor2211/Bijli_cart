import { useState, useEffect } from 'react';
import { FiTrendingUp, FiShoppingBag, FiUsers, FiDollarSign, FiBox } from 'react-icons/fi';
import api from '../../api/axios';
import useLiveRefresh from '../../hooks/useLiveRefresh';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // In production, this would hit /api/dashboard
    api.get('/dashboard')
      .then(res => setStats(res.data?.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);
  useLiveRefresh(() => {
    api.get('/dashboard')
      .then(res => setStats(res.data?.data))
      .catch(err => console.error(err));
  });

  if (loading) {
    return <div className="animate-pulse flex gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex-1 h-32 bg-white rounded-2xl shadow-sm"></div>
      ))}
    </div>;
  }

  const data = stats || {};
  const overview = data.overview || {
    monthlySales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
  };
  const recentOrders = data.recentOrders || [];

  const cards = [
    { title: 'Monthly Sales', value: `₹${overview.monthlySales.toLocaleString()}`, icon: FiDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: 'Total Orders', value: overview.totalOrders, icon: FiShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Total Customers', value: overview.totalCustomers, icon: FiUsers, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Active Products', value: overview.totalProducts, icon: FiBox, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening with your store today.</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg} ${card.color}`}>
                <card.icon size={24} />
              </div>
              <div className="flex items-center text-emerald-600 text-sm font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                <FiTrendingUp className="mr-1" size={14} />
                +12.5%
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
          <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No recent orders found.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">#{order._id.slice(-6)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{order.customerId?.name || 'Guest'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{order.grandTotal?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                        ${order.orderStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 
                          order.orderStatus === 'PENDING' ? 'bg-orange-100 text-orange-700' : 
                          'bg-blue-100 text-blue-700'}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
