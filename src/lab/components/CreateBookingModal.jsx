import { useState } from 'react';
import Modal from '../../components/common/Modal.jsx';
import TestPicker from './TestPicker.jsx';
import { todayISO } from '../../services/labBookingService.js';
import { formatCurrency } from '../../utils/helpers.js';

/**
 * Create a counter booking for this laboratory.
 *
 * Lifted out of the Bookings screen so the Today board can offer the same
 * form — one definition of what a booking needs, wherever it is started.
 * The lab is never passed in from the form: the caller supplies it and the
 * database stamps lab_id from the signed-in profile regardless.
 */
const emptyPatient = {
  patientName: '', patientPhone: '', patientEmail: '', patientAge: '', patientGender: '',
  scheduledDate: todayISO(), scheduledTime: '', collectionType: 'lab', address: '', notes: '',
};

export default function CreateBookingModal({ open, onClose, tests, testsLoading, onCreate }) {
  const [form, setForm] = useState(emptyPatient);
  const [picked, setPicked] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  const total = picked.reduce((sum, t) => sum + Number(t.price || 0), 0);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.patientName.trim() || !picked.length) return;
    setSaving(true);
    try {
      await onCreate({
        ...form,
        items: picked.map((t) => ({ id: t.id, name: t.name, price: t.price, code: t.code, type: 'test' })),
        totalAmount: total,
        amountPaid: paymentStatus === 'paid' ? total : 0,
        paymentStatus,
        paymentMethod,
        source: 'walk_in',
      });
      setForm(emptyPatient);
      setPicked([]);
      setPaymentStatus('pending');
    } finally {
      setSaving(false);
    }
  };

  const StepLabel = ({ n, children }) => (
    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
        {n}
      </span>
      {children}
    </h4>
  );

  return (
    <Modal open={open} onClose={onClose} title="New booking" maxWidth="max-w-2xl">
      <form className="space-y-6" onSubmit={submit}>
        <section>
          <StepLabel n="1">Patient details</StepLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" placeholder="Full name *" value={form.patientName} onChange={set('patientName')} required />
            <input className="input-field" placeholder="Phone" value={form.patientPhone} onChange={set('patientPhone')} />
            <input className="input-field" placeholder="Email" type="email" value={form.patientEmail} onChange={set('patientEmail')} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field" placeholder="Age" type="number" min="0" max="120" value={form.patientAge} onChange={set('patientAge')} />
              <select className="input-field" value={form.patientGender} onChange={set('patientGender')}>
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <StepLabel n="2">Select tests</StepLabel>
          <TestPicker tests={tests} loading={testsLoading} selected={picked} onChange={setPicked} />
        </section>

        <section>
          <StepLabel n="3">Schedule &amp; payment</StepLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="form-label">Date</span>
              <input className="input-field" type="date" value={form.scheduledDate} onChange={set('scheduledDate')} />
            </label>
            <label className="block">
              <span className="form-label">Time</span>
              <input className="input-field" type="time" value={form.scheduledTime} onChange={set('scheduledTime')} />
            </label>
            <label className="block">
              <span className="form-label">Payment status</span>
              <select className="input-field" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                <option value="pending">Payment pending</option>
                <option value="paid">Paid in full</option>
                <option value="partial">Partial</option>
              </select>
            </label>
            <label className="block">
              <span className="form-label">Method</span>
              <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">Mobile / UPI</option>
                <option value="online">Online</option>
              </select>
            </label>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="text-sm">
            <span className="text-gray-500">Total </span>
            <span className="text-lg font-bold tabular-nums text-gray-900">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !picked.length}>
              {saving ? 'Creating…' : 'Create booking'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
