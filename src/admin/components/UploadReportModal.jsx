import React, { useState, useRef } from 'react';
import { Modal, Field } from './Shared';

/**
 * Deliver a report against a lab booking. Opens on a chooser (nothing
 * pre-selected):
 *   • Send Email  — fires the mail client + marks completed
 *   • WhatsApp    — fires WhatsApp + marks completed
 *   • Upload PDF  — reveals the file-upload UI (patient can then download)
 * The Reports page passes onUpload only, so it skips the chooser and shows the
 * upload UI directly.
 */
export default function UploadReportModal({ bookings = [], booking = null, existing = null, onClose, onUpload, onEmail, onWhatsApp }) {
  const isEdit = !!existing;
  const canSend = !!(onEmail || onWhatsApp);
  // mode: null = chooser screen · 'upload' = the file-upload form
  const [mode, setMode] = useState(canSend && !isEdit ? null : 'upload');

  const [form, setForm] = useState({
    bookingId: booking?.id || '',   // real UUID — used for the DB lookup
    patient: booking?.user || existing?.patient || '',
    test: existing?.test || booking?.test || '',
    lab: existing?.uploadedBy && existing.uploadedBy !== 'Admin Upload' ? existing.uploadedBy : '',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setErrors(e => ({ ...e, file: 'Only PDF files are allowed' })); return; }
    if (f.size > 10 * 1024 * 1024) { setErrors(e => ({ ...e, file: 'File must be under 10MB' })); return; }
    setFile(f);
    setErrors(e => ({ ...e, file: undefined }));
  };

  const onSelectBooking = (id) => {
    const b = bookings.find(x => String(x.id) === String(id));
    setForm(p => ({ ...p, bookingId: id, patient: b?.user || '', test: b?.test || '' }));
    setErrors(e => ({ ...e, bookingId: undefined }));
  };

  const payload = () => ({ bookingId: form.bookingId, patient: form.patient, test: form.test, lab: form.lab, notes: form.notes, file });

  // Chooser: Email / WhatsApp fire immediately (need a booking selected).
  const send = async (fn) => {
    if (!form.bookingId) { setErrors({ bookingId: 'Please select a booking first' }); setMode('upload'); return; }
    setSaving(true);
    try { await fn(payload()); } finally { setSaving(false); }
  };

  const handleUpload = async () => {
    const e = {};
    if (!form.bookingId) e.bookingId = 'Please select a booking';
    if (!isEdit && !file) e.file = 'Please attach the report PDF';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try { await onUpload(payload()); } finally { setSaving(false); }
  };

  const optionStyle = {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
    padding: '16px 18px', borderRadius: 14, border: '1.5px solid var(--border)',
    background: 'white', cursor: 'pointer',
  };

  return (
    <Modal size="md" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-user-name">📄 {isEdit ? 'Edit / Replace Report' : 'Deliver Report'}</div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {mode === null ? (
        /* ── Chooser — nothing selected by default ── */
        <>
          <div className="modal-body">
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16 }}>
              How would you like to deliver this report{form.patient ? ` to ${form.patient}` : ''}? This completes the booking.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onEmail && (
                <button type="button" style={optionStyle} disabled={saving} onClick={() => send(onEmail)}>
                  <span style={{ fontSize: 22 }}>✉️</span>
                  <span><span style={{ display: 'block', fontWeight: 800, color: 'var(--ink)' }}>Send by Email</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Opens your mail app to the patient's email</span></span>
                </button>
              )}
              {onWhatsApp && (
                <button type="button" style={optionStyle} disabled={saving} onClick={() => send(onWhatsApp)}>
                  <span style={{ fontSize: 22 }}>💬</span>
                  <span><span style={{ display: 'block', fontWeight: 800, color: 'var(--ink)' }}>Send on WhatsApp</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Opens WhatsApp to the patient's phone</span></span>
                </button>
              )}
              {/* Upload is intentionally the last option */}
              <button type="button" style={optionStyle} disabled={saving} onClick={() => setMode('upload')}>
                <span style={{ fontSize: 22 }}>📤</span>
                <span><span style={{ display: 'block', fontWeight: 800, color: 'var(--ink)' }}>Upload a PDF</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Patient can download the report anytime</span></span>
              </button>
            </div>
            {errors.bookingId && <div className="field-error" style={{ marginTop: 10 }}>{errors.bookingId}</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </>
      ) : (
        /* ── Upload UI ── */
        <>
          <div className="modal-body">
            <div className="form-grid form-grid-2">
              <Field label="Booking *" error={errors.bookingId}>
                {booking ? (
                  <input className="form-input" value={`${booking.ref} · ${booking.user}`} readOnly />
                ) : (
                  <select
                    className={`form-select${errors.bookingId ? ' input-error' : ''}`}
                    value={form.bookingId}
                    onChange={e => onSelectBooking(e.target.value)}
                  >
                    <option value="">Select a booking…</option>
                    {bookings.map(b => (
                      <option key={b.id} value={b.id}>{b.ref} · {b.user} · {b.test}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Patient Name" error={errors.patient}>
                <input className={`form-input${errors.patient ? ' input-error' : ''}`} value={form.patient} onChange={e => set('patient', e.target.value)} placeholder="Patient name" />
              </Field>
              <Field label="Test / Package">
                <input className="form-input" value={form.test} onChange={e => set('test', e.target.value)} placeholder="e.g. Complete Blood Count" />
              </Field>
              <Field label="Lab Partner">
                <input className="form-input" value={form.lab} onChange={e => set('lab', e.target.value)} placeholder="Lab name" />
              </Field>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <div
              className="upload-drop-zone"
              style={{ marginTop: 16, cursor: 'pointer', borderColor: errors.file ? 'var(--red)' : undefined }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
            >
              <div className="udz-icon">{file ? '✅' : '📄'}</div>
              <div className="udz-text">
                {file ? file.name : isEdit ? <>Drop a new PDF to replace, or <span className="udz-link">browse</span></> : <>Drag &amp; drop PDF or <span className="udz-link">browse</span></>}
              </div>
              <div className="udz-sub">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB · click to change`
                  : isEdit ? 'Keeps the current file unless you attach a new one' : 'PDF reports only, max 10MB'}
              </div>
            </div>
            {errors.file && <div className="field-error" style={{ marginTop: 6 }}>{errors.file}</div>}

            <Field label="Notes">
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this report…" />
            </Field>
          </div>
          <div className="modal-footer">
            {canSend && !isEdit
              ? <button className="btn btn-secondary" onClick={() => setMode(null)} disabled={saving}>← Back</button>
              : <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>}
            <button className="btn btn-primary" onClick={handleUpload} disabled={saving}>{saving ? '⏳ Saving…' : isEdit ? '💾 Save Report' : '📤 Upload & Complete'}</button>
          </div>
        </>
      )}
    </Modal>
  );
}
