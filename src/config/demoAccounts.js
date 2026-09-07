/**
 * ------------------------------------------------------------------
 *  DEMO / DUMMY LOGIN ACCOUNTS
 * ------------------------------------------------------------------
 *  Test credentials surfaced on the sign-in page so the whole flow can
 *  be walked through without creating accounts by hand. These are real
 *  Supabase users — create them once by running section 15 of
 *  `newSQL.html` in the Supabase SQL Editor.
 *
 *  Keep the passwords here in sync with that script.
 * ------------------------------------------------------------------
 */
export const DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    name: 'LabEasy Admin',
    email: 'admin@adminlabeasy.com',
    password: 'admin@labeasy',
    role: 'admin',
    hint: 'Platform admin — every lab, the Today board, approvals',
  },
  {
    label: 'User',
    name: 'Demo Lab Admin',
    email: 'user@userlabeasy.com',
    password: 'user@labeasy',
    role: 'lab_admin',
    hint: 'Lab Admin of the demo lab — full lab dashboard',
  },
  {
    label: 'Receptionist',
    name: 'Demo Receptionist',
    email: 'reception@userlabeasy.com',
    password: 'user@labeasy',
    role: 'receptionist',
    hint: 'Bookings, payments, send to testing',
  },
  {
    label: 'Tester',
    name: 'Demo Tester',
    email: 'tester@userlabeasy.com',
    password: 'user@labeasy',
    role: 'tester',
    hint: 'The testing queue only',
  },
  {
    label: 'Reportist',
    name: 'Demo Reportist',
    email: 'reportist@userlabeasy.com',
    password: 'user@labeasy',
    role: 'reportist',
    hint: 'Upload report PDFs and close bookings',
  },
];

/** Tone per role for the badge on each demo card. */
export const DEMO_ROLE_TONES = {
  admin: 'bg-slate-800 text-white',
  lab_admin: 'bg-primary-100 text-primary-800',
  receptionist: 'bg-amber-100 text-amber-800',
  tester: 'bg-indigo-100 text-indigo-700',
  reportist: 'bg-emerald-100 text-emerald-700',
};

/**
 * Whether to render the demo credentials panel.
 *
 * Always on while running `npm run dev`; on a deployed build it only
 * shows when `VITE_SHOW_DEMO_LOGINS=true` is set, so production sites
 * don't advertise test logins by accident.
 */
export const showDemoAccounts =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_LOGINS === 'true';
