import { useNavigate } from "react-router-dom";

const LINKS = {
  shop: [
    { label: "Mobiles", path: "/search?q=mobile" },
    { label: "Smart TVs", path: "/search?q=smart+tv" },
    { label: "Laptops", path: "/search?q=laptop" },
    { label: "Air Conditioners", path: "/search?q=ac" },
    { label: "Refrigerators", path: "/search?q=refrigerator" },
    { label: "Today's Deals", path: "/search?q=deal" },
  ],
  seller: [
    { label: "Sell on BijliCart", path: "/seller-register" },
    { label: "Seller Login", path: "/seller-login" },
    { label: "Seller Dashboard", path: "/seller" },
  ],
  support: [
    { label: "Customer Login", path: "/login" },
    { label: "Create Account", path: "/signup" },
    { label: "Track Order", path: "/my-orders" },
  ],
};

export default function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#071b3d] text-white mt-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div>
          <div className="text-2xl font-black mb-2">⚡ BIJLICART</div>
          <p className="text-sm text-blue-200 mb-4 leading-relaxed">
            Your trusted local electronics marketplace. Quality products from
            verified sellers.
          </p>
          <div className="flex gap-3">
            {["📘", "📸", "🐦", "▶️"].map((icon, i) => (
              <span
                key={i}
                className="text-xl cursor-pointer hover:opacity-75 transition"
              >
                {icon}
              </span>
            ))}
          </div>
        </div>

        {/* Links */}
        {[
          { title: "Shop", links: LINKS.shop },
          { title: "Seller", links: LINKS.seller },
          { title: "Account", links: LINKS.support },
        ].map((section) => (
          <div key={section.title}>
            <h4 className="font-black text-yellow-400 mb-3 text-sm uppercase tracking-wide">
              {section.title}
            </h4>
            <ul className="space-y-2">
              {section.links.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => navigate(l.path)}
                    className="text-sm text-blue-200 hover:text-white transition"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 py-4 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-blue-300">
        <span>
          © {year} BijliCart Electronics Marketplace. All rights reserved.
        </span>
        <div className="flex gap-4">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Refund Policy</span>
        </div>
      </div>
    </footer>
  );
}
