import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { phoneRule } from '../../utils/helpers.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Account creation page rendered inside AuthLayout's form panel. */
export default function Register() {
  useDocumentTitle('Create Account');
  const { register: registerUser } = useAuth();
  const { brandName } = useSettings();
  const navigate = useNavigate();
  const pr = phoneRule(); // country-aware phone rule

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const passwordValue = watch('password', '');

  const onSubmit = async ({ fullName, email, phone, password }) => {
    setServerError('');
    try {
      const result = await registerUser({ fullName, email, phone, password });
      if (result?.needsVerification) {
        navigate('/verify-email', { state: { email } });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setServerError(err?.message || 'Unable to create your account. Please try again.');
    }
  };

  return (
    <PageTransition>
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
        <p className="mt-1 text-sm text-gray-500">
          Book doctors, lab tests and health packages — all from one place.
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
            <label htmlFor="reg-name" className="form-label">
              Full name
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Priya Sharma"
              className={`input-field ${errors.fullName ? 'input-error' : ''}`}
              aria-invalid={errors.fullName ? 'true' : 'false'}
              {...field('fullName', {
                required: 'Full name is required.',
                minLength: { value: 2, message: 'Name must be at least 2 characters.' },
              })}
            />
            {errors.fullName && <p className="error-text">{errors.fullName.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="form-label">
              Email address
            </label>
            <input
              id="reg-email"
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

          <div>
            <label htmlFor="reg-phone" className="form-label">
              Mobile number
            </label>
            <input
              id="reg-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={pr.maxLength}
              placeholder={pr.placeholder}
              className={`input-field ${errors.phone ? 'input-error' : ''}`}
              aria-invalid={errors.phone ? 'true' : 'false'}
              {...field('phone', {
                required: 'Mobile number is required.',
                pattern: { value: pr.pattern, message: pr.message },
              })}
            />
            {errors.phone && <p className="error-text">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-password" className="form-label">
              Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min 8 characters, at least one number"
                className={`input-field pr-11 ${errors.password ? 'input-error' : ''}`}
                aria-invalid={errors.password ? 'true' : 'false'}
                {...field('password', {
                  required: 'Password is required.',
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
            <label htmlFor="reg-confirm" className="form-label">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className={`input-field pr-11 ${errors.confirmPassword ? 'input-error' : ''}`}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                {...field('confirmPassword', {
                  required: 'Please confirm your password.',
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

          <div>
            <label htmlFor="reg-terms" className="flex items-start gap-2.5 text-sm text-gray-600">
              <input
                id="reg-terms"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                aria-invalid={errors.terms ? 'true' : 'false'}
                {...field('terms', {
                  required: 'You must accept the terms to continue.',
                })}
              />
              <span>
                I agree to {brandName}&apos;s{' '}
                <Link
                  to="/terms"
                  className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy-policy"
                  className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {errors.terms && <p className="error-text">{errors.terms.message}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}
