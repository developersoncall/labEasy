import { supabase } from '../supabase/supabase.js';
import { billingService } from './billingService.js';

/**
 * The booking pipeline, as seen by lab staff and by the platform admin.
 *
 * Bookings are rows in the existing `booked_tests` table — the same table the
 * public site has always used. What is new is `lab_id` + `workflow_status`,
 * which turn one row into a task that moves from reception to testing to the
 * report desk.
 *
 * Stage changes are ALSO validated by the `enforce_booking_workflow` trigger:
 * a tester who calls markTestingDone() on a booking that never reached testing
 * gets a database error, not a silent write.
 */

/** The pipeline, in order. Used for progress bars and the Today board. */
export const WORKFLOW_STAGES = [
  'booked',
  'payment_pending',
  'payment_completed',
  'sent_for_testing',
  'testing_in_progress',
  'testing_completed',
  'report_pending',
  'report_uploaded',
  'completed',
];

export const STATUS_LABELS = {
  booked: 'Booked',
  payment_pending: 'Payment Pending',
  payment_completed: 'Payment Completed',
  sent_for_testing: 'Sent for Testing',
  testing_in_progress: 'Testing In Progress',
  testing_completed: 'Testing Completed',
  report_pending: 'Report Pending',
  report_uploaded: 'Report Uploaded',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * The pipeline folded into the four buckets the dashboard shows.
 *
 * Every stage in WORKFLOW_STAGES belongs to exactly one phase, plus 'cancelled'
 * which is deliberately outside them. phaseOf() falls back to null so a stage
 * that is added later can never silently vanish from the tiles — countPhases()
 * reports it under 'other'.
 */
export const PIPELINE_PHASES = [
  { key: 'awaiting_payment', label: 'Awaiting payment', hint: 'Booked or payment pending',
    stages: ['booked', 'payment_pending'] },
  { key: 'in_testing', label: 'Paid / in testing', hint: 'Paid, queued or on the bench',
    stages: ['payment_completed', 'sent_for_testing', 'testing_in_progress'] },
  { key: 'reports_due', label: 'Reports due', hint: 'Testing done, report not closed',
    stages: ['testing_completed', 'report_pending', 'report_uploaded'] },
  { key: 'completed', label: 'Completed', hint: 'Closed and delivered',
    stages: ['completed'] },
];

export const phaseOf = (status) =>
  PIPELINE_PHASES.find((p) => p.stages.includes(status))?.key || null;

/** Roll per-stage counts up into phases, keeping anything unclassified visible. */
export function countPhases(counts = {}) {
  const out = { other: 0, cancelled: counts.cancelled || 0 };
  PIPELINE_PHASES.forEach((p) => {
    out[p.key] = p.stages.reduce((n, st) => n + (counts[st] || 0), 0);
  });
  Object.entries(counts).forEach(([k, v]) => {
    if (k === 'total' || k === 'cancelled') return;
    if (!phaseOf(k)) out.other += v;
  });
  return out;
}

/** Tailwind classes per stage — one place so every screen agrees. */
export const STATUS_STYLES = {
  booked: 'bg-slate-100 text-slate-700',
  payment_pending: 'bg-amber-100 text-amber-800',
  payment_completed: 'bg-emerald-100 text-emerald-700',
  sent_for_testing: 'bg-primary-100 text-primary-800',
  testing_in_progress: 'bg-indigo-100 text-indigo-700',
  testing_completed: 'bg-teal-100 text-teal-700',
  report_pending: 'bg-orange-100 text-orange-700',
  report_uploaded: 'bg-sky-100 text-sky-800',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

/** 0-100 progress for a stage, so the admin can eyeball a day at a glance. */
/** Payment is settled — 'waived' covers labs that bill separately. */
export const isPaymentSettled = (b) => ['paid', 'waived'].includes(b?.payment_status);

export function stageProgress(status) {
  if (status === 'cancelled') return 100;
  const i = WORKFLOW_STAGES.indexOf(status);
  if (i < 0) return 0;
  return Math.round(((i + 1) / WORKFLOW_STAGES.length) * 100);
}

export const todayISO = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local

/**
 * Named columns rather than `*`, because a booking row carries a lot of legacy
 * width. The billing and patient columns arrive with phase2.sql, so they live
 * in their own list: if that migration has not been run yet, the first query
 * fails with "column does not exist" and every screen falls back to the core
 * set rather than showing nothing at all.
 */
const CORE_FIELDS =
  'id, booking_ref, lab_id, user_id, items, collection_type, scheduled_date, scheduled_time, ' +
  'patient_name, patient_age, patient_gender, patient_phone, patient_email, address, city, ' +
  'total_amount, amount_paid, status, workflow_status, payment_status, payment_method, source, ' +
  'assigned_tester, assigned_reportist, created_by, staff_notes, sent_to_testing_at, ' +
  'testing_started_at, testing_completed_at, report_uploaded_at, completed_at, created_at';

const PHASE2_FIELDS =
  'patient_id, bill_no, billed_at, subtotal_amount, discount, discount_type, ' +
  'discount_reason, tax_amount, amount_due';

/** Flipped once, the first time the database says those columns are not there. */
let phase2 = true;
const FIELD_LIST = () => (phase2 ? `${CORE_FIELDS}, ${PHASE2_FIELDS}` : CORE_FIELDS);

const isMissingColumn = (err) => {
  const msg = err?.message || '';
  return (
    ['42703', 'PGRST204', 'PGRST205'].includes(err?.code) ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg)
  );
};

/**
 * Run a query, and if the billing columns are what it choked on, drop them and
 * run it once more. One retry, never a loop.
 */
async function withFields(run) {
  const first = await run(FIELD_LIST());
  if (!first.error) return first;
  if (phase2 && isMissingColumn(first.error)) {
    phase2 = false;
    return run(CORE_FIELDS);
  }
  return first;
}

export const labBookingService = {
  /** Receptionist: create a counter booking for this lab. */
  async create(labId, payload) {
    const row = {
      lab_id: labId,
      user_id: payload.userId || null, // walk-ins have no account
      items: payload.items || [],
      collection_type: payload.collectionType || 'lab',
      scheduled_date: payload.scheduledDate || todayISO(),
      scheduled_time: payload.scheduledTime || '',
      patient_name: payload.patientName || '',
      patient_age: payload.patientAge ? Number(payload.patientAge) : null,
      patient_gender: payload.patientGender || null,
      patient_phone: payload.patientPhone || '',
      patient_email: payload.patientEmail || '',
      address: payload.address || '',
      city: payload.city || '',
      total_amount: Number(payload.totalAmount || 0),
      amount_paid: Number(payload.amountPaid || 0),
      payment_status: payload.paymentStatus || 'pending',
      payment_method: payload.paymentMethod || 'cash',
      workflow_status: payload.paymentStatus === 'paid' ? 'payment_completed' : 'booked',
      source: payload.source || 'walk_in',
      staff_notes: payload.notes || '',
    };

    // Billing and the patient link only exist after phase2.sql. Sending them
    // to a database that has not run it would fail the whole insert, so they
    // are added only when the columns are known to be there.
    if (phase2) {
      Object.assign(row, {
        patient_id: payload.patientId || null,
        subtotal_amount: Number(payload.subtotalAmount ?? payload.totalAmount ?? 0),
        discount: Number(payload.discount || 0),
        discount_type: payload.discountType || 'amount',
        discount_reason: payload.discountReason || '',
      });
    }

    const { data, error } = await withFields((f) =>
      supabase.from('booked_tests').insert(row).select(f).single(),
    );
    if (error) {
      // The retry above re-selects, but an insert that carried unknown columns
      // has to be sent again without them.
      if (isMissingColumn(error)) {
        phase2 = false;
        ['patient_id', 'subtotal_amount', 'discount', 'discount_type', 'discount_reason']
          .forEach((k) => delete row[k]);
        const retry = await supabase.from('booked_tests').insert(row).select(CORE_FIELDS).single();
        if (retry.error) throw retry.error;
        return retry.data;
      }
      throw error;
    }

    // Money taken at the counter becomes the first line of the bill's ledger.
    // The trigger recomputes amount_paid from it, arriving at the figure just
    // written — so this adds history without changing the total.
    if (phase2 && Number(payload.amountPaid || 0) > 0) {
      await billingService
        .record({
          bookingId: data.id,
          labId,
          amount: payload.amountPaid,
          method: payload.paymentMethod || 'cash',
          note: 'Collected at booking',
          receivedBy: payload.userId || null,
        })
        .catch(() => {});
    }
    return data;
  },

  /** Every booking for one lab, optionally filtered by stage or date. */
  async listForLab(labId, { statuses, date, search, limit = 200 } = {}) {
    let q = supabase
      .from('booked_tests')
      .select(FIELD_LIST())
      .eq('lab_id', labId)
      .order('scheduled_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (statuses?.length) q = q.in('workflow_status', statuses);
    if (date) q = q.eq('scheduled_date', date);
    const { data, error } = await q;
    if (error) throw error;
    let rows = data || [];
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.patient_name || '').toLowerCase().includes(s) ||
          (r.booking_ref || '').toLowerCase().includes(s) ||
          (r.patient_phone || '').includes(s),
      );
    }
    return rows;
  },

  /** Admin: every booking scheduled for `date` across every lab, plus lab names. */
  async listAllForDate(date) {
    const { data, error } = await supabase
      .from('booked_tests')
      .select(`${FIELD_LIST()}, labs:lab_id ( id, name, lab_ref, city )`)
      .eq('scheduled_date', date)
      .order('scheduled_time', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /** One booking with its lab and report, for a details drawer. */
  async get(id) {
    const { data, error } = await supabase
      .from('booked_tests')
      .select(`${FIELD_LIST()}, labs:lab_id ( id, name, lab_ref )`)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Generic patch — the stage guards live in the database trigger. */
  async update(id, patch) {
    const { data, error } = await supabase
      .from('booked_tests')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(FIELD_LIST())
      .single();
    if (error) throw error;
    return data;
  },

  // ---- the stage transitions, named after what the staff member is doing ----

  /** Receptionist: record a payment. */
  recordPayment(id, { amountPaid, paymentMethod, paymentStatus }) {
    return labBookingService.update(id, {
      amount_paid: Number(amountPaid || 0),
      payment_method: paymentMethod || 'cash',
      payment_status: paymentStatus || 'paid',
      workflow_status: paymentStatus === 'paid' ? 'payment_completed' : 'payment_pending',
      payment_collected: paymentStatus === 'paid',
      payment_collected_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
    });
  },

  /** Receptionist: hand the booking to the testing queue. */
  sendToTesting(id) {
    return labBookingService.update(id, { workflow_status: 'sent_for_testing' });
  },

  /** Tester: pick up a task. */
  startTesting(id, testerId) {
    return labBookingService.update(id, {
      workflow_status: 'testing_in_progress',
      assigned_tester: testerId || null,
    });
  },

  /** Tester: done — the booking becomes the reportist's task. */
  completeTesting(id, notes) {
    return labBookingService.update(id, {
      workflow_status: 'testing_completed',
      ...(notes ? { staff_notes: notes } : {}),
    });
  },

  /** Reportist: close the booking after the PDF is in. */
  markCompleted(id) {
    return labBookingService.update(id, { workflow_status: 'completed', status: 'completed' });
  },

  cancel(id) {
    return labBookingService.update(id, { workflow_status: 'cancelled', status: 'cancelled' });
  },

  /**
   * Lab Admin only: remove a booking outright, at any stage.
   *
   * The RLS delete policy is restricted to lab_admin of the owning lab, so a
   * receptionist or tester calling this gets nothing deleted rather than a
   * silent success. booking_activity and any medical_reports row cascade or
   * null out with the booking, which is why the UI asks first.
   */
  async remove(id) {
    const { error } = await supabase.from('booked_tests').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  /** Counts per stage for one lab — drives the dashboard tiles and task badges. */
  async stageCounts(labId, date) {
    let q = supabase.from('booked_tests').select('workflow_status, scheduled_date').eq('lab_id', labId);
    if (date) q = q.eq('scheduled_date', date);
    const { data, error } = await q;
    if (error) throw error;
    const out = {};
    (data || []).forEach((r) => {
      out[r.workflow_status] = (out[r.workflow_status] || 0) + 1;
    });
    out.total = (data || []).length;
    return out;
  },

  /** Audit trail for one booking. */
  async activity(bookingId) {
    const { data, error } = await supabase
      .from('booking_activity')
      .select('id, action, from_status, to_status, actor_role, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

export default labBookingService;
