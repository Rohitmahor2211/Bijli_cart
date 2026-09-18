import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import api from "../api/axios";
import { formatMoney, getPriceIncludingTax } from "../utils/pricing";

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "all";
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/catalog/search", {
        params: {
          q: query,
          category: category === "all" ? undefined : category,
          limit: "40",
        },
      })
      .then((response) => setProducts(response.data?.data?.products || []))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Search could not be completed.",
        ),
      )
      .finally(() => setLoading(false));
  }, [query, category]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fb]">
      {/* <Navbar cartCount={totalItems} /> */}
      <div className="border-b border-slate-200 bg-white px-4 py-5 md:px-10">
        <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">
          Marketplace collection
        </p>
        <p className="mt-1 font-semibold text-[#071b3d]">
          Results for{" "}
          <span className="font-black">“{query || "all products"}”</span>
        </p>
        <span className="text-xs text-slate-500">
          Active listings from approved sellers
        </span>
      </div>
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-8">
        {error ? (
          <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>
        ) : null}
        {loading ? (
          <p className="py-16 text-center text-slate-500">Searching…</p>
        ) : products.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <article
                key={product._id}
                className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                onClick={() => navigate(`/product/${product._id}`)}
              >
                <img
                  src={
                    product.images?.[0]?.url ||
                    "https://via.placeholder.com/300x200?text=No+Image"
                  }
                  alt={product.name}
                  className="h-44 w-full object-contain bg-slate-50 p-3 transition group-hover:scale-105"
                />
                <div className="p-3">
                  <p className="text-[10px] font-bold uppercase text-blue-600">
                    {product.brand}
                  </p>
                  <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold">
                    {product.name}
                  </h3>
                  <p className="mt-2 font-black">
                    {formatMoney(getPriceIncludingTax(product))}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-700">
                    Inclusive of GST
                  </p>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      addToCart(product);
                    }}
                    className="mt-3 w-full rounded-xl bg-[#071b3d] py-2 text-xs font-black text-white"
                  >
                    Add to Cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-16 text-center text-slate-500">
            <p className="text-lg font-semibold">No products found</p>
            <p className="text-sm mt-1">
              Try a different search term or category.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
