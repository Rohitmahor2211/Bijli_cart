import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import api, { clearPlatformAdminTokens } from '../api/axios';

const ADMIN_IDLE_TIMEOUT = 2 * 60 * 60 * 1000;

const links = [
  { path: '', label: 'Dashboard' },
  { path: 'sellers', label: 'Seller approvals' },
  { path: 'products', label: 'Product moderation' },
  { path: 'categories', label: 'Marketplace categories' },
  { path: 'commissions', label: 'Commission report' },
  { path: 'orders', label: 'Orders & seller payments' },
  { path: 'analytics', label: 'Seller analytics & income' },
];

export default function PlatformAdminLayout() {
  const navigate = useNavigate();
  const idleTimerRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logout = async () => {
    try {
      await api.post("/platform-admin/logout");
    } finally {
      clearPlatformAdminTokens();
      navigate("/platform-admin/login", { replace: true });
    }
  };

  useEffect(() => {
    let disposed = false;

    const redirectAfterInactivity = async () => {
      if (disposed) return;
      try {
        await api.post("/platform-admin/logout");
      } finally {
        clearPlatformAdminTokens();
        navigate("/platform-admin/login", { replace: true });
      }
    };

    const resetIdleTimer = () => {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(
        redirectAfterInactivity,
        ADMIN_IDLE_TIMEOUT,
      );
    };

    const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, resetIdleTimer, { passive: true }),
    );
    resetIdleTimer();

    return () => {
      disposed = true;
      window.clearTimeout(idleTimerRef.current);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, resetIdleTimer),
      );
    };
  }, [navigate]);

  useEffect(() => {
    let disposed = false;
    const loadNotifications = async () => {
      try {
        const response = await api.get("/platform-admin/notifications");
        if (!disposed) {
          setNotifications(response.data?.data?.notifications || []);
          setUnreadCount(response.data?.data?.unreadCount || 0);
        }
      } catch (error) {
        if (error.response?.status === 401 && !disposed)
          navigate("/platform-admin/login", { replace: true });
      }
    };
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [navigate]);

  const markNotificationsRead = async () => {
    if (!unreadCount) return;
    await api.patch("/platform-admin/notifications/read-all");
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
    setUnreadCount(0);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <button
        type="button"
        aria-label="Open platform admin navigation"
        onClick={() => setMobileMenuOpen(true)}
        className="fixed bottom-5 left-5 z-30 rounded-lg bg-blue-600 px-4  py-2 text-xl text-white shadow-xl md:hidden"
      >
        ☰
      </button>
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="h-full w-[min(20rem,85vw)] overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900 p-5 text-white shadow-xl transform transition-all duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs font-black tracking-[.18em] text-blue-300">BIJLICART</p>
                <h1 className="mt-2 text-xl font-black">Platform Admin</h1>
              </div>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-2xl text-slate-300">
                ×
              </button>
            </div>
            <nav aria-label="Mobile platform admin navigation" className="grid gap-2">
              {links.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-4 py-3 text-sm font-bold transition ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <button onClick={logout} className="mt-8 w-full rounded-lg border border-slate-700 px-4 py-3 text-left text-sm font-bold text-slate-300">
              Sign out
            </button>
          </aside>
        </div>
      )}
      <aside className="hidden w-full shrink-0 bg-gradient-to-b from-slate-950 to-slate-900 p-5 text-white shadow-xl md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-72 md:flex-col md:overflow-y-auto">
        <div className="mb-8">
          <p className="text-xs font-black tracking-[.18em] text-blue-300">
            BIJLICART
          </p>
          <h1 className="mt-2 text-xl font-black">Platform Admin</h1>
          <p className="mt-1 text-xs text-slate-400">Marketplace operations</p>
        </div>
        <nav aria-label="Platform admin navigation" className="grid gap-2">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `rounded-lg px-4 py-3 text-sm font-bold transition ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-8 w-full rounded-lg border border-slate-700 px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-slate-800"
        >
          Sign out
        </button>
      </aside>
      <section className="min-w-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 md:ml-72">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-5 py-4 backdrop-blur md:px-8 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Operations workspace
            </p>
            <p className="text-sm font-bold text-slate-800">
              Live marketplace controls
            </p>
          </div>
          <div className="group relative">
            <button
              onClick={markNotificationsRead}
              className="relative rounded-xl bg-slate-50 px-3 py-2 text-left shadow-sm"
              aria-label="Admin notifications"
            >
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <div className="invisible absolute right-0 top-12 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-white p-3 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
              <div className="flex items-center justify-between px-2 pb-2">
                <p className="font-black text-slate-900">Admin alerts</p>
                <span className="text-xs text-slate-400">
                  {unreadCount} unread
                </span>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {notifications.length ? (
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`rounded-xl p-3 text-xs ${notification.isRead ? "bg-slate-50" : "bg-blue-50"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-slate-800">
                          {notification.title}
                        </p>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                          {notification.metadata?.badge || "INFO"}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-[10px] text-slate-400">
                        {new Date(notification.createdAt).toLocaleString(
                          "en-IN",
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-sm text-slate-500">
                    No admin alerts yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>
        <Outlet />
      </section>
    </div>
  );
}
