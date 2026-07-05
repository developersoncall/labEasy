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

export default function Terms() {
  useDocumentTitle('Terms & Conditions');
  const { contactEmail } = useSettings();

  return (
    <PageTransition>
      <section className="section-padding">
        <div className="container-custom">
          <div className="mx-auto max-w-3xl">
            <span className="badge bg-primary-50 text-primary-700 uppercase tracking-wide">Legal</span>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Terms &amp; Conditions</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

            <Section title="1. Acceptance of these terms">
              <p>
                These Terms &amp; Conditions govern your use of the LabEasy website and services
                (&ldquo;the Platform&rdquo;). By creating an account, making a booking or otherwise
                using the Platform, you agree to be bound by these terms and by our{' '}
                <Link to="/privacy-policy" className="font-medium text-primary-600 hover:text-primary-700">
                  Privacy Policy
                </Link>
                . If you do not agree, please do not use the Platform. You must be at least 18 years
                old to create an account; bookings for minors must be made by a parent or guardian.
              </p>
            </Section>

            <Section title="2. Our services">
              <p>
                LabEasy is a healthcare facilitation platform. We enable you to discover and book
                in-clinic doctor appointments, video consultations, diagnostic tests, health
                packages and home sample collection, and to receive digital reports and
                prescriptions. Medical services themselves are provided by independent, verified
                doctors and NABL-accredited partner laboratories. LabEasy does not itself practise
                medicine and does not interfere with the clinical judgement of healthcare
                professionals.
              </p>
            </Section>

            <Section title="3. Your account">
              <p>
                You are responsible for keeping your login credentials confidential and for all
                activity that occurs under your account. Provide accurate, current information —
                especially patient details used for consultations and lab reports, since errors can
                affect your care. Notify us immediately at {contactEmail} if you suspect
                unauthorised use of your account. We may suspend accounts that provide false
                information or misuse the Platform.
              </p>
            </Section>

            <Section title="4. Bookings, cancellations & refunds">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  A booking is confirmed only after successful payment and an on-screen or email
                  confirmation from LabEasy.
                </li>
                <li>
                  Appointments cancelled at least 2 hours before the scheduled slot are refunded in
                  full to the original payment method within 3–5 working days.
                </li>
                <li>
                  Lab test and home-collection bookings can be cancelled free of charge any time
                  before the sample is collected; once a sample is collected, the booking cannot be
                  cancelled.
                </li>
                <li>
                  If a doctor or laboratory cancels or misses a confirmed booking, you may choose a
                  priority reschedule or a 100% refund.
                </li>
                <li>
                  Rescheduling is free and can be done from your dashboard, subject to slot
                  availability.
                </li>
              </ul>
            </Section>

            <Section title="5. Medical disclaimer — not for emergencies">
              <p>
                The Platform is not designed for medical emergencies. If you or someone near you is
                experiencing a life-threatening condition — such as chest pain, severe breathing
                difficulty, heavy bleeding or loss of consciousness — call your local emergency
                number or go to the nearest hospital immediately. Content on the Platform, including
                blog articles and test descriptions, is for general information only and is not a
                substitute for professional medical advice, diagnosis or treatment. Always consult a
                qualified doctor about your specific condition.
              </p>
            </Section>

            <Section title="6. Payments">
              <p>
                Prices for consultations, tests and packages are shown inclusive of applicable taxes
                unless stated otherwise. Payments are processed by secure, PCI-DSS-compliant payment
                gateways; LabEasy does not store your full card details. Where pay-after-collection
                is offered for home visits, payment is due at the time of sample collection.
                Discounted prices shown against an MRP reflect our negotiated partner rates and may
                change without notice, though confirmed bookings are always honoured at the price
                you paid.
              </p>
            </Section>

            <Section title="7. User conduct">
              <p>When using the Platform you agree not to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Impersonate another person or provide false patient information.</li>
                <li>Harass, abuse or threaten doctors, phlebotomists or support staff.</li>
                <li>Post reviews that are fraudulent, defamatory or unrelated to a genuine visit.</li>
                <li>Attempt to probe, scrape, disrupt or gain unauthorised access to the Platform or other users&rsquo; data.</li>
                <li>Use the Platform for any unlawful purpose or in breach of these terms.</li>
              </ul>
              <p>We may remove content or suspend accounts that violate these rules.</p>
            </Section>

            <Section title="8. Intellectual property">
              <p>
                The LabEasy name, logo, design, software and all content we create — including test
                descriptions, package curation and articles — are the intellectual property of
                LabEasy or its licensors. You may view and download materials for personal,
                non-commercial use. Reproducing, redistributing or creating derivative works from
                Platform content without our written permission is prohibited. Your medical reports
                remain your records; this clause does not restrict your use of your own health data.
              </p>
            </Section>

            <Section title="9. Limitation of liability">
              <p>
                To the maximum extent permitted by law, LabEasy&rsquo;s aggregate liability arising
                from or relating to the Platform is limited to the amount you paid for the specific
                booking giving rise to the claim. LabEasy is not liable for indirect or
                consequential losses, or for acts and omissions of independent doctors and partner
                laboratories in the course of clinical care, though we will always assist you in
                resolving grievances with our partners. Nothing in these terms limits liability that
                cannot be limited under applicable law.
              </p>
            </Section>

            <Section title="10. Governing law">
              <p>
                These terms are governed by the laws of Bangladesh. Any dispute arising out of or in
                connection with the Platform is subject to the exclusive jurisdiction of the courts
                at Bengaluru, Karnataka. We encourage you to contact our support team first — most
                concerns are resolved within a few working days.
              </p>
            </Section>

            <Section title="11. Changes to these terms">
              <p>
                We may update these terms from time to time to reflect new features, legal
                requirements or operational changes. The &ldquo;Last updated&rdquo; date at the top
                of this page shows the current version. For material changes we will notify you by
                email or an in-app notice before the changes take effect. Continuing to use the
                Platform after an update means you accept the revised terms. Questions? Write to us
                at {contactEmail} or via the{' '}
                <Link to="/contact" className="font-medium text-primary-600 hover:text-primary-700">
                  contact page
                </Link>
                .
              </p>
            </Section>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
