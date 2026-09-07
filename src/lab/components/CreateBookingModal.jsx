import { useMemo, useState } from 'react';
import { FaPercent, FaRupeeSign } from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';
import TestPicker from './TestPicker.jsx';
import PatientPicker from './PatientPicker.jsx';
import { todayISO } from '../../services/labBookingService.js';
import { billTotals, PAYMENT_METHODS } from '../../services/billingService.js';
import { formatCurrency } from '../../utils/helpers.js';

/**
 * Create a counter booking for this laboratory.
 *
 * Lifted out of the Bookings screen so the Today board can offer the same
 * form — one definition of what a booking needs, wherever it is started.
 * The lab is never passed in from the form: the caller supplies it and the
 * database stamps lab_id from the signed-in profile regardless.
 *
 * Step 1 searches the register first. A returning patient is one click and the
 * rest of the form fills itself; a new one is typed as before and registered
 * on save by the `attach_booking_patient` trigger, so the counter never has to
 * think about the patient master as a separate chore.
 */
const emptyPatient = {
  patientId: null,
  patientName: '', patientPhone: '', patientEmail: '', patientAge: '', patientGender: '',
  scheduledDate: todayISO(), scheduledTime: '', collectionType: 'lab', address: '', city: '', notes: '',
};

export default function CreateBookingModal({ open, onClose, labId, tests, testsLoading, onCreate }) {
  const [form, setForm] = useState(emptyPatient);
  const [picked, setPicked] = useState([]);
  const [patient, setPatient] = useState(null);
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('amount');
  const [discountReason, setDiscountReason] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [partialAmount, setPartialAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const subtotal = picked.reduce((sum, t) => sum + Number(t.price || 0), 0);
  const bill = useMemo(
    () => billTotals({ subtotal, discount, discountType }),
    [subtotal, discount, discountType],
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => {
    setForm(emptyPatient);
    setPicked([]);
    setPatient(null);
    setDiscount('');
    setDiscountType('amount');
    setDiscountReason('');
    setPaymentStatus('pending');
    setPartialAmount('');
  };

  const amountPaid =
    paymentStatus === 'paid' ? bill.total
      : paymentStatus === 'partial' ? Math.min(Number(partialAmount || 0), bill.total)
        : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.patientName.trim() || !picked.length) return;
    setSaving(true);
    try {
      await onCreate({
        ...form,
        items: picked.map((t) => ({ id: t.id, name: t.name, price: t.price, code: t.code, type: 'test' })),
        subtotalAmount: subtotal,
        discount: Number(discount || 0),
        discountType,
        discountReason,
        totalAmount: bill.total,
        amountPaid,
        paymentStatus,
        paymentMethod,
        source: 'walk_in',
      });
      reset();
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
          <StepLabel n="1">Patient</StepLabel>

          <PatientPicker
            labId={labId}
            value={patient}
            disabled={saving}
            onPick={(p, filled) => { setPatient(p); setForm((f) => ({ ...f, ...filled })); }}
            onClear={() => { setPatient(null); setForm((f) => ({ ...f, ...emptyPatient, scheduledDate: f.scheduledDate })); }}
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          {!patient && form.patientPhone.trim() && (
            <p className="mt-2 text-xs text-gray-500">
              This patient will be added to your register automatically, matched on the phone number.
            </p>
          )}
        </section>

        <section>
          <StepLabel n="2">Select tests</StepLabel>
          <TestPicker tests={tests} loading={testsLoading} selected={picked} onChange={setPicked} />
        </section>

        <section>
          <StepLabel n="3">Schedule</StepLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="form-label">Date</span>
              <input className="input-field" type="date" value={form.scheduledDate} onChange={set('scheduledDate')} />
            </label>
            <label className="block">
              <span className="form-label">Time</span>
              <input className="input-field" type="time" value={form.scheduledTime} onChange={set('scheduledTime')} />
            </label>
          </div>
        </section>

        {/* ---- the bill ---- */}
        <section>
          <StepLabel n="4">Bill &amp; payment</StepLabel>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="b-discount">Discount</label>
              <div className="flex gap-2">
                <input
                  id="b-discount"
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
                <div className="flex shrink-0 overflow-hidden rounded-lg border border-gray-200">
                  {[['amount', <FaRupeeSign key="a" />], ['percent', <FaPercent key="p" />]].map(
                    ([kind, icon]) => (
                      <button
                        key={kind}
                        type="button"
                        className={`px-3 text-xs ${
                          discountType === kind
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                        onClick={() => setDiscountType(kind)}
                        aria-label={kind === 'amount' ? 'Flat amount' : 'Percentage'}
                        aria-pressed={discountType === kind}
                      >
                        {icon}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="b-reason">Reason</label>
              <input
                id="b-reason"
                className="input-field"
                placeholder="Staff family, camp rate…"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>
            <label className="block">
              <span className="form-label">Payment</span>
              <select className="input-field" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                <option value="pending">Nothing paid yet</option>
                <option value="paid">Paid in full</option>
                <option value="partial">Part payment</option>
              </select>
            </label>
            <label className="block">
              <span className="form-label">Method</span>
              <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            {paymentStatus === 'partial' && (
              <label className="block">
                <span className="form-label">Amount received</span>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  max={bill.total}
                  step="0.01"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                />
              </label>
            )}
          </div>

          <dl className="mt-4 space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal</dt>
              <dd className="tabular-nums text-gray-900">{formatCurrency(subtotal)}</dd>
            </div>
            {bill.discountValue > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Discount{discountType === 'percent' ? ` (${discount}%)` : ''}</dt>
                <dd className="tabular-nums">− {formatCurrency(bill.discountValue)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCurrency(bill.total)}</dd>
            </div>
            {amountPaid > 0 && amountPaid < bill.total && (
              <div className="flex justify-between text-amber-700">
                <dt>Due after this payment</dt>
                <dd className="tabular-nums">{formatCurrency(bill.total - amountPaid)}</dd>
              </div>
            )}
          </dl>
        </section>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving || !picked.length}>
            {saving ? 'Creating…' : 'Create booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
