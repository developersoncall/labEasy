import { Link } from 'react-router-dom';
import PageTransition from '../../components/common/PageTransition.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useSettings } from '../../context/SettingsContext.jsx';

const LAST_UPDATED = '1 June 2026';

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-gray-600 sm:text-base">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  useDocumentTitle('Privacy Policy');
  const { contactEmail, contactPhone, contactHours, contactAddress } = useSettings();

  return (
    <PageTransition>
      <section className="section-padding">
        <div className="container-custom">
          <div className="mx-auto max-w-3xl">
            <span className="badge bg-primary-50 text-primary-700 uppercase tracking-wide">Legal</span>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

            <p className="mt-6 text-sm leading-relaxed text-gray-600 sm:text-base">
              LabEasy (&ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;) provides doctor
              appointments, video consultations, diagnostic test bookings and digital health records
              through the LabEasy website and services. Your health information is among the most
              sensitive data there is, and this policy explains — in plain language — what we
              collect, why we collect it, how we protect it and the choices you have.
            </p>

            <Section title="1. Data we collect">
              <p>We collect only what we need to deliver and improve your care:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Account details</strong> — your name, email address, phone number and
                  password (stored in hashed form only) when you register.
                </li>
                <li>
                  <strong>Profile information</strong> — optional details such as date of birth,
                  gender, address and an avatar photo, if you choose to add them.
                </li>
                <li>
                  <strong>Booking information</strong> — the doctors, tests and packages you book,
                  patient details you enter, chosen slots, collection addresses and payment status.
                </li>
                <li>
                  <strong>Health records</strong> — diagnostic reports, prescriptions and doctor
                  notes generated through the platform.
                </li>
                <li>
                  <strong>Communications</strong> — messages you send through our contact form,
                  reviews you write and support conversations.
                </li>
                <li>
                  <strong>Technical data</strong> — device type, browser, approximate location and
                  usage events, used to keep the service secure and reliable.
                </li>
              </ul>
            </Section>

            <Section title="2. How we use your data">
              <ul className="list-disc space-y-2 pl-5">
                <li>To create and manage your account and authenticate your sign-ins.</li>
                <li>To schedule appointments, sample collections and video consultations.</li>
                <li>To deliver reports and prescriptions to your dashboard and notify you when they are ready.</li>
                <li>To process payments and refunds, and to send booking confirmations and reminders.</li>
                <li>To respond to support requests and improve the quality of our services.</li>
                <li>To meet legal and regulatory obligations that apply to healthcare providers.</li>
              </ul>
              <p>
                We do not sell your personal data, and we do not use your medical records for
                advertising of any kind.
              </p>
            </Section>

            <Section title="3. Medical data & reports">
              <p>
                Your diagnostic reports, prescriptions and consultation notes are visible only to
                you and to the healthcare professionals directly involved in your care — for
                example, the doctor you consult or the pathologist validating your report. Partner
                laboratories receive only the details necessary to process your samples.
              </p>
              <p>
                We never share medical records with employers, insurers or marketers. Aggregated,
                fully anonymised statistics (for example, the number of thyroid tests booked in a
                month) may be used to plan capacity, but these can never be traced back to you.
              </p>
            </Section>

            <Section title="4. Cookies">
              <p>
                We use a small number of cookies and similar browser-storage technologies to keep
                you signed in, remember items in your test cart and understand how the site is used
                so we can improve it. Essential cookies cannot be switched off because the service
                will not function without them; analytics cookies are optional and can be blocked in
                your browser settings without affecting your bookings.
              </p>
            </Section>

            <Section title="5. Third parties">
              <p>We share data with a limited set of service providers, strictly to run LabEasy:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Partner laboratories and doctors</strong> — the patient and booking details
                  needed to perform your tests or consultations.
                </li>
                <li>
                  <strong>Payment processors</strong> — payment details are handled directly by
                  PCI-DSS-compliant payment gateways; we never store your full card number.
                </li>
                <li>
                  <strong>Infrastructure providers</strong> — cloud hosting and database services
                  that store data on our behalf under strict data-processing agreements.
                </li>
              </ul>
              <p>
                Each provider is contractually bound to use your data only for the service they
                provide to us, and disclosure to authorities happens only where the law requires it.
              </p>
            </Section>

            <Section title="6. Storage & security">
              <p>
                Your data is stored on Supabase, a secure managed cloud platform. All traffic
                between your device and our servers is encrypted with TLS, and data — including
                reports and prescriptions — is encrypted at rest. Access within our team follows the
                principle of least privilege: staff can only reach the data their role strictly
                requires, and all access is logged.
              </p>
              <p>
                Row-level security policies ensure that your records are technically isolated from
                other users&rsquo; records at the database layer, not just in the application.
              </p>
            </Section>

            <Section title="7. Your rights">
              <p>You are in control of your data. At any time you can:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Access and download your reports, prescriptions and profile information from your dashboard.</li>
                <li>Correct inaccurate profile details through the Edit Profile page.</li>
                <li>Request a full export of the personal data we hold about you.</li>
                <li>Request deletion of your account and associated personal data, subject to records we must retain by law.</li>
                <li>Withdraw consent for optional processing, such as promotional emails, at any time.</li>
              </ul>
              <p>
                To exercise any of these rights, write to us at{' '}
                <a href={`mailto:${contactEmail}`} className="font-medium text-primary-600 hover:text-primary-700">
                  {contactEmail}
                </a>
                . We respond to verified requests within 30 days.
              </p>
            </Section>

            <Section title="8. Data retention">
              <p>
                We keep your account data for as long as your account is active. Diagnostic reports
                and prescriptions remain available in your dashboard so your medical history stays
                intact. If you delete your account, personal data is erased or anonymised within 90
                days, except for records that healthcare and tax regulations require us to retain —
                these are archived securely and deleted once the statutory period ends.
              </p>
            </Section>

            <Section title="9. Contact us">
              <p>
                If you have questions about this policy or how your data is handled, contact our
                privacy team:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Email: {contactEmail}</li>
                <li>Phone: {contactPhone} ({contactHours})</li>
                <li>Post: {contactAddress}</li>
              </ul>
              <p>
                You can also reach us through the{' '}
                <Link to="/contact" className="font-medium text-primary-600 hover:text-primary-700">
                  contact form
                </Link>
                . If we update this policy, we will revise the date at the top of this page and,
                for significant changes, notify you by email or an in-app notice.
              </p>
            </Section>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
