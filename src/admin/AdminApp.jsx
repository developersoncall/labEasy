import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import { sidebarCounts } from './adminData';

// Scoped admin styles (every selector is namespaced under .admin-root)
import './admin-base.css';
import './admin-shared.css';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import Dashboard     from './pages/Dashboard/index';
import Users         from './pages/Users/index';
import Doctors       from './pages/Doctors/index';
import Tests         from './pages/Tests/index';
import Packages      from './pages/Packages/index';
import Bookings      from './pages/Bookings/index';
import Appointments  from './pages/Appointments/index';
import Reports       from './pages/Reports/index';
import Payments      from './pages/Payments/index';
import Support       from './pages/Support/index';
import Analytics     from './pages/Analytics/index';
import Settings      from './pages/Settings/index';

/**
 * Admin panel shell. Ported from the standalone Lab-Admin app: keeps its
 * state-based page switching and its Sidebar/Topbar screens, but is mounted
 * inside this site's router at /admin and uses the site's Supabase auth.
 */
const AdminApp = () => {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebar] = useState(false);
  const [counts, setCounts] = useState({});
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const refreshCounts = useCallback(() => {
    sidebarCounts().then(setCounts).catch(() => {});
  }, []);

  // Refresh badge counts when the section changes (so confirming a booking
  // or verifying a report updates the sidebar as you move around).
  useEffect(() => { refreshCounts(); }, [page, refreshCounts]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true }); // back to the public website
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':      return <Dashboard />;
      case 'users':          return <Users />;
      case 'doctors':        return <Doctors />;
      // Distinct keys force a remount so the Tests page opens on the right tab.
      case 'tests':          return <Tests key="tests-all" initialTab="tests" />;
      case 'categories':     return <Tests key="tests-cats" initialTab="categories" />;
      case 'packages':       return <Packages />;
      case 'bookings':       return <Bookings onChange={refreshCounts} />;
      case 'appointments':   return <Appointments onChange={refreshCounts} />;
      case 'reports':        return <Reports onChange={refreshCounts} />;
      case 'payments':       return <Payments />;
      case 'analytics':      return <Analytics />;
      case 'settings':       return <Settings />;
      case 'support':
      case 'feedback':       return <Support onChange={refreshCounts} />;
      default:               return <Dashboard />;
    }
  };

  const adminName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="admin-root">
      <div className="admin-layout">
        <Sidebar
          currentPage={page}
          onNavigate={setPage}
          open={sidebarOpen}
          onClose={() => setSidebar(false)}
          onLogout={handleLogout}
          onViewWebsite={() => navigate('/')}
          counts={counts}
          adminName={adminName}
          adminEmail={user?.email || ''}
        />
        <div className="main-area">
          <Topbar
            page={page}
            onMenuToggle={() => setSidebar(o => !o)}
            onNavigate={setPage}
            onViewWebsite={() => navigate('/')}
            onLogout={handleLogout}
            adminName={adminName}
            adminEmail={user?.email || ''}
          />
          <main className="content">{renderPage()}</main>
        </div>
      </div>
    </div>
  );
};

export default AdminApp;
