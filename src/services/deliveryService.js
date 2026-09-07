import { supabase } from '../supabase/supabase.js';

/**
 * Getting the report to the patient, and proving it is genuine.
 *
 * WhatsApp, SMS and e-mail are handed to the device rather than sent from a
 * server: the lab's own WhatsApp account and the staff member's own mail client
 * do the sending, and this records that it happened. That is a deliberate
 * choice, not a stub — routing patient reports through a third-party gateway is
 * a data-protection decision a lab should make explicitly, with its own
 * business account, and can be added behind this same interface when they do.
 *
 * The QR code on a printed report resolves to /verify/<token>, which confirms
 * the lab, the reference and the date. It never serves the PDF: anyone who
 * photographs a discarded printout would otherwise be handed the document.
 */

const isMissingSchema = (err) => {
  const msg = err?.message || '';
  return (
    ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(err?.code) ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /could not find the table/i.test(msg) ||
    /could not find the function/i.test(msg)
  );
};

export const CHANNELS = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'E-mail',
  print: 'Printed',
  download: 'Downloaded',
  link: 'Link shared',
};

/** Where a QR code should point for this deployment. */
export const verifyUrl = (token) =>
  `${window.location.origin}/verify/${token}`;

/** Digits only, with a country code so wa.me accepts it. */
export function waNumber(phone, defaultCode = '91') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length > 10) return digits;
  return `${defaultCode}${digits}`;
}

/** The message a lab would actually send. */
export function reportMessage({ lab, booking, report, url }) {
  const name = booking?.patient_name || 'there';
  const labName = lab?.name || 'our laboratory';
  const ref = report?.report_ref || booking?.booking_ref || '';
  return [
    `Dear ${name},`,
    '',
    `Your laboratory report from ${labName} is ready.`,
    ref ? `Reference: ${ref}` : '',
    url ? `Verify it here: ${url}` : '',
    '',
    'Please collect the printed copy from the laboratory, or reply to this message if you would like it sent to you.',
    labName,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

export const deliveryService = {
  /** Note that a report went out, so the lab can answer "did we send it?". */
  async log({ reportId, bookingId, labId, channel, destination, note, sentBy }) {
    const { data, error } = await supabase
      .from('report_deliveries')
      .insert({
        report_id: reportId || null,
        booking_id: bookingId || null,
        lab_id: labId,
        channel,
        destination: destination || '',
        note: note || '',
        sent_by: sentBy || null,
      })
      .select('*')
      .single();
    if (error) {
      // A missing deliveries table must never stop a report reaching a patient.
      if (isMissingSchema(error)) return null;
      throw error;
    }
    return data;
  },

  async listForReport(reportId) {
    const { data, error } = await supabase
      .from('report_deliveries')
      .select('id, channel, destination, status, sent_at, note')
      .eq('report_id', reportId)
      .order('sent_at', { ascending: false });
    if (error) {
      if (isMissingSchema(error)) return { deliveries: [], schemaMissing: true };
      throw error;
    }
    return { deliveries: data || [], schemaMissing: false };
  },

  /** The public verification lookup — safe to call signed out. */
  async verify(token) {
    const { data, error } = await supabase.rpc('verify_report', { p_token: token });
    if (error) {
      if (isMissingSchema(error)) return { result: null, schemaMissing: true };
      throw error;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return { result: row || null, schemaMissing: false };
  },
};

export default deliveryService;
