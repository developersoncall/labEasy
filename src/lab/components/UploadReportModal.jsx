import { useEffect, useState } from 'react';
import Modal from '../../components/common/Modal.jsx';
import { itemsLabel } from './ui.jsx';

/**
 * Attach the report PDF to a booking.
 *
 * Shared by the Reports desk and the booking details drawer, so a pending
 * report can be uploaded from wherever it was noticed rather than only from
 * the queue it belongs to.
 */
export default function UploadReportModal({ booking, onClose, onUpload, replacing = null }) {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setFile(null);
    setNotes('');
    setErr('');
  }, [booking, replacing]);

  if (!booking) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setErr('Choose a PDF to upload.');
    if (file.type && file.type !== 'application/pdf') return setErr('Reports must be PDF files.');
    setSaving(true);
    try {
      await onUpload(file, notes);
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      title={`${replacing ? 'Replace report' : 'Upload report'} — ${booking.booking_ref || ''}`}
    >
      <form className="space-y-4" onSubmit={submit}>
        <dl className="space-y-1.5 rounded-xl bg-gray-50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Patient</dt>
            <dd className="font-semibold">{booking.patient_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-gray-500">Tests</dt>
            <dd className="truncate text-right">{itemsLabel(booking.items)}</dd>
          </div>
        </dl>

        {replacing && (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This replaces <strong>{replacing.file_name || replacing.report_ref}</strong>. The old PDF is
            deleted once the new one is stored; the report reference stays the same.
          </p>
        )}

        <div>
          <label className="form-label" htmlFor="report-file">
            {replacing ? 'New report PDF *' : 'Report PDF *'}
          </label>
          <input
            id="report-file"
            type="file"
            accept="application/pdf"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setErr(''); }}
            className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-700"
          />
        </div>

        <div className={replacing ? 'hidden' : ''}>
          <label className="form-label" htmlFor="report-notes">Notes</label>
          <textarea
            id="report-notes"
            rows={2}
            className="input-field"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the patient or doctor should know."
          />
        </div>

        {err && <p className="error-text">{err}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-outline flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Uploading…' : replacing ? 'Replace report' : 'Upload report'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
