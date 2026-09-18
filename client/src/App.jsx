import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";

// Public pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import CustomerSignup from "./pages/CustomerSignup";
import ProductDetails from "./pages/ProductDetails";
import SearchResults from "./pages/SearchResults";
import CartPage from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AccessDenied from "./pages/AccessDenied";
import MyOrders from "./pages/MyOrders";
import Invoice from "./pages/Invoice";
import BuyerNotifications from "./pages/BuyerNotifications";
import PlatformAdminCommissions from "./pages/PlatformAdminCommissions";
import PlatformAdminOrders from "./pages/PlatformAdminOrders";
import PlatformAdminAnalytics from "./pages/PlatformAdminAnalytics";
import PlatformAdminDashboard from "./pages/PlatformAdminDashboard";

// Seller pages
import SellerLogin from "./pages/SellerLogin";
import SellerRegistration from "./pages/SellerRegistration";
// Admin Dashboard (Seller Panel)
import AdminLayout from "./admin/components/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import ProductList from "./admin/pages/Products/ProductList";
import ProductForm from "./admin/pages/Products/ProductForm";
import Inventory from "./admin/pages/Inventory";
import Orders from "./admin/pages/Orders";
import Customers from "./admin/pages/Customers";
import Categories from "./admin/pages/Categories";
import Offers from "./admin/pages/Offers";
import Reports from "./admin/pages/Reports";
import Notifications from "./admin/pages/Notifications";
import Settlements from "./admin/pages/Settlements";
import SellerInvoice from "./admin/pages/SellerInvoice";

// Staff pages
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import PlatformAdminLogin from "./pages/PlatformAdminLogin";
import PlatformAdminSellers from "./pages/PlatformAdminSellers";
import CatalogCategory from "./pages/CatalogCategory";
import PlatformAdminCategories from "./pages/PlatformAdminCategories";
import PlatformAdminProducts from "./pages/PlatformAdminProducts";
import Navbar from "./components/Navbar";
import PlatformAdminLayout from "./pages/PlatformAdminLayout";

/* ================================
   PROTECTED ROUTE WRAPPERS
================================ */

function SellerRoute({ children }) {
  const { seller, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  return seller ? children : <Navigate to="/seller-login" replace />;
}

// Removed OwnerRoute as the "Admin" panel is the Seller dashboard now

function StaffRoute({ children }) {
  return children;
}

function PlatformAdminRoute({ children }) {
  return children;
}

function ApplicationLayout({
  cart,
  addToCart,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
  totalItems,
}) {
  const location = useLocation();
  const isSellerWorkspace = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const isPlatformAdminWorkspace = location.pathname === "/platform-admin" || location.pathname.startsWith("/platform-admin/");
  const showMarketplaceNavbar = !isSellerWorkspace && !isPlatformAdminWorkspace;

  return (
    <>
      {showMarketplaceNavbar && <Navbar cartCount={totalItems} />}
      <ScrollToTop />
      <Routes>
        {/* ── CUSTOMER ── */}
        <Route
          path="/"
          element={<Home addToCart={addToCart} cartCount={totalItems} />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<CustomerSignup />} />
        <Route
          path="/product/:id"
          element={<ProductDetails addToCart={addToCart} />}
        />
        <Route
          path="/search"
          element={<SearchResults addToCart={addToCart} />}
        />
        <Route path="/c/:slug" element={<CatalogCategory />} />
        <Route
          path="/cart"
          element={
            <CartPage
              cart={cart}
              removeFromCart={removeFromCart}
              increaseQuantity={increaseQuantity}
              decreaseQuantity={decreaseQuantity}
            />
          }
        />
        <Route path="/checkout" element={<Checkout cart={cart} />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/invoice/:id" element={<Invoice />} />
        <Route path="/notifications" element={<BuyerNotifications />} />

        {/* ── SELLER AUTH ── */}
        <Route path="/seller-register" element={<SellerRegistration />} />
        <Route path="/seller-login" element={<SellerLogin />} />

        {/* ── ADMIN DASHBOARD (Seller Panel) ── */}
        <Route
          path="/admin"
          element={
            <SellerRoute>
              <AdminLayout />
            </SellerRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/add" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id/invoice" element={<SellerInvoice />} />
          <Route path="customers" element={<Customers />} />
          <Route path="categories" element={<Categories />} />
          <Route path="offers" element={<Offers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settlements" element={<Settlements />} />
        </Route>

        {/* ── STAFF ── */}
        <Route path="/staff-login" element={<StaffLogin />} />
        <Route
          path="/staff"
          element={
            <StaffRoute>
              <StaffDashboard />
            </StaffRoute>
          }
        />

        {/* ── PLATFORM ADMINISTRATOR ── */}
        <Route
          path="/platform-admin/login"
          element={<PlatformAdminLogin />}
        />
        <Route
          path="/platform-admin"
          element={
            <PlatformAdminRoute>
              <PlatformAdminLayout />
            </PlatformAdminRoute>
          }
        >
          <Route index element={<PlatformAdminDashboard />} />
          <Route path="dashboard" element={<PlatformAdminDashboard />} />
          <Route path="sellers" element={<PlatformAdminSellers />} />
          <Route path="categories" element={<PlatformAdminCategories />} />
          <Route path="products" element={<PlatformAdminProducts />} />
          <Route path="commissions" element={<PlatformAdminCommissions />} />
          <Route path="orders" element={<PlatformAdminOrders />} />
          <Route path="analytics" element={<PlatformAdminAnalytics />} />
          <Route
            path="analytics/seller/:sellerId"
            element={<PlatformAdminAnalytics />}
          />
        </Route>

        {/* ── MISC ── */}
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/* ================================
   MAIN APP
================================ */

export default function App() {
  const {
    cart,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    totalItems,
  } = useCart();

  return (
    <BrowserRouter>
      <ApplicationLayout
        cart={cart}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        increaseQuantity={increaseQuantity}
        decreaseQuantity={decreaseQuantity}
        totalItems={totalItems}
      />
    </BrowserRouter>
  );
}
