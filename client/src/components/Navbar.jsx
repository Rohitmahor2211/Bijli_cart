import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { clearBuyerTokens } from "../api/axios";

const SUGGESTIONS = [
  "samsung mobile",
  "samsung galaxy s25",
  "samsung smart tv",
  "samsung refrigerator",
  "apple iphone 16",
  "apple iphone 16 pro",
  "apple macbook air",
  "apple airpods",
  "mobile under 15000",
  "mobile under 20000",
  "5g mobile",
  "smartphone",
  "smart tv",
  "4k smart tv",
  "43 inch smart tv",
  "55 inch smart tv",
  "sony smart tv",
  "1.5 ton ac",
  "5 star ac",
  "inverter ac",
  "split ac",
  "voltas ac",
  "laptop under 50000",
  "gaming laptop",
  "hp laptop",
  "dell laptop",
  "lenovo laptop",
  "double door refrigerator",
  "lg refrigerator",
  "whirlpool refrigerator",
  "washing machine",
  "front load washing machine",
  "lg washing machine",
  "wireless headphones",
  "bluetooth speaker",
  "jbl speaker",
];

let catalogNavigationCache = null;
let catalogNavigationRequest = null;

function readCatalogNavigationCache() {
  if (catalogNavigationCache) return catalogNavigationCache;
  try {
    const stored = sessionStorage.getItem("bijlicartCatalogNavigation");
    catalogNavigationCache = stored ? JSON.parse(stored) : [];
  } catch {
    catalogNavigationCache = [];
  }
  return catalogNavigationCache;
}

export default function Navbar({ cartCount = 0 }) {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPincodeBox, setShowPincodeBox] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [cats, setCats] = useState(readCatalogNavigationCache);
  const [deliveryPincode, setDeliveryPincode] = useState(
    localStorage.getItem("avnishPincode") || "",
  );
  const [pincodeInput, setPincodeInput] = useState(
    localStorage.getItem("avnishPincode") || "",
  );
  const [pincodeError, setPincodeError] = useState("");

  const customerLoggedIn =
    localStorage.getItem("bijlikartCustomerAuth") === "true";
  const customerName = localStorage.getItem("bijlikartCustomerName") || "";
  const firstName = customerName ? customerName.split(" ")[0] : "";

  useEffect(() => {
    if (!catalogNavigationRequest) {
      catalogNavigationRequest = api.get("/catalog/navigation")
        .then((response) => {
          const categories = response.data?.data?.categories || [];
          catalogNavigationCache = categories;
          sessionStorage.setItem("bijlicartCatalogNavigation", JSON.stringify(categories));
          return categories;
        })
        .catch(() => readCatalogNavigationCache());
    }
    catalogNavigationRequest.then(setCats);
  }, []);

  const filteredSuggestions = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    if (!q) return [];
    const starts = SUGGESTIONS.filter((s) => s.toLowerCase().startsWith(q));
    const contains = SUGGESTIONS.filter(
      (s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q),
    );
    return [...starts, ...contains].slice(0, 10);
  }, [searchText]);

  function runSearch(value = searchText) {
    const q = value.trim();
    if (!q) return;
    setSearchText(q);
    setShowSuggestions(false);
    const params = new URLSearchParams({ q });
    if (searchCategory !== "all") params.set("category", searchCategory);
    navigate(`/search?${params}`);
  }



  function applyPincode(e) {
    e.preventDefault();
    if (!/^[1-9][0-9]{5}$/.test(pincodeInput.trim())) {
      setPincodeError("PIN Code: enter a valid 6-digit PIN code.");
      return;
    }
    setPincodeError("");
    setDeliveryPincode(pincodeInput.trim());
    localStorage.setItem("avnishPincode", pincodeInput.trim());
    setShowPincodeBox(false);
  }

  async function handleAccount() {
    if (!customerLoggedIn) {
      navigate("/login");
      return;
    }
    setShowAccount(true);
    try {
      const response = await api.get("/buyer-auth/me");
      setBuyerProfile(response.data?.data?.buyer || null);
    } catch {
      setBuyerProfile({
        name: customerName,
        phone: localStorage.getItem("bijlikartCustomerMobile") || "",
        email: "",
      });
    }
  }

  async function logoutBuyer() {
    try {
      await api.post("/buyer-auth/logout");
    } catch {
      /* Session may already be expired. */
    }
    [
      "bijlikartCustomerAuth",
      "bijlikartCustomerName",
      "bijlikartCustomerMobile",
    ].forEach((k) => localStorage.removeItem(k));
    clearBuyerTokens();
    setShowAccount(false);
    navigate("/");
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#071b3d]/95 text-white shadow-xl shadow-blue-950/20 backdrop-blur-xl">
        {/* TOP ROW */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:flex-nowrap md:px-6 md:py-3">
          {/* Logo */}
          <div
            className="flex min-w-0 flex-1 cursor-pointer select-none flex-col md:flex-none"
            onClick={() => navigate("/platform-admin/login")}
          >
            <span className="truncate text-lg font-black leading-none tracking-tight sm:text-xl">
              ⚡ BILJIKACT
            </span>
            <span className="text-[9px] leading-none tracking-[.16em] text-blue-200 sm:text-[10px]">
              SMART ELECTRONICS
            </span>
          </div>

          {/* Delivery Pincode — desktop */}
          <button
            onClick={() => {
              setPincodeInput(deliveryPincode);
              setShowPincodeBox(true);
            }}
            className="hidden md:flex flex-col items-start text-xs px-3 py-1 rounded hover:bg-white/10 transition shrink-0"
          >
            <span className="opacity-75">📍 Deliver to</span>
            <strong className="text-sm">
              {deliveryPincode ? `PIN ${deliveryPincode}` : "Select Pincode"}
            </strong>
          </button>

          {/* Search Bar */}
          <div className="relative order-3 basis-full md:order-none md:mx-2 md:min-w-0 md:flex-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch();
              }}
              className="flex min-h-10 overflow-hidden rounded-xl border-2 border-[#f5db92] bg-white shadow-sm"
            >
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="hidden md:block bg-gray-100 text-gray-700 text-sm px-2 border-r border-gray-300 outline-none"
              >
                <option value="all">All</option>
                {cats.map((category) => (
                  <option key={category._id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={searchText}
                placeholder="Search phones, TVs, laptops & more"
                autoComplete="off"
                className="min-w-0 flex-1 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setShowSuggestions(true);
                }}
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    setShowSuggestions(false);
                  }}
                  className="bg-white px-2 text-slate-500 hover:text-slate-800"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                aria-label="Search"
                className="bg-[#f0c040] px-4 font-bold text-[#123b7a] transition hover:bg-yellow-400"
              >
                🔍
              </button>
            </form>

            {/* Suggestions dropdown */}
            {showSuggestions && searchText.trim() && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-b-lg z-50 max-h-64 overflow-y-auto">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSearchText(s);
                        setShowSuggestions(false);
                        runSearch(s);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <span className="text-gray-400">⌕</span>{" "}
                      <strong>{s}</strong>
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runSearch()}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span className="text-gray-400">⌕</span>{" "}
                    <strong>{searchText}</strong>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Account */}
          {customerLoggedIn && (
            <button
              onClick={() => navigate("/notifications")}
              className="hidden md:flex flex-col items-start text-xs px-2 py-1 rounded hover:bg-white/10 transition shrink-0"
            >
              <span className="opacity-75">Updates</span>
              <strong className="text-sm">Alerts</strong>
            </button>
          )}
          {customerLoggedIn && (
            <button
              onClick={() => navigate("/my-orders")}
              className="flex flex-col items-start text-xs px-2 py-1 rounded hover:bg-white/10 transition shrink-0"
            >
              <span className="opacity-75">Track</span>
              <strong className="text-sm">Orders</strong>
            </button>
          )}
          <button
            onClick={handleAccount}
            className="hidden md:flex flex-col items-start text-xs px-2 py-1 rounded hover:bg-white/10 transition shrink-0"
          >
            <span className="opacity-75">
              {customerLoggedIn ? `Hi, ${firstName}` : "Hello, Sign in"}
            </span>
            <strong className="text-sm">
              {customerLoggedIn ? "Your Account" : "Account"}
            </strong>
          </button>
          <button
            onClick={handleAccount}
            aria-label="Account"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg transition hover:bg-white/10 md:hidden"
          >
            👤
          </button>

          {/* Cart */}
          <button
            onClick={() => navigate("/cart")}
            aria-label="Shopping cart"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl transition hover:bg-white/10 md:w-auto md:gap-1 md:px-3 md:py-2"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#f0c040] text-[#123b7a] text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* CATEGORY NAV */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/10 px-3 py-2 scrollbar-none md:px-6 md:py-1">
          <button
            onClick={() => setShowCatalog(true)}
            className="text-xs font-bold px-3 py-1 rounded bg-[#ffcf4a] text-[#071b3d] shrink-0 mr-2 hover:bg-[#ffe08a] transition"
          >
            ☰ All
          </button>
          <button
            onClick={() => navigate("/")}
            className="text-xs px-3 py-1 rounded hover:bg-white/20 transition whitespace-nowrap shrink-0"
          >
            Home
          </button>

          {cats.map((c) => (
            <button
              key={c._id}
              onClick={() => navigate(`/c/${c.slug}`)}
              className="text-xs px-3 py-1 rounded hover:bg-white/20 transition whitespace-nowrap shrink-0"
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => navigate("/seller-register")}
            className="text-xs px-3 py-1 rounded hover:bg-white/20 transition whitespace-nowrap shrink-0"
          >
            Sell
          </button>
          <button
            onClick={() => navigate("/login")}
            className="text-xs px-3 py-1 rounded hover:bg-white/20 transition whitespace-nowrap shrink-0 md:hidden"
          >
            Account
          </button>
        </nav>
      </header>

      {showAccount && (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setShowAccount(false)}
        >
          <section
            className="absolute right-4 top-20 w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">
                  My account
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {buyerProfile?.name || firstName || "Customer"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAccount(false)}
                className="text-2xl text-slate-400"
                aria-label="Close account"
              >
                ×
              </button>
            </div>
            <div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <p>
                <span className="font-bold text-slate-500">Name</span>
                <br />
                {buyerProfile?.name || customerName || "—"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Mobile</span>
                <br />
                {buyerProfile?.phone ||
                  localStorage.getItem("bijlikartCustomerMobile") ||
                  "—"}
              </p>
              <p>
                <span className="font-bold text-slate-500">Email</span>
                <br />
                {buyerProfile?.email || "Not added"}
              </p>
              {buyerProfile?.city && (
                <p>
                  <span className="font-bold text-slate-500">City</span>
                  <br />
                  {buyerProfile.city}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={logoutBuyer}
              className="mt-6 w-full rounded-xl bg-red-600 py-3 font-bold text-white transition hover:bg-red-700"
            >
              Log out
            </button>
          </section>
        </div>
      )}

      {showCatalog && (
        <div
          className="fixed inset-0 z-[110] bg-[#071b3d]/65 backdrop-blur-sm"
          onClick={() => setShowCatalog(false)}
        >
          <aside
            className="h-full w-[min(23rem,88vw)] bg-white shadow-2xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-[#071b3d] text-white px-7 py-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-200 uppercase tracking-widest">
                  BiljiKact
                </p>
                <h2 className="font-black text-xl">Shop by category</h2>
              </div>
              <button
                onClick={() => setShowCatalog(false)}
                className="w-9 h-9 border border-white/25 rounded-lg text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="font-black text-[#071b3d] mb-3">
                Popular categories
              </p>
              {cats.map((category) => (
                <button
                  key={category._id}
                  onClick={() => {
                    setShowCatalog(false);
                    navigate(`/c/${category.slug}`);
                  }}
                  className="w-full flex items-center justify-between py-3 text-left border-b border-slate-100 hover:text-[#155eef]"
                >
                  <span>{category.name}</span>
                  <span>›</span>
                </button>
              ))}
              <p className="font-black text-[#071b3d] mt-7 mb-3">
                Shop by brand
              </p>
              {["Samsung", "LG", "Sony", "Apple", "Whirlpool"].map((brand) => (
                <button
                  key={brand}
                  onClick={() => {
                    setShowCatalog(false);
                    navigate(`/search?q=${encodeURIComponent(brand)}`);
                  }}
                  className="w-full flex items-center justify-between py-3 text-left border-b border-slate-100 hover:text-[#155eef]"
                >
                  <span>{brand}</span>
                  <span>›</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setShowCatalog(false);
                  navigate("/seller-register");
                }}
                className="mt-7 w-full rounded-xl bg-[#ffcf4a] text-[#071b3d] font-black py-3"
              >
                Start selling with us
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* PINCODE MODAL */}
      {showPincodeBox && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowPincodeBox(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              📍 Set Delivery Pincode
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter your 6-digit PIN code to check delivery availability.
            </p>
            <form onSubmit={applyPincode} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincodeInput}
                onChange={(e) =>
                  setPincodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="e.g. 110001"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
              >
                Apply
              </button>
            </form>
            {pincodeError && <p role="alert" className="mt-2 text-sm text-red-600">{pincodeError}</p>}
            {deliveryPincode && (
              <button
                onClick={() => {
                  localStorage.removeItem("avnishPincode");
                  setDeliveryPincode("");
                  setPincodeInput("");
                  setShowPincodeBox(false);
                }}
                className="mt-3 text-xs text-red-500 hover:underline"
              >
                Clear pincode
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
