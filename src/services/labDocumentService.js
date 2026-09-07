import { supabase } from '../supabase/supabase.js';

/**
 * The paperwork a laboratory is verified against.
 *
 * Files go into the private `lab-docs` bucket under  lab-docs/<lab_id>/…  and
 * a row in `lab_documents` indexes them. Both the bucket policy and the table
 * policy resolve through can_manage_lab_docs(), which — unlike every other
 * lab-scoped rule — does NOT require the lab to be approved: a pending lab has
 * to be able to send its licence, and the admin has to be able to read it
 * before deciding.
 */
const BUCKET = 'lab-docs';

export const DOC_TYPES = [
  { value: 'license', label: 'Laboratory licence', hint: 'Required for verification' },
  { value: 'registration', label: 'Registration certificate' },
  { value: 'accreditation', label: 'Accreditation (NABL, ISO…)' },
  { value: 'id_proof', label: 'Owner ID proof' },
  { value: 'address_proof', label: 'Address proof' },
  { value: 'other', label: 'Other document' },
];

export const docTypeLabel = (v) => DOC_TYPES.find((d) => d.value === v)?.label || 'Document';

/** The lab_documents table only arrives with section 19 of newSQL.html. */
const isMissingSchema = (err) => {
  const msg = err?.message || '';
  return (
    err?.code === '42P01' ||
    err?.code === '42703' ||
    err?.code === 'PGRST204' ||
    err?.code === 'PGRST205' ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /could not find the table/i.test(msg) ||
    /bucket not found/i.test(msg)
  );
};

export const labDocumentService = {
  /** Upload one PDF and index it against the lab. */
  async upload({ labId, file, docType = 'other', title, uploadedBy }) {
    const safeName = (file.name || 'document.pdf').replace(/[^\w.\-]+/g, '_');
    const path = `${labId}/${docType}_${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from('lab_documents')
      .insert({
        lab_id: labId,
        doc_type: docType,
        title: title || docTypeLabel(docType),
        file_path: path,
        file_name: safeName,
        file_size: file.size || null,
        mime_type: file.type || 'application/pdf',
        uploaded_by: uploadedBy || null,
      })
      .select('*')
      .single();

    if (error) {
      // Never leave an orphan file behind if the index row was refused.
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
      throw error;
    }
    return data;
  },

  /**
   * Upload several at once. Returns what succeeded and what didn't, so a
   * registration is never lost because one file failed.
   */
  async uploadMany(labId, entries, uploadedBy) {
    const uploaded = [];
    const failed = [];
    for (const entry of entries) {
      try {
        // Sequential on purpose: a handful of PDFs, and a clearer failure list.
        // eslint-disable-next-line no-await-in-loop
        uploaded.push(await labDocumentService.upload({ ...entry, labId, uploadedBy }));
      } catch (err) {
        failed.push({ name: entry.file?.name || 'document', message: err?.message || 'Upload failed' });
      }
    }
    return { uploaded, failed };
  },

  /** Documents for one lab. `schemaMissing` when section 19 has not been run. */
  async listForLab(labId) {
    const { data, error } = await supabase
      .from('lab_documents')
      .select('*')
      .eq('lab_id', labId)
      .order('created_at', { ascending: false });
    if (!error) return { documents: data || [], schemaMissing: false };
    if (isMissingSchema(error)) return { documents: [], schemaMissing: true };
    throw error;
  },

  async remove(doc) {
    const { error } = await supabase.from('lab_documents').delete().eq('id', doc.id);
    if (error) throw error;
    if (doc.file_path) await supabase.storage.from(BUCKET).remove([doc.file_path]).catch(() => {});
    return true;
  },

  /** Short-lived signed link — the bucket is private. */
  async viewUrl(path) {
    if (!path) return null;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data?.signedUrl || null;
  },
};

export default labDocumentService;
