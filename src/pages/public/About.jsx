import { Link } from 'react-router-dom';
import {
  IoHeart,
  IoFlask,
  IoEye,
  IoShieldCheckmark,
  IoLockClosed,
  IoRibbon,
  IoArrowForward,
} from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useSettings } from '../../context/SettingsContext.jsx';

const STATS = [
  { value: '550+', label: 'Verified doctors' },
  { value: '300+', label: 'Lab tests & packages' },
  { value: '75,000+', label: 'Patients cared for' },
  { value: '12', label: 'Cities served' },
];


const VALUES = [
  {
    icon: IoHeart,
    title: 'Patient first',
    text: 'Every decision starts with a simple question — does this make care easier, faster or kinder for the patient? If not, we do not ship it.',
  },
  {
    icon: IoFlask,
    title: 'Clinical rigour',
    text: 'Doctors are credential-verified, labs are NABL-accredited, and abnormal results are double-checked by senior pathologists before release.',
  },
  {
    icon: IoEye,
    title: 'Transparency',
    text: 'Upfront pricing, clear preparation instructions and honest turnaround times. No hidden charges, no surprise add-ons at checkout.',
  },
  {
    icon: IoShieldCheckmark,
    title: 'Privacy',
    text: 'Your health records belong to you. Data is encrypted in transit and at rest, and is never shared without your explicit consent.',
  },
];

const QUALITY = [
  {
    icon: IoRibbon,
    title: 'NABL-accredited labs',
    text: 'Every partner laboratory holds NABL accreditation and follows daily calibration, internal quality-control runs and external proficiency testing.',
  },
  {
    icon: IoShieldCheckmark,
    title: 'ISO-aligned processes',
    text: 'Our sample handling, reporting and data-management workflows are aligned to ISO 15189 and ISO 27001 practices for quality and information security.',
  },
  {
    icon: IoLockClosed,
    title: 'Encrypted health data',
    text: 'Reports, prescriptions and personal details are protected with bank-grade encryption in transit and at rest on secure cloud infrastructure.',
  },
];

export default function About() {
  useDocumentTitle('About Us');
  const { brandName } = useSettings();

  const MILESTONES = [
    { year: '2021', event: `${brandName} founded in Dhaka with 40 partner doctors` },
    { year: '2022', event: 'Home sample collection launched across 4 cities' },
    { year: '2023', event: 'Accredited partner lab network crosses 50 centres' },
    { year: '2024', event: 'Secure video consultations rolled out nationwide' },
    { year: '2025', event: '75,000 patients served across 12 cities in Bangladesh' },
  ];

  return (
    <PageTransition>
      {/* Hero strip */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="container-custom section-padding">
          <div className="mx-auto max-w-3xl text-center">
            <span className="badge bg-white/15 text-white uppercase tracking-wide">About {brandName}</span>
            <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl text-balance">
              Healthcare that shows up on time, every time.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-primary-100 sm:text-lg">
              Our mission is to make quality diagnostics and doctor consultations effortless — book a
              trusted doctor, get samples collected at home and receive accurate digital reports, all
              from one simple platform.
            </p>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-b border-gray-100 bg-white">
        <div className="container-custom py-10">
          <dl className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.08}>
                <div>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="text-3xl font-bold text-primary-600 sm:text-4xl">{stat.value}</dd>
                  <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </dl>
        </div>
      </section>

      {/* Our story */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <FadeIn>
              <div>
                <SectionHeading
                  eyebrow="Our story"
                  title="Started in 2021, built around one waiting room too many"
                  align="left"
                />
                <div className="space-y-4 text-sm leading-relaxed text-gray-600 sm:text-base">
                  <p>
                    {brandName} began in 2021 when our founders spent an entire day shuttling between a
                    clinic, a diagnostic centre and a pharmacy — for a single routine check-up. The
                    paperwork was duplicated, the queues were long and the reports arrived days late
                    on paper that was easy to lose.
                  </p>
                  <p>
                    We believed healthcare logistics should feel as effortless as ordering groceries.
                    So we built one platform where you can find a verified doctor, book an in-clinic
                    or video consultation, schedule lab tests with home sample collection and keep
                    every report and prescription safely in one place.
                  </p>
                  <p>
                    Today, {brandName} connects patients in 12 cities with over 550 verified doctors and
                    an accredited lab network — and we are just getting started.
                  </p>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="card bg-gradient-to-br from-primary-50 to-secondary-50 p-6 sm:p-8">
                <h3 className="mb-6 text-lg font-semibold text-gray-900">Milestones along the way</h3>
                <ol className="space-y-5">
                  {MILESTONES.map((m) => (
                    <li key={m.year} className="flex items-start gap-4">
                      <span className="badge shrink-0 bg-primary-600 text-white">{m.year}</span>
                      <p className="text-sm leading-relaxed text-gray-700">{m.event}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Values grid */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionHeading
            eyebrow="What we stand for"
            title="The values behind every appointment"
            subtitle={`Four principles guide how we build ${brandName} and how we treat every patient who trusts us with their health.`}
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, i) => (
              <FadeIn key={value.title} delay={i * 0.08}>
                <div className="card-hover h-full p-6">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <value.icon size={24} aria-hidden="true" />
                  </span>
                  <h3 className="mb-2 text-base font-semibold">{value.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{value.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Quality & accreditation */}
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Quality & accreditation"
            title="Standards you can verify, not just take our word for"
            subtitle="Accuracy and security are not features — they are the foundation of everything we do."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {QUALITY.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1}>
                <div className="card h-full p-6">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
                    <item.icon size={24} aria-hidden="true" />
                  </span>
                  <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="pb-14 md:pb-20">
        <div className="container-custom">
          <FadeIn>
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-12 text-center text-white sm:px-12 md:flex-row md:justify-between md:text-left">
              <div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Have a question about your care?
                </h2>
                <p className="mt-2 max-w-xl text-sm text-primary-100 sm:text-base">
                  Our support team is available every day from 7 AM to 10 PM — write to us and we
                  will get back within one working day.
                </p>
              </div>
              <Link
                to="/contact"
                className="btn shrink-0 bg-white text-primary-700 shadow-sm hover:bg-primary-50"
                aria-label={`Contact the ${brandName} team`}
              >
                Contact us
                <IoArrowForward aria-hidden="true" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
