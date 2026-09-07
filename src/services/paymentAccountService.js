import { supabase } from '../supabase/supabase.js';

/**
 * Where money is actually sent: a UPI ID, a phone number, a scan-to-pay QR, or
 * bank details.
 *
 * One table serves two scopes. A row with `lab_id = null` belongs to the
 * platform and every laboratory can read it; a row with a `lab_id` belongs to
 * that laboratory alone. A QR code is the same object either way, so splitting
 * it in two would only mean maintaining the same screen twice.
 *
 * Nothing here moves money. These are the destinations a patient is shown at
 * the counter, and the record of which one a payment came through — which is
 * what reconciling a settlement statement later needs.
 */
const BUCKET = 'payment-qr';

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

const FIELDS =
  'id, lab_id, kind, label, upi_id, phone, qr_path, account_name, bank_name, ' +
  'account_number, ifsc, instructions, is_active, is_default, sort_order, created_at';

export const ACCOUNT_KINDS = [
  { value: 'upi', label: 'UPI ID', hint: 'name@bank — the patient pays from any UPI app.' },
  { value: 'qr', label: 'Scan-to-pay QR', hint: 'An image the counter shows the patient.' },
  { value: 'phone', label: 'Mobile number', hint: 'For UPI-by-number, or a payment request.' },
  { value: 'bank', label: 'Bank transfer', hint: 'Account number and IFSC.' },
  { value: 'cash', label: 'Cash', hint: 'Taken at the counter — nothing to configure.' },
];

export const kindLabel = (k) => ACCOUNT_KINDS.find((x) => x.value === k)?.label || k || 'Other';

/** The one line a receptionist reads out or a patient types in. */
export function accountDetail(a) {
  if (!a) return '';
  if (a.kind === 'upi') return a.upi_id || '';
  if (a.kind === 'phone') return a.phone || '';
  if (a.kind === 'bank') {
    return [a.account_number, a.ifsc].filter(Boolean).join('  ·  ');
  }
  if (a.kind === 'qr') return a.upi_id || a.phone || 'Scan the QR code';
  return '';
}

/** A validation message, or '' when the row is safe to save. */
export function validateAccount(form) {
  if (!form.kind) return 'Choose what kind of payment option this is.';
  if (form.kind === 'upi' && !String(form.upiId || '').trim()) {
    return 'Enter the UPI ID.';
  }
  if (form.kind === 'phone' && !String(form.phone || '').trim()) {
    return 'Enter the mobile number.';
  }
  if (form.kind === 'bank' && !String(form.accountNumber || '').trim()) {
    return 'Enter the account number.';
  }
  if (form.kind === 'qr' && !String(form.qrPath || '').trim()) {
    return 'Upload the QR image.';
  }
  return '';
}

const toRow = (form, labId) => ({
  lab_id: labId ?? null,
  kind: form.kind || 'upi',
  label: form.label || '',
  upi_id: form.upiId || '',
  phone: form.phone || '',
  qr_path: form.qrPath || '',
  account_name: form.accountName || '',
  bank_name: form.bankName || '',
  account_number: form.accountNumber || '',
  ifsc: form.ifsc || '',
  instructions: form.instructions || '',
  is_active: form.isActive !== false,
  is_default: !!form.isDefault,
  sort_order: Number(form.sortOrder || 0),
});

export const paymentAccountService = {
  /** A browsable URL for a stored QR image. */
  qrUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl || '';
  },

  /**
   * The accounts for one scope.
   *
   * `labId` null lists the platform's own; a lab id lists that lab's plus the
   * platform's, because a lab that has not set up its own should still be able
   * to show the patient somewhere to pay.
   */
  async list({ labId = null, includePlatform = false, activeOnly = false } = {}) {
    let q = supabase.from('payment_accounts').select(FIELDS).order('sort_order').order('created_at');

    if (labId && includePlatform) q = q.or(`lab_id.eq.${labId},lab_id.is.null`);
    else if (labId) q = q.eq('lab_id', labId);
    else q = q.is('lab_id', null);

    if (activeOnly) q = q.eq('is_active', true);

    const { data, error } = await q;
    if (error) {
      if (isMissingSchema(error)) return { accounts: [], schemaMissing: true };
      throw error;
    }
    return { accounts: data || [], schemaMissing: false };
  },

  async save(form, { labId = null, createdBy } = {}) {
    const problem = validateAccount(form);
    if (problem) throw new Error(problem);

    const row = toRow(form, labId);
    const q = form.id
      ? supabase.from('payment_accounts').update(row).eq('id', form.id)
      : supabase.from('payment_accounts').insert({ ...row, created_by: createdBy || null });

    const { data, error } = await q.select(FIELDS).single();
    if (error) {
      if (isMissingSchema(error)) {
        throw new Error('Payment options need payment-options.sql to be run in the Supabase SQL Editor.');
      }
      throw error;
    }
    return data;
  },

  async remove(account) {
    const { error } = await supabase.from('payment_accounts').delete().eq('id', account.id);
    if (error) throw error;
    // The row is gone; the image behind it should not linger in the bucket.
    if (account.qr_path) await supabase.storage.from(BUCKET).remove([account.qr_path]).catch(() => {});
    return true;
  },

  async setActive(id, isActive) {
    const { error } = await supabase
      .from('payment_accounts')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  /** The database un-marks the previous default; this only sets the new one. */
  async makeDefault(id) {
    const { error } = await supabase
      .from('payment_accounts')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  /**
   * Store a QR image and hand back its path.
   *
   * Uploaded before the row is saved, so the file has a unique name rather than
   * a stable one — an account that has not been created yet has no id to key on,
   * and overwriting a shared filename would swap two labs' QR codes.
   */
  async uploadQr(file, { labId = null } = {}) {
    if (!file) throw new Error('Choose an image first.');
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      throw new Error('Use a PNG, JPEG or WebP image.');
    }
    if (file.size > 2 * 1024 * 1024) throw new Error('Keep the image under 2 MB.');

    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const folder = labId || 'platform';
    const path = `${folder}/qr_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      if (isMissingSchema(error)) {
        throw new Error('QR storage needs payment-options.sql to be run in the Supabase SQL Editor.');
      }
      throw error;
    }
    return { path, url: paymentAccountService.qrUrl(path) };
  },

  async removeQr(path) {
    if (!path) return true;
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    return true;
  },
};

export default paymentAccountService;
