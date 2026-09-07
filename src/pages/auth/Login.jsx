import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { supabase } from '../../supabase/supabase.js';
import { homeForRole } from '../../config/platform.js';
import { DEMO_ACCOUNTS, DEMO_ROLE_TONES, showDemoAccounts } from '../../config/demoAccounts.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One sign-in for every role.
 *
 * The role on `user_profiles` decides where you land: platform admins in the
 * admin panel, anyone attached to a laboratory in the lab dashboard, patients
 * in their dashboard (or back to the public page while that portal is off).
 */
export default function Login() {
  useDocumentTitle('Sign In');
  const { login } = useAuth();
  const { brandName, publicPortalEnabled, labRegistrationOpen } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register: field,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      const user = await login({ email, password });

      // Read the role straight from the profile rather than waiting for the
      // context to catch up, so the very first navigation is already correct.
      let role = null;
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        role = data?.role || null;
      } catch {
        role = null;
      }

      const fallback = homeForRole(role, { publicPortalEnabled });
      // Honour where they were headed, but never send a lab or admin account
      // into the patient area.
      const from = location.state?.from;
      const target = from && from.startsWith(fallback) ? from : fallback;
      navigate(target, { replace: true });
    } catch (err) {
      setServerError(err?.message || 'Unable to sign in. Please try again.');
    }
  };

  // Drop a demo account into the form and sign in with it right away.
  const useDemoAccount = ({ email, password }) => {
    setServerError('');
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    handleSubmit(onSubmit)();
  };

  return (
    <PageTransition>
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="mt-1 text-sm text-gray-500">
          Sign in to your {brandName} admin panel or laboratory dashboard.
        </p>

        {serverError && (
          <div
            className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            role="alert"
          >
            <FaExclamationCircle className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="login-email" className="form-label">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@yourlab.com"
              className={`input-field ${errors.email ? 'input-error' : ''}`}
              aria-invalid={errors.email ? 'true' : 'false'}
              {...field('email', {
                required: 'Email is required.',
                pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address.' },
              })}
            />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="form-label mb-0">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`input-field pr-11 ${errors.password ? 'input-error' : ''}`}
                aria-invalid={errors.password ? 'true' : 'false'}
                {...field('password', { required: 'Password is required.' })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:text-primary-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {showDemoAccounts && (
          <section className="mt-6 rounded-xl border border-dashed border-primary-200 bg-primary-50/60 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-700">Demo accounts</h3>
              <span className="text-[11px] text-gray-500">tap to fill</span>
            </div>
            <ul className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => useDemoAccount(account)}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-left transition hover:border-primary-300 hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">{account.name}</span>
                      <span className={`badge ${DEMO_ROLE_TONES[account.role] || 'bg-gray-100 text-gray-700'}`}>
                        {account.label}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-gray-600">
                      {account.email} · {account.password}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{account.hint}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {labRegistrationOpen && (
          <>
            <div className="my-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs uppercase tracking-wide text-gray-400">New to {brandName}?</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <p className="text-center text-sm text-gray-600">
              Running a diagnostic laboratory?{' '}
              <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
                Register with us
              </Link>
            </p>
          </>
        )}
      </div>
    </PageTransition>
  );
}
