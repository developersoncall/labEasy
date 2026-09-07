import { supabase, createSignupClient } from '../supabase/supabase.js';

/**
 * Lab staff — created and managed by the Lab Admin only.
 *
 * How an account is created without a service-role key:
 *   1. the Lab Admin records a `lab_staff_invites` row (lab + role)
 *   2. the account is signed up on a throwaway, session-less client so the
 *      Lab Admin stays signed in
 *   3. the `handle_new_user` trigger sees the pending invite and stamps the
 *      role + lab_id onto the new profile, then marks the invite accepted
 *
 * The role therefore never travels from the browser as a claim — the database
 * assigns it from a row only a Lab Admin was allowed to write. A staff member
 * cannot create staff: the invites table is `lab_admin`-only in RLS.
 */

export const STAFF_ROLES = [
  { value: 'receptionist', label: 'Receptionist', hint: 'Bookings, patient details, payments, send to testing' },
  { value: 'tester', label: 'Tester', hint: 'Runs the tests and updates testing status' },
  { value: 'reportist', label: 'Reportist', hint: 'Uploads the report PDF and closes the booking' },
  { value: 'lab_admin', label: 'Lab Admin', hint: 'Full control of this laboratory, including staff' },
];

export const ROLE_LABELS = {
  admin: 'Platform Admin',
  lab_admin: 'Lab Admin',
  receptionist: 'Receptionist',
  tester: 'Tester',
  reportist: 'Reportist',
  patient: 'Patient',
};

export const labStaffService = {
  /** Everyone attached to this lab. */
  async list(labId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email, phone, role, status, created_at')
      .eq('lab_id', labId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /** Staff who can be handed a testing / reporting task. */
  async listByRole(labId, role) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email, role, status')
      .eq('lab_id', labId)
      .eq('role', role)
      .eq('status', 'active');
    if (error) throw error;
    return data || [];
  },

  /**
   * Create a staff account: invite row first (so the trigger has something to
   * read), then the signup. If the signup fails the invite is revoked again so
   * a half-made staff member can't linger in the list.
   */
  async createStaff(labId, { fullName, email, phone, role, password, createdBy }) {
    const { data: invite, error: inviteError } = await supabase
      .from('lab_staff_invites')
      .insert({
        lab_id: labId,
        email: email.trim().toLowerCase(),
        full_name: fullName || '',
        phone: phone || '',
        role,
        created_by: createdBy || null,
      })
      .select('id')
      .single();
    if (inviteError) {
      if (inviteError.code === '23505') {
        throw new Error('An invite for this email is already pending.');
      }
      throw inviteError;
    }

    const signupClient = createSignupClient();
    const { data, error } = await signupClient.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName || '', phone: phone || '' } },
    });

    if (error) {
      await supabase.from('lab_staff_invites').update({ status: 'revoked' }).eq('id', invite.id);
      throw error;
    }
    // Never leave a session behind on the throwaway client.
    await signupClient.auth.signOut().catch(() => {});
    return { userId: data.user?.id || null, needsVerification: !data.session };
  },

  /** Activate / deactivate a staff member (they keep their history). */
  async setStatus(profileId, status) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .select('id, status')
      .single();
    if (error) throw error;
    return data;
  },

  /** Change what a staff member is allowed to do. */
  async setRole(profileId, role) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .select('id, role')
      .single();
    if (error) throw error;
    return data;
  },

  async updateStaff(profileId, patch) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .select('id, full_name, phone, role, status')
      .single();
    if (error) throw error;
    return data;
  },

  /** Invites that were never completed (signup pending). */
  async pendingInvites(labId) {
    const { data, error } = await supabase
      .from('lab_staff_invites')
      .select('id, email, full_name, role, status, created_at')
      .eq('lab_id', labId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async revokeInvite(id) {
    const { error } = await supabase.from('lab_staff_invites').update({ status: 'revoked' }).eq('id', id);
    if (error) throw error;
    return true;
  },
};

export default labStaffService;
