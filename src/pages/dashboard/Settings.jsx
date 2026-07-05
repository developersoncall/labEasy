import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  FaUser, FaLock, FaRegBell, FaExclamationTriangle, FaSignOutAlt,
  FaTrashAlt, FaCheckCircle, FaExclamationCircle,
} from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useSettings } from '../../context/SettingsContext.jsx';

const PREFS_KEY = 'labeasy_prefs';

const DEFAULT_PREFS = {
  emailReminders: true,
  reportAlerts: true,
  healthTips: false,
};

const PREF_OPTIONS = [
  {
    id: 'emailReminders',
    label: 'Email reminders',
    description: 'Appointment and sample-collection reminders in your inbox.',
  },
  {
    id: 'reportAlerts',
    label: 'Report alerts',
    description: 'Get notified the moment a lab report is verified and ready.',
  },
  {
    id: 'healthTips',
    label: 'Health tips',
    description: 'Occasional seasonal wellness tips from our doctors.',
  },
];

const loadPrefs = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY));
    return { ...DEFAULT_PREFS, ...(stored || {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

/** Accessible toggle switch persisted per preference. */
function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-primary-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

function SettingsCard({ icon: Icon, iconClass, title, description, children }) {
  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={16} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Account, security, notification-preference and danger-zone settings. */
export default function Settings() {
  useDocumentTitle('Settings');
  const { user, resetPassword, logout } = useAuth();
  const { contactEmail, brandName } = useSettings();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState(loadPrefs);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const {
    register: field,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const newPassword = watch('newPassword');

  const onChangePassword = async ({ newPassword: pwd }) => {
    setPasswordSuccess('');
    setPasswordError('');
    try {
      await resetPassword(pwd);
      setPasswordSuccess('Your password has been updated successfully.');
      reset();
    } catch (err) {
      setPasswordError(err?.message || 'Could not update your password. Please try again.');
    }
  };

  const togglePref = (id) => setPrefs((p) => ({ ...p, [id]: !p[id] }));

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account, security and notification preferences.
        </p>
      </header>

      <div className="space-y-6">
        {/* Account */}
        <SettingsCard
          icon={FaUser}
          iconClass="bg-primary-50 text-primary-600"
          title="Account"
          description={`Your sign-in identity on ${brandName}.`}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-name" className="form-label">Full name</label>
              <input
                id="settings-name"
                type="text"
                value={user.user_metadata?.full_name || ''}
                readOnly
                className="input-field bg-gray-50 text-gray-500"
                aria-readonly="true"
              />
            </div>
            <div>
              <label htmlFor="settings-email" className="form-label">Email address</label>
              <input
                id="settings-email"
                type="email"
                value={user.email || ''}
                readOnly
                className="input-field bg-gray-50 text-gray-500"
                aria-readonly="true"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Want to change your name, phone or health details?{' '}
            <Link to="/dashboard/edit-profile" className="font-semibold text-primary-600 hover:underline">
              Edit your profile
            </Link>
          </p>
        </SettingsCard>

        {/* Security */}
        <SettingsCard
          icon={FaLock}
          iconClass="bg-secondary-50 text-secondary-600"
          title="Security"
          description="Change the password you use to sign in."
        >
          {passwordSuccess && (
            <div
              className="mb-4 flex items-start gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700"
              role="status"
            >
              <FaCheckCircle className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div
              className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
              role="alert"
            >
              <FaExclamationCircle className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onChangePassword)} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-new-password" className="form-label">New password</label>
              <input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={`input-field ${errors.newPassword ? 'input-error' : ''}`}
                aria-invalid={errors.newPassword ? 'true' : 'false'}
                {...field('newPassword', {
                  required: 'New password is required.',
                  minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                })}
              />
              {errors.newPassword && <p className="error-text">{errors.newPassword.message}</p>}
            </div>
            <div>
              <label htmlFor="settings-confirm-password" className="form-label">Confirm new password</label>
              <input
                id="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter new password"
                className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                {...field('confirmPassword', {
                  required: 'Please confirm your new password.',
                  validate: (value) => value === newPassword || 'Passwords do not match.',
                })}
              />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" /> Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </SettingsCard>

        {/* Notification preferences */}
        <SettingsCard
          icon={FaRegBell}
          iconClass="bg-amber-50 text-amber-600"
          title="Notification Preferences"
          description={`Choose what ${brandName} keeps you posted about.`}
        >
          <ul className="divide-y divide-gray-50">
            {PREF_OPTIONS.map(({ id, label, description }) => (
              <li key={id} className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{description}</p>
                </div>
                <Toggle checked={!!prefs[id]} onChange={() => togglePref(id)} label={label} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            Preferences are saved on this device automatically.
          </p>
        </SettingsCard>

        {/* Danger zone */}
        <SettingsCard
          icon={FaExclamationTriangle}
          iconClass="bg-red-50 text-red-500"
          title="Danger Zone"
          description="Sign out of this device or manage your account."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Log out</p>
                <p className="text-xs text-gray-500">You&apos;ll be signed out on this device only.</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-outline text-xs"
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <>
                    <Spinner size="sm" /> Signing out…
                  </>
                ) : (
                  <>
                    <FaSignOutAlt aria-hidden="true" /> Log Out
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-red-600">Delete account</p>
                <p className="text-xs text-gray-500">
                  To permanently delete your account and medical data, please{' '}
                  {contactEmail ? (
                    <>
                      write to{' '}
                      <a href={`mailto:${contactEmail}`} className="font-medium text-primary-600 hover:underline">
                        {contactEmail}
                      </a>
                    </>
                  ) : (
                    'contact our support team'
                  )}{' '}
                  — our team verifies identity before deletion.
                </p>
              </div>
              <button
                type="button"
                className="btn bg-red-100 text-red-400 text-xs"
                disabled
                aria-disabled="true"
                title="Contact support to delete your account"
              >
                <FaTrashAlt aria-hidden="true" /> Delete Account
              </button>
            </div>
          </div>
        </SettingsCard>
      </div>
    </PageTransition>
  );
}
