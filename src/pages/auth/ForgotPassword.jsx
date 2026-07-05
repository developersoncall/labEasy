import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaArrowLeft, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Request-a-reset-link page rendered inside AuthLayout's form panel. */
export default function ForgotPassword() {
  useDocumentTitle('Forgot Password');
  const { forgotPassword } = useAuth();

  const [sentTo, setSentTo] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const onSubmit = async ({ email }) => {
    setServerError('');
    try {
      await forgotPassword(email);
      setSentTo(email);
    } catch (err) {
      setServerError(err?.message || 'Something went wrong. Please try again.');
    }
  };

  if (sentTo) {
    return (
      <PageTransition>
        <div className="card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
            <FaCheckCircle size={26} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Check your inbox</h2>
          <div
            className="mt-4 rounded-xl border border-secondary-100 bg-secondary-50 px-4 py-3 text-sm text-secondary-700"
            role="status"
          >
            If an account exists for <span className="font-semibold">{sentTo}</span>, a reset link
            is on its way.
          </div>
          <p className="mt-4 text-sm text-gray-500">
            The link stays valid for a limited time. Don&apos;t see it? Check your spam folder
            before requesting another.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            <FaArrowLeft size={12} aria-hidden="true" /> Back to sign in
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900">Forgot your password?</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the email you registered with and we&apos;ll send you a link to reset it.
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
            <label htmlFor="forgot-email" className="form-label">
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`input-field ${errors.email ? 'input-error' : ''}`}
              aria-invalid={errors.email ? 'true' : 'false'}
              {...field('email', {
                required: 'Email is required.',
                pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address.' },
              })}
            />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Sending link…
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}
