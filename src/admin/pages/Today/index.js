import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { labBookingService, STATUS_LABELS, stageProgress, todayISO } from '../../../services/labBookingService.js';
import { formatCurrency } from '../../../utils/helpers.js';
import { EmptyState } from '../../components/Shared';
import './Today.css';

/**
 * TODAY — every booking scheduled for one day, across every laboratory.
 *
 * The admin's monitoring board: grouped by lab, each row showing where that
 * booking has got to, who is on it, whether it is paid and whether the report
 * is out. One glance answers "what is happening today".
 */

const STAGE_TONE = {
  booked: 'gray',
  payment_pending: 'yellow',
  payment_completed: 'green',
  sent_for_testing: 'blue',
  testing_in_progress: 'purple',
  testing_completed: 'blue',
  report_pending: 'yellow',
  report_uploaded: 'blue',
  completed: 'green',
  cancelled: 'red',
};

const SUMMARY = [
  { key: 'total', label: 'Bookings today', icon: '📅', tint: '#0ea5e920' },
  { key: 'awaiting_payment', label: 'Awaiting payment', icon: '💰', tint: '#d9770620' },
  { key: 'in_testing', label: 'In testing', icon: '🧪', tint: '#7c3aed20' },
  { key: 'reports_due', label: 'Reports due', icon: '📄', tint: '#0d948820' },
  { key: 'completed', label: 'Completed', icon: '✅', tint: '#05966920' },
];

const Today = () => {
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [labFilter, setLabFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await labBookingService.listAllForDate(date));
    } catch (err) {
      setError(err?.message || 'Could not load today’s bookings.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const labs = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const id = r.lab_id || 'unassigned';
      if (!map.has(id)) {
        map.set(id, { id, name: r.labs?.name || 'Unassigned / online', ref: r.labs?.lab_ref || '', rows: [] });
      }
      map.get(id).rows.push(r);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const visible = useMemo(
    () =>
      labs
        .filter((l) => labFilter === 'all' || l.id === labFilter)
        .map((l) => ({
          ...l,
          rows: l.rows.filter((r) => stageFilter === 'all' || r.workflow_status === stageFilter),
        }))
        .filter((l) => l.rows.length),
    [labs, labFilter, stageFilter],
  );

  const stats = useMemo(() => {
    const s = { total: rows.length, awaiting_payment: 0, in_testing: 0, reports_due: 0, completed: 0 };
    rows.forEach((r) => {
      if (['booked', 'payment_pending'].includes(r.workflow_status)) s.awaiting_payment += 1;
      if (['sent_for_testing', 'testing_in_progress'].includes(r.workflow_status)) s.in_testing += 1;
      if (['testing_completed', 'report_pending'].includes(r.workflow_status)) s.reports_due += 1;
      if (r.workflow_status === 'completed') s.completed += 1;
    });
    return s;
  }, [rows]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="ph-title">Today</h1>
          <p className="ph-sub">Every booking scheduled for this day, across all laboratories.</p>
        </div>
        <div className="ph-actions">
          <input
            type="date"
            className="form-input today-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
          />
          <button className="btn btn-secondary" onClick={() => setDate(todayISO())}>Today</button>
          <button className="btn btn-primary" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-red">{error}</div>}

      <div className="stat-row today-stats">
        {SUMMARY.map((s) => (
          <div className="stat-card" key={s.key}>
            <div className="sc-top"><div className="sc-icon" style={{ background: s.tint }}>{s.icon}</div></div>
            <div className="sc-num">{stats[s.key]}</div>
            <div className="sc-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-row">
        <select className="filter-select" value={labFilter} onChange={(e) => setLabFilter(e.target.value)} aria-label="Laboratory">
          <option value="all">All laboratories ({labs.length})</option>
          {labs.map((l) => (
            <option key={l.id} value={l.id}>{l.name} ({l.rows.length})</option>
          ))}
        </select>
        <select className="filter-select" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} aria-label="Stage">
          <option value="all">All stages</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card"><div className="card-body">Loading today…</div></div>
      ) : !visible.length ? (
        <EmptyState icon="📅" message={`No bookings scheduled for ${date}.`} />
      ) : (
        visible.map((labGroup) => (
          <div className="card today-lab" key={labGroup.id}>
            <div className="card-header">
              <div>
                <div className="card-title">{labGroup.name}</div>
                {labGroup.ref && <div className="today-lab-ref">{labGroup.ref}</div>}
              </div>
              <span className="badge badge-blue">{labGroup.rows.length} booking{labGroup.rows.length === 1 ? '' : 's'}</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Patient</th>
                    <th>Test</th>
                    <th>Time</th>
                    <th>Payment</th>
                    <th>Stage</th>
                    <th>Report</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {labGroup.rows.map((b) => {
                    const items = Array.isArray(b.items) ? b.items : [];
                    const reportOut = ['report_uploaded', 'completed'].includes(b.workflow_status);
                    return (
                      <tr key={b.id}>
                        <td><span className="today-ref">{b.booking_ref || b.id.slice(0, 8)}</span></td>
                        <td>
                          <div className="today-patient">{b.patient_name || 'Walk-in'}</div>
                          <div className="today-meta">{b.patient_phone || '—'}</div>
                        </td>
                        <td className="today-tests">
                          {items.map((i) => i.name || i.title).filter(Boolean).join(', ') || '—'}
                          <div className="today-meta">{formatCurrency(b.total_amount)}</div>
                        </td>
                        <td>{b.scheduled_time || '—'}</td>
                        <td>
                          <span className={`badge badge-${b.payment_status === 'paid' ? 'green' : b.payment_status === 'partial' ? 'yellow' : 'red'}`}>
                            {b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${STAGE_TONE[b.workflow_status] || 'gray'}`}>
                            {STATUS_LABELS[b.workflow_status] || b.workflow_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${reportOut ? 'green' : 'gray'}`}>
                            {reportOut ? 'Uploaded' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <div className="prog-bar today-prog">
                            <div className="prog-fill" style={{ width: `${stageProgress(b.workflow_status)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  );
};

export default Today;
