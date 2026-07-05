import React, { useState, useRef } from 'react';
import { Modal, Field } from './Shared';

/**
 * Deliver a prescription against a doctor appointment. Opens on a chooser
 * (nothing pre-selected): Email / WhatsApp fire immediately; Upload reveals
 * the file-upload UI. Upload is intentionally the last option.
 */
export default function UploadPrescriptionModal({ appointment, existing = null, onClose, onUpload, onEmail, onWhatsApp }) {
  const isEdit = !!existing;
  const canSend = !!(onEmail || onWhatsApp);
  const [mode, setMode] = useState(canSend && !isEdit ? null : 'upload');

  const [form, setForm] = useState({
    diagnosis: existing?.diagnosis || appointment?.symptoms || '',
    notes: existing?.notes || '',
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); };

  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setErrors(e => ({ ...e, file: 'Only PDF files are allowed' })); return; }
    if (f.size > 10 * 1024 * 1024) { setErrors(e => ({ ...e, file: 'File must be under 10MB' })); return; }
    setFile(f);
    setErrors(e => ({ ...e, file: undefined }));
  };

  const payload = () => ({ diagnosis: form.diagnosis, notes: form.notes, file });

  const send = async (fn) => {
    setSaving(true);
    try { await fn(payload()); } finally { setSaving(false); }
  };

  const handleUpload = async () => {
    if (!isEdit && !file) { setErrors({ file: 'Please attach the prescription PDF' }); return; }
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
        <div className="modal-user-name">💊 {isEdit ? 'Edit / Replace Prescription' : 'Deliver Prescription'}</div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {mode === null ? (
        <>
          <div className="modal-body">
            <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16 }}>
              How would you like to deliver this prescription{appointment?.user ? ` to ${appointment.user}` : ''}? This completes the appointment.
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
              <button type="button" style={optionStyle} disabled={saving} onClick={() => setMode('upload')}>
                <span style={{ fontSize: 22 }}>📤</span>
                <span><span style={{ display: 'block', fontWeight: 800, color: 'var(--ink)' }}>Upload a PDF</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Patient can download the prescription anytime</span></span>
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className="modal-body">
            <div className="form-grid form-grid-2">
              <Field label="Appointment">
                <input className="form-input" value={`${appointment?.ref || ''} · ${appointment?.user || ''}`} readOnly />
              </Field>
              <Field label="Doctor">
                <input className="form-input" value={appointment?.doctor || '—'} readOnly />
              </Field>
            </div>

            <Field label="Diagnosis">
              <input className="form-input" value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} placeholder="e.g. Seasonal allergic rhinitis" />
            </Field>

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <div
              className="upload-drop-zone"
              style={{ marginTop: 4, cursor: 'pointer', borderColor: errors.file ? 'var(--red)' : undefined }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
            >
              <div className="udz-icon">{file ? '✅' : '💊'}</div>
              <div className="udz-text">
                {file ? file.name : isEdit ? <>Drop a new PDF to replace, or <span className="udz-link">browse</span></> : <>Drag &amp; drop PDF or <span className="udz-link">browse</span></>}
              </div>
              <div className="udz-sub">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB · click to change`
                  : isEdit ? 'Keeps the current file unless you attach a new one' : 'PDF prescriptions only, max 10MB'}
              </div>
            </div>
            {errors.file && <div className="field-error" style={{ marginTop: 6 }}>{errors.file}</div>}

            <Field label="Notes for patient">
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Dosage advice, follow-up, etc." />
            </Field>
          </div>
          <div className="modal-footer">
            {canSend && !isEdit
              ? <button className="btn btn-secondary" onClick={() => setMode(null)} disabled={saving}>← Back</button>
              : <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>}
            <button className="btn btn-primary" onClick={handleUpload} disabled={saving}>{saving ? '⏳ Saving…' : isEdit ? '💾 Save Prescription' : '📤 Upload & Complete'}</button>
          </div>
        </>
      )}
    </Modal>
  );
}
