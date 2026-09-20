import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Footer from '../components/Footer';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import { formatMoney, getPriceIncludingTax } from '../utils/pricing';
import { getApiErrorMessage } from '../utils/apiError';

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true); script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart, totalPrice, totalItems } = useCart();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkoutOrders, setCheckoutOrders] = useState([]);
  const [checkingSession, setCheckingSession] = useState(true);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'ONLINE',
  });

  useEffect(() => {
    let active = true;
    api.get('/buyer-auth/me')
      .catch(() => {
        if (active) {
          showToast('Please sign in before starting payment.', 'info');
          navigate('/login', { replace: true });
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, [navigate, showToast]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (checkingSession) return;
    if (cart.length === 0) {
      showToast('Your cart is empty.', 'info');
      return;
    }

    // Basic validation
    if (!form.address || !form.city || !form.state || !form.pincode) {
      showToast('Please fill all required delivery details.', 'error');
      return;
    }

    setLoading(true);
    let razorpayOpened = false;
    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await api.post('/marketplace-checkout', {
        items: cart.map((item) => ({ productId: item._id || item.id, quantity: item.quantity })),
        shippingAddress: { street: form.address, city: form.city, state: form.state, pincode: form.pincode },
      }, { headers: { 'Idempotency-Key': idempotencyKey } });
      const { payment, gateway, orders } = response.data.data;
      const complete = async (verification) => {
        await api.post('/marketplace-checkout/verify', { checkoutReference: payment.checkoutReference, ...verification });
        setCheckoutOrders(orders); clearCart(); setSuccess(true);
      };
      if (gateway.mock) {
        await complete({ mock: true });
      } else {
        const available = await loadRazorpay();
        if (!available) throw new Error('Razorpay checkout could not be loaded. Please check your connection and try again.');
        const razorpay = new window.Razorpay({
          key: gateway.keyId, amount: gateway.amount, currency: gateway.currency, name: 'BiljiKact', description: `Checkout ${payment.checkoutReference}`, order_id: gateway.providerOrderId,
          handler: async (result) => { try { await complete({ razorpayPaymentId: result.razorpay_payment_id, razorpayOrderId: result.razorpay_order_id, razorpaySignature: result.razorpay_signature }); } catch (error) { showToast(getApiErrorMessage(error, 'Payment verification failed. Contact support before retrying.'), 'error'); } finally { setLoading(false); } },
          modal: {
            ondismiss: async () => {
              try {
                await api.post('/marketplace-checkout/cancel', { checkoutReference: payment.checkoutReference });
              } catch (error) {
                showToast(getApiErrorMessage(error, 'Payment cancellation could not be recorded. Please retry checkout.'), 'error');
              } finally {
                setLoading(false);
              }
            },
          }, theme: { color: '#071b3d' },
        });
        razorpayOpened = true;
        razorpay.open();
        return;
      }
    } catch (error) {
      if (error.response?.status === 401) { showToast('Your customer session expired. Please sign in again to continue checkout.', 'error'); navigate('/login'); }
      else showToast(getApiErrorMessage(error, 'Checkout could not be started. Review your delivery details and try again.'), 'error');
    } finally {
      if (!razorpayOpened) setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f5f7fb]">
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-16 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center w-full">
            <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
              ✓
            </div>
            <h1 className="text-3xl font-black text-gray-800 mb-4">Order Placed Successfully!</h1>
            <p className="text-gray-600 mb-8">
              Payment is confirmed. {checkoutOrders.length > 1 ? `Your cart has been split into ${checkoutOrders.length} seller orders.` : 'Your seller order is being prepared.'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition"
            >
              Continue Shopping
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fb]">

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-blue-600">Secure purchase</p><h1 className="mt-1 text-3xl font-black text-[#071b3d] mb-2">Checkout</h1><p className="mb-8 text-sm text-slate-500">Your payment is protected by Razorpay and your order is split safely by seller.</p>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">
              {/* Delivery Details */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
                  Delivery Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">PIN Code *</label>
                    <input required type="text" name="pincode" value={form.pincode} onChange={handleChange} maxLength="6"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:border-blue-500 outline-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Address *</label>
                    <textarea required name="address" value={form.address} onChange={handleChange} rows="3"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:border-blue-500 outline-none"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">City *</label>
                    <input required type="text" name="city" value={form.city} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">State *</label>
                    <input required type="text" name="state" value={form.state} onChange={handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:border-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</span>
                  Payment Method
                </h2>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-blue-500 bg-blue-50 rounded-xl">
                    <input type="radio" checked readOnly className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-bold text-gray-800 block">UPI / Card / NetBanking</span>
                      <span className="text-xs text-gray-500">Secure payment via Razorpay. Cash on delivery is not enabled yet.</span>
                    </div>
                  </label>
                </div>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-96">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h3 className="text-xl font-black text-gray-800 mb-4">Order Summary</h3>
              
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                {cart.map((item, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden shrink-0">
                      <img src={item.images?.[0]?.url || item.image || 'https://via.placeholder.com/50'} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-bold text-gray-800">
                      {formatMoney(getPriceIncludingTax(item) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Subtotal ({totalItems} items):</span>
                  <span>{formatMoney(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Delivery Fee:</span>
                  <span className="text-green-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-xl font-black text-gray-800 pt-2 border-t border-gray-100">
                  <span>Total:</span>
                  <span>{formatMoney(totalPrice)}</span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={checkingSession || loading || cart.length === 0}
                className="w-full bg-yellow-400 text-[#123b7a] font-black py-4 rounded-xl hover:bg-yellow-300 transition shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {checkingSession ? 'Checking sign-in...' : loading ? 'Processing...' : (
                  <>🔒 Place Order</>
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">
                Secure checkout provided by BiljiKact.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
