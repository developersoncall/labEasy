import React, { useState, useEffect } from 'react';
import { bookingsData, appointmentsData, exportCSV } from '../../adminData';
import { formatCurrency } from '../../../utils/helpers.js';
import { Toast, Badge, EmptyState } from '../../components/Shared';

/**
 * Cash collection — payments are cash, so this simply lets the admin mark
 * each booking / appointment's payment as collected. Fully dynamic:
 * reads lab bookings + doctor appointments and writes back the collected flag.
 */
const Payments = () => {
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const toast_ = (msg, type = 'success') => setToast({ msg, type });

  const load = async () => {
    try {
      const [bk, ap] = await Promise.all([bookingsData.load(), appointmentsData.load()]);
      const bookingRows = bk
        .filter(b => b.status !== 'cancelled')
        .map(b => ({ key: `b-${b.id}`, source: 'lab', id: b.id, ref: b.ref, patient: b.user, item: b.test, amount: b.amount, date: b.date, paid: b.paid }));
      const apptRows = ap
        .filter(a => a.status !== 'cancelled')
        .map(a => ({ key: `a-${a.id}`, source: 'doctor', id: a.id, ref: a.ref, patient: a.user, item: `${a.doctor}${a.specialty ? ` · ${a.specialty}` : ''}`, amount: a.fee, date: a.date, paid: a.paid }));
      setRows([...bookingRows, ...apptRows]);
    } catch (e) {
      toast_(e.message || 'Failed to load payments', 'error');
    }
  };
  useEffect(() => { load(); }, []);

  const collect = async (row, collected) => {
    try {
      if (row.source === 'lab') await bookingsData.collectPayment(row.id, collected);
      else await appointmentsData.collectPayment(row.id, collected);
      setRows(prev => prev.map(r => r.key === row.key ? { ...r, paid: collected } : r));
      toast_(collected ? 'Payment marked as collected' : 'Marked as pending');
    } catch (e) { toast_(e.message || 'Update failed', 'error'); }
  };

  const filtered = rows.filter(r => {
    if (tab === 'collected' && !r.paid) return false;
    if (tab === 'pending' && r.paid) return false;
    if (search && ![r.patient, r.item, r.ref].some(f => f?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const collectedTotal = rows.filter(r => r.paid).reduce((a, r) => a + r.amount, 0);
  const pendingTotal = rows.filter(r => !r.paid).reduce((a, r) => a + r.amount, 0);

  const handleExport = () => {
    const headers = ['Ref', 'Patient', 'For', 'Type', 'Date', 'Amount', 'Payment'];
    const data = filtered.map(r => [r.ref, r.patient, r.item, r.source === 'lab' ? 'Lab' : 'Doctor', r.date, r.amount, r.paid ? 'Collected' : 'Pending']);
    exportCSV('medis-cash-collection.csv', headers, data);
    toast_('Exported CSV');
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Cash Collection</div><div className="ph-sub">Mark cash as collected for each booking &amp; appointment</div></div>
        <div className="ph-actions"><button className="btn btn-secondary" onClick={handleExport}>⬇ Export</button></div>
      </div>

      <div className="stat-row">
        {[
          { i: '💵', c: '#0d9488', l: 'Collected', n: formatCurrency(collectedTotal) },
          { i: '⏳', c: '#d97706', l: 'Pending Collection', n: formatCurrency(pendingTotal) },
          { i: '✅', c: '#1a6fc4', l: 'Collected Count', n: rows.filter(r => r.paid).length },
          { i: '🧾', c: '#7c3aed', l: 'Total Orders', n: rows.length },
        ].map((s, i) => (
          <div className="stat-card" key={i}><div className="sc-top"><div className="sc-icon" style={{ background: s.c + '20' }}>{s.i}</div></div><div className="sc-num">{s.n}</div><div className="sc-label">{s.l}</div></div>
        ))}
      </div>

      <div className="tabs-bar">
        {[['pending', `Pending (${rows.filter(r => !r.paid).length})`], ['collected', `Collected (${rows.filter(r => r.paid).length})`], ['all', `All (${rows.length})`]].map(([k, l]) => (
          <button key={k} className={`tab-pill${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="filter-row">
        <div className="search-input">
          <span>🔍</span>
          <input placeholder="Search by patient, item or ref…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState icon="💵" message="Nothing here" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Ref</th><th>Patient</th><th>For</th><th>Type</th><th>Date</th><th>Amount</th><th>Payment</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.key}>
                  <td><span className="bid">{r.ref}</span></td>
                  <td><div className="user-name">{r.patient}</div></td>
                  <td>{r.item}</td>
                  <td><span className={`type-badge type-${r.source === 'lab' ? 'lab' : 'home'}`}>{r.source === 'lab' ? '🧪 Lab' : '🩺 Doctor'}</span></td>
                  <td className="date-cell">{r.date}</td>
                  <td><span className="price-val">{formatCurrency(r.amount)}</span></td>
                  <td><Badge status={r.paid ? 'success' : 'pending'} /></td>
                  <td>
                    {r.paid ? (
                      <button className="btn btn-sm btn-secondary" onClick={() => collect(r, false)}>↩ Mark Pending</button>
                    ) : (
                      <button className="btn btn-sm btn-primary" onClick={() => collect(r, true)}>💵 Collect Cash</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
};

export default Payments;
