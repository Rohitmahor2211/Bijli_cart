import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate();

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="relative overflow-hidden bg-[#071b3d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(20,184,255,.34),transparent_26%),radial-gradient(circle_at_25%_75%,rgba(21,94,239,.42),transparent_30%)]" />
      {/* MAIN HERO */}
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20 flex flex-col md:flex-row items-center gap-10">
        {/* Content */}
        <div className="flex-1 text-center md:text-left">
          <span className="inline-block bg-yellow-400 text-[#123b7a] text-xs font-black px-3 py-1 rounded-full mb-4 tracking-wide">
            ⚡ BILJIKACT FESTIVE EDIT
          </span>
          <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4">
            The smart way to
            <br />
            <span className="text-[#ffcf4a]">bring tech home.</span>
          </h1>
          <p className="text-blue-200 text-sm md:text-base mb-6 max-w-md mx-auto md:mx-0">
            Discover trusted electronics, honest prices, and a shopping
            experience designed around you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <button
              onClick={() => scrollTo("products")}
              className="bg-[#ffcf4a] text-[#071b3d] font-black px-6 py-3 rounded-xl hover:bg-[#ffe08a] transition-all shadow-lg hover:shadow-yellow-400/30 hover:scale-105"
            >
              Explore deals →
            </button>
            <button
              onClick={() => scrollTo("categories")}
              className="border-2 border-white/40 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-all"
            >
              Browse Categories
            </button>
          </div>
          <div className="flex items-center gap-4 mt-6 justify-center md:justify-start text-sm text-blue-200">
            <span>✓ Trusted Sellers</span>
            <span>✓ Local Deals</span>
            <span>✓ Fast Delivery</span>
          </div>
        </div>

        {/* Hero Image */}
        <div className="flex-1 relative flex justify-center">
          <div className="absolute top-2 right-8 md:right-16 bg-yellow-400 text-[#123b7a] rounded-full w-20 h-20 flex flex-col items-center justify-center font-black z-10 shadow-lg">
            <small className="text-[9px]">UP TO</small>
            <strong className="text-2xl leading-none">40%</strong>
            <span className="text-[10px]">OFF</span>
          </div>
          <img
            src="https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800"
            alt="Electronics deals on BiljiKact"
            className="rounded-[2rem] ring-8 ring-white/10 shadow-2xl w-full max-w-md object-cover"
          />
        </div>
      </div>

      {/* QUICK CARDS */}
      <div className="bg-white/5 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: "📺",
              title: "Smart TVs",
              sub: "Top brands & deals",
              q: "smart tv",
            },
            {
              icon: "❄️",
              title: "Air Conditioners",
              sub: "Beat the heat",
              q: "ac",
            },
            {
              icon: "📱",
              title: "Mobiles",
              sub: "Latest smartphones",
              q: "mobile",
            },
            { icon: "💻", title: "Laptops", sub: "Work & gaming", q: "laptop" },
          ].map((c) => (
            <button
              key={c.title}
              onClick={() => navigate(`/search?q=${encodeURIComponent(c.q)}`)}
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-all text-left group"
            >
              <span className="text-2xl">{c.icon}</span>
              <div>
                <strong className="text-sm font-bold group-hover:text-yellow-300 transition">
                  {c.title}
                </strong>
                <small className="block text-xs text-blue-200">{c.sub}</small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
