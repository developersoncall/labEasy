import { useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';

/**
 * Ask before doing something that cannot be undone.
 *
 * Used for deleting a booking, where the row, its activity trail and any
 * attached report go with it. The confirm button stays disabled while the
 * action runs so a double click cannot fire it twice.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err?.message || 'That action was refused.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'
            }`}
          >
            <FaExclamationTriangle aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-relaxed text-gray-700">{message}</p>
            {detail && (
              <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{detail}</p>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <button type="button" className="btn-outline flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={run}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
