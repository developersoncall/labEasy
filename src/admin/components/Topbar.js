import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';

const PAGE_TITLES = {
  dashboard:'Dashboard', today:'Today', labs:'Manage Labs',
  users:'Manage Users', doctors:'Manage Doctors',
  tests:'Manage Tests', categories:'Test Categories', packages:'Health Packages',
  bookings:'Lab Bookings', reports:'Reports',
  analytics:'Analytics & Reports',
  settings:'App Settings', support:'Support Tickets', feedback:'Support Tickets',
};

const Topbar = ({ page, onMenuToggle, onNavigate, onViewWebsite, onLogout, adminName = 'Admin', adminEmail = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { brandName } = useSettings();

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="topbar">
      <button className="topbar-menu-btn" onClick={onMenuToggle}>
        <span/><span/><span/>
      </button>

      <div className="topbar-page-info">
        <div className="topbar-title">{PAGE_TITLES[page] || 'Dashboard'}</div>
        <div className="topbar-sub">{brandName} Admin · {new Date().toDateString()}</div>
      </div>

      <div className="topbar-right">
        <div className="tb-search">
          <span>🔍</span>
          <input placeholder="Search anything..." />
        </div>
        <button className="tb-icon-btn" onClick={() => onNavigate?.('settings')} aria-label="Settings" title="Settings">⚙️</button>

        {/* Profile menu — View Website + Logout live here (like the patient navbar) */}
        <div className="tb-profile-wrap" ref={ref}>
          <button className="avatar" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} title={adminName}>
            {(adminName || 'A')[0].toUpperCase()}
          </button>
          {open && (
            <div className="tb-dropdown" role="menu">
              <div className="tb-dd-profile">
                <div className="tb-dd-name">{adminName}</div>
                <div className="tb-dd-role">{adminEmail || 'Administrator'}</div>
              </div>
              <button className="tb-dd-menu-item" role="menuitem" onClick={() => { setOpen(false); onViewWebsite?.(); }}>
                🌐 View Website
              </button>
              <button className="tb-dd-menu-item danger" role="menuitem" onClick={() => { setOpen(false); onLogout?.(); }}>
                ⎋ Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
