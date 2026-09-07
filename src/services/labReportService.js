import { supabase } from '../supabase/supabase.js';

/**
 * Report PDFs, written by the Reportist.
 *
 * Files go into the existing private `reports` bucket under
 *   reports/lab/<lab_id>/<booking_ref>_<timestamp>.pdf
 * which is exactly the prefix the storage policies added in newSQL.html allow
 * for that lab's staff — one lab can never read another lab's folder, and the
 * row in `medical_reports` carries the same lab_id for the table-level check.
 */
const BUCKET = 'reports';

const FIELDS =
  'id, report_ref, lab_id, booking_id, user_id, title, report_url, file_path, file_name, ' +
  'file_size, mime_type, status, is_verified, uploaded_by, notes, completed_at, created_at';

export const labReportService = {
  /** Upload the PDF and attach it to the booking. */
  async upload({ labId, booking, file, uploadedBy, title, notes }) {
    const safeName = (file.name || 'report.pdf').replace(/[^\w.\-]+/g, '_');
    const path = `lab/${labId}/${booking.booking_ref || booking.id}_${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
    if (upErr) throw upErr;

    const row = {
      lab_id: labId,
      booking_id: booking.id,
      user_id: booking.user_id || null,
      title: title || `Lab Report — ${booking.patient_name || booking.booking_ref}`,
      report_url: path,
      file_path: path,
      file_name: safeName,
      file_size: file.size || null,
      mime_type: file.type || 'application/pdf',
      status: 'processing',
      uploaded_by: uploadedBy || null,
      notes: notes || '',
    };

    const { data, error } = await supabase.from('medical_reports').insert(row).select(FIELDS).single();
    if (error) {
      // Don't leave an orphan file behind if the row insert was refused.
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
      throw error;
    }
    return data;
  },

  /** Replace the PDF on an existing report row. */
  async replaceFile(report, file) {
    const safeName = (file.name || 'report.pdf').replace(/[^\w.\-]+/g, '_');
    const path = `lab/${report.lab_id}/${report.id}_${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from('medical_reports')
      .update({
        report_url: path,
        file_path: path,
        file_name: safeName,
        file_size: file.size || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id)
      .select(FIELDS)
      .single();
    if (error) throw error;
    if (report.file_path) await supabase.storage.from(BUCKET).remove([report.file_path]).catch(() => {});
    return data;
  },

  /**
   * Attach a generated PDF to a report row that already exists.
   *
   * The result-entry flow creates the report record first (so the values have
   * something to hang from), then approves and generates the file — this is
   * the second half of that, and it updates rather than inserting so a booking
   * never ends up with two report rows.
   */
  async attachFile({ reportId, labId, booking, file, signedBy, previousPath }) {
    const safeName = (file.name || `report-${booking.booking_ref || booking.id}.pdf`)
      .replace(/[^\w.\-]+/g, '_');
    const path = `lab/${labId}/${booking.booking_ref || booking.id}_${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: 'application/pdf', upsert: false });
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from('medical_reports')
      .update({
        report_url: path,
        file_path: path,
        file_name: safeName,
        file_size: file.size || null,
        mime_type: 'application/pdf',
        status: 'signed',
        is_verified: true,
        signed_by: signedBy || null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select(FIELDS)
      .single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
      throw error;
    }

    // A regenerated report supersedes the old file; drop it once the row is
    // safely pointing at the new one.
    if (previousPath && previousPath !== path) {
      await supabase.storage.from(BUCKET).remove([previousPath]).catch(() => {});
    }
    return data;
  },

  /** Reportist: sign the report off. */
  async markCompleted(id) {
    const { data, error } = await supabase
      .from('medical_reports')
      .update({
        status: 'signed',
        is_verified: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(FIELDS)
      .single();
    if (error) throw error;
    return data;
  },

  async listForLab(labId, { limit = 200 } = {}) {
    const { data, error } = await supabase
      .from('medical_reports')
      .select(`${FIELDS}, booked_tests:booking_id ( id, booking_ref, patient_name, scheduled_date )`)
      .eq('lab_id', labId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async forBooking(bookingId) {
    const { data, error } = await supabase
      .from('medical_reports')
      .select(FIELDS)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /** Short-lived signed link — reports are never publicly reachable. */
  async downloadUrl(pathOrUrl) {
    if (!pathOrUrl) return null;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUrl, 3600);
    if (error) throw error;
    return data?.signedUrl || null;
  },
};

export default labReportService;
