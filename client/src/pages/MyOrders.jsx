import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import api from "../api/axios";
import useLiveRefresh from "../hooks/useLiveRefresh";

const steps = ["PENDING", "ACCEPTED", "DELIVERED"];

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [cancellationOrder, setCancellationOrder] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const load = () =>
    api
      .get("/buyer-orders")
      .then((response) => setOrders(response.data?.data?.orders || []))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message || "Unable to load orders.",
        ),
      )
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);
  useLiveRefresh(load);
  const cancel = async (event) => {
    event.preventDefault();
    if (cancellationReason.trim().length < 10) return;
    setSaving(cancellationOrder.id);
    setError("");
    try {
      await api.post(`/buyer-orders/${cancellationOrder.id}/cancel`, {
        reason: cancellationReason.trim(),
      });
      setCancellationOrder(null);
      setCancellationReason("");
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Cancellation could not be submitted.",
      );
    } finally {
      setSaving("");
    }
  };
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fb]">
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10">
        <p className="text-xs uppercase tracking-[.2em] text-[#155eef] font-black">
          Your purchases
        </p>
        <h1 className="mt-2 text-3xl font-black text-[#071b3d]">My Orders</h1>
        <p className="mt-2 text-sm text-slate-500">
          Track acceptance, direct admin delivery, payment and cancellation.
        </p>
        {loading && (
          <p className="mt-8 text-slate-500">Loading your orders...</p>
        )}
        {error && (
          <p className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 space-y-5">
          {orders.map((order) => {
            const current = steps.indexOf(order.orderStatus);
            const canCancel = ["PENDING", "CONFIRMED"].includes(
              order.orderStatus,
            );
            return (
              <article
                key={order.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-[#071b3d]">
                      {order.orderNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Sold by {order.retailer?.shopName || "bijliKart seller"} ·{" "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-black text-slate-900">
                      ₹{Number(order.grandTotal).toLocaleString("en-IN")}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                      {order.paymentStatus === "REFUNDED"
                        ? "REFUNDED"
                        : order.orderStatus}
                    </span>
                  </div>
                </div>
                <div className="mt-5 space-y-2 border-t pt-4">
                  {order.items.map((item) => (
                    <div
                      key={item._id}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.productName} x {item.quantity}
                      </span>
                      <strong>
                        ₹{Number(item.subtotal).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  ))}
                </div>
                {!["CANCELLED", "RETURNED"].includes(order.orderStatus) && (
                  <div className="mt-6 grid grid-cols-3 gap-1">
                    {steps.map((step, index) => (
                      <div key={step}>
                        <div
                          className={`h-1 rounded-full ${index <= current ? "bg-[#155eef]" : "bg-slate-200"}`}
                        />
                        <p
                          className={`mt-2 text-[10px] font-bold ${index <= current ? "text-[#155eef]" : "text-slate-400"}`}
                        >
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate(`/invoice/${order.id}`)}
                    className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-[#155eef]"
                  >
                    Invoice
                  </button>
                  {canCancel && (
                    <button
                      disabled={saving === order.id}
                      onClick={() => {
                        setCancellationOrder(order);
                        setCancellationReason("");
                      }}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600"
                    >
                      Cancel before seller acceptance
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {!loading && !error && !orders.length && (
            <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="text-xl font-bold text-slate-800">No orders yet</p>
            </div>
          )}
        </div>
        {cancellationOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={cancel}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <p className="text-xs font-black uppercase tracking-[.18em] text-red-600">
                Cancel order
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-900">
                {cancellationOrder.orderNumber}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Your payment refund will be initiated immediately after
                cancellation. Please enter at least 10 characters.
              </p>
              <textarea
                autoFocus
                required
                minLength={10}
                maxLength={500}
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                placeholder="Please explain why you want to cancel this order..."
                className="mt-4 min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-red-500"
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {cancellationReason.trim().length}/10 minimum
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancellationOrder(null)}
                  className="rounded-lg border px-4 py-2 text-sm font-bold"
                >
                  Keep order
                </button>
                <button
                  disabled={
                    saving === cancellationOrder.id ||
                    cancellationReason.trim().length < 10
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving === cancellationOrder.id
                    ? "Cancelling…"
                    : "Cancel & refund"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
