import { supabase } from '../supabase/supabase.js';

/**
 * The money side of a booking: the bill, and the payments against it.
 *
 * Payments used to be a single figure on the booking, which meant "200 now,
 * 300 on Friday" quietly overwrote itself. They are rows now, and the
 * booking's `amount_paid` / `payment_status` are recomputed from them by the
 * `sync_booking_payment_total` trigger — this service never writes those two
 * columns, because two places computing the same number is how they stop
 * agreeing.
 */

const isMissingSchema = (err) => {
  const msg = err?.message || '';
  return (
    ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(err?.code) ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
};

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

export const methodLabel = (m) => PAYMENT_METHODS.find((x) => x.value === m)?.label || m || '—';

/**
 * What a bill actually comes to.
 *
 * One function so the booking form, the receipt and the accounts screen cannot
 * drift apart. A percentage discount is capped at 100 and an amount discount
 * at the subtotal — a bill that owes the patient money is always a typo.
 */
export function billTotals({ subtotal = 0, discount = 0, discountType = 'amount', tax = 0 }) {
  const sub = Math.max(Number(subtotal) || 0, 0);
  const d = Math.max(Number(discount) || 0, 0);
  const discountValue =
    discountType === 'percent'
      ? Math.round(((sub * Math.min(d, 100)) / 100) * 100) / 100
      : Math.min(d, sub);
  const taxable = sub - discountValue;
  const taxValue = Math.max(Number(tax) || 0, 0);
  return {
    subtotal: sub,
    discountValue,
    tax: taxValue,
    total: Math.max(Math.round((taxable + taxValue) * 100) / 100, 0),
  };
}

/** What is still owed, whether or not the generated column has been added yet. */
export const dueOf = (b) =>
  b?.amount_due != null
    ? Number(b.amount_due)
    : Math.max(Number(b?.total_amount || 0) - Number(b?.amount_paid || 0), 0);

export const billingService = {
  /** Every payment against one booking, oldest first — it reads as a ledger. */
  async listForBooking(bookingId) {
    const { data, error } = await supabase
      .from('booking_payments')
      .select('id, booking_id, lab_id, amount, method, reference, note, is_refund, received_by, received_at')
      .eq('booking_id', bookingId)
      .order('received_at', { ascending: true });
    if (error) {
      if (isMissingSchema(error)) return { payments: [], schemaMissing: true };
      throw error;
    }
    return { payments: data || [], schemaMissing: false };
  },

  /**
   * Record money taken. The booking's paid total and stage follow from the
   * database trigger, so nothing else needs updating here.
   */
  async record({
    bookingId, labId, amount, method, reference, note,
    isRefund = false, receivedBy, paymentAccountId,
  }) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Enter an amount greater than zero.');

    const row = {
      booking_id: bookingId,
      lab_id: labId,
      amount: value,
      method: method || 'cash',
      reference: reference || '',
      note: note || '',
      is_refund: !!isRefund,
      received_by: receivedBy || null,
    };

    const { data, error } = await supabase
      .from('booking_payments')
      .insert(paymentAccountId ? { ...row, payment_account_id: paymentAccountId } : row)
      .select('*')
      .single();
    if (!error) return data;

    // Which account the money went into is a nice-to-have that arrives with
    // payment-options.sql. Never let it stop a payment being recorded.
    if (paymentAccountId && isMissingSchema(error)) {
      const retry = await supabase.from('booking_payments').insert(row).select('*').single();
      if (retry.error) throw retry.error;
      return retry.data;
    }
    throw error;
  },

  /** Lab Admin only — RLS refuses this for anyone else. */
  async remove(id) {
    const { error } = await supabase.from('booking_payments').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  /** Apply or change the discount on a bill, recomputing the total with it. */
  async setDiscount(booking, { discount, discountType, reason }) {
    const subtotal = Number(booking.subtotal_amount ?? booking.total_amount ?? 0);
    const { discountValue, total } = billTotals({
      subtotal,
      discount,
      discountType,
      tax: booking.tax_amount,
    });

    const { data, error } = await supabase
      .from('booked_tests')
      .update({
        subtotal_amount: subtotal,
        discount: Number(discount) || 0,
        discount_type: discountType || 'amount',
        discount_reason: reason || '',
        total_amount: total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id)
      .select('*')
      .single();
    if (error) throw error;
    return { booking: data, discountValue };
  },

  /**
   * Every payment for a lab between two dates — the raw material for the
   * day book and the collection tiles.
   */
  async collections(labId, { from, to } = {}) {
    let q = supabase
      .from('booking_payments')
      .select(
        'id, amount, method, is_refund, received_at, received_by, booking_id, ' +
          'booked_tests:booking_id ( booking_ref, bill_no, patient_name )',
      )
      .eq('lab_id', labId)
      .order('received_at', { ascending: false })
      .limit(1000);
    if (from) q = q.gte('received_at', `${from}T00:00:00`);
    if (to) q = q.lte('received_at', `${to}T23:59:59.999`);

    const { data, error } = await q;
    if (error) {
      if (isMissingSchema(error)) return { payments: [], schemaMissing: true };
      throw error;
    }
    return { payments: data || [], schemaMissing: false };
  },

  /** Bookings with money still owed, biggest first. */
  async outstanding(labId, { limit = 200 } = {}) {
    const { data, error } = await supabase
      .from('booked_tests')
      .select(
        'id, booking_ref, bill_no, patient_name, patient_phone, scheduled_date, ' +
          'total_amount, amount_paid, amount_due, payment_status, workflow_status',
      )
      .eq('lab_id', labId)
      .not('payment_status', 'in', '("paid","waived")')
      .neq('workflow_status', 'cancelled')
      .order('scheduled_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).filter((b) => dueOf(b) > 0);
  },
};

export default billingService;
