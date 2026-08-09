import React from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';

// Only functional destinations. `badgeKey` pulls a live count from `counts`.
const NAV = [
  { group:'Overview', items:[{key:'dashboard',icon:'📊',label:'Dashboard'}]},
  { group:'People', items:[{key:'users',icon:'👥',label:'Manage Users'},{key:'doctors',icon:'🩺',label:'Manage Doctors'}]},
  { group:'Catalog', items:[
    {key:'tests',icon:'🔬',label:'Manage Tests'},
    {key:'categories',icon:'🗂️',label:'Test Categories'},
    {key:'packages',icon:'📦',label:'Health Packages'},
    {key:'blogs',icon:'✍️',label:'Manage Blogs'},
  ]},
  { group:'Bookings', items:[
    {key:'bookings',icon:'🧪',label:'Lab Bookings',badgeKey:'bookings'},
    {key:'appointments',icon:'🩺',label:'Doctor Appointments',badgeKey:'appointments'},
  ]},
  { group:'Reports', items:[{key:'reports',icon:'📄',label:'Reports',badgeKey:'reports'}]},
  { group:'Finance', items:[{key:'payments',icon:'💵',label:'Cash Collection'}]},
  { group:'Analytics', items:[{key:'analytics',icon:'📈',label:'Analytics & Reports'}]},
  { group:'System', items:[{key:'settings',icon:'⚙️',label:'App Settings'},{key:'support',icon:'🆘',label:'Support Tickets',badgeKey:'support'}]},
];

const Sidebar = ({ currentPage, onNavigate, open, onClose, onLogout, onViewWebsite, counts = {}, adminName = 'Admin', adminEmail = '' }) => {
  const { brandName } = useSettings();
  return (
  <>
    {open && <div className="sidebar-overlay" onClick={onClose} />}

    <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
      <div className="sidebar-brand">
        <img src="/logo.png" alt={brandName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        <div>
          <div className="sidebar-brand-name">{brandName}</div>
          <div className="sidebar-brand-sub">Admin Panel</div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose}>✕</button>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(g => (
          <div className="nav-group" key={g.group}>
            <div className="nav-group-label">{g.group}</div>
            {g.items.map(item => {
              const badge = item.badgeKey ? counts[item.badgeKey] : 0;
              return (
                <button
                  key={item.key}
                  className={`nav-item${currentPage === item.key ? ' active' : ''}`}
                  onClick={() => { onNavigate(item.key); onClose?.(); }}
                >
                  <span className="ni-icon">{item.icon}</span>
                  <span className="ni-label">{item.label}</span>
                  {badge > 0 && <span className="ni-badge">{badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="su-avatar">{(adminName || 'A')[0].toUpperCase()}</div>
          <div>
            <div className="su-name">{adminName}</div>
            <div className="su-role">{adminEmail || 'Administrator'}</div>
          </div>
          <div className="su-dot" />
        </div>
      </div>
    </aside>
  </>
  );
};

export default Sidebar;
