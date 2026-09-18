import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiGrid, FiPackage, FiShoppingCart, FiUsers, 
  FiTag, FiBarChart2, FiBell, FiChevronDown, FiMenu, FiX, FiLogOut
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { seller, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(
    location.pathname.includes('/admin/products')
  );

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/seller-login');
    }
  };

  const navLinkStyle = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
      isActive
        ? 'bg-[#f4f7fe] text-[#2b59ff]'
        : 'text-[#64748b] hover:bg-gray-50 hover:text-gray-900'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-[15px]">
      {/* Brand */}
      <div className="flex items-center justify-between p-6 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl leading-none">
            ⚡
          </div>
          <span className="text-xl font-black text-slate-800 tracking-tight">AVNISH</span>
        </div>
        <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-gray-500 hover:bg-gray-100 p-2 rounded-lg">
          <FiX size={20} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-none pb-4">
        <NavLink end to="/admin" className={navLinkStyle}>
          <FiGrid size={20} className="stroke-[1.5]" />
          Dashboard
        </NavLink>

        {/* Products Accordion */}
        <div>
          <button 
            onClick={() => setProductsOpen(!productsOpen)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
              location.pathname.includes('/admin/products') && !productsOpen 
                ? 'text-[#2b59ff]' 
                : 'text-[#64748b] hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <FiPackage size={20} className="stroke-[1.5]" />
              Products
            </div>
            <FiChevronDown 
              size={16} 
              className={`transition-transform duration-200 ${productsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${productsOpen ? 'max-h-40 mt-1 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col ml-11 border-l border-gray-200 space-y-1">
              <NavLink end to="/admin/products" className={({isActive}) => `block pl-4 py-1.5 text-sm transition-colors ${isActive ? 'text-[#2b59ff] font-semibold border-l-2 border-[#2b59ff] -ml-[1px]' : 'text-gray-500 hover:text-gray-900'}`}>
                All Products
              </NavLink>
              <NavLink to="/admin/products/add" className={({isActive}) => `block pl-4 py-1.5 text-sm transition-colors ${isActive ? 'text-[#2b59ff] font-semibold border-l-2 border-[#2b59ff] -ml-[1px]' : 'text-gray-500 hover:text-gray-900'}`}>
                Add Product
              </NavLink>
            </div>
          </div>
        </div>

        <NavLink to="/admin/inventory" className={navLinkStyle}>
          {/* Using grid icon for inventory as a placeholder since FiWarehouse isn't in FI by default, wait FiArchive works */}
          <svg stroke="currentColor" fill="none" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M10 4v4"></path><path d="M14 4v4"></path><path d="M2 8h20"></path><path d="M8 12h8"></path><path d="M8 16h8"></path></svg>
          Inventory
        </NavLink>

        <NavLink to="/admin/orders" className={navLinkStyle}>
          <FiShoppingCart size={20} className="stroke-[1.5]" />
          Orders
        </NavLink>

        <NavLink to="/admin/customers" className={navLinkStyle}>
          <FiUsers size={20} className="stroke-[1.5]" />
          Customers
        </NavLink>

        <NavLink to="/admin/categories" className={navLinkStyle}>
          <FiTag size={20} className="stroke-[1.5]" />
          Categories
        </NavLink>

        <NavLink to="/admin/offers" className={navLinkStyle}>
          {/* Custom ticket/offer icon matching screenshot */}
          <svg stroke="currentColor" fill="none" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          Offers
        </NavLink>

        <NavLink to="/admin/reports" className={navLinkStyle}>
          <FiBarChart2 size={20} className="stroke-[1.5]" />
          Reports
        </NavLink>

        <NavLink to="/admin/settlements" className={navLinkStyle}>
          <span className="text-lg leading-none">₹</span>
          Settlements
        </NavLink>

        <NavLink to="/admin/notifications" className={navLinkStyle}>
          <FiBell size={20} className="stroke-[1.5]" />
          Notifications
        </NavLink>
      </div>

      {/* User Section at bottom */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 mb-3 cursor-pointer hover:bg-gray-100 transition">
          <div className="w-8 h-8 rounded-full bg-[#2b59ff] text-white flex items-center justify-center font-bold">
            {(seller?.shopName || 'A')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{seller?.shopName || 'My Shop'}</p>
            <p className="text-[11px] text-gray-500 truncate">{seller?.email || 'admin@shop.com'}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition"
        >
          <FiLogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-[260px] h-screen shrink-0 border-r border-gray-200 sticky top-0 z-20">
        <SidebarContent />
        {/* Collapse toggle (matching screenshot arrow) */}
        <button className="absolute top-6 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 shadow-sm hover:text-gray-800">
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-[260px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-[72px] bg-white border-b border-gray-200 shrink-0 flex items-center px-4 sm:px-6 lg:px-8 sticky top-0 z-10 justify-between md:justify-end shadow-sm">
          <div className="md:hidden flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <FiMenu size={24} />
            </button>
            <div className="font-black text-slate-800 text-lg tracking-tight">AVNISH</div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition">
              <FiBell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-gray-200 mx-1"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800 leading-none">{seller?.ownerName || 'Admin User'}</p>
                <span className="text-[11px] text-gray-500 font-medium">Owner</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#2b59ff] text-white flex items-center justify-center font-bold ring-2 ring-white shadow-sm cursor-pointer hover:opacity-90">
                {(seller?.ownerName || 'A')[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
