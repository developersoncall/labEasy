import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { HiMenuAlt2, HiX } from 'react-icons/hi';
import {
  FaThLarge, FaUser, FaCalendarCheck, FaFlask, FaFileMedical,
  FaPrescriptionBottleAlt, FaRegBell, FaHeart, FaCog,
} from 'react-icons/fa';
import Navbar from '../components/common/Navbar.jsx';
import Footer from '../components/common/Footer.jsx';

const MENU = [
  { label: 'Dashboard', to: '/dashboard', icon: FaThLarge, end: true },
  { label: 'My Profile', to: '/dashboard/profile', icon: FaUser },
  { label: 'My Appointments', to: '/dashboard/appointments', icon: FaCalendarCheck },
  { label: 'Lab Bookings', to: '/dashboard/diagnostic-bookings', icon: FaFlask },
  { label: 'My Reports', to: '/dashboard/reports', icon: FaFileMedical },
  { label: 'Prescriptions', to: '/dashboard/prescriptions', icon: FaPrescriptionBottleAlt },
  { label: 'Notifications', to: '/dashboard/notifications', icon: FaRegBell },
  { label: 'Favorite Doctors', to: '/dashboard/favorites', icon: FaHeart },
  { label: 'Settings', to: '/dashboard/settings', icon: FaCog },
];

/** Authenticated dashboard layout: navbar + sidebar + content. */
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container-custom flex flex-1 gap-6 py-6">
        {/* Mobile sidebar toggle */}
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-card-hover lg:hidden"
          aria-label="Toggle dashboard menu"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <HiX size={20} /> : <HiMenuAlt2 size={20} />}
        </button>

        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'fixed inset-y-0 left-0 z-30 w-72 overflow-y-auto bg-white p-4 pt-20 shadow-card-hover' : 'hidden'
          } lg:static lg:block lg:w-60 lg:shrink-0 lg:bg-transparent lg:p-0 lg:pt-0 lg:shadow-none`}
          aria-label="Dashboard navigation"
        >
          <nav className="card space-y-1 p-3">
            {MENU.map(({ label, to, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setSidebarOpen(false)}>
                <Icon size={15} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
