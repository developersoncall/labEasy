import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaSearch, FaUser, FaClipboardList, FaArrowLeft, FaPrint, FaCheckCircle,
  FaPercent, FaRupeeSign, FaFileInvoiceDollar,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';
import useAuth from '../../hooks/useAuth.js';
import PatientPicker from './PatientPicker.jsx';
import { labBookingService, STATUS_LABELS } from '../../services/labBookingService.js';
import { billingService, billTotals, dueOf, PAYMENT_METHODS } from '../../services/billingService.js';
import { buildReceiptPdf } from '../report/receiptPdf.js';
import { formatCurrency } from '../../utils/helpers.js';
import { itemsLabel, Alert } from './ui.jsx';

/**
 * Raise a bill against work that already exists.
 *
 * A bill is not a separate document in this system — it *is* the booking, and
 * inventing a second record that says what the booking already says is how the
 * two end up disagreeing. So this screen finds the booking (by patient, or by
 * searching), shows what was ordered, lets the counter set a discount and take
 * the money, and prints the receipt.
 *
 * Choosing a patient first is the common case: the person is standing there,
 * the receptionist types their name, and everything they have open appears.
 */
export default function NewBillModal({ open, onClose, onSaved }) {
  const { labId, lab, user, profile } = useAuth();

  const [step, setStep] = useState('find'); // find | bill | done
  const [mode, setMode] = useState('patient'); // patient | search
  const [patient, setPatient] = useState(null);
  const [term, setTerm] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('amount');
  const [discountReason, setDiscountReason] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');

  const reset = useCallback(() => {
    setStep('find');
    setPatient(null);
    setTerm('');
    setBookings([]);
    setPicked(null);
    setDiscount('');
    setDiscountType('amount');
    setDiscountReason('');
    setAmount('');
    setError('');
  }, []);

  useEffect(() => { if (open) reset(); }, [open, reset]);

  /** Everything this lab has, filtered to what the counter is looking at. */
  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    setError('');
    try {
      const rows = await labBookingService.listForLab(labId, { limit: 400 });
      setBookings(rows.filter((b) => b.workflow_status !== 'cancelled'));
    } catch (err) {
      setError(err?.message || 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const matches = useMemo(() => {
    if (mode === 'patient') {
      if (!patient) return [];
      // Match on the patient link where phase2 has run, and on the phone number
      // where it has not — the counter should not have to care which.
      return bookings.filter(
        (b) =>
          (b.patient_id && b.patient_id === patient.id) ||
          (!b.patient_id &&
            patient.phone &&
            String(b.patient_phone || '').replace(/\D/g, '').slice(-10) ===
              String(patient.phone).replace(/\D/g, '').slice(-10)),
      );
    }
    const q = term.trim().toLowerCase();
    if (q.length < 2) return [];
    return bookings
      .filter(
        (b) =>
          (b.patient_name || '').toLowerCase().includes(q) ||
          (b.bill_no || '').toLowerCase().includes(q) ||
          (b.booking_ref || '').toLowerCase().includes(q) ||
          (b.patient_phone || '').includes(q),
      )
      .slice(0, 20);
  }, [mode, patient, term, bookings]);

  const choose = (b) => {
    setPicked(b);
    setDiscount(String(b.discount ?? ''));
    setDiscountType(b.discount_type || 'amount');
    setDiscountReason(b.discount_reason || '');
    setAmount(String(dueOf(b) || ''));
    setMethod(b.payment_method || 'cash');
    setStep('bill');
  };

  const items = Array.isArray(picked?.items) ? picked.items : [];
  const subtotal = Number(picked?.subtotal_amount ?? picked?.total_amount ?? 0);
  const bill = billTotals({ subtotal, discount, discountType, tax: picked?.tax_amount });
  const alreadyPaid = Number(picked?.amount_paid || 0);
  const dueAfter = Math.max(bill.total - alreadyPaid - Number(amount || 0), 0);

  /**
   * Apply the discount, take the money, print the receipt — in that order, so
   * a receipt is never printed for a bill the database refused to change.
   */
  const generate = async () => {
    setWorking(true);
    setError('');
    try {
      let current = picked;

      const changed =
        Number(discount || 0) !== Number(picked.discount || 0) ||
        (discountType || 'amount') !== (picked.discount_type || 'amount') ||
        (discountReason || '') !== (picked.discount_reason || '');
      if (changed) {
        const { booking } = await billingService.setDiscount(picked, {
          discount, discountType, reason: discountReason,
        });
        current = { ...picked, ...booking };
      }

      if (Number(amount || 0) > 0) {
        await billingService.record({
          bookingId: current.id,
          labId,
          amount,
          method,
          note: 'Collected at the billing counter',
          receivedBy: user?.id,
        });
      }

      const fresh = await labBookingService.get(current.id).catch(() => current);
      const { payments } = await billingService
        .listForBooking(current.id)
        .catch(() => ({ payments: [] }));

      const blob = await buildReceiptPdf({
        lab,
        booking: fresh || current,
        payments,
        items: Array.isArray((fresh || current).items) ? (fresh || current).items : [],
        issuedBy: profile?.full_name || user?.email || '',
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      setPicked(fresh || current);
      setStep('done');
      await onSaved?.();
    } catch (err) {
      setError(err?.message || 'Could not generate that bill.');
    } finally {
      setWorking(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'find' ? 'New bill' : step === 'bill' ? 'Generate bill' : 'Bill generated'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

        {/* ================= step 1: find the work ================= */}
        {step === 'find' && (
          <>
            <div className="flex gap-2">
              {[
                ['patient', 'By patient', <FaUser key="u" />],
                ['search', 'By bill or booking', <FaClipboardList key="c" />],
              ].map(([key, label, icon]) => (
                <button
                  key={key}
                  type="button"
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    mode === key
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300'
                  }`}
                  onClick={() => { setMode(key); setPicked(null); }}
                  aria-pressed={mode === key}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {mode === 'patient' ? (
              <PatientPicker
                labId={labId}
                value={patient}
                onPick={(p) => setPatient(p)}
                onClear={() => setPatient(null)}
              />
            ) : (
              <div className="relative">
                <FaSearch
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
                  aria-hidden="true"
                />
                <input
                  className="input-field pl-9"
                  placeholder="Bill number, booking reference, patient or phone…"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  aria-label="Find a booking to bill"
                />
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200">
              <header className="border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  {mode === 'patient' && patient
                    ? `Bookings for ${patient.full_name}`
                    : 'Matching bookings'}
                </h4>
              </header>

              {loading ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">Loading…</p>
              ) : matches.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                  {mode === 'patient'
                    ? patient
                      ? 'This patient has no bookings to bill. Take a new booking first — the bill is raised with it.'
                      : 'Search for the patient above.'
                    : term.trim().length < 2
                      ? 'Type at least two characters.'
                      : 'Nothing matches that.'}
                </p>
              ) : (
                <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
                  {matches.map((b) => {
                    const due = dueOf(b);
                    return (
                      <li key={b.id}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-primary-50"
                          onClick={() => choose(b)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                              {b.patient_name || 'Walk-in'}
                              <span className="font-mono text-[11px] font-normal text-gray-400">
                                {b.bill_no || b.booking_ref}
                              </span>
                            </p>
                            <p className="truncate text-xs text-gray-500">{itemsLabel(b.items)}</p>
                            <p className="text-[11px] text-gray-400">
                              {b.scheduled_date} · {STATUS_LABELS[b.workflow_status]}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums text-gray-900">
                              {formatCurrency(b.total_amount)}
                            </p>
                            <p
                              className={`text-[11px] font-semibold ${
                                due > 0 ? 'text-amber-700' : 'text-emerald-600'
                              }`}
                            >
                              {due > 0 ? `${formatCurrency(due)} due` : 'Settled'}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <p className="flex items-start gap-2 text-xs text-gray-500">
              <FaFileInvoiceDollar className="mt-0.5 shrink-0 text-gray-300" aria-hidden="true" />
              A bill belongs to a booking, so it is raised the moment reception takes one. This
              screen finds that bill to discount it, settle it and print the receipt.
            </p>
          </>
        )}

        {/* ================= step 2: the bill ================= */}
        {step === 'bill' && picked && (
          <>
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">
                {picked.patient_name || 'Walk-in patient'}
              </p>
              <p className="font-mono text-xs text-gray-500">
                {[picked.bill_no, picked.booking_ref].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200">
              <header className="border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                  What was ordered
                </h4>
              </header>
              {items.length ? (
                <ul className="divide-y divide-gray-100">
                  {items.map((t, i) => (
                    <li key={t.id || i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="min-w-0 truncate text-gray-800">{t.name || 'Test'}</span>
                      <span className="shrink-0 tabular-nums text-gray-900">{formatCurrency(t.price)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-gray-400">{itemsLabel(picked.items)}</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="form-label" htmlFor="nb-discount">Discount</label>
                <div className="flex gap-2">
                  <input
                    id="nb-discount"
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
                          aria-pressed={discountType === kind}
                          aria-label={kind === 'amount' ? 'Flat amount' : 'Percentage'}
                        >
                          {icon}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="form-label" htmlFor="nb-reason">Reason</label>
                <input
                  id="nb-reason"
                  className="input-field"
                  placeholder="Staff family, camp rate…"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="nb-amount">Amount received now</label>
                <input
                  id="nb-amount"
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="nb-method">Method</label>
                <select
                  id="nb-method"
                  className="input-field"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <dl className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
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
              {alreadyPaid > 0 && (
                <div className="flex justify-between text-gray-500">
                  <dt>Already paid</dt>
                  <dd className="tabular-nums">{formatCurrency(alreadyPaid)}</dd>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <dt className={dueAfter > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                  {dueAfter > 0 ? 'Balance after this payment' : 'Settled in full'}
                </dt>
                <dd className={`tabular-nums ${dueAfter > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatCurrency(dueAfter)}
                </dd>
              </div>
            </dl>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-outline flex-1"
                onClick={() => { setPicked(null); setStep('find'); }}
                disabled={working}
              >
                <FaArrowLeft aria-hidden="true" /> Back
              </button>
              <button type="button" className="btn-primary flex-1" onClick={generate} disabled={working}>
                <FaPrint aria-hidden="true" />
                {working ? 'Generating…' : 'Generate bill & receipt'}
              </button>
            </div>
          </>
        )}

        {/* ================= step 3: done ================= */}
        {step === 'done' && picked && (
          <>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center">
              <FaCheckCircle className="mx-auto text-3xl text-emerald-500" aria-hidden="true" />
              <h3 className="mt-3 text-base font-bold text-gray-900">Bill generated</h3>
              <p className="mt-1 text-sm text-gray-600">
                The receipt opened in a new tab. The booking&apos;s balance is up to date.
              </p>
              <p className="mt-2 font-mono text-xs text-gray-500">
                {picked.bill_no || picked.booking_ref}
              </p>
            </div>

            <div className="flex gap-2">
              <button type="button" className="btn-soft flex-1" onClick={reset}>
                Bill someone else
              </button>
              <button type="button" className="btn-primary flex-1" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
