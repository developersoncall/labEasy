import React, { useState, useEffect } from 'react';
import { dashboardData } from '../../adminData';
import { formatCurrency, currencySymbol } from '../../../utils/helpers.js';

const BAR_COLORS=['#1a6fc4','#2080d8','#0d9488','#1a6fc4','#7c3aed','#d97706','#2080d8'];
const rupee = (n) => formatCurrency(n);

const Dashboard = () => {
  const [d, setD] = useState({ stats: {}, recentBookings: [], chartBookings: [], chartRevenue: [] });

  useEffect(() => { dashboardData.load().then(setD).catch(() => {}); }, []);

  const maxB = Math.max(1, ...d.chartBookings.map(x => x.val));
  const maxR = Math.max(1, ...d.chartRevenue.map(x => x.val));

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Welcome back 👋</div><div className="ph-sub">Here's what's happening with LabEasy today.</div></div>
        <div className="ph-actions">
          <select className="filter-select"><option>Today</option><option>This Week</option><option>This Month</option></select>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{background:'#1a6fc420'}}>📦</div></div><div className="sc-num">{d.stats.bookings ?? 0}</div><div className="sc-label">Total Lab Bookings</div></div>
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{background:'#0d948820'}}>💰</div></div><div className="sc-num">{rupee(d.stats.revenue)}</div><div className="sc-label">Revenue (Successful)</div></div>
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{background:'#7c3aed20'}}>👥</div></div><div className="sc-num">{d.stats.users ?? 0}</div><div className="sc-label">Registered Users</div></div>
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{background:'#d9770620'}}>📄</div></div><div className="sc-num">{d.stats.pendingReports ?? 0}</div><div className="sc-label">Pending Reports</div></div>
      </div>

      <div className="two-col" style={{marginBottom:'20px'}}>
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Bookings by Weekday</div></div>
          <div className="card-body">
            <div className="chart-bar-row">
              {d.chartBookings.map((x,i)=>(
                <div key={i} title={`${x.label}: ${x.val} bookings`} className="chart-bar" style={{height:`${(x.val/maxB)*100}%`,background:BAR_COLORS[i%BAR_COLORS.length]}}/>
              ))}
            </div>
            <div className="chart-x">{d.chartBookings.map((x,i)=><span key={i}>{x.label}</span>)}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">💰 Monthly Revenue ({currencySymbol()} thousands)</div></div>
          <div className="card-body">
            <div className="chart-bar-row">
              {d.chartRevenue.map((x,i)=>(
                <div key={i} className="chart-bar" style={{height:`${(x.val/maxR)*100}%`,background:i===new Date().getMonth()?'#0d9488':'#d0e6f8'}}/>
              ))}
            </div>
            <div className="chart-x">{d.chartRevenue.map((x,i)=><span key={i}>{x.label}</span>)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">📋 Recent Bookings</div></div>
        <div className="card-body" style={{padding:0}}>
          <table className="data-table">
            <thead><tr><th>Booking</th><th>Patient</th><th>Type</th><th>Status</th><th>Amount</th></tr></thead>
            <tbody>{d.recentBookings.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text-3)',padding:'28px'}}>No bookings yet</td></tr>
            ) : d.recentBookings.map(b=>(
              <tr key={b.id}>
                <td><span style={{fontFamily:'Lato',fontWeight:700,color:'var(--accent)'}}>{b.ref}</span></td>
                <td>{b.user}</td>
                <td><span className={`badge ${b.type==='home'?'badge-blue':'badge-purple'}`}>{b.type==='home'?'Home':'Lab Visit'}</span></td>
                <td><span className={`badge badge-${b.status==='completed'?'green':b.status==='cancelled'?'red':b.status==='processing'?'yellow':'blue'}`}>{b.status.replace('_',' ')}</span></td>
                <td style={{fontWeight:700}}>{rupee(b.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
