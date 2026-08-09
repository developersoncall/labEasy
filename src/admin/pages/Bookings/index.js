import React, { useState, useEffect } from 'react';
import { bookingsData, reportsData, patientContact, exportCSV } from '../../adminData';
import { formatCurrency, whatsappNumber } from '../../../utils/helpers.js';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { Toast, Modal, ConfirmModal, Field, Badge, EmptyState } from '../../components/Shared';
import UploadReportModal from '../../components/UploadReportModal';
import './Bookings.css';

const STATUSES = ['all','pending','confirmed','sample_collected','processing','report_ready','completed','cancelled'];
const STATUS_LABELS = {all:'All',pending:'Pending',confirmed:'Confirmed',sample_collected:'Sample Collected',processing:'Processing',report_ready:'Report Ready',completed:'Completed',cancelled:'Cancelled'};

// The booking lifecycle, in order. `advance` moves a booking to the next step.
const PIPELINE = ['pending','confirmed','sample_collected','processing','report_ready','completed'];
const NEXT_LABEL = { confirmed:'✓ Confirm', sample_collected:'🧪 Sample Collected', processing:'⚙ Processing', report_ready:'📤 Deliver Report', completed:'📤 Deliver Report' };

const ViewBooking = ({ booking, onClose, onEdit }) => (
  <Modal size="md" onClose={onClose}>
    <div className="modal-header">
      <div>
        <div className="modal-user-name">Booking {booking.ref}</div>
        <div className="modal-user-meta">{booking.user} · {booking.date}</div>
      </div>
      <button className="modal-close" onClick={onClose}>✕</button>
    </div>
    <div className="modal-body">
      <div className="booking-view-grid">
        {[
          ['👤','Patient',booking.user],
          ['🔬','Test / Package',booking.test],
          ['📅','Date',booking.date],
          ['⏰','Slot',booking.slot],
          ['🏠','Type',booking.type==='home'?'🏠 Home Collection':'🏥 Lab Visit'],
          ['💳','Amount', formatCurrency(booking.amount)],
          ['👷','Phlebotomist',booking.phlebotomist||'—'],
          ['📍','Address',booking.address||'Lab Visit'],
        ].map(([icon,label,value])=>(
          <div key={label} className="info-row">
            <div className="info-icon">{icon}</div>
            <div className="info-label">{label}</div>
            <div className="info-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="booking-status-row">
        <span>Status:</span> <Badge status={booking.status} />
      </div>
      {booking.notes && <div className="booking-notes"><strong>Notes:</strong> {booking.notes}</div>}
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary" onClick={onClose}>Close</button>
      <button className="btn btn-primary" onClick={()=>{onClose();onEdit(booking);}}>✏️ Edit Status</button>
    </div>
  </Modal>
);

const EditBookingModal = ({ booking, onClose, onSave }) => {
  const [form, setForm] = useState({...booking});
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    setSaving(true); await new Promise(r=>setTimeout(r,700)); setSaving(false); onSave(form);
  };
  return (
    <Modal size="md" onClose={onClose}>
      <div className="modal-header">
        <div><div className="modal-user-name">Edit Booking — {booking.ref}</div><div className="modal-user-meta">{booking.user}</div></div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className="form-grid form-grid-2">
          <Field label="Status">
            <select className="form-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
              {['pending','confirmed','sample_collected','processing','report_ready','completed','cancelled'].map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Slot Time">
            <input className="form-input" value={form.slot} onChange={e=>setForm(p=>({...p,slot:e.target.value}))} />
          </Field>
          <Field label="Booking Date">
            <input className="form-input" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} />
          </Field>
          <Field label="Phlebotomist">
            <input className="form-input" value={form.phlebotomist||''} onChange={e=>setForm(p=>({...p,phlebotomist:e.target.value}))} placeholder="Assign phlebotomist" />
          </Field>
        </div>
        <Field label="Admin Notes">
          <textarea className="form-textarea" rows={3} value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Internal notes…" />
        </Field>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handle} disabled={saving}>{saving?'⏳ Saving…':'✅ Save Changes'}</button>
      </div>
    </Modal>
  );
};

const Bookings = ({ onChange }) => {
  const { brandName } = useSettings();
  const [bookings, setBookings] = useState([]);
  const [tabStatus, setTabStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [typeF, setTypeF] = useState('all');
  const [view, setView] = useState(null);
  const [edit, setEdit] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [uploadFor, setUploadFor] = useState(null); // { booking, report|null }
  const [reportsByBooking, setReportsByBooking] = useState({}); // bookingId -> report
  const [toast, setToast] = useState(null);
  const toast_ = (msg, type='success') => setToast({msg,type});

  // Build a bookingId -> report map. Surface load errors (do NOT swallow them):
  // a silent failure here makes every booking look report-less and show "Upload".
  const loadReports = () => reportsData.load()
    .then(rows => {
      const map = {};
      rows.forEach(r => { if (r.file && r.bookingRawId) map[r.bookingRawId] = r; });
      setReportsByBooking(map);
    })
    .catch(e => toast_(e.message || 'Could not load reports', 'error'));

  useEffect(() => {
    bookingsData.load().then(setBookings).catch(e => toast_(e.message || 'Failed to load bookings', 'error'));
    loadReports();
  }, []);

  const reportFor = (b) => reportsByBooking[b.id];
  const hasReport = (b) => !!reportsByBooking[b.id];

  // Open the stored report PDF via a short-lived signed URL.
  const viewReport = async (b) => {
    const r = reportFor(b);
    if (!r?.file) return;
    try {
      const url = await reportsData.downloadUrl(r.file);
      if (url) window.open(url, '_blank', 'noopener');
      else toast_('Could not open the report', 'error');
    } catch (e) { toast_(e.message || 'Could not open the report', 'error'); }
  };

  const filtered = bookings.filter(b=>{
    if (tabStatus!=='all' && b.status!==tabStatus) return false;
    if (typeF!=='all' && b.type!==typeF) return false;
    if (search && ![b.user,b.test,b.ref,String(b.id)].some(f=>f.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const handleSave = async updated => {
    try {
      await bookingsData.setStatus(updated.id, updated.status);
      const saved = await bookingsData.assign(updated.id, updated.phlebotomist || '');
      setBookings(prev=>prev.map(b=>b.id===updated.id?{...b,...saved,notes:updated.notes}:b));
      setEdit(null); toast_('Booking updated'); onChange?.();
    } catch (e) { toast_(e.message || 'Update failed','error'); }
  };

  const handleCancel = async id => {
    try {
      await bookingsData.setStatus(id, 'cancelled');
      setBookings(prev=>prev.map(b=>b.id===id?{...b,status:'cancelled'}:b));
      setCancel(null); toast_('Booking cancelled','error'); onChange?.();
    } catch (e) { toast_(e.message || 'Cancel failed','error'); }
  };

  // Advance one stage. The "Report Ready" step is special: it opens the
  // upload dialog (a report is required) and completing the upload marks the
  // booking Completed automatically — there is no separate Complete click.
  const advance = async b => {
    const idx = PIPELINE.indexOf(b.status);
    const next = PIPELINE[idx + 1];
    if (!next) return;
    if (next === 'report_ready' || next === 'completed') {
      // Reaching "Report Ready"/"Completed" requires a report — open the
      // upload dialog; uploading marks the booking completed automatically.
      setUploadFor({ booking: b, report: null });
      return;
    }
    try {
      await bookingsData.setStatus(b.id, next);
      setBookings(prev=>prev.map(x=>x.id===b.id?{...x,status:next}:x));
      toast_(next === 'confirmed' ? 'Booking confirmed — patient notified' : `Marked as ${STATUS_LABELS[next]}`);
      onChange?.();
    } catch (e) { toast_(e.message || 'Update failed','error'); }
  };

  // Upload a new report — this also marks the booking Completed automatically
  // (no separate Complete step). Or replace the file on an existing report.
  const handleUploadReport = async (form) => {
    const { booking, report } = uploadFor;
    try {
      if (report) {
        const saved = await reportsData.replace(report.id, { ...form, userId: booking.userId });
        setReportsByBooking(prev => ({ ...prev, [booking.id]: { ...saved, bookingRawId: booking.id } }));
        toast_('Report updated');
      } else {
        const saved = await reportsData.create(form);
        await bookingsData.setStatus(booking.id, 'completed');
        setReportsByBooking(prev => ({ ...prev, [booking.id]: { ...saved, bookingRawId: booking.id } }));
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b));
        toast_('Report uploaded — booking completed & patient notified');
      }
      setUploadFor(null);
      // Re-read from the server so the persisted link (not just local state)
      // drives View/Edit vs Upload — this is what makes it stick after refresh.
      await loadReports();
      onChange?.();
    } catch (e) { toast_(e.message || 'Upload failed', 'error'); }
  };

  // Mark the booking completed after sending (no file → patient just sees the
  // "completed" status, no download). Shared by the email + WhatsApp paths.
  const completeAfterSend = async (booking, msg) => {
    await bookingsData.setStatus(booking.id, 'completed');
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b));
    setUploadFor(null);
    toast_(msg);
    onChange?.();
  };

  // Send the report by email (opens the mail client) → complete.
  const handleEmailReport = async (form) => {
    const { booking } = uploadFor;
    try {
      const { email } = await patientContact(booking.userId);
      if (!email) { toast_('No email on file for this patient', 'error'); return; }
      const subject = encodeURIComponent(`Your report from ${brandName}`);
      const body = encodeURIComponent(`Hi ${booking.user},\n\nYour report for "${form.test || booking.test}" is ready.\n\n— ${brandName}`);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      await completeAfterSend(booking, 'Report emailed — booking completed');
    } catch (e) { toast_(e.message || 'Could not send email', 'error'); }
  };

  // Share the report on WhatsApp (opens wa.me) → complete.
  const handleWhatsAppReport = async (form) => {
    const { booking } = uploadFor;
    try {
      const num = whatsappNumber(booking.patientPhone);
      if (!num) { toast_('No phone number on file for this patient', 'error'); return; }
      const text = encodeURIComponent(`Hi ${booking.user}, your report for "${form.test || booking.test}" from ${brandName} is ready.`);
      window.open(`https://wa.me/${num}?text=${text}`, '_blank', 'noopener');
      await completeAfterSend(booking, 'Shared on WhatsApp — booking completed');
    } catch (e) { toast_(e.message || 'Could not open WhatsApp', 'error'); }
  };

  const handleExport = () => {
    const headers = ['Booking ID','Patient','Test/Package','Type','Date','Slot','Amount','Status','Phlebotomist'];
    const rows = filtered.map(b => [b.ref, b.user, b.test, b.type, b.date, b.slot, b.amount, b.status, b.phlebotomist]);
    exportCSV('medis-bookings.csv', headers, rows);
    toast_('Exported CSV');
  };

  const stats = {
    total: bookings.length,
    home: bookings.filter(b=>b.type==='home').length,
    lab: bookings.filter(b=>b.type==='lab').length,
    cancelled: bookings.filter(b=>b.status==='cancelled').length,
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Manage Bookings</div><div className="ph-sub">{filtered.length} shown · {bookings.length} total</div></div>
        <div className="ph-actions"><button className="btn btn-secondary" onClick={handleExport}>⬇ Export</button></div>
      </div>

      <div className="stat-row">
        {[
          {i:'📋',c:'#1a6fc4',l:'Total Bookings',n:stats.total},
          {i:'🏠',c:'#0d9488',l:'Home Collections',n:stats.home},
          {i:'🏥',c:'#7c3aed',l:'Lab Visits',n:stats.lab},
          {i:'❌',c:'#dc2626',l:'Cancelled',n:stats.cancelled},
        ].map((s,i)=>(
          <div className="stat-card" key={i}>
            <div className="sc-top"><div className="sc-icon" style={{background:s.c+'20'}}>{s.i}</div></div>
            <div className="sc-num">{s.n}</div><div className="sc-label">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="booking-status-tabs">
        {STATUSES.map(s=>(
          <button key={s} className={`status-tab${tabStatus===s?' active':''}`} onClick={()=>setTabStatus(s)}>
            {STATUS_LABELS[s]}
            <span className="status-tab-count">{s==='all'?bookings.length:bookings.filter(b=>b.status===s).length}</span>
          </button>
        ))}
      </div>

      <div className="filter-row">
        <div className="search-input">
          <span>🔍</span>
          <input placeholder="Search by name, test or booking ID…" value={search} onChange={e=>setSearch(e.target.value)} />
          {search && <button className="clear-search" onClick={()=>setSearch('')}>✕</button>}
        </div>
        <select className="filter-select" value={typeF} onChange={e=>setTypeF(e.target.value)}>
          <option value="all">All Types</option>
          <option value="home">🏠 Home Collection</option>
          <option value="lab">🏥 Lab Visit</option>
        </select>
      </div>

      {filtered.length===0 ? <EmptyState icon="📋" message="No bookings found" /> : (
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Booking ID</th><th>Patient</th><th>Test / Package</th><th>Type</th><th>Date & Slot</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(b=>(
              <tr key={b.id}>
                <td><span className="bid">{b.ref}</span></td>
                <td><div className="user-name">{b.user}</div></td>
                <td>{b.test}</td>
                <td><span className={`type-badge type-${b.type}`}>{b.type==='home'?'🏠 Home':'🏥 Lab'}</span></td>
                <td><div className="user-name">{b.date}</div><div className="user-id">{b.slot}</div></td>
                <td><span className="price-val">{formatCurrency(b.amount)}</span></td>
                <td><Badge status={b.status} /></td>
                <td>
                  <div className="actions">
                    {hasReport(b) ? (
                      /* Report uploaded → View + Edit only (no upload, no complete) */
                      <>
                        <button className="btn btn-sm btn-secondary" title="View report" onClick={()=>viewReport(b)}>👁 Report</button>
                        <button className="btn btn-sm btn-secondary" title="Edit / replace report" onClick={()=>setUploadFor({ booking: b, report: reportFor(b) })}>✏️ Edit Report</button>
                      </>
                    ) : b.status==='cancelled' ? null
                      : PIPELINE.indexOf(b.status) >= 0 && PIPELINE.indexOf(b.status) < PIPELINE.length-1 ? (
                        /* In progress → one button to the next stage. At "Report Ready" it opens upload → auto-completes. */
                        <button className="btn btn-sm btn-primary" title="Next step" onClick={()=>advance(b)}>
                          {NEXT_LABEL[PIPELINE[PIPELINE.indexOf(b.status)+1]]}
                        </button>
                      ) : (
                        /* Completed with no downloadable report → allow delivering one */
                        <button className="btn btn-sm btn-primary" title="Deliver report" onClick={()=>setUploadFor({ booking: b, report: null })}>📤 Deliver Report</button>
                      )}

                    <button className="btn btn-secondary btn-sm btn-icon" title="View booking" onClick={()=>setView(b)}>👁</button>
                    <button className="btn btn-secondary btn-sm btn-icon" title="Edit booking" onClick={()=>setEdit(b)}>✏️</button>
                    {b.status!=='cancelled' && b.status!=='completed' && !hasReport(b) && (
                      <button className="btn btn-sm btn-danger" title={b.status==='pending'?'Reject request':'Cancel'} onClick={()=>setCancel(b)}>
                        {b.status==='pending'?'Reject':'Cancel'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {uploadFor && <UploadReportModal booking={uploadFor.booking} existing={uploadFor.report} onClose={()=>setUploadFor(null)} onUpload={handleUploadReport} onEmail={handleEmailReport} onWhatsApp={handleWhatsAppReport} />}
      {view && <ViewBooking booking={view} onClose={()=>setView(null)} onEdit={b=>{setView(null);setEdit(b);}} />}
      {edit && <EditBookingModal booking={edit} onClose={()=>setEdit(null)} onSave={handleSave} />}
      {cancel && <ConfirmModal title="Cancel Booking?" message={`Cancel booking ${cancel.id} for ${cancel.user}? The patient will be notified.`} confirmLabel="Yes, Cancel" danger onConfirm={()=>handleCancel(cancel.id)} onClose={()=>setCancel(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );
};
export default Bookings;
