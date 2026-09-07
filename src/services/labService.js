import { supabase } from '../supabase/supabase.js';

/**
 * Laboratories — registration, the admin approval queue and lab profile.
 *
 * Every write here is additionally guarded in the database: `protect_lab_status`
 * forces a new registration to `pending` and refuses any status change that
 * does not come from a platform admin, so a lab can never approve itself.
 */

const LAB_FIELDS =
  'id, lab_ref, name, slug, email, phone, alt_phone, contact_person, license_no, ' +
  'registration_no, address, city, pincode, description, logo_url, status, ' +
  'rejection_reason, approved_at, owner_user_id, created_at, updated_at';

const slugify = (t = '') =>
  t.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').slice(0, 60);

export const labService = {
  /** File a new lab registration for the signed-in owner. Always lands as pending. */
  async register(payload, ownerUserId) {
    const row = {
      name: payload.name,
      slug: `${slugify(payload.name)}-${Date.now().toString(36)}`,
      email: payload.email,
      phone: payload.phone || '',
      alt_phone: payload.altPhone || '',
      contact_person: payload.contactPerson || '',
      license_no: payload.licenseNo || '',
      registration_no: payload.registrationNo || '',
      address: payload.address || '',
      city: payload.city || '',
      pincode: payload.pincode || '',
      description: payload.description || '',
      owner_user_id: ownerUserId,
    };
    const { data, error } = await supabase.from('labs').insert(row).select(LAB_FIELDS).single();
    if (error) throw error;
    return data;
  },

  /** One lab by id. */
  async get(id) {
    const { data, error } = await supabase.from('labs').select(LAB_FIELDS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Admin: every registered lab, newest first. `status` filters the queue. */
  async list({ status } = {}) {
    let q = supabase.from('labs').select(LAB_FIELDS).order('created_at', { ascending: false });
    if (status && status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  /** Admin: approve / reject / suspend / reactivate. */
  async setStatus(id, status, { reason, approvedBy } = {}) {
    const patch = { status, updated_at: new Date().toISOString() };
    if (status === 'approved') {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = approvedBy || null;
      patch.rejection_reason = null;
      patch.suspended_at = null;
    }
    if (status === 'rejected') patch.rejection_reason = reason || '';
    if (status === 'suspended') patch.suspended_at = new Date().toISOString();
    const { data, error } = await supabase.from('labs').update(patch).eq('id', id).select(LAB_FIELDS).single();
    if (error) throw error;
    return data;
  },

  /** Lab Admin: edit the lab's own profile (status fields are ignored by the DB). */
  async updateProfile(id, patch) {
    const { data, error } = await supabase
      .from('labs')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(LAB_FIELDS)
      .single();
    if (error) throw error;
    return data;
  },

  /** Admin dashboard tiles. */
  async counts() {
    const { data, error } = await supabase.from('labs').select('status');
    if (error) throw error;
    const rows = data || [];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
      suspended: rows.filter((r) => r.status === 'suspended').length,
    };
  },
};

export default labService;
