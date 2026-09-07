import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase/supabase.js';

/**
 * Global authentication context.
 *
 * Supabase-only: real email/password auth backed by a session listener.
 * If Supabase is not configured, every action throws — the app renders
 * the setup notice instead of the routes until credentials are added.
 *
 * On top of the session it resolves the caller's *identity in the platform*
 * once per sign-in and shares it with the whole app:
 *
 *   role    admin | lab_admin | receptionist | tester | reportist | patient
 *   lab     the row from `labs` for every lab-side role (null for admin)
 *
 * Everything that gates a screen reads these — the same values the database
 * RLS policies use, so the UI and the backend can never disagree about who
 * someone is.
 */
const AuthContext = createContext(null);

const NOT_CONFIGURED_MESSAGE =
  'Supabase is not configured. Add your project credentials to .env';

/** Roles that belong to a laboratory rather than to the platform. */
export const LAB_ROLES = ['lab_admin', 'receptionist', 'tester', 'reportist'];

/** Throws when the Supabase client is missing (credentials not set). */
function requireSupabase() {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
  return supabase;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleChecked, setRoleChecked] = useState(false);
  const [identityError, setIdentityError] = useState('');

  // Resolve profile (role + lab_id) and, for lab accounts, the lab itself.
  //
  // Deliberately `select('*')`: naming the newer columns explicitly made the
  // whole query fail with "column lab_id does not exist" on a database where
  // newSQL.html has not been run yet, which left every account looking
  // role-less and bounced admins straight back out of /admin.
  const loadIdentity = useCallback(async (u) => {
    if (!supabase || !u) {
      setProfile(null);
      setLab(null);
      setIdentityError('');
      setRoleChecked(true);
      return;
    }
    setIdentityError('');
    let prof = null;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();
      if (error) throw error;
      prof = data || null;
      setProfile(prof);
      if (!prof) setIdentityError('No profile row exists for this account.');
    } catch (err) {
      setProfile(null);
      setIdentityError(err?.message || 'Could not read your account profile.');
      console.error('[auth] profile lookup failed:', err?.message || err);
    }

    // The lab lookup is separate on purpose: before the migration runs the
    // labs table does not exist, and that must not wipe out a valid profile.
    try {
      const query = supabase.from('labs').select('*');
      const { data: labRow } = prof?.lab_id
        ? await query.eq('id', prof.lab_id).maybeSingle()
        : await query.eq('owner_user_id', u.id).maybeSingle();
      setLab(labRow || null);
    } catch {
      setLab(null);
    }

    setRoleChecked(true);
  }, []);

  // ---------- bootstrap the session on first load ----------
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setRoleChecked(true);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data?.session?.user ?? null;
      setUser(sessionUser);
      setLoading(false);
      loadIdentity(sessionUser);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setRoleChecked(false);
      loadIdentity(sessionUser);
    });
    return () => sub?.subscription?.unsubscribe();
  }, [loadIdentity]);

  /** Re-read role/lab — used after registering a lab or changing a profile. */
  const refreshIdentity = useCallback(async () => {
    setRoleChecked(false);
    await loadIdentity(user);
  }, [loadIdentity, user]);

  // ---------- actions ----------
  const register = useCallback(async ({ fullName, email, phone, password, signupRole }) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      // signup_role is read by the handle_new_user() trigger. Only 'lab_admin'
      // is honoured there — every other role has to come from a staff invite.
      options: { data: { full_name: fullName, phone, signup_role: signupRole || '' } },
    });
    if (error) throw error;
    return { user: data.user, session: data.session, needsVerification: !data.session };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const client = requireSupabase();
    await client.auth.signOut();
    setUser(null);
    setProfile(null);
    setLab(null);
  }, []);

  const forgotPassword = useCallback(async (email) => {
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  }, []);

  const resetPassword = useCallback(async (newPassword) => {
    const client = requireSupabase();
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  }, []);

  // Update the signed-in user's metadata (name, phone, avatar_url) so it's
  // available app-wide via user.user_metadata — the header, greetings, etc.
  const updateUserMeta = useCallback(async (data) => {
    const client = requireSupabase();
    const { data: res, error } = await client.auth.updateUser({ data });
    if (error) throw error;
    if (res?.user) setUser(res.user);
    return res?.user;
  }, []);

  const role = profile?.role || null;
  const isLabRole = LAB_ROLES.includes(role);

  const value = {
    user,
    profile,
    lab,
    role,
    labId: profile?.lab_id || lab?.id || null,
    loading,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    isLabRole,
    isLabAdmin: role === 'lab_admin',
    // A lab account can only work once the platform admin has approved the lab
    // and the account itself is still active.
    labApproved: lab?.status === 'approved',
    accountActive: !profile || profile.status === 'active',
    roleChecked,
    identityError,
    refreshIdentity,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    updateUserMeta,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
