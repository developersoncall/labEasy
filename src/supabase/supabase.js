import { createClient } from '@supabase/supabase-js';

/**
 * ------------------------------------------------------------------
 *  SUPABASE CLIENT
 * ------------------------------------------------------------------
 *  The app REQUIRES these credentials — every catalog read and user
 *  write goes through Supabase. There is no offline fallback.
 *
 *  1. Copy `.env.example` to `.env`
 *  2. Set your project's credentials
 *     (Supabase Dashboard -> Project Settings -> API):
 *
 *       VITE_SUPABASE_URL      -> your project URL
 *       VITE_SUPABASE_ANON_KEY -> your anon/public key
 *
 *  3. Run the SQL from `database.html` in the Supabase SQL Editor.
 *  4. Restart `npm run dev`.
 * ------------------------------------------------------------------
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

/**
 * True when real credentials are present. While this is false the app
 * renders the Supabase setup notice instead of the routes — nothing
 * works until the `.env` credentials above are provided.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 30;

/**
 * Credentials re-exported for the one place that needs a SECOND client:
 * a Lab Admin creating a staff account. Signing that account up on the
 * shared client would swap the Lab Admin session for the new staff session,
 * so createSignupClient() below runs it on a throwaway, session-less client.
 */
export const SUPABASE_CREDENTIALS = { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };

/** A client that never touches localStorage — used only to create accounts. */
export function createSignupClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
