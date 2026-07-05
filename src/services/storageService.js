import { supabase } from '../supabase/supabase.js';

/**
 * Supabase Storage helpers for report PDFs.
 *
 * Reports live in a PRIVATE bucket called `reports`. We store the object
 * PATH on medical_reports.report_url (not a public URL) and mint a short-lived
 * signed URL only when someone with access downloads it — so medical reports
 * are never openly accessible by guessing a link.
 */
const BUCKET = 'reports';

export const storageService = {
  /**
   * Upload a report file into  reports/{userId}/{timestamp}_{name}.
   * Returns the storage path to save on the report row.
   */
  async uploadReport(userId, file) {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${userId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
    if (error) throw error;
    return path;
  },

  /**
   * Upload a prescription PDF into  reports/{userId}/presc_{timestamp}_{name}.
   * Reuses the same private bucket + policies as reports.
   */
  async uploadPrescription(userId, file) {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${userId}/presc_${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
    if (error) throw error;
    return path;
  },

  /**
   * Turn a stored path into a temporary (1 hour) download URL.
   * Passes through any value that is already a full http(s) URL (legacy rows).
   */
  async reportUrl(pathOrUrl) {
    if (!pathOrUrl) return null;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUrl, 3600);
    if (error) throw error;
    return data?.signedUrl || null;
  },
};
