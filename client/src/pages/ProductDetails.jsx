import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../components/Footer";
import { getPublicProductById } from "../api/products.api";
import api from "../api/axios";
import { useCart } from "../context/CartContext";
import { staticProducts } from "../data/products";
import { getMrpIncludingTax, getPriceIncludingTax } from "../utils/pricing";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

function Reviews({ productId, onSummary }) {
  const [data, setData] = useState({
    reviews: [],
    summary: {
      total: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
  });
  const [form, setForm] = useState({ rating: 5, title: "", comment: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(
    () =>
      api
        .get(`/products/${productId}/reviews`)
        .then((response) => {
          setData(response.data.data);
          onSummary?.(response.data.data.summary);
        })
        .catch(() => {}),
    [productId, onSummary],
  );
  useEffect(() => {
    load();
  }, [load]);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.post(`/products/${productId}/reviews`, form);
      setForm({ rating: 5, title: "", comment: "" });
      setMessage("Your review was published.");
      await load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Sign in and review this product after delivery.",
      );
    } finally {
      setSaving(false);
    }
  };
  const { summary, reviews } = data;
  return (
    <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">
            Customer voice
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-900">
            Customer Ratings & Reviews
          </h2>
          <p className="text-sm text-slate-500">
            See what customers say after using this product.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-xl border bg-slate-50 p-4"
        >
          <p className="mb-2 text-sm font-black">Write a review</p>
          <select
            value={form.rating}
            onChange={(event) =>
              setForm({ ...form, rating: event.target.value })
            }
            className="mb-2 w-full rounded-lg border p-2"
          >
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Average</option>
            <option value="2">2 - Poor</option>
            <option value="1">1 - Bad</option>
          </select>
          <input
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder="Review title (optional)"
            className="mb-2 w-full rounded-lg border p-2"
          />
          <textarea
            required
            minLength="3"
            value={form.comment}
            onChange={(event) =>
              setForm({ ...form, comment: event.target.value })
            }
            placeholder="Share your experience"
            rows="3"
            className="mb-2 w-full rounded-lg border p-2"
          />
          <button
            disabled={saving}
            className="w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit review"}
          </button>
          {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
        </form>
      </div>
      <div className="mt-6 grid gap-6 border-b pb-6 md:grid-cols-[180px_1fr]">
        <div className="text-center">
          <p className="text-5xl font-black text-slate-900">
            {summary.average || "0.0"}{" "}
            <span className="text-2xl text-amber-500">★</span>
          </p>
          <p className="text-sm text-slate-500">
            {summary.total} ratings and reviews
          </p>
        </div>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-3 text-xs">
              <span className="w-8 font-bold">{rating} ★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${summary.total ? (summary.distribution[rating] / summary.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-slate-500">
                {summary.distribution[rating]}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="divide-y">
        {reviews.map((review) => (
          <article key={review._id} className="py-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-emerald-600 px-2 py-1 text-xs font-black text-white">
                {review.rating} ★
              </span>
              <h3 className="font-black text-slate-900">
                {review.title || "Verified customer review"}
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {review.comment}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              By {review.buyerId?.name || "Verified buyer"} ·{" "}
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </article>
        ))}
      </div>
      {!reviews.length && (
        <p className="py-8 text-center text-sm text-slate-500">
          No reviews yet. Be the first verified buyer to share your experience.
        </p>
      )}
    </section>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, total: 0 });
  useEffect(() => {
    setActiveImg(0);
    getPublicProductById(id)
      .then((res) => setProduct(res.data?.data || res.data))
      .catch(() =>
        setProduct(
          staticProducts.find((item) => item.id === id || item._id === id) ||
            null,
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);
  const highlights = useMemo(
    () =>
      product?.highlights?.length
        ? product.highlights
        : String(product?.description || "")
            .split(/\n|•/)
            .map((item) => item.trim())
            .filter(Boolean),
    [product],
  );
  if (loading)
    return (
      <>
        {/* <Navbar cartCount={totalItems} /> */}
        <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 text-slate-500">
          Loading product experience…
        </main>
      </>
    );
  if (!product)
    return (
      <>
        {/* <Navbar cartCount={totalItems} /> */}
        <main className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50">
          <h1 className="text-2xl font-black">Product not found</h1>
          <button
            onClick={() => navigate("/")}
            className="mt-4 rounded-lg bg-blue-700 px-5 py-2 font-bold text-white"
          >
            Back to store
          </button>
        </main>
      </>
    );
  const activePricing = product.pricing || {};
  const price = getPriceIncludingTax(product);
  const mrp = getMrpIncludingTax(product);
  const discount =
    activePricing.discount ||
    (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
  const stock = product.inventory?.stockQuantity ?? product.stock ?? 1;
  const images = product.images?.length
    ? product.images.map((image) => image.url)
    : [product.image || "https://via.placeholder.com/500"];
  const specs = Object.entries(product.specifications || {});
  const addSelectedToCart = () => addToCart(product);
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* <Navbar cartCount={totalItems} /> */}
      <main className="mx-auto max-w-7xl px-4 py-5 md:py-8">
        <div className="grid gap-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-[1.05fr_1fr] md:p-7">
          <div>
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-6">
              <span className="absolute left-4 top-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-black text-white">
                {discount ? `${discount}% OFF` : "BIJLICART PICK"}
              </span>
              <img
                src={images[activeImg]}
                alt={product.name}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image}
                  onClick={() => setActiveImg(index)}
                  className={`h-16 w-16 shrink-0 rounded-lg border-2 bg-white p-1 ${activeImg === index ? "border-blue-600" : "border-slate-200"}`}
                >
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
              
            </div>
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">
              {product.brand || "BijliCart special"}
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-slate-900 md:text-3xl">
              {product.name}
            </h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded bg-emerald-600 px-2 py-1 text-sm font-black text-white">
                {reviewSummary.total ? `${reviewSummary.average} ★` : "New"}
              </span>
              <span className="text-sm text-slate-500">
                {reviewSummary.total
                  ? `${reviewSummary.total} customer reviews`
                  : "Be the first to review"}
              </span>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-5">
              <div className="flex items-end gap-3">
                <strong className="text-4xl font-black text-slate-900">
                  {money(price)}
                </strong>
                {mrp > price && (
                  <span className="text-sm text-slate-400 line-through">
                    {money(mrp)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-emerald-600">
                {discount ? `${discount}% off · ` : ""}Inclusive of GST and all
                taxes
              </p>
            </div>
            <div className="mt-5 grid gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm">
              <p className="font-black text-amber-900">🎁 BIJLICART special</p>
              <p className="text-amber-800">
                Free surprise gift with this order. Genuine product with seller
                warranty support.
              </p>
            </div>
            <div className="mt-4 rounded-xl border p-4">
              <p className="font-black text-slate-900">
                Sold by{" "}
                {product.retailerId?.shopName || "verified BijliCart seller"}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                ✓ Verified seller · ✓ Available from a verified seller
              </p>
              <p
                className={`mt-3 text-sm font-bold ${stock > 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                ● {stock > 0 ? `${stock} in stock` : "Out of stock"}
              </p>
              <p className="text-xs text-slate-500">
                🛡{" "}
                {product.warranty?.duration ||
                  "Manufacturer warranty available"}
              </p>
            </div>
            <div className="mt-auto flex gap-3 pt-5">
              <button
                disabled={!stock}
                onClick={addSelectedToCart}
                className="flex-1 rounded-xl bg-amber-400 py-3 font-black text-slate-900 shadow-sm disabled:opacity-50"
              >
                Add to cart
              </button>
              <button
                disabled={!stock}
                onClick={() => {
                  addSelectedToCart();
                  navigate("/checkout");
                }}
                className="flex-1 rounded-xl bg-orange-500 py-3 font-black text-white shadow-sm disabled:opacity-50"
              >
                Buy now
              </button>
            </div>
          </div>
        </div>
        <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
          <h2 className="text-xl font-black text-slate-900">
            Product Highlights
          </h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-2">
            {highlights.length ? (
              highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2">
                  <span className="font-black text-blue-600">•</span>
                  {highlight}
                </li>
              ))
            ) : (
              <li>No highlights provided by retailer.</li>
            )}
          </ul>
        </section>
        <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
          <h2 className="text-xl font-black text-slate-900">Specifications</h2>
          <div className="mt-4 divide-y">
            {[
              ["Brand", product.brand],
              ...specs.map(([key, value]) => [
                key.replaceAll(/([A-Z])/g, " $1"),
                value,
              ]),
              ["Warranty", product.warranty?.duration],
            ]
              .filter(([, value]) => value)
              .map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-4 py-3 text-sm">
                  <span className="text-slate-500">{key}</span>
                  <strong className="text-slate-800">{value}</strong>
                </div>
              ))}
          </div>
        </section>
        <Reviews
          productId={product._id || product.id}
          onSummary={setReviewSummary}
        />
      </main>
      <Footer />
    </div>
  );
}
