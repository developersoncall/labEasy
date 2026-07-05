import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase/supabase.js';

/**
 * Global authentication context.
 *
 * Supabase-only: real email/password auth backed by a session listener.
 * If Supabase is not configured, every action throws — the app renders
 * the setup notice instead of the routes until credentials are added.
 */
const AuthContext = createContext(null);

const NOT_CONFIGURED_MESSAGE =
  'Supabase is not configured. Add your project credentials to .env';

/** Throws when the Supabase client is missing (credentials not set). */
function requireSupabase() {
  if (!supabase) throw new Error(NOT_CONFIGURED_MESSAGE);
  return supabase;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  // Look up whether the signed-in user has the admin role.
  const checkAdminRole = useCallback(async (u) => {
    if (!supabase || !u) {
      setIsAdmin(false);
      setRoleChecked(true);
      return;
    }
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', u.id)
        .maybeSingle();
      setIsAdmin(data?.role === 'admin');
    } catch {
      setIsAdmin(false);
    } finally {
      setRoleChecked(true);
    }
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
      checkAdminRole(sessionUser);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setRoleChecked(false);
      checkAdminRole(sessionUser);
    });
    return () => sub?.subscription?.unsubscribe();
  }, [checkAdminRole]);

  // ---------- actions ----------
  const register = useCallback(async ({ fullName, email, phone, password }) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) throw error;
    return { user: data.user, needsVerification: !data.session };
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

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    roleChecked,
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
