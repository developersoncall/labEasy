import { Link } from 'react-router-dom';
import { FaUserMd, FaVideo } from 'react-icons/fa';
import {
  IoCall, IoCalendarOutline, IoCheckmarkCircle, IoDocumentTextOutline,
  IoMic, IoShieldCheckmarkOutline, IoVideocam,
} from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import SpecialtyIcon from '../../components/common/SpecialtyIcon.jsx';
import Accordion from '../../components/common/Accordion.jsx';
import StarRating from '../../components/common/StarRating.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import useFetch from '../../hooks/useFetch.js';
import { doctorService } from '../../services/doctorService.js';
import { testimonialService } from '../../services/testimonialService.js';
import { formatCurrency } from '../../utils/helpers.js';

const BENEFITS = [
  'No travel, no waiting rooms — consult from home or work',
  'Digital prescriptions delivered straight to your dashboard',
  '15-minute average wait for the next available doctor',
];

const STEPS = [
  {
    id: 1,
    icon: FaUserMd,
    title: 'Choose your doctor',
    description: 'Browse verified specialists by rating, fee and language — or let us match you with the next available GP.',
  },
  {
    id: 2,
    icon: IoCalendarOutline,
    title: 'Pick a slot',
    description: 'Select a date and time that suits you. Same-day slots are available across most specialties.',
  },
  {
    id: 3,
    icon: IoVideocam,
    title: 'Join the secure call',
    description: 'Tap the link we send you — no app installs needed. Calls are encrypted end to end.',
  },
  {
    id: 4,
    icon: IoDocumentTextOutline,
    title: 'Get your prescription',
    description: 'Your prescription, advice notes and any lab referrals land in your dashboard before the call ends.',
  },
];

const PLANS = [
  {
    id: 'single',
    name: 'Single Consult',
    price: 499,
    cadence: 'one-time',
    tagline: 'A quick, expert opinion when you need it.',
    features: [
      'One video consultation with any doctor',
      'Valid for 7 days from purchase',
      'Digital prescription in your dashboard',
      'Free follow-up chat for 24 hours',
    ],
    popular: false,
  },
  {
    id: 'family',
    name: 'Family Plan',
    price: 1499,
    cadence: 'per month',
    tagline: 'Ongoing care for the whole household.',
    features: [
      '4 video consultations every month',
      'Any specialty, any doctor',
      'Priority slots — skip the queue',
      'Shareable with family members',
      'All prescriptions in one place',
    ],
    popular: true,
  },
  {
    id: 'annual',
    name: 'Annual Care',
    price: 9999,
    cadence: 'per year',
    tagline: 'Year-round cover for proactive health.',
    features: [
      'Unlimited GP video consultations',
      '2 specialist consults every quarter',
      'Free basic health check included',
      'Priority slots all year',
      'Dedicated care manager',
    ],
    popular: false,
  },
];

const VIDEO_FAQS = [
  {
    id: 1,
    question: 'How do I join my video consultation?',
    answer: 'Once your appointment is confirmed, we send a secure link by SMS and email, and it also appears under My Appointments. Tap the link a couple of minutes before your slot — it opens directly in your browser, so there is nothing to install.',
  },
  {
    id: 2,
    question: 'Will I get a prescription after a video consult?',
    answer: 'Yes. If the doctor prescribes medication, a signed digital prescription is added to your Lab Easy dashboard immediately after the call. It is valid at pharmacies across Bangladesh and can be downloaded as a PDF anytime.',
  },
  {
    id: 3,
    question: 'Is my video consultation private and secure?',
    answer: 'Absolutely. Every call is encrypted end to end, is never recorded, and your health records are visible only to you and your consulting doctor, in line with our privacy policy and Bangladesh telemedicine guidelines.',
  },
  {
    id: 4,
    question: 'What if I face a connection issue during the call?',
    answer: 'If a call drops, you can rejoin using the same link within your slot window. If the consultation could not be completed, the doctor will call you back or we will reschedule you at no extra cost — no questions asked.',
  },
];

export default function VideoConsultation() {
  useDocumentTitle('Video Consultation');
  const { isAuthenticated } = useAuth();

  const ctaTarget = isAuthenticated ? '/doctors?availability=today' : '/register';

  const { data: specialtiesData } = useFetch(() => doctorService.getSpecialties(), []);
  const { data: testimonialsData } = useFetch(() => testimonialService.getAll(), []);

  const specialties = specialtiesData || [];
  const testimonials = testimonialsData || [];
  const videoTestimonials = testimonials.filter((t) => t.service === 'Video Consultation');
  const shownTestimonials = videoTestimonials.length >= 3 ? videoTestimonials.slice(0, 3) : testimonials.slice(0, 3);

  return (
    <PageTransition>
      {/* ---------- hero ---------- */}
      <section className="bg-gradient-to-r from-primary-50 via-white to-secondary-50">
        <div className="container-custom section-padding grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="badge bg-primary-100 uppercase tracking-wide text-primary-700">
              Doctor on your screen
            </span>
            <h1 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl text-balance">
              See a doctor in minutes, from anywhere
            </h1>
            <p className="mt-4 max-w-lg text-sm text-gray-500 sm:text-base">
              Skip the commute and the crowded waiting room. Consult verified specialists over a
              secure, encrypted video call — mornings, evenings and weekends included.
            </p>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm text-gray-700 sm:text-base">
                  <IoCheckmarkCircle className="mt-0.5 shrink-0 text-secondary-500" size={20} aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={ctaTarget} className="btn-primary">Consult a Doctor Now</Link>
              <Link to="/doctors" className="btn-outline">Browse Doctors</Link>
            </div>
          </div>

          {/* icon-built video call illustration */}
          <FadeIn className="mx-auto w-full max-w-md">
            <div
              aria-hidden="true"
              className="card relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 p-6"
            >
              <div className="flex items-center justify-between text-primary-100">
                <span className="badge bg-white/15 text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary-400" /> Live consult
                </span>
                <span className="text-xs">12:04</span>
              </div>
              <div className="mt-6 flex flex-col items-center gap-3 py-6">
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-white ring-4 ring-white/20">
                  <FaUserMd size={44} />
                </span>
                <p className="font-semibold text-white">Dr. Ananya Iyer</p>
                <p className="text-xs text-primary-200">General Medicine · Speaking…</p>
              </div>
              <div className="absolute bottom-20 right-5 flex h-20 w-16 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
                <FaVideo size={20} />
              </div>
              <div className="mt-4 flex items-center justify-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
                  <IoMic size={20} />
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
                  <IoVideocam size={20} />
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white">
                  <IoCall size={20} className="rotate-[135deg]" />
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="How it works"
            title="From symptoms to prescription in 4 steps"
            subtitle="The entire journey happens on Lab Easy — booking, consultation, prescription and follow-up."
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <FadeIn key={step.id} delay={index * 0.08}>
                <div className="card h-full p-6 text-center">
                  <div className="relative mx-auto w-fit">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                      <step.icon size={26} aria-hidden="true" />
                    </span>
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-secondary-500 text-xs font-bold text-white">
                      {step.id}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- plans ---------- */}
      <section className="bg-white section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Plans & pricing"
            title="Care plans for every kind of family"
            subtitle="Transparent pricing, no hidden charges. Cancel or upgrade your plan anytime from your dashboard."
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan, index) => (
              <FadeIn key={plan.id} delay={index * 0.08} className="h-full">
                <div
                  className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-card ${
                    plan.popular ? 'border-primary-600 ring-2 ring-primary-100' : 'border-gray-100'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
                  <p className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">{formatCurrency(plan.price)}</span>
                    <span className="ml-1.5 text-sm text-gray-400">{plan.cadence}</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                        <IoCheckmarkCircle className="mt-0.5 shrink-0 text-secondary-500" size={17} aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={ctaTarget}
                    className={`mt-6 w-full ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                    aria-label={`Get started with the ${plan.name} plan`}
                  >
                    Get Started
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
            <IoShieldCheckmarkOutline aria-hidden="true" />
            All plans include encrypted calls, digital prescriptions and free rescheduling.
          </p>
        </div>
      </section>

      {/* ---------- specialties strip ---------- */}
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Available on video"
            title="Consult across 15 specialties"
            subtitle="From dermatology to psychiatry — most concerns can be assessed safely over video."
          />
          <div className="flex flex-wrap justify-center gap-3">
            {specialties.map((specialty) => (
              <Link
                key={specialty.id}
                to={`/doctors?specialty=${encodeURIComponent(specialty.name)}`}
                className="card-hover flex items-center gap-3 px-4 py-3"
                aria-label={`Video consult a ${specialty.name} specialist`}
              >
                <SpecialtyIcon icon={specialty.icon} size={18} className="h-9 w-9 rounded-lg" />
                <span className="text-sm font-medium text-gray-700">{specialty.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="bg-white section-padding">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Good to know"
            title="Video consultation FAQs"
            subtitle="Everything patients usually ask before their first online consultation."
          />
          <Accordion items={VIDEO_FAQS} />
        </div>
      </section>

      {/* ---------- testimonials ---------- */}
      <section className="section-padding">
        <div className="container-custom">
          {shownTestimonials.length > 0 && (
            <>
              <SectionHeading
                eyebrow="Patient stories"
                title="Trusted by families across Bangladesh"
                subtitle="Real experiences from patients who consulted doctors on Lab Easy."
              />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {shownTestimonials.map((testimonial, index) => (
                  <FadeIn key={testimonial.id} delay={index * 0.08} className="h-full">
                    <figure className="card flex h-full flex-col p-6">
                      <StarRating rating={testimonial.rating} />
                      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">
                        “{testimonial.text}”
                      </blockquote>
                      <figcaption className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          loading="lazy"
                          width="40"
                          height="40"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                          <p className="text-xs text-gray-400">{testimonial.city} · {testimonial.service}</p>
                        </div>
                      </figcaption>
                    </figure>
                  </FadeIn>
                ))}
              </div>
            </>
          )}

          <div className="mt-12 text-center">
            <Link to={ctaTarget} className="btn-primary">Start Your Video Consult</Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
