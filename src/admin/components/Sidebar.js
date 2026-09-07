import React from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import BrandMark from '../../components/common/BrandMark.jsx';

// Only functional destinations. `badgeKey` pulls a live count from `counts`.
const NAV = [
  { group:'Overview', items:[
    {key:'dashboard',icon:'📊',label:'Dashboard'},
    {key:'today',icon:'📅',label:'Today'},
  ]},
  { group:'Laboratories', items:[
    {key:'labs',icon:'🏥',label:'Manage Labs',badgeKey:'labsPending'},
  ]},
  // Manage Users / Manage Doctors are intentionally not in the nav: the
  // platform is lab-first for now, so people are managed by each lab. The
  // pages themselves still exist and work if the nav entry is put back.
  { group:'Catalog', items:[
    {key:'tests',icon:'🔬',label:'Manage Tests'},
    {key:'categories',icon:'🗂️',label:'Test Categories'},
    {key:'packages',icon:'📦',label:'Health Packages'},
    {key:'blogs',icon:'✍️',label:'Manage Blogs'},
  ]},
  { group:'Bookings', items:[
    {key:'bookings',icon:'🧪',label:'Lab Bookings',badgeKey:'bookings'},
  ]},
  { group:'Reports', items:[{key:'reports',icon:'📄',label:'Reports',badgeKey:'reports'}]},
  { group:'Analytics', items:[{key:'analytics',icon:'📈',label:'Analytics & Reports'}]},
  { group:'System', items:[
    {key:'settings',icon:'⚙️',label:'App Settings'},
    // Where patients send money: UPI, a mobile number, a scan-to-pay QR.
    {key:'payments',icon:'💳',label:'Payment Options'},
    {key:'support',icon:'🆘',label:'Support Tickets',badgeKey:'support'},
  ]},
];

const Sidebar = ({ currentPage, onNavigate, open, onClose, onLogout, onViewWebsite, counts = {}, adminName = 'Admin', adminEmail = '' }) => {
  const { brandName } = useSettings();
  return (
  <>
    {open && <div className="sidebar-overlay" onClick={onClose} />}

    <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
      <div className="sidebar-brand">
        <BrandMark size={44} title={brandName} className="shrink-0" />
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
