import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiMenu, HiX } from 'react-icons/hi';
import { FaUserCircle, FaRegBell } from 'react-icons/fa';
import { NAV_LINKS } from '../../constants/index.js';
import useAuth from '../../hooks/useAuth.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { notificationService } from '../../services/notificationService.js';

/** Sticky site header with responsive mobile menu and auth-aware actions. */
export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { brandName } = useSettings();

  // Admins get a single "Admin Panel" entry; patients get their dashboard links.
  const menuItems = isAdmin
    ? [{ label: '🛠 Admin Panel', to: '/admin' }]
    : [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'My Appointments', to: '/dashboard/appointments' },
        { label: 'My Lab Bookings', to: '/dashboard/diagnostic-bookings' },
        { label: 'My Reports', to: '/dashboard/reports' },
        { label: 'Settings', to: '/dashboard/settings' },
      ];
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Notifications are a patient feature — admins don't have a feed.
    if (isAuthenticated && !isAdmin) {
      notificationService.getUnreadCount(user.id).then(setUnread).catch(() => {});
    }
  }, [isAuthenticated, isAdmin, user]);

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
    navigate('/');
  };

  const displayName = user?.user_metadata?.full_name || user?.email || 'Account';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <nav className="container-custom flex h-20 items-center justify-between gap-4" aria-label="Main navigation">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" aria-label={`${brandName} home`}>
          <img src="/logo.png" alt={brandName} className="h-14 w-auto" width="56" height="56" />
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {!isAdmin && (
                <Link
                  to="/dashboard/notifications"
                  aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                  className="relative hidden rounded-full p-2 text-gray-500 transition hover:bg-gray-100 sm:block"
                >
                  <FaRegBell size={18} />
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-3 text-sm font-medium text-gray-700 transition hover:border-primary-300"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <FaUserCircle className="text-primary-600" size={24} />
                  )}
                  <span className="hidden max-w-[120px] truncate sm:block">{displayName}</span>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      role="menu"
                      className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-card-hover"
                    >
                      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <FaUserCircle className="text-primary-600" size={34} />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                          {user?.email && <p className="truncate text-xs text-gray-400">{user.email}</p>}
                        </div>
                      </div>
                      {menuItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                        >
                          {item.label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="block w-full px-4 py-2 text-left text-sm text-red-500 transition hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost hidden text-sm sm:inline-flex">
                Login
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <HiX size={22} /> : <HiMenu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-100 bg-white lg:hidden"
          >
            <ul className="container-custom space-y-1 py-3">
              {NAV_LINKS.map((link) => (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
              {!isAuthenticated && (
                <li>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Login
                  </Link>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
