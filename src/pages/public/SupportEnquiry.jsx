import { Link } from 'react-router-dom';
import { FaFlask, FaArrowLeft, FaQuestionCircle, FaClock, FaShieldAlt } from 'react-icons/fa';
import SupportForm from '../../components/support/SupportForm.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

/**
 * Public enquiry form — for a laboratory that wants to ask something before
 * it registers.
 *
 * Same component the Lab Dashboard uses, so both routes land in the admin's
 * one Support Tickets queue. Deliberately outside PortalRoute: this has to
 * work while the patient portal is off, which is exactly when a prospective
 * lab is deciding whether to sign up.
 */
export default function SupportEnquiry() {
  const { brandName, contactEmail, contactPhone, labRegistrationOpen } = useSettings();
  useDocumentTitle('Contact support');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
              <FaFlask aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-gray-900">{brandName}</span>
          </Link>
          <Link to="/" className="btn-ghost px-4 py-2 text-sm">
            <FaArrowLeft aria-hidden="true" /> Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="badge bg-primary-100 text-primary-800">
            <FaQuestionCircle aria-hidden="true" /> Before you register
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Ask us anything
          </h1>
          <p className="mt-4 leading-relaxed text-gray-600">
            Not sure whether {brandName} fits how your laboratory works? Send us the question and a real
            person will answer. You do not need an account.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="card p-6 sm:p-8">
            <SupportForm submitLabel="Send enquiry" />
          </div>

          <aside className="space-y-4">
            <div className="card p-6">
              <h2 className="text-sm font-bold text-gray-900">What people usually ask</h2>
              <ul className="mt-3 space-y-3 text-sm text-gray-600">
                <li>
                  <p className="font-medium text-gray-800">How long does approval take?</p>
                  <p>Usually less than one working day once the registration is in.</p>
                </li>
                <li>
                  <p className="font-medium text-gray-800">Can my whole team have logins?</p>
                  <p>Yes — the Lab Admin creates a login per receptionist, tester and reportist.</p>
                </li>
                <li>
                  <p className="font-medium text-gray-800">Who can see our data?</p>
                  <p>Only your lab. Isolation is enforced in the database, not just the interface.</p>
                </li>
              </ul>
            </div>

            <div className="card p-6">
              <h2 className="text-sm font-bold text-gray-900">Other ways to reach us</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                {contactEmail && (
                  <li>
                    <a className="text-primary-600 hover:text-primary-700" href={`mailto:${contactEmail}`}>
                      {contactEmail}
                    </a>
                  </li>
                )}
                {contactPhone && <li>{contactPhone}</li>}
                <li className="flex items-center gap-2 pt-1 text-xs text-gray-400">
                  <FaClock aria-hidden="true" /> We reply to enquiries in order received.
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-400">
                  <FaShieldAlt aria-hidden="true" /> Please don&apos;t send patient details here.
                </li>
              </ul>
            </div>

            {labRegistrationOpen && (
              <div className="card bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white">
                <p className="font-semibold">Ready to go instead?</p>
                <p className="mt-1 text-sm text-white/80">
                  Registration takes a couple of minutes and you can ask questions afterwards.
                </p>
                <Link
                  to="/register"
                  className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
                >
                  Register With Us
                </Link>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
