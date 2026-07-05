import { Link, useLocation } from 'react-router-dom';
import { FaEnvelopeOpenText } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useSettings } from '../../context/SettingsContext.jsx';

/** Post-registration screen asking the user to confirm their email. */
export default function VerifyEmail() {
  useDocumentTitle('Verify Email');
  const location = useLocation();
  const { brandName } = useSettings();
  const email = location.state?.email;

  return (
    <PageTransition>
      <div className="card p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <FaEnvelopeOpenText size={30} aria-hidden="true" />
        </span>

        <h2 className="mt-5 text-2xl font-bold text-gray-900">Verify your email</h2>

        <p className="mt-2 text-sm text-gray-500">
          We&apos;ve sent a confirmation link
          {email ? (
            <>
              {' '}
              to <span className="font-semibold text-gray-700">{email}</span>
            </>
          ) : (
            ' to your inbox'
          )}
          . Click the link in that email to activate your {brandName} account, then come back here to
          sign in.
        </p>

        <Link to="/login" className="btn-primary mt-6 w-full">
          I&apos;ve verified — Sign in
        </Link>

        <p className="mt-4 text-xs text-gray-400">
          Didn&apos;t receive anything? Check your spam folder, or register again with the same
          email to resend the confirmation link.
        </p>
      </div>
    </PageTransition>
  );
}
