import React, { useState, useEffect } from 'react';
import { appointmentsData, prescriptionsData, patientContact, exportCSV } from '../../adminData';
import { formatCurrency, whatsappNumber } from '../../../utils/helpers.js';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { Avatar, Toast, Modal, ConfirmModal, Badge, EmptyState } from '../../components/Shared';
import UploadPrescriptionModal from '../../components/UploadPrescriptionModal.jsx';

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
const LABELS = { all: 'All', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

const ViewAppointment = ({ appt, onClose }) => (
  <Modal size="md" onClose={onClose}>
    <div className="modal-header">
      <div className="modal-user-hero">
        <Avatar name={appt.user} size={48} />
        <div>
          <div className="modal-user-name">{appt.ref} · {appt.user}</div>
          <div className="modal-user-meta">{appt.doctor} · {appt.specialty}</div>
        </div>
        <Badge status={appt.status} />
      </div>
      <button className="modal-close" onClick={onClose}>✕</button>
    </div>
    <div className="modal-body">
      <div className="view-grid">
        {[
          ['🩺', 'Doctor', appt.doctor],
          ['💊', 'Specialty', appt.specialty],
          ['📅', 'Date', appt.date],
          ['⏰', 'Time', appt.time],
          ['💻', 'Type', appt.type === 'video' ? 'Video consult' : 'In-clinic'],
          ['💳', 'Fee', formatCurrency(appt.fee)],
          ['🎂', 'Patient Age', appt.patientAge || '—'],
          ['📞', 'Phone', appt.patientPhone || '—'],
        ].map(([i, l, v]) => (
          <div key={l} className="info-row"><div className="info-icon">{i}</div><div className="info-label">{l}</div><div className="info-value">{v || '—'}</div></div>
        ))}
      </div>
      {appt.symptoms && <div className="notes-view" style={{ marginTop: 16 }}><strong>Symptoms / notes:</strong> {appt.symptoms}</div>}
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary" onClick={onClose}>Close</button>
    </div>
  </Modal>
);

const Appointments = ({ onChange }) => {
  const { brandName } = useSettings();
  const [appts, setAppts] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [typeF, setTypeF] = useState('all');
  const [view, setView] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [presFor, setPresFor] = useState(null);   // { appt, prescription }
  const [prescByAppt, setPrescByAppt] = useState({}); // appointmentId -> prescription
  const [toast, setToast] = useState(null);
  const toast_ = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => {
    Promise.all([appointmentsData.load(), prescriptionsData.load()])
      .then(([ap, pr]) => {
        setAppts(ap);
        const map = {};
        pr.forEach(p => { if (p.appointmentId) map[p.appointmentId] = p; });
        setPrescByAppt(map);
      })
      .catch(e => toast_(e.message || 'Failed to load appointments', 'error'));
  }, []);

  const hasPrescription = (a) => !!prescByAppt[a.id];

  const viewPrescription = async (a) => {
    const p = prescByAppt[a.id];
    if (!p?.file) return;
    try {
      const url = await prescriptionsData.downloadUrl(p.file);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (e) { toast_(e.message || 'Could not open prescription', 'error'); }
  };

  const handleUploadPrescription = async ({ diagnosis, notes, file }) => {
    const { appt, prescription } = presFor;
    try {
      if (prescription) {
        const updated = await prescriptionsData.replace(prescription.id, { diagnosis, notes, file, userId: appt.userId });
        setPrescByAppt(m => ({ ...m, [appt.id]: updated }));
        toast_('Prescription updated');
      } else {
        const created = await prescriptionsData.create({ appointmentId: appt.id, userId: appt.userId, doctorId: appt.doctorId, diagnosis, notes, file });
        setPrescByAppt(m => ({ ...m, [appt.id]: created }));
        // Uploading a prescription completes the consultation (mirrors reports).
        if (appt.status !== 'completed') {
          await appointmentsData.setStatus(appt.id, 'completed');
          setAppts(prev => prev.map(x => x.id === appt.id ? { ...x, status: 'completed' } : x));
        }
        toast_('Prescription uploaded — appointment completed');
      }
      setPresFor(null);
      onChange?.();
    } catch (e) { toast_(e.message || 'Upload failed', 'error'); }
  };

  // Complete the appointment after sending (no file → patient sees "completed"
  // only, no download). Shared by the email + WhatsApp paths.
  const completeApptAfterSend = async (appt, msg) => {
    if (appt.status !== 'completed') {
      await appointmentsData.setStatus(appt.id, 'completed');
      setAppts(prev => prev.map(x => x.id === appt.id ? { ...x, status: 'completed' } : x));
    }
    setPresFor(null);
    toast_(msg);
    onChange?.();
  };

  const handleEmailPrescription = async ({ test }) => {
    const { appt } = presFor;
    try {
      const { email } = await patientContact(appt.userId);
      if (!email) { toast_('No email on file for this patient', 'error'); return; }
      const subject = encodeURIComponent(`Your prescription from ${brandName}`);
      const body = encodeURIComponent(`Hi ${appt.user},\n\nYour prescription from your consultation with ${appt.doctor} is ready.\n\n— ${brandName}`);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      await completeApptAfterSend(appt, 'Prescription emailed — appointment completed');
    } catch (e) { toast_(e.message || 'Could not send email', 'error'); }
  };

  const handleWhatsAppPrescription = async () => {
    const { appt } = presFor;
    try {
      const num = whatsappNumber(appt.patientPhone);
      if (!num) { toast_('No phone number on file for this patient', 'error'); return; }
      const text = encodeURIComponent(`Hi ${appt.user}, your prescription from your consultation with ${appt.doctor} at ${brandName} is ready.`);
      window.open(`https://wa.me/${num}?text=${text}`, '_blank', 'noopener');
      await completeApptAfterSend(appt, 'Shared on WhatsApp — appointment completed');
    } catch (e) { toast_(e.message || 'Could not open WhatsApp', 'error'); }
  };

  const filtered = appts.filter(a => {
    if (tab !== 'all' && a.status !== tab) return false;
    if (typeF !== 'all' && a.type !== typeF) return false;
    if (search && ![a.user, a.doctor, a.ref].some(f => f?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const setStatus = async (a, status) => {
    try {
      await appointmentsData.setStatus(a.id, status);
      setAppts(prev => prev.map(x => x.id === a.id ? { ...x, status } : x));
      setCancel(null);
      toast_(status === 'confirmed' ? 'Appointment confirmed — patient notified' : `Marked as ${LABELS[status]}`, status === 'cancelled' ? 'error' : 'success');
      onChange?.();
    } catch (e) { toast_(e.message || 'Update failed', 'error'); }
  };

  const handleExport = () => {
    const headers = ['Ref', 'Patient', 'Doctor', 'Specialty', 'Date', 'Time', 'Type', 'Fee', 'Status'];
    const rows = filtered.map(a => [a.ref, a.user, a.doctor, a.specialty, a.date, a.time, a.type, a.fee, a.status]);
    exportCSV('medis-appointments.csv', headers, rows);
    toast_('Exported CSV');
  };

  const stats = {
    total: appts.length,
    pending: appts.filter(a => a.status === 'pending').length,
    confirmed: appts.filter(a => a.status === 'confirmed').length,
    video: appts.filter(a => a.type === 'video').length,
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Doctor Appointments</div><div className="ph-sub">{filtered.length} shown · {appts.length} total</div></div>
        <div className="ph-actions"><button className="btn btn-secondary" onClick={handleExport}>⬇ Export</button></div>
      </div>

      <div className="stat-row">
        {[
          { i: '🩺', c: '#1a6fc4', l: 'Total Appointments', n: stats.total },
          { i: '⏳', c: '#d97706', l: 'Pending', n: stats.pending },
          { i: '✅', c: '#0d9488', l: 'Confirmed', n: stats.confirmed },
          { i: '💻', c: '#7c3aed', l: 'Video Consults', n: stats.video },
        ].map((s, i) => (
          <div className="stat-card" key={i}><div className="sc-top"><div className="sc-icon" style={{ background: s.c + '20' }}>{s.i}</div></div><div className="sc-num">{s.n}</div><div className="sc-label">{s.l}</div></div>
        ))}
      </div>

      <div className="booking-status-tabs">
        {STATUSES.map(s => (
          <button key={s} className={`status-tab${tab === s ? ' active' : ''}`} onClick={() => setTab(s)}>
            {LABELS[s]}
            <span className="status-tab-count">{s === 'all' ? appts.length : appts.filter(a => a.status === s).length}</span>
          </button>
        ))}
      </div>

      <div className="filter-row">
        <div className="search-input">
          <span>🔍</span>
          <input placeholder="Search by patient, doctor or ref…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
        </div>
        <select className="filter-select" value={typeF} onChange={e => setTypeF(e.target.value)}>
          <option value="all">All Types</option>
          <option value="clinic">🏥 In-Clinic</option>
          <option value="video">💻 Video</option>
        </select>
      </div>

      {filtered.length === 0 ? <EmptyState icon="🩺" message="No appointments found" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Ref</th><th>Patient</th><th>Doctor</th><th>Date &amp; Time</th><th>Type</th><th>Fee</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td><span className="bid">{a.ref}</span></td>
                  <td><div className="user-name">{a.user}</div></td>
                  <td><div className="user-name">{a.doctor}</div><div className="user-id">{a.specialty}</div></td>
                  <td><div className="user-name">{a.date}</div><div className="user-id">{a.time}</div></td>
                  <td><span className={`type-badge type-${a.type === 'video' ? 'home' : 'lab'}`}>{a.type === 'video' ? '💻 Video' : '🏥 Clinic'}</span></td>
                  <td><span className="price-val">{formatCurrency(a.fee)}</span></td>
                  <td><Badge status={a.status} /></td>
                  <td>
                    <div className="actions">
                      {a.status === 'pending' && <button className="btn btn-sm btn-primary" onClick={() => setStatus(a, 'confirmed')}>✓ Confirm</button>}
                      {/* Completing a confirmed consult means delivering its prescription. */}
                      {a.status === 'confirmed' && !hasPrescription(a) && (
                        <button className="btn btn-sm btn-primary" onClick={() => setPresFor({ appt: a, prescription: null })}>💊 Deliver Prescription</button>
                      )}
                      {/* Already completed with no downloadable prescription — allow delivering one. */}
                      {a.status === 'completed' && !hasPrescription(a) && (
                        <button className="btn btn-sm btn-primary" onClick={() => setPresFor({ appt: a, prescription: null })}>💊 Deliver Prescription</button>
                      )}
                      {/* Prescription exists — view + edit, no re-upload button. */}
                      {hasPrescription(a) && (
                        <>
                          <button className="btn btn-sm btn-secondary" title="View prescription" onClick={() => viewPrescription(a)}>👁 Prescription</button>
                          <button className="btn btn-sm btn-secondary" title="Edit prescription" onClick={() => setPresFor({ appt: a, prescription: prescByAppt[a.id] })}>✏️ Edit</button>
                        </>
                      )}
                      <button className="btn btn-secondary btn-sm btn-icon" title="View" onClick={() => setView(a)}>👁</button>
                      {a.status !== 'cancelled' && a.status !== 'completed' && !hasPrescription(a) && (
                        <button className="btn btn-sm btn-danger" onClick={() => setCancel(a)}>{a.status === 'pending' ? 'Reject' : 'Cancel'}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view && <ViewAppointment appt={view} onClose={() => setView(null)} />}
      {presFor && (
        <UploadPrescriptionModal
          appointment={presFor.appt}
          existing={presFor.prescription}
          onClose={() => setPresFor(null)}
          onUpload={handleUploadPrescription}
          onEmail={handleEmailPrescription}
          onWhatsApp={handleWhatsAppPrescription}
        />
      )}
      {cancel && <ConfirmModal title="Cancel Appointment?" message={`Cancel ${cancel.ref} for ${cancel.user}? The patient will be notified.`} confirmLabel="Yes, Cancel" danger onConfirm={() => setStatus(cancel, 'cancelled')} onClose={() => setCancel(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
};

export default Appointments;
