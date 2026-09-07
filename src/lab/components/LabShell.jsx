import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaFlask, FaTachometerAlt, FaCalendarDay, FaClipboardList, FaVials, FaFileMedical,
  FaUsers, FaCog, FaLifeRing, FaSignOutAlt, FaBars, FaTimes, FaFlask as FaVialsIcon,
} from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { canAccessLabSection } from '../../config/platform.js';
import { ROLE_LABELS } from '../../services/labStaffService.js';

/**
 * Chrome for the Lab Dashboard: brand, lab identity, role-filtered navigation.
 *
 * The nav is grouped (Operations / Management) and filtered through
 * canAccessLabSection(), so a tester simply never sees Staff or Bookings —
 * the whole point of the task-based workflow is that each person opens the
 * app on their own work.
 */

const NAV = [
  {
    group: 'Operations',
    items: [
      { to: '/lab', end: true, section: 'dashboard', icon: <FaTachometerAlt />, label: 'Dashboard' },
      { to: '/lab/today', section: 'today', icon: <FaCalendarDay />, label: 'Today' },
      { to: '/lab/bookings', section: 'bookings', icon: <FaClipboardList />, label: 'Bookings' },
      { to: '/lab/testing', section: 'testing', icon: <FaVials />, label: 'Testing' },
      { to: '/lab/reports', section: 'reports', icon: <FaFileMedical />, label: 'Reports' },
    ],
  },
  {
    group: 'Management',
    items: [
      { to: '/lab/tests', section: 'tests', icon: <FaVialsIcon />, label: 'Tests' },
      { to: '/lab/staff', section: 'staff', icon: <FaUsers />, label: 'Staff' },
      { to: '/lab/settings', section: 'settings', icon: <FaCog />, label: 'Lab Settings' },
      { to: '/lab/help', section: 'help', icon: <FaLifeRing />, label: 'Help & Support' },
    ],
  },
];

export default function LabShell({ children }) {
  const { lab, role, profile, user, logout } = useAuth();
  const { brandName } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const groups = NAV
    .map((g) => ({ ...g, items: g.items.filter((n) => canAccessLabSection(role, n.section)) }))
    .filter((g) => g.items.length);

  const name =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff';

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
      isActive
        ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
        : 'text-gray-600 hover:bg-white hover:text-primary-700 hover:shadow-sm'
    }`;

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* ---- top bar ---- */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1560px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="-ml-1 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={open}
            >
              {open ? <FaTimes /> : <FaBars />}
            </button>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
              <FaFlask aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-gray-900">
                {lab?.name || brandName}
              </p>
              <p className="truncate text-xs leading-tight text-gray-500">
                {lab?.lab_ref ? `${lab.lab_ref} · ` : ''}Lab Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline">
              ● Active
            </span>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-gray-900">{name}</p>
              <p className="text-xs leading-tight text-primary-600">{ROLE_LABELS[role] || role}</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
              {name[0]?.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
              title="Sign out"
              aria-label="Sign out"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1560px] gap-8 px-4 py-7 sm:px-6 lg:px-8">
        {/* ---- sidebar ---- */}
        {open && (
          <button
            type="button"
            className="fixed inset-0 top-16 z-30 bg-gray-900/20 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <aside
          className={`${
            open ? 'block' : 'hidden'
          } fixed inset-x-0 top-16 z-30 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-gray-200 bg-gray-50 p-4 lg:sticky lg:top-[88px] lg:z-auto lg:block lg:max-h-none lg:w-60 lg:shrink-0 lg:self-start lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0`}
        >
          <nav className="space-y-6">
            {groups.map((g) => (
              <div key={g.group} className="space-y-1">
                <p className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-400">
                  {g.group}
                </p>
                {g.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={linkClass}
                    onClick={() => setOpen(false)}
                  >
                    <span className="text-base opacity-90" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="mt-7 rounded-2xl border border-primary-100 bg-primary-50/70 p-4">
            <p className="text-xs font-bold text-primary-900">{ROLE_LABELS[role] || role}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-primary-700/90">
              You see the bookings that need your action. Stages you are not responsible for are
              handled by your colleagues.
            </p>
          </div>
        </aside>

        {/* ---- content ---- */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
