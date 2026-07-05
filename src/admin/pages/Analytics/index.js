import React, { useState, useEffect } from 'react';
import { dashboardData, bookingsData } from '../../adminData';
import { formatCurrency, currencySymbol } from '../../../utils/helpers.js';

const rupee = (n) => formatCurrency(n);

const Analytics = () => {
  const [period, setPeriod] = useState('monthly');
  const [d, setD] = useState({ stats: {}, chartRevenue: [] });
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    dashboardData.load().then(setD).catch(() => {});
    bookingsData.load().then(setBookings).catch(() => {});
  }, []);

  const maxR = Math.max(1, ...d.chartRevenue.map(x => x.val));
  const home = bookings.filter(b => b.type === 'home').length;
  const lab = bookings.filter(b => b.type === 'lab').length;
  const totalBk = home + lab || 1;
  const homePct = Math.round((home / totalBk) * 100);
  const labPct = 100 - homePct;

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Analytics &amp; Reports</div><div className="ph-sub">Booking analytics, revenue reports, and user activity</div></div>
        <div className="ph-actions">
          <div className="tabs" style={{marginBottom:0}}>{['daily','weekly','monthly','yearly'].map(p=><button key={p} className={`tab-btn${period===p?' active':''}`} onClick={()=>setPeriod(p)}>{p}</button>)}</div>
        </div>
      </div>
      <div className="stat-row">
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{background:'#1a6fc420'}}>📊</div></div><div className="sc-num">{d.stats.bookings ?? 0}</div><div className="sc-label">Total Lab Bookings</div></div>
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{background:'#0d948820'}}>💰</div></div><div className="sc-num">{rupee(d.stats.revenue)}</div><div className="sc-label">Total Revenue</div></div>
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{background:'#7c3aed20'}}>👥</div></div><div className="sc-num">{d.stats.users ?? 0}</div><div className="sc-label">Registered Users</div></div>
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{background:'#d9770620'}}>📄</div></div><div className="sc-num">{d.stats.pendingReports ?? 0}</div><div className="sc-label">Pending Reports</div></div>
      </div>

      <div className="card" style={{marginBottom:'20px'}}>
        <div className="card-header"><div className="card-title">💰 Monthly Revenue ({currencySymbol()} thousands)</div></div>
        <div className="card-body">
          <div className="chart-bar-row" style={{height:'160px'}}>
            {d.chartRevenue.map((x,i)=>(<div key={i} className="chart-bar" style={{height:`${(x.val/maxR)*100}%`,background:i===new Date().getMonth()?'#0d9488':'#c7dcf5'}}/>))}
          </div>
          <div className="chart-x">{d.chartRevenue.map((x,i)=><span key={i}>{x.label}</span>)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">📋 Booking Type Split</div></div>
        <div className="card-body">
          <div style={{display:'flex',justifyContent:'space-around',marginBottom:'20px'}}>
            {[{l:'Home Collection',n:`${homePct}%`,c:'#1a6fc4'},{l:'Lab Visit',n:`${labPct}%`,c:'#0d9488'}].map((s,i)=>(
              <div key={i} style={{textAlign:'center'}}>
                <div style={{fontFamily:'Lato',fontSize:'2rem',fontWeight:900,color:s.c}}>{s.n}</div>
                <div style={{fontSize:'12px',color:'var(--text-2)',marginTop:'4px'}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="prog-bar" style={{height:'10px',borderRadius:'100px',marginBottom:'6px'}}>
            <div className="prog-fill" style={{width:`${homePct}%`,background:'linear-gradient(90deg,#1a6fc4,#0d9488)',borderRadius:'100px',height:'100%'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text-3)',fontWeight:600}}>
            <span>🏠 {home} home</span><span>🏥 {lab} lab visits</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Analytics;
