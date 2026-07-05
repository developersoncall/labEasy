import { Link } from 'react-router-dom';
import { FaUserMd, FaBoxOpen } from 'react-icons/fa';
import {
  IoVideocam,
  IoFlask,
  IoHome,
  IoDocumentText,
  IoArrowForward,
  IoHelpCircle,
} from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const SERVICES = [
  {
    icon: FaUserMd,
    title: 'Doctor Appointments',
    text: 'Find verified specialists near you, compare experience and fees, and book an in-clinic visit in under a minute — no phone calls, no waiting on hold.',
    path: '/doctors',
    linkLabel: 'Find a doctor',
  },
  {
    icon: IoVideocam,
    title: 'Video Consultations',
    text: 'Consult a doctor over a secure video call from home. Join from any phone or laptop and receive a digital prescription right after the call.',
    path: '/video-consultation',
    linkLabel: 'Consult online',
  },
  {
    icon: IoFlask,
    title: 'Diagnostic Tests',
    text: 'From blood sugar to thyroid profiles, choose from 300+ tests processed at NABL-accredited labs with clear pricing and fast turnaround.',
    path: '/diagnostic-tests',
    linkLabel: 'Browse tests',
  },
  {
    icon: FaBoxOpen,
    title: 'Health Packages',
    text: 'Curated full-body and condition-specific check-up packages that bundle the right tests together at a significant saving over individual prices.',
    path: '/health-packages',
    linkLabel: 'View packages',
  },
  {
    icon: IoHome,
    title: 'Home Sample Collection',
    text: 'A certified phlebotomist visits your doorstep with sealed single-use kits and transports samples in temperature-controlled boxes to the lab.',
    path: '/home-collection',
    linkLabel: 'Book a home visit',
  },
  {
    icon: IoDocumentText,
    title: 'Digital Reports & Prescriptions',
    text: 'Every report and prescription lands in your dashboard as a downloadable PDF — organised, searchable and available whenever you need them.',
    path: '/dashboard/reports',
    linkLabel: 'Go to my reports',
  },
];

const STEPS = [
  {
    step: '1',
    title: 'Search & choose',
    text: 'Pick a doctor, test or health package that fits your need and budget.',
  },
  {
    step: '2',
    title: 'Pick a slot',
    text: 'Choose a date and time that works — clinic, video call or home collection.',
  },
  {
    step: '3',
    title: 'Pay in cash',
    text: 'No online payment — pay in cash at your visit or after home sample collection.',
  },
  {
    step: '4',
    title: 'Get care & reports',
    text: 'Attend your consultation or give your sample, then track reports in your dashboard.',
  },
];

export default function Services() {
  useDocumentTitle('Our Services');

  return (
    <PageTransition>
      {/* Page header */}
      <section className="bg-white">
        <div className="container-custom section-padding pb-8 md:pb-10">
          <SectionHeading
            eyebrow="Our services"
            title="Everything your health needs, in one place"
            subtitle="Consultations, lab tests, home collection and digital records — designed to work together so you never have to juggle clinics, labs and paperwork again."
          />
        </div>
      </section>

      {/* Services grid */}
      <section className="pb-14 md:pb-20 bg-white">
        <div className="container-custom">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service, i) => (
              <FadeIn key={service.title} delay={i * 0.06}>
                <div className="card-hover flex h-full flex-col p-6">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <service.icon size={22} aria-hidden="true" />
                  </span>
                  <h3 className="mb-2 text-base font-semibold">{service.title}</h3>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600">{service.text}</p>
                  <Link
                    to={service.path}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700"
                    aria-label={`${service.linkLabel} — ${service.title}`}
                  >
                    {service.linkLabel}
                    <IoArrowForward aria-hidden="true" />
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How LabEasy works */}
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="How it works"
            title="How LabEasy works"
            subtitle="Four simple steps between you and better health — most bookings take less than two minutes."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item, i) => (
              <FadeIn key={item.step} delay={i * 0.08}>
                <div className="card h-full p-6 text-center">
                  <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-secondary-600 text-base font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="pb-14 md:pb-20">
        <div className="container-custom">
          <FadeIn>
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-r from-secondary-600 to-secondary-700 px-6 py-12 text-center text-white sm:px-12 md:flex-row md:justify-between md:text-left">
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <IoHelpCircle size={26} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">
                    Questions about fasting, refunds or reports?
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-secondary-100 sm:text-base">
                    We have answered the questions patients ask us most — from preparing for a blood
                    test to rescheduling an appointment.
                  </p>
                </div>
              </div>
              <Link
                to="/faq"
                className="btn shrink-0 bg-white text-secondary-700 shadow-sm hover:bg-secondary-50"
                aria-label="Browse frequently asked questions"
              >
                Browse FAQs
                <IoArrowForward aria-hidden="true" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
