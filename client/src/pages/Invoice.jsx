import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get(`/buyer-orders/${id}`)
      .then((res) => setOrder(res.data?.data?.order))
      .catch((err) =>
        setError(err.response?.data?.message || "Invoice could not be loaded."),
      );
  }, [id]);
  if (error)
    return (
      <div className="min-h-screen p-8">
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => navigate("/my-orders")}
          className="mt-4 text-blue-700 font-bold"
        >
          Back to orders
        </button>
      </div>
    );
  if (!order)
    return (
      <div className="min-h-screen p-8 text-slate-500">Preparing invoice…</div>
    );
  const seller = order.retailer || {};
  const invoiceNumber = `INV-${order.orderNumber.replace("ORD-", "")}`;
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <style>{`@media print { body { background: white; } .no-print { display: none !important; } .invoice { box-shadow: none !important; border: 0 !important; max-width: none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-4xl justify-between">
        <button
          onClick={() => navigate("/my-orders")}
          className="font-bold text-[#155eef]"
        >
          ← My Orders
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-[#071b3d] px-4 py-2 font-bold text-white"
        >
          Print / Save PDF
        </button>
      </div>
      <section className="invoice mx-auto max-w-4xl bg-white p-7 md:p-10 shadow-xl">
        <header className="flex flex-col sm:flex-row justify-between gap-6 border-b-2 border-[#071b3d] pb-6">
          <div>
            <p className="text-2xl font-black text-[#071b3d]">⚡ BIJLICART</p>
            <p className="text-xs font-bold tracking-widest text-slate-400">
              TAX INVOICE
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p>
              <strong>Invoice:</strong> {invoiceNumber}
            </p>
            <p>
              <strong>Order:</strong> {order.orderNumber}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
        </header>
        <div className="grid gap-8 py-7 sm:grid-cols-2 text-sm">
          <div>
            <h2 className="font-black text-slate-900">Sold by</h2>
            <p className="mt-2 font-bold">
              {seller.shopName || "BijliCart Seller"}
            </p>
            <p>{seller.address}</p>
            <p>
              {[seller.city, seller.state, seller.pincode]
                .filter(Boolean)
                .join(", ")}
            </p>
            {seller.gstNumber && (
              <p className="mt-2">
                <strong>GSTIN:</strong> {seller.gstNumber}
              </p>
            )}
          </div>
          <div>
            <h2 className="font-black text-slate-900">Delivered to</h2>
            <p className="mt-2">{order.shippingAddress?.street}</p>
            <p>
              {[
                order.shippingAddress?.city,
                order.shippingAddress?.state,
                order.shippingAddress?.pincode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="mt-2">
              <strong>Payment:</strong> {order.paymentStatus}
            </p>
          </div>
        </div>
        <table className="w-full border-collapse text-sm max-sm:hidden">
          <thead>
            <tr className="bg-[#071b3d] text-white">
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-right">Rate</th>
              <th className="p-3 text-right">Tax</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item._id} className="border-b">
                <td className="p-3">
                  <strong>{item.productName}</strong>
                  <br />
                  <span className="text-xs text-slate-500">
                    SKU: {item.sku}
                  </span>
                </td>
                <td className="p-3 text-right">{item.quantity}</td>
                <td className="p-3 text-right">{money(item.price)}</td>
                <td className="p-3 text-right">{money(item.tax)}</td>
                <td className="p-3 text-right">
                  {money(item.subtotal + item.tax)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {order.items.map((item) => (
          <table className="w-full border-collapse text-sm boredr-2 sm:hidden">
            <tbody>
              <tr>
                <th className="bg-[#071b3d] text-white p-3 text-left border">
                  Item
                </th>
                <td className="px-6">
                  <strong>{item.productName}</strong> <br />
                  <span className="text-xs text-slate-500">{item.sku}</span>
                </td>
              </tr>

              <tr>
                <th className="bg-[#071b3d] text-white p-3 text-left border">
                  Qty
                </th>
                <td className="px-6">
                  {item.quantity} <br />
                </td>
              </tr>

              <tr>
                <th className="bg-[#071b3d] text-white p-3 text-left border">
                  Rate
                </th>
                <td className="px-6">
                  {money(item.price)} <br />
                </td>
              </tr>

              <tr>
                <th className="bg-[#071b3d] text-white p-3 text-left border">
                  Tax
                </th>
                <td className="px-6">
                  <strong>{money(item.tax)}</strong> <br />
                </td>
              </tr>

              <tr>
                <th className="bg-[#071b3d] text-white p-3 text-left border">
                  Amount
                </th>
                <td className="px-6">
                  <strong>{money(item.subtotal + item.tax)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        ))}

        <div className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <strong>{money(order.subtotal)}</strong>
          </div>
          <div className="flex justify-between">
            <span>GST / Tax</span>
            <strong>{money(order.tax)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <strong>{money(order.shipping)}</strong>
          </div>
          <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-lg">
            <strong>Total</strong>
            <strong>{money(order.grandTotal)}</strong>
          </div>
        </div>
        <footer className="mt-10 border-t pt-5 text-center text-xs text-slate-500">
          This is a computer-generated BijliCart invoice. For support, quote
          order number {order.orderNumber}.
        </footer>
      </section>
    </div>
  );
}
