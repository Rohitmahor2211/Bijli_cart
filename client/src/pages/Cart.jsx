import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { formatMoney, getPriceIncludingTax } from "../utils/pricing";

export default function Cart({
  cart,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
}) {
  const navigate = useNavigate();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + getPriceIncludingTax(item) * item.quantity,
    0,
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fb]">
      {/* <Navbar cartCount={totalItems} /> */}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <p className="text-xs uppercase tracking-[.2em] text-[#155eef] font-black mb-2">
          Your shortlist
        </p>
        <h1 className="text-3xl font-black text-[#071b3d] mb-2">
          Shopping Cart
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Review your selected products before secure checkout.
        </p>

        {cart.length === 0 ? (
          <div className="bg-white rounded-[2rem] shadow-xl shadow-blue-950/5 border border-gray-100 p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-500 mb-6">
              Looks like you haven't added anything to your cart yet.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-[#071b3d] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#155eef] transition"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-4">
              {cart.map((item, index) => {
                const price = getPriceIncludingTax(item);
                const id = item._id ?? item.id ?? item.sku;
                const img =
                  item.images?.[0]?.url ||
                  item.image ||
                  "https://via.placeholder.com/150";

                return (
                  <div
                    key={id ? String(id) : `cart-item-${index}`}
                    className="bg-white rounded-[1.5rem] shadow-sm hover:shadow-lg border border-gray-100 p-5 flex flex-col sm:flex-row items-center gap-6 transition-shadow"
                  >
                    <img
                      src={img}
                      alt={item.name}
                      className="w-32 h-32 object-contain bg-gray-50 rounded-xl"
                    />

                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-bold text-gray-800 mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        Seller: {item.sellerName || "bijliKart Assured"}
                      </p>
                      <div className="text-lg font-black text-[#155eef]">
                        {formatMoney(price)}{" "}
                        <span className="text-xs font-semibold text-emerald-700">
                          incl. GST
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center bg-gray-100 rounded-lg">
                        <button
                          onClick={() => decreaseQuantity(id)}
                          className="w-10 h-10 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200 rounded-l-lg transition"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-bold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQuantity(id)}
                          className="w-10 h-10 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-200 rounded-r-lg transition"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(id)}
                        className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="w-full lg:w-96">
              <div className="bg-[#071b3d] text-white rounded-[1.5rem] shadow-xl shadow-blue-950/20 p-6 sticky top-24">
                <h3 className="text-lg font-black mb-4">Order Summary</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-blue-100">
                    <span>Items ({totalItems}):</span>
                    <span>{formatMoney(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-blue-100">
                    <span>Delivery:</span>
                    <span className="text-green-600 font-bold">FREE</span>
                  </div>
                  <div className="h-px bg-white/15 my-2" />
                  <div className="flex justify-between text-xl font-black">
                    <span>Total:</span>
                    <span>{formatMoney(totalPrice)}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/checkout")}
                  className="w-full bg-[#ffcf4a] text-[#071b3d] font-black py-4 rounded-xl hover:bg-[#ffe08a] transition shadow-md"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
