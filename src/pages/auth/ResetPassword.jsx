import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaCheckCircle, FaExclamationCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

/** Set-a-new-password page, opened from the email reset link. */
export default function ResetPassword() {
  useDocumentTitle('Reset Password');
  const { resetPassword } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const passwordValue = watch('password', '');

  const onSubmit = async ({ password }) => {
    setServerError('');
    try {
      await resetPassword(password);
      setDone(true);
    } catch (err) {
      setServerError(err?.message || 'Could not update your password. Please try again.');
    }
  };

  if (done) {
    return (
      <PageTransition>
        <div className="card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
            <FaCheckCircle size={26} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Password updated</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your password has been changed successfully. Sign in with your new password to
            continue.
          </p>
          <Link to="/login" className="btn-primary mt-6 w-full">
            Go to sign in
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900">Set a new password</h2>
        <p className="mt-1 text-sm text-gray-500">
          Open this page from the reset link in your email.
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
            <label htmlFor="reset-password" className="form-label">
              New password
            </label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min 8 characters, at least one number"
                className={`input-field pr-11 ${errors.password ? 'input-error' : ''}`}
                aria-invalid={errors.password ? 'true' : 'false'}
                {...field('password', {
                  required: 'New password is required.',
                  minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                  validate: (value) =>
                    /\d/.test(value) || 'Password must contain at least one number.',
                })}
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

          <div>
            <label htmlFor="reset-confirm" className="form-label">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="reset-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                className={`input-field pr-11 ${errors.confirmPassword ? 'input-error' : ''}`}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                {...field('confirmPassword', {
                  required: 'Please confirm your new password.',
                  validate: (value) => value === passwordValue || 'Passwords do not match.',
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:text-primary-600"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Updating password…
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Changed your mind?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}
