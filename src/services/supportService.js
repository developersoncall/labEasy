import { supabase } from '../supabase/supabase.js';

/**
 * Support tickets to the platform admin.
 *
 * Deliberately the existing `contact_messages` table rather than a new one:
 * it already has status, priority, admin_reply and the TK01 reference that the
 * admin's Support Tickets screen reads, so a ticket raised from a lab lands in
 * the same queue the admin already works — nothing new to monitor.
 *
 * Two ways in:
 *   lab dashboard  — signed in, stamped with lab_id + user_id, so the lab can
 *                    follow its own thread
 *   public website — a lab asking questions before it registers; anonymous,
 *                    which the base script's "Anyone can submit" policy allows
 */

export const SUPPORT_CATEGORIES = [
  { value: 'general', label: 'General question' },
  { value: 'registration', label: 'Registration & approval' },
  { value: 'account', label: 'Account & staff logins' },
  { value: 'bookings', label: 'Bookings & workflow' },
  { value: 'reports', label: 'Reports & uploads' },
  { value: 'billing', label: 'Billing' },
  { value: 'bug', label: 'Something is broken' },
];

export const TICKET_STATUS_LABELS = {
  new: 'Open',
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

export const TICKET_STATUS_STYLES = {
  new: 'bg-amber-100 text-amber-800',
  open: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-primary-100 text-primary-800',
  resolved: 'bg-emerald-100 text-emerald-700',
};

/**
 * The newer columns are not in this database yet (section 17 of newSQL.html).
 *
 * Two shapes to catch: Postgres itself says 'column ... does not exist' (42703)
 * on a SELECT, while PostgREST rejects an INSERT earlier than that, from its
 * own schema cache, with PGRST204 and different wording.
 */
const isMissingColumn = (err) => {
  const msg = err?.message || '';
  return (
    err?.code === '42703' ||
    err?.code === 'PGRST204' ||
    /column .* does not exist/i.test(msg) ||
    /could not find the .* column/i.test(msg) ||
    /schema cache/i.test(msg)
  );
};

const FIELDS =
  'id, ticket_ref, name, email, phone, subject, message, category, status, ' +
  'priority, admin_reply, lab_id, user_id, source, created_at, updated_at';

export const supportService = {
  /**
   * File a ticket. `lab` and `userId` are optional — without them this is a
   * public enquiry from someone who has not registered yet.
   */
  async submit({ name, email, phone, subject, message, category, lab, userId, source }) {
    const record = {
      name,
      email,
      phone: phone || '',
      subject: subject || 'Support request',
      message,
      category: category || 'general',
      status: 'new',
      source: source || (lab ? 'lab_dashboard' : 'website'),
      lab_id: lab?.id || null,
      user_id: userId || null,
    };
    // No .select(): an anonymous visitor may INSERT but not read the row back.
    const { error } = await supabase.from('contact_messages').insert(record);
    if (!error) return true;
    if (!isMissingColumn(error)) throw error;

    // Older schema: keep the ticket, fold the extra context into the message
    // rather than dropping it on the floor.
    const context = [
      lab ? `Lab: ${lab.name}${lab.lab_ref ? ` (${lab.lab_ref})` : ''}` : null,
      record.category ? `Category: ${record.category}` : null,
    ].filter(Boolean).join(' · ');
    const { error: retryError } = await supabase.from('contact_messages').insert({
      name: record.name,
      email: record.email,
      phone: record.phone,
      subject: record.subject,
      message: context ? `${context}\n\n${record.message}` : record.message,
      status: 'new',
    });
    if (retryError) throw retryError;
    return true;
  },

  /** The tickets this lab has raised, newest first. */
  async listForLab(labId) {
    const { data, error } = await supabase
      .from('contact_messages')
      .select(FIELDS)
      .eq('lab_id', labId)
      .order('created_at', { ascending: false });
    if (!error) return { tickets: data || [], schemaMissing: false };
    if (isMissingColumn(error)) return { tickets: [], schemaMissing: true };
    throw error;
  },
};

export default supportService;
