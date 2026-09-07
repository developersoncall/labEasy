import { useEffect, useState } from 'react';
import Modal from '../../components/common/Modal.jsx';
import { STATUS_LABELS } from '../../services/labBookingService.js';
import { formatCurrency } from '../../utils/helpers.js';

/**
 * Record what the patient paid.
 *
 * Shared by the Bookings list and the booking details drawer.
 */
export default function PaymentModal({ booking, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [status, setStatus] = useState('paid');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setAmount(String(booking.total_amount ?? ''));
      setMethod(booking.payment_method || 'cash');
      setStatus('paid');
    }
  }, [booking]);

  if (!booking) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ amountPaid: amount, paymentMethod: method, paymentStatus: status });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!booking} onClose={onClose} title={`Payment — ${booking.booking_ref || ''}`}>
      <form className="space-y-4" onSubmit={submit}>
        <dl className="space-y-1.5 rounded-xl bg-gray-50 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Patient</dt><dd className="font-semibold">{booking.patient_name}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Billed</dt><dd className="font-semibold tabular-nums">{formatCurrency(booking.total_amount)}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Current stage</dt><dd>{STATUS_LABELS[booking.workflow_status]}</dd></div>
        </dl>
        <div>
          <label className="form-label" htmlFor="pay-amount">Amount received</label>
          <input id="pay-amount" className="input-field" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="pay-method">Method</label>
            <select id="pay-method" className="input-field" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">Mobile / UPI</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="pay-status">Status</label>
            <select id="pay-status" className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="paid">Paid in full</option>
              <option value="partial">Partial</option>
              <option value="pending">Still pending</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-outline flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
