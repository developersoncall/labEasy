/**
 * Platform-wide constants for the lab-first architecture.
 *
 * Roles here mirror `user_profiles.role` exactly — the same strings the RLS
 * helpers in newSQL.html compare against. Keep them in step with the database
 * and there is only ever one definition of who may do what.
 */

export const ROLES = {
  ADMIN: 'admin',
  LAB_ADMIN: 'lab_admin',
  RECEPTIONIST: 'receptionist',
  TESTER: 'tester',
  REPORTIST: 'reportist',
  PATIENT: 'patient',
};

export const LAB_ROLES = [ROLES.LAB_ADMIN, ROLES.RECEPTIONIST, ROLES.TESTER, ROLES.REPORTIST];

/** Where each role belongs after signing in. */
export function homeForRole(role, { publicPortalEnabled = false } = {}) {
  if (role === ROLES.ADMIN) return '/admin';
  if (LAB_ROLES.includes(role)) return '/lab';
  return publicPortalEnabled ? '/dashboard' : '/';
}

/**
 * Which lab-dashboard sections a role may open. The database enforces the same
 * boundaries; this drives what the sidebar shows so nobody is offered a button
 * that would fail.
 */
export const LAB_SECTION_ACCESS = {
  dashboard: LAB_ROLES,
  // Today is the shared board: everyone at the lab sees the day, whatever
  // stage of it they own.
  today: LAB_ROLES,
  bookings: [ROLES.LAB_ADMIN, ROLES.RECEPTIONIST],
  // The register is reception's tool, and the report desk needs it to check
  // what a patient was tested for last time.
  patients: [ROLES.LAB_ADMIN, ROLES.RECEPTIONIST, ROLES.REPORTIST],
  testing: [ROLES.LAB_ADMIN, ROLES.TESTER],
  reports: [ROLES.LAB_ADMIN, ROLES.REPORTIST],
  tests: [ROLES.LAB_ADMIN],
  // The books are the Lab Admin's; a receptionist sees a bill, not the day's
  // margin. The database policy on lab_expenses says the same thing.
  accounts: [ROLES.LAB_ADMIN],
  staff: [ROLES.LAB_ADMIN],
  help: LAB_ROLES,
  settings: [ROLES.LAB_ADMIN],
};

export const canAccessLabSection = (role, section) =>
  (LAB_SECTION_ACCESS[section] || []).includes(role);

/** sessionStorage key holding a lab registration that still needs filing. */
export const PENDING_LAB_KEY = 'labeasy_pending_lab';
