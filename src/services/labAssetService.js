import { supabase } from '../supabase/supabase.js';

/**
 * The laboratory's logo and the signature that goes on its reports.
 *
 * These live in a public bucket, unlike verification paperwork and reports.
 * They are printed on every document the lab hands out, so treating them as
 * secrets would be theatre — and a public URL is what lets jsPDF fetch them
 * while a report is being generated.
 *
 * Writes are still folder-scoped to `<lab_id>/`, so one lab can never replace
 * another lab's letterhead.
 */
const BUCKET = 'lab-assets';

const isMissingSchema = (err) => {
  const msg = err?.message || '';
  return (
    ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(err?.code) ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /bucket not found/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
};

export const ASSET_KINDS = {
  logo: { column: 'logo_path', label: 'Logo', hint: 'Printed at the top left of every report.' },
  signature: {
    column: 'signature_path',
    label: 'Signature',
    hint: 'Printed above the approval line. A transparent PNG looks best.',
  },
};

const MAX_BYTES = 1024 * 1024; // 1 MB — a letterhead image, not a photograph

export const labAssetService = {
  /** A browsable URL for something already stored. */
  publicUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl || '';
  },

  /**
   * Replace one of the lab's images.
   *
   * `upsert` on a stable path per kind, so a lab that changes its logo four
   * times does not leave four files behind — and every report generated after
   * the change picks up the new one without any cache to clear.
   */
  async upload(labId, kind, file) {
    const meta = ASSET_KINDS[kind];
    if (!meta) throw new Error('Unknown image type.');
    if (!file) throw new Error('Choose a file first.');
    if (!/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i.test(file.type)) {
      throw new Error('Use a PNG, JPEG, WebP or SVG image.');
    }
    if (file.size > MAX_BYTES) throw new Error('Keep the image under 1 MB.');

    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${labId}/${kind}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) {
      if (isMissingSchema(upErr)) {
        throw new Error('Image storage needs phase2.sql to be run in the Supabase SQL Editor.');
      }
      throw upErr;
    }

    const { error } = await supabase
      .from('labs')
      .update({ [meta.column]: path, updated_at: new Date().toISOString() })
      .eq('id', labId);
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
      throw error;
    }

    // Cache-busted, because the path is stable on purpose.
    return { path, url: `${labAssetService.publicUrl(path)}?v=${Date.now()}` };
  },

  async remove(labId, kind, path) {
    const meta = ASSET_KINDS[kind];
    if (!meta) return false;
    const { error } = await supabase
      .from('labs')
      .update({ [meta.column]: '', updated_at: new Date().toISOString() })
      .eq('id', labId);
    if (error) throw error;
    if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    return true;
  },

  /** The report-appearance settings a Lab Admin can change. */
  async saveBranding(labId, branding) {
    const { error } = await supabase
      .from('labs')
      .update({
        signatory_name: branding.signatoryName || '',
        signatory_designation: branding.signatoryDesignation || '',
        signatory_reg_no: branding.signatoryRegNo || '',
        report_footer: branding.reportFooter || '',
        report_header_note: branding.reportHeaderNote || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', labId);
    if (error) {
      if (isMissingSchema(error)) {
        throw new Error('Report settings need phase2.sql to be run in the Supabase SQL Editor.');
      }
      throw error;
    }
    return true;
  },

  /**
   * The lab, with its images resolved to URLs a PDF can fetch.
   *
   * Every report generator takes this rather than the raw row, so nothing
   * downstream has to know where the files are kept.
   */
  withAssets(lab) {
    if (!lab) return lab;
    return {
      ...lab,
      logoUrl: labAssetService.publicUrl(lab.logo_path),
      signatureUrl: labAssetService.publicUrl(lab.signature_path),
    };
  },
};

export default labAssetService;
