import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiRefreshCw,
  FiShoppingBag,
  FiTruck,
  FiXCircle,
} from "react-icons/fi";
import api from "../api/axios";
import useLiveRefresh from "../hooks/useLiveRefresh";

const periods = [
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["half-yearly", "Half-yearly"],
  ["yearly", "Yearly"],
];
const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const statusClass = {
  DELIVERED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-red-50 text-red-700",
};

function Metric({ label, value, icon: Icon, tone, detail }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
          <Icon size={19} />
        </div>
        <FiActivity className="text-slate-300" />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
    </div>
  );
}

function TrendChart({ series, field, color, prefix = "" }) {
  const values = series.map((item) => Number(item[field] ||  0));
  const max = Math.max(...values, 1);
  const points = series
    .map(
      (item, index) =>
        `${(index / Math.max(series.length - 1, 1)) * 100},${100 - (Number(item[field] || 0) / max) * 82}`,
    )
    .join(" ");
  return (
    <div className="mt-5">
      <div className="relative h-52 rounded-xl bg-slate-50 p-3">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
        >
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            points={points}
            vectorEffect="non-scaling-stroke"
          />
          {series.map((item, index) => (
            <circle
              key={item.label}
              cx={(index / Math.max(series.length - 1, 1)) * 100}
              cy={100 - (Number(item[field] || 0) / max) * 82}
              r="1.7"
              fill={color}
              vectorEffect="non-scaling-stroke"
            >
              <title>
                {item.label}: {prefix}
                {Number(item[field] || 0).toLocaleString("en-IN")}
              </title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex justify-between gap-2 overflow-hidden text-[10px] text-slate-400">
        {series.slice(-7).map((item) => (
          <span key={item.label} className="truncate">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Donut({ summary }) {
  const values = [
    summary.pending || 0,
    summary.accepted || 0,
    summary.cancelled || 0,
    summary.delivered || 0,
  ];
  const total = values.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  const colors = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981"];
  const stops = values
    .map((value, index) => {
      const start = total ? (cursor / total) * 100 : 0;
      cursor += value;
      return `${colors[index]} ${start}% ${(cursor / Math.max(total, 1)) * 100}%`;
    })
    .join(", ");
  return (
    <div className="flex items-center gap-6">
      <div
        className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${stops || "#e2e8f0 0 100%"})` }}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
          <strong className="text-2xl">{total}</strong>
          <span className="text-[10px] text-slate-400">orders</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {["Pending", "Accepted", "Cancelled", "Delivered"].map(
          (label, index) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: colors[index] }}
              />
              {label}
              <strong className="ml-auto pl-5">{values[index]}</strong>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export default function PlatformAdminDashboard() {
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    setError("");
    api
      .get(`/platform-operations/analytics?period=${period}`)
      .then((response) => setData(response.data?.data))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Unable to load dashboard data.",
        ),
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, [period]);
  useLiveRefresh(load);
  const summary = data?.summary || {};
  const marketplace = data?.marketplace || {};
  const series = data?.series || [];
  const topSellers = data?.topSellers || [];
  const maxCategory = useMemo(
    () => Math.max(...(data?.categories || []).map((item) => item.sales), 1),
    [data],
  );
  if (loading && !data)
    return (
      <main className="p-5 md:p-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-16 rounded-2xl bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-32 rounded-2xl bg-slate-200" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-72 rounded-2xl bg-slate-200" />
            <div className="h-72 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">
              Platform intelligence
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Marketplace dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Orders, seller performance and platform income in one view.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Reporting period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"
            >
              {periods.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              aria-label="Refresh dashboard"
              onClick={load}
              className="rounded-xl border bg-white px-3 py-2.5 text-slate-600 hover:bg-slate-50"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={load} className="font-bold underline">
              Retry
            </button>
          </div>
        )}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Metric
            label="Total orders"
            value={summary.totalOrders || 0}
            icon={FiShoppingBag}
            tone="bg-blue-50 text-blue-600"
            detail={`${period} reporting period`}
          />
          <Metric
            label="Pending"
            value={summary.pending || 0}
            icon={FiClock}
            tone="bg-amber-50 text-amber-600"
          />
          <Metric
            label="Accepted"
            value={summary.accepted || 0}
            icon={FiCheckCircle}
            tone="bg-blue-50 text-blue-600"
          />
          <Metric
            label="Cancelled"
            value={summary.cancelled || 0}
            icon={FiXCircle}
            tone="bg-red-50 text-red-600"
          />
          <Metric
            label="Delivered"
            value={summary.delivered || 0}
            icon={FiTruck}
            tone="bg-emerald-50 text-emerald-600"
          />
          <Metric
            label="Commission income"
            value={money(summary.totalCommission)}
            icon={FiDollarSign}
            tone="bg-teal-50 text-teal-600"
          />
        </section>
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black">Orders over time</h2>
                <p className="text-xs text-slate-400">
                  Order volume by reporting bucket
                </p>
              </div>
              <FiShoppingBag className="text-blue-500" />
            </div>
            <TrendChart series={series} field="orders" color="#2563eb" />
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black">Commission income</h2>
                <p className="text-xs text-slate-400">
                  Platform commission captured
                </p>
              </div>
              <FiDollarSign className="text-teal-500" />
            </div>
            <TrendChart
              series={series}
              field="commission"
              color="#0d9488"
              prefix="₹"
            />
          </div>
        </section>
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-black">Order status distribution</h2>
            <p className="mb-5 text-xs text-slate-400">
              Current period breakdown
            </p>
            <Donut summary={summary} />
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-black">Sales by category</h2>
            <p className="mb-5 text-xs text-slate-400">
              Product subtotal contribution
            </p>
            <div className="space-y-4">
              {(data?.categories || []).length ? (
                data.categories.slice(0, 6).map((category) => (
                  <div key={category.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold">{category.name}</span>
                      <span className="font-bold text-slate-600">
                        {money(category.sales)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{
                          width: `${(category.sales / maxCategory) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-sm text-slate-500">
                  No category data available for this period.
                </p>
              )}
            </div>
          </div>
        </section>
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="font-black">Top sellers by commission</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-400">
                  <tr>
                    <th className="pb-3">Seller</th>
                    <th className="pb-3">Orders</th>
                    <th className="pb-3">Delivered</th>
                    <th className="pb-3">Cancelled</th>
                    <th className="pb-3 text-right">Sales</th>
                    <th className="pb-3 text-right">Commission</th>
                    <th className="pb-3">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topSellers.length ? (
                    topSellers.slice(0, 8).map((seller) => (
                      <tr key={seller.sellerId}>
                        <td className="py-3 font-bold">{seller.sellerName}</td>
                        <td>{seller.total}</td>
                        <td className="text-emerald-700">{seller.delivered}</td>
                        <td className="text-red-600">{seller.cancelled}</td>
                        <td className="text-right">{money(seller.sales)}</td>
                        <td className="text-right font-bold text-teal-700">
                          {money(seller.commission)}
                        </td>
                        <td>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">
                            {seller.performance}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="py-8 text-center text-slate-500"
                      >
                        No seller data available for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-black">Marketplace performance</h2>
            <div className="mt-5 space-y-4">
              {[
                ["Total GMV / sales", money(marketplace.gmv), "text-blue-700"],
                [
                  "Platform commission",
                  money(summary.totalCommission),
                  "text-teal-700",
                ],
                [
                  "Seller payout",
                  money(marketplace.sellerPayout),
                  "text-emerald-700",
                ],
                [
                  "Average order value",
                  money(marketplace.averageOrderValue),
                  "text-slate-900",
                ],
                [
                  "Cancellation rate",
                  `${marketplace.cancellationRate || 0}%`,
                  "text-red-700",
                ],
              ].map(([label, value, tone]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <span className="text-sm text-slate-500">{label}</span>
                  <strong className={tone}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-black">Recent orders</h2>
            <p className="text-xs text-slate-400">
              Latest marketplace activity in the selected period
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Seller</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.recentOrders || []).length ? (
                  data.recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="p-4 font-bold">{order.orderNumber}</td>
                      <td className="p-4">{order.buyerId?.name || "—"}</td>
                      <td className="p-4">
                        {order.retailerId?.shopName || "—"}
                      </td>
                      <td className="p-4">
                        {order.items?.[0]?.productName ||
                          order.items?.[0]?.productId?.name ||
                          "—"}
                      </td>
                      <td className="p-4 font-bold">
                        {money(order.grandTotal)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass[order.orderStatus] || "bg-slate-100 text-slate-600"}`}
                        >
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      No orders available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Total GMV"
            value={money(marketplace.gmv)}
            icon={FiDollarSign}
            tone="bg-blue-50 text-blue-600"
          />
          <Metric
            label="Seller payout"
            value={money(marketplace.sellerPayout)}
            icon={FiTruck}
            tone="bg-emerald-50 text-emerald-600"
          />
          <Metric
            label="Active categories"
            value={(data?.categories || []).length}
            icon={FiBox}
            tone="bg-purple-50 text-purple-600"
          />
          <Metric
            label="Commission transactions"
            value={summary.commissionTransactions || 0}
            icon={FiActivity}
            tone="bg-teal-50 text-teal-600"
          />
        </section>
      </div>
    </main>
  );
}
