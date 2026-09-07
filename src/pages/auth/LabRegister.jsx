import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  FaEye, FaEyeSlash, FaExclamationCircle, FaFlask, FaCheckCircle, FaInfoCircle,
} from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import LabForm from '../../components/lab/LabForm.jsx';
import DocumentPicker from '../../components/lab/DocumentPicker.jsx';
import { labDocumentService } from '../../services/labDocumentService.js';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { labService } from '../../services/labService.js';
import { PENDING_LAB_KEY } from '../../config/platform.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lab registration — the only registration the platform accepts right now.
 *
 * Step 1 creates the Lab Admin account (signup_role = 'lab_admin', which the
 * database trigger is allowed to honour); step 2 files the laboratory itself.
 * The lab row always lands as `pending`: `protect_lab_status` in the database
 * overwrites anything else, so no one can register an already-approved lab.
 *
 * If the project requires e-mail confirmation there is no session after
 * signup and the lab row cannot be written yet. The details are kept for the
 * user's next sign-in, where the lab area asks them to confirm and files it.
 */
export default function LabRegister() {
  useDocumentTitle('Register your laboratory');
  const { register: signUp, refreshIdentity } = useAuth();
  const { brandName, labRegistrationOpen } = useSettings();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [account, setAccount] = useState(null);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  // Chosen in step 2, uploaded in step 3 — a document needs a lab_id to
  // belong to, so the lab row has to exist first.
  const [documents, setDocuments] = useState([]);
  const [uploadNote, setUploadNote] = useState('');

  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const onAccountSubmit = (values) => {
    setServerError('');
    setAccount(values);
    setStep(2);
  };

  const onLabSubmit = async (labValues) => {
    setServerError('');
    try {
      // 1. the Lab Admin account
      const { session } = await signUp({
        fullName: account.fullName,
        email: account.email,
        phone: labValues.phone,
        password: account.password,
        signupRole: 'lab_admin',
      });

      const payload = { ...labValues, email: account.email };

      // 2. the laboratory — only possible once we hold a session
      if (session?.user) {
        const lab = await labService.register(payload, session.user.id);

        if (documents.length) {
          const { failed } = await labDocumentService.uploadMany(lab.id, documents, session.user.id);
          // A failed PDF must never cost them the registration: the lab is
          // filed either way and the documents can be added from Lab Settings.
          if (failed.length) {
            setUploadNote(`${failed.length} document(s) could not be uploaded. You can add them from Lab Settings.`);
          }
        }

        await refreshIdentity();
        navigate('/lab', { replace: true });
        return;
      }

      // E-mail confirmation is switched on: park the details and let them in
      // after they confirm.
      sessionStorage.setItem(PENDING_LAB_KEY, JSON.stringify(payload));
      setNeedsVerification(true);
    } catch (err) {
      setServerError(err?.message || 'Registration failed. Please try again.');
      setStep(2);
    }
  };

  if (!labRegistrationOpen) {
    return (
      <PageTransition>
        <div className="card p-8 text-center">
          <FaInfoCircle className="mx-auto text-3xl text-primary-500" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold text-gray-900">Registrations are paused</h2>
          <p className="mt-2 text-sm text-gray-600">
            {brandName} is not accepting new laboratory registrations at the moment. Please check back soon.
          </p>
          <Link to="/" className="btn-outline mt-6 w-full">Back to home</Link>
        </div>
      </PageTransition>
    );
  }

  if (needsVerification) {
    return (
      <PageTransition>
        <div className="card p-8 text-center">
          <FaCheckCircle className="mx-auto text-4xl text-emerald-500" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold text-gray-900">Confirm your email</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            We created your Lab Admin account for <strong>{account?.email}</strong>. Confirm the email we
            just sent, then sign in — we will file your laboratory registration the moment you are back.
          </p>
          <Link to="/login" className="btn-primary mt-6 w-full">Go to sign in</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="card p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
            <FaFlask aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Register your laboratory</h2>
            <p className="text-sm text-gray-500">Step {step} of 2 · {step === 1 ? 'Your login' : 'Lab details'}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-1.5" aria-hidden="true">
          <span className="h-1.5 flex-1 rounded-full bg-primary-600" />
          <span className={`h-1.5 flex-1 rounded-full ${step === 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-900">
          <FaInfoCircle className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
          <span>
            Currently, {brandName} is accepting registrations from{' '}
            <strong>diagnostic laboratories only</strong> — not hospitals, doctors or patients.
          </span>
        </div>

        {uploadNote && (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {uploadNote}
          </div>
        )}

        {serverError && (
          <div
            className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            role="alert"
          >
            <FaExclamationCircle className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        {step === 1 ? (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onAccountSubmit)} noValidate>
            <div>
              <label htmlFor="reg-name" className="form-label">Your full name *</label>
              <input
                id="reg-name"
                className={`input-field ${errors.fullName ? 'input-error' : ''}`}
                placeholder="Lab administrator's name"
                {...field('fullName', { required: 'Your name is required.' })}
              />
              {errors.fullName && <p className="error-text">{errors.fullName.message}</p>}
            </div>

            <div>
              <label htmlFor="reg-email" className="form-label">Work email *</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                className={`input-field ${errors.email ? 'input-error' : ''}`}
                placeholder="admin@yourlab.com"
                {...field('email', {
                  required: 'Email is required.',
                  pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address.' },
                })}
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
              <p className="mt-1 text-xs text-gray-500">This becomes your Lab Admin login.</p>
            </div>

            <div>
              <label htmlFor="reg-password" className="form-label">Password *</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input-field pr-11 ${errors.password ? 'input-error' : ''}`}
                  placeholder="At least 8 characters"
                  {...field('password', {
                    required: 'Password is required.',
                    minLength: { value: 8, message: 'Use at least 8 characters.' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="reg-confirm" className="form-label">Confirm password *</label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
                {...field('confirmPassword', {
                  required: 'Please repeat the password.',
                  validate: (v) => v === watch('password') || 'The passwords do not match.',
                })}
              />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              Continue to lab details
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <section className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-bold text-gray-900">Verification documents</h3>
              <p className="mb-3 mt-0.5 text-xs text-gray-500">
                PDFs only, up to 10 MB each. An administrator reads these before approving your lab.
              </p>
              <DocumentPicker value={documents} onChange={setDocuments} />
            </section>

            <LabForm onSubmit={onLabSubmit} submitLabel="Submit registration" />
            <button
              type="button"
              className="btn-ghost mt-3 w-full"
              onClick={() => { setStep(1); setServerError(''); }}
            >
              Back to account details
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}
