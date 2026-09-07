import { useCallback, useEffect, useState } from 'react';
import {
  FaPlus, FaTrash, FaPrint, FaUndoAlt, FaCheckCircle, FaPercent, FaRupeeSign,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';
import useAuth from '../../hooks/useAuth.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import { STATUS_LABELS } from '../../services/labBookingService.js';
import {
  billingService, billTotals, dueOf, PAYMENT_METHODS, methodLabel,
} from '../../services/billingService.js';
import { buildReceiptPdf } from '../report/receiptPdf.js';
import { ROLES } from '../../config/platform.js';
import { formatCurrency } from '../../utils/helpers.js';
import { Alert } from './ui.jsx';

/**
 * The bill: what is owed, what has been taken, and printing the receipt.
 *
 * A payment is a line in a ledger, not a figure that gets overwritten. "200
 * now, 300 on Friday" is two rows and the booking's paid total is recomputed
 * from them by the database — which is also what makes a day's collection a
 * sum rather than an estimate.
 *
 * Shared by the Bookings list and the booking details drawer.
 */
export default function PaymentModal({ booking, onClose, onSave }) {
  const { labId, lab, role, user, profile } = useAuth();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [isRefund, setIsRefund] = useState(false);

  const [editDiscount, setEditDiscount] = useState(false);
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('amount');
  const [discountReason, setDiscountReason] = useState('');

  const isLabAdmin = role === ROLES.LAB_ADMIN;
  const due = dueOf(booking);

  const load = useCallback(async () => {
    if (!booking?.id) return;
    setLoading(true);
    try {
      const { payments: rows, schemaMissing: missing } = await billingService.listForBooking(booking.id);
      setPayments(rows);
      setSchemaMissing(missing);
    } catch (err) {
      setError(err?.message || 'Could not load the payment history.');
    } finally {
      setLoading(false);
    }
  }, [booking?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!booking) return;
    setAmount(dueOf(booking) > 0 ? String(dueOf(booking)) : '');
    setMethod(booking.payment_method || 'cash');
    setReference('');
    setIsRefund(false);
    setDiscount(String(booking.discount ?? ''));
    setDiscountType(booking.discount_type || 'amount');
    setDiscountReason(booking.discount_reason || '');
    setEditDiscount(false);
  }, [booking]);

  if (!booking) return null;

  const paid = payments.filter((p) => !p.is_refund).reduce((n, p) => n + Number(p.amount || 0), 0);
  const refunded = payments.filter((p) => p.is_refund).reduce((n, p) => n + Number(p.amount || 0), 0);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await billingService.record({
        bookingId: booking.id,
        labId,
        amount,
        method,
        reference,
        isRefund,
        receivedBy: user?.id,
      });
      setAmount('');
      setReference('');
      await load();
      await onSave?.();
    } catch (err) {
      setError(err?.message || 'Could not record that payment.');
    } finally {
      setBusy(false);
    }
  };

  const saveDiscount = async () => {
    setBusy(true);
    setError('');
    try {
      await billingService.setDiscount(booking, { discount, discountType, reason: discountReason });
      setEditDiscount(false);
      await onSave?.();
    } catch (err) {
      setError(err?.message || 'Could not apply that discount.');
    } finally {
      setBusy(false);
    }
  };

  const printReceipt = async () => {
    setBusy(true);
    try {
      const blob = await buildReceiptPdf({
        lab,
        booking,
        payments,
        items: Array.isArray(booking.items) ? booking.items : [],
        issuedBy: profile?.full_name || user?.email || '',
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      // Give the new tab time to take the blob before it is revoked.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err?.message || 'Could not build the receipt.');
    } finally {
      setBusy(false);
    }
  };

  const preview = billTotals({
    subtotal: booking.subtotal_amount ?? booking.total_amount,
    discount,
    discountType,
    tax: booking.tax_amount,
  });

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      title={`Bill — ${booking.bill_no || booking.booking_ref || ''}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
        {schemaMissing && (
          <Alert tone="warning">
            The payment ledger needs <code className="font-mono">phase2.sql</code> to be run in the
            Supabase SQL Editor. Until then a booking keeps a single paid figure.
          </Alert>
        )}

        {/* ---- the bill ---- */}
        <section className="overflow-hidden rounded-xl border border-gray-200">
          <header className="flex items-baseline justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
              Bill
            </h4>
            <span className="text-xs text-gray-500">
              {booking.patient_name} · {STATUS_LABELS[booking.workflow_status]}
            </span>
          </header>

          <dl className="space-y-1.5 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal</dt>
              <dd className="tabular-nums">
                {formatCurrency(booking.subtotal_amount ?? booking.total_amount)}
              </dd>
            </div>
            {Number(booking.discount || 0) > 0 && !editDiscount && (
              <div className="flex justify-between text-emerald-700">
                <dt>
                  Discount
                  {booking.discount_type === 'percent' ? ` (${booking.discount}%)` : ''}
                  {booking.discount_reason && (
                    <span className="text-gray-400"> · {booking.discount_reason}</span>
                  )}
                </dt>
                <dd className="tabular-nums">
                  − {formatCurrency(
                    Number(booking.subtotal_amount ?? booking.total_amount) - Number(booking.total_amount),
                  )}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCurrency(booking.total_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Received</dt>
              <dd className="tabular-nums text-emerald-700">{formatCurrency(paid - refunded)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt className={due > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                {due > 0 ? 'Balance due' : 'Settled'}
              </dt>
              <dd className={`tabular-nums ${due > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {due > 0 ? formatCurrency(due) : <FaCheckCircle aria-hidden="true" />}
              </dd>
            </div>
          </dl>

          {/* Discounts are the Lab Admin's to give. */}
          {isLabAdmin && (
            <div className="border-t border-gray-100 px-4 py-3">
              {editDiscount ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex min-w-[8rem] flex-1 gap-1">
                      <input
                        className="input-field h-9 py-1 text-sm"
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        aria-label="Discount"
                      />
                      <div className="flex shrink-0 overflow-hidden rounded-lg border border-gray-200">
                        {[['amount', <FaRupeeSign key="a" />], ['percent', <FaPercent key="p" />]].map(
                          ([kind, icon]) => (
                            <button
                              key={kind}
                              type="button"
                              className={`px-2.5 text-xs ${
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
                    <input
                      className="input-field h-9 min-w-[10rem] flex-[2] py-1 text-sm"
                      placeholder="Reason"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      aria-label="Discount reason"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    New total {formatCurrency(preview.total)}
                    {preview.total < (paid - refunded) &&
                      ' — that is less than has already been taken, so a refund will be owed.'}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" className="btn-soft px-3 py-1.5 text-xs" onClick={() => setEditDiscount(false)}>
                      Cancel
                    </button>
                    <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={saveDiscount} disabled={busy}>
                      Apply discount
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                  onClick={() => setEditDiscount(true)}
                >
                  {Number(booking.discount || 0) > 0 ? 'Change the discount' : 'Apply a discount'}
                </button>
              )}
            </div>
          )}
        </section>

        {/* ---- the ledger ---- */}
        <section className="overflow-hidden rounded-xl border border-gray-200">
          <header className="border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
              Payments received
            </h4>
          </header>

          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-400">Loading…</p>
          ) : payments.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Nothing recorded against this bill yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-900">
                      {p.is_refund && <span className="mr-1 text-red-600">Refund</span>}
                      {methodLabel(p.method)}
                      {p.reference && <span className="text-gray-400"> · {p.reference}</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.received_at).toLocaleString()}
                      {p.note && ` · ${p.note}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${
                      p.is_refund ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {p.is_refund ? '− ' : ''}{formatCurrency(p.amount)}
                  </span>
                  {isLabAdmin && (
                    <button
                      type="button"
                      className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setConfirmDelete(p)}
                      aria-label="Remove this payment line"
                    >
                      <FaTrash />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- take a payment ---- */}
        {!schemaMissing && (
          <form className="space-y-3 rounded-xl border border-gray-200 p-4" onSubmit={add}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="form-label" htmlFor="pay-amount">Amount</label>
                <input
                  id="pay-amount"
                  className="input-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="pay-method">Method</label>
                <select
                  id="pay-method"
                  className="input-field"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="pay-ref">Reference</label>
                <input
                  id="pay-ref"
                  className="input-field"
                  placeholder="UPI ref, last 4 digits…"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={isRefund}
                  onChange={(e) => setIsRefund(e.target.checked)}
                />
                <FaUndoAlt className="text-gray-400" aria-hidden="true" />
                This is a refund
              </label>
              <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={busy}>
                <FaPlus aria-hidden="true" /> {isRefund ? 'Record refund' : 'Record payment'}
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-2 border-t border-gray-100 pt-4">
          <button type="button" className="btn-outline flex-1" onClick={onClose}>Close</button>
          <button type="button" className="btn-soft flex-1" onClick={printReceipt} disabled={busy}>
            <FaPrint aria-hidden="true" /> Print receipt
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        danger
        title="Remove this payment line?"
        message="The bill's paid total and balance are recalculated without it. Do this only to correct a mistake — a refund should be recorded as a refund."
        detail={confirmDelete ? `${methodLabel(confirmDelete.method)} · ${formatCurrency(confirmDelete.amount)}` : ''}
        confirmLabel="Remove line"
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          await billingService.remove(confirmDelete.id);
          setConfirmDelete(null);
          await load();
          await onSave?.();
        }}
      />
    </Modal>
  );
}
