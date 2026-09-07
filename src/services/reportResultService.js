import { supabase } from '../supabase/supabase.js';

/**
 * The structured report: what was measured against each parameter.
 *
 * A tester (or the Lab Admin) types a value per parameter; this saves those
 * values against the booking and keeps a `medical_reports` row in step so the
 * booking still appears in the Reports queue and can have a signed PDF
 * attached later.
 *
 * Names, units and ranges are snapshotted onto each row on purpose — a report
 * issued today must keep reading the same way after the catalogue is edited
 * next year.
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

/**
 * High / low against the numeric range, when the parameter defines one.
 *
 * The range has already been chosen for this patient's sex and age by
 * resolveParameters() before it reaches here — so this only has to compare a
 * number against the two bounds it was given, and a parameter with no bounds
 * is simply never flagged.
 */
export function flagFor(value, param) {
  const n = Number(String(value).replace(/[, ]/g, ''));
  if (value === '' || value == null || Number.isNaN(n)) return '';
  if (param?.refLow != null && n < Number(param.refLow)) return 'low';
  if (param?.refHigh != null && n > Number(param.refHigh)) return 'high';
  if (param?.refLow == null && param?.refHigh == null) return '';
  return 'normal';
}

export const FLAG_STYLES = {
  low: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-700',
  abnormal: 'bg-red-100 text-red-700',
  normal: 'bg-emerald-100 text-emerald-700',
  '': 'bg-gray-100 text-gray-600',
};

export const FLAG_LABELS = { low: 'Low', high: 'High', abnormal: 'Abnormal', normal: 'Normal', '': '—' };

export const reportResultService = {
  /** Everything recorded against one booking, in display order. */
  async listForBooking(bookingId) {
    const { data, error } = await supabase
      .from('report_values')
      .select('*')
      .eq('booking_id', bookingId)
      .order('sort_order');
    if (!error) return { values: data || [], schemaMissing: false };
    if (isMissingSchema(error)) return { values: [], schemaMissing: true };
    throw error;
  },

  /**
   * Save the whole result sheet for a booking.
   *
   * Replaces every value for that booking in one go — the entry form always
   * submits the complete sheet, so a partial diff would only invite rows that
   * disagree with what the tester saw on screen.
   */
  async save({ booking, labId, rows, enteredBy, title, notes }) {
    // 1. the report record, so the booking shows up on the Reports desk
    let reportId = null;
    const { data: existing } = await supabase
      .from('medical_reports')
      .select('id')
      .eq('booking_id', booking.id)
      .maybeSingle();

    if (existing?.id) {
      reportId = existing.id;
      await supabase
        .from('medical_reports')
        .update({ updated_at: new Date().toISOString(), interpretation: notes || '' })
        .eq('id', existing.id)
        // The interpretation column arrives with phase2.sql; without it the
        // timestamp still has to be written.
        .then((r) => (r.error && isMissingSchema(r.error)
          ? supabase.from('medical_reports')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', existing.id)
          : r));
    } else {
      const { data: created, error: repErr } = await supabase
        .from('medical_reports')
        .insert({
          lab_id: labId,
          booking_id: booking.id,
          user_id: booking.user_id || null,
          title: title || `Lab Report — ${booking.patient_name || booking.booking_ref}`,
          status: 'processing',
          uploaded_by: enteredBy || null,
        })
        .select('id')
        .single();
      if (repErr) throw repErr;
      reportId = created.id;
    }

    // 2. the values
    const { error: delErr } = await supabase.from('report_values').delete().eq('booking_id', booking.id);
    if (delErr) throw delErr;

    const payload = rows.map((r, i) => ({
      booking_id: booking.id,
      lab_id: labId,
      report_id: reportId,
      test_id: r.testId || null,
      test_name: r.testName || '',
      parameter_id: r.parameterId || null,
      parameter_name: r.parameterName,
      unit: r.unit || '',
      ref_range: r.refRange || '',
      value: String(r.value ?? ''),
      flag: r.flag || '',
      group_label: r.groupLabel || '',
      sort_order: i,
      entered_by: enteredBy || null,
    }));

    // Method and the standing comment are snapshotted too, so a report reads
    // the same way in five years even after the catalogue moves on.
    const enriched = payload.map((row, i) => ({
      ...row,
      method: rows[i].method || '',
      interpretation: rows[i].interpretation || '',
    }));

    if (payload.length) {
      const { error } = await supabase.from('report_values').insert(enriched);
      if (error) {
        if (!isMissingSchema(error)) throw error;
        const retry = await supabase.from('report_values').insert(payload);
        if (retry.error) throw retry.error;
      }
    }
    return { reportId, count: payload.length };
  },
};

export default reportResultService;
