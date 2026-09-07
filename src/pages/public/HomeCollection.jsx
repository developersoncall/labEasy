import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  FaMapMarkerAlt,
  FaCheckCircle,
  FaRegClock,
  FaShieldVirus,
  FaUserNurse,
  FaTemperatureLow,
  FaFileMedicalAlt,
  FaCalendarCheck,
  FaFlask,
  FaMobileAlt,
  FaVial,
} from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonGrid } from '../../components/common/Skeleton.jsx';
import TestCard from '../../components/diagnostics/TestCard.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useCart } from '../../context/CartContext.jsx';
import { diagnosticService } from '../../services/diagnosticService.js';
import { CITIES } from '../../constants/index.js';
import { postcodeRule } from '../../utils/helpers.js';

const SAFETY_POINTS = [
  {
    icon: FaShieldVirus,
    title: 'Sealed single-use kits',
    text: 'Factory-sealed needles and vacutainers, opened in front of you — never reused, ever.',
  },
  {
    icon: FaUserNurse,
    title: 'Certified phlebotomists',
    text: 'Background-verified, trained professionals with hundreds of supervised collections behind them.',
  },
  {
    icon: FaTemperatureLow,
    title: 'Cold-chain transport',
    text: 'Samples travel in temperature-controlled boxes and reach the lab within a strict time window.',
  },
  {
    icon: FaFileMedicalAlt,
    title: 'Digital verified reports',
    text: 'Every report is pathologist-signed and lands on your Lab Easy dashboard as a downloadable PDF.',
  },
];

const STEPS = [
  { icon: FaCalendarCheck, title: 'Book a slot', text: 'Pick your tests and a convenient date and time.' },
  { icon: FaUserNurse, title: 'Phlebotomist visits', text: 'Sample collected at home with a sealed kit.' },
  { icon: FaFlask, title: 'Lab processing', text: 'NABL-accredited lab runs and verifies your sample.' },
  { icon: FaMobileAlt, title: 'Report on app', text: 'Download the verified report from your dashboard.' },
];

export default function HomeCollection() {
  useDocumentTitle('Home Sample Collection');
  const pc = postcodeRule();
  const { toggleItem, inCart } = useCart();
  const [availability, setAvailability] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { city: '', pincode: '' } });

  const { data: tests, loading } = useFetch(() => diagnosticService.getAllTests(), []);

  const homeTests = useMemo(() => (tests || []).filter((t) => t.homeCollection), [tests]);

  const popularHomeTests = useMemo(
    () => [...homeTests].sort((a, b) => Number(b.popular) - Number(a.popular)).slice(0, 8),
    [homeTests]
  );

  const sampleChips = useMemo(() => {
    const types = [...new Set(homeTests.map((t) => t.sampleType))].filter((s) => s && s !== 'None');
    return types;
  }, [homeTests]);

  const onCheckAvailability = ({ city, pincode }) => {
    const cleanCity = city.trim();
    const serviceable = CITIES.some((c) => c.toLowerCase() === cleanCity.toLowerCase());
    setAvailability({ serviceable, city: cleanCity, pincode });
  };

  return (
    <PageTransition>
      {/* ---------- hero + serviceability check ---------- */}
      <section className="bg-gradient-to-b from-primary-50/70 to-white">
        <div className="container-custom grid grid-cols-1 items-center gap-10 py-14 md:py-20 lg:grid-cols-2">
          <div>
            <span className="badge bg-primary-100 text-primary-700 uppercase tracking-wide">
              Home Sample Collection
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-gray-900 md:text-4xl text-balance">
              Lab-grade diagnostics, collected at your doorstep
            </h1>
            <p className="mt-4 max-w-xl leading-relaxed text-gray-600">
              Skip the queue. A certified phlebotomist visits your home with a sealed kit, your sample rides a
              monitored cold chain to an NABL-accredited lab, and your verified report arrives on the app — most
              within 24 hours.
            </p>
            <ul className="mt-6 space-y-2">
              {['Slots from 7:00 AM, seven days a week', 'No extra charge for home visits', 'Live booking status on your dashboard'].map(
                (point) => (
                  <li key={point} className="flex items-center gap-2 text-sm text-gray-700">
                    <FaCheckCircle aria-hidden="true" className="shrink-0 text-secondary-500" /> {point}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="card p-6 md:p-8">
            <h2 className="text-lg font-semibold text-gray-900">Check availability in your area</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your city and post code to see if doorstep collection is live near you.
            </p>

            <form onSubmit={handleSubmit(onCheckAvailability)} noValidate className="mt-5 space-y-4">
              <div>
                <label htmlFor="hc-city" className="form-label">
                  City
                </label>
                <input
                  id="hc-city"
                  type="text"
                  placeholder="e.g. Bengaluru"
                  className={`input-field ${errors.city ? 'input-error' : ''}`}
                  aria-invalid={errors.city ? 'true' : 'false'}
                  {...register('city', { required: 'Please enter your city' })}
                />
                {errors.city && <p className="error-text">{errors.city.message}</p>}
              </div>

              <div>
                <label htmlFor="hc-pincode" className="form-label">
                  {pc.label.replace(/^\w/, c => c.toUpperCase())}
                </label>
                <input
                  id="hc-pincode"
                  type="text"
                  inputMode="numeric"
                  maxLength={pc.maxLength}
                  placeholder={pc.placeholder}
                  className={`input-field ${errors.pincode ? 'input-error' : ''}`}
                  aria-invalid={errors.pincode ? 'true' : 'false'}
                  {...register('pincode', {
                    required: `Please enter your ${pc.label}`,
                    pattern: { value: pc.pattern, message: pc.message },
                  })}
                />
                {errors.pincode && <p className="error-text">{errors.pincode.message}</p>}
              </div>

              <button type="submit" className="btn-primary w-full">
                <FaMapMarkerAlt aria-hidden="true" /> Check Availability
              </button>
            </form>

            {availability && (
              <div
                role="status"
                className={`mt-5 rounded-xl border p-4 text-sm ${
                  availability.serviceable
                    ? 'border-secondary-200 bg-secondary-50 text-secondary-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {availability.serviceable ? (
                  <p>
                    <span className="font-semibold">Great news!</span> Home collection is available in{' '}
                    {availability.city} ({availability.pincode}). Morning slots from 7:00 AM are usually open —{' '}
                    <Link to="/diagnostic-tests" className="font-semibold underline">
                      pick your tests
                    </Link>{' '}
                    to book one.
                  </p>
                ) : (
                  <p>
                    <span className="font-semibold">Coming soon to {availability.city}.</span> We currently serve{' '}
                    {CITIES.join(', ')}. You can still book a lab-visit appointment at a partner centre near you.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- what we collect at home ---------- */}
      <section className="border-y border-gray-100 bg-white">
        <div className="container-custom flex flex-col items-start justify-between gap-6 py-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">What we collect at home</h2>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{loading ? '—' : homeTests.length}+ tests</span> in our
              catalogue support doorstep collection — from routine blood counts to allergy panels.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Sample types collected at home">
            {(sampleChips.length > 0 ? sampleChips : ['Blood', 'Urine', 'Swab']).map((type) => (
              <span key={type} className="badge bg-primary-50 text-primary-700">
                <FaVial aria-hidden="true" /> {type} samples
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- safety protocol ---------- */}
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Safety First"
            title="Our home collection safety protocol"
            subtitle="The same rigour as a walk-in lab — sealed kits, trained hands and a monitored cold chain from your door to the analyser."
          />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SAFETY_POINTS.map(({ icon: Icon, title, text }, i) => (
              <FadeIn key={title} delay={i * 0.08}>
                <div className="card h-full p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- steps timeline ---------- */}
      <section className="bg-white">
        <div className="container-custom py-12 md:py-16">
          <SectionHeading
            eyebrow="How It Works"
            title="From booking to report in four steps"
            subtitle="A typical home collection takes under 15 minutes at your door."
          />
          <ol className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <FadeIn key={title} delay={i * 0.08}>
                <li className="relative flex flex-col items-center text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-card">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary-600">
                    Step {i + 1}
                  </span>
                  <h3 className="mt-1 font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1.5 max-w-[220px] text-sm text-gray-500">{text}</p>
                </li>
              </FadeIn>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- popular home-collectable tests ---------- */}
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Most Booked"
            title="Popular tests collected at home"
            subtitle="Add tests to your booking — a floating cart tracks your selection as you browse."
          />
          {loading ? (
            <SkeletonGrid count={8} lines={3} />
          ) : popularHomeTests.length === 0 ? (
            <EmptyState
              icon={FaRegClock}
              title="Tests are loading soon"
              message="Our home-collection catalogue is being refreshed. Browse the full test list meanwhile."
              actionLabel="Browse All Tests"
              actionTo="/diagnostic-tests"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {popularHomeTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  inCart={inCart(test.id, 'test')}
                  onAdd={(t) => toggleItem(t, 'test')}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- CTA band ---------- */}
      <section className="pb-14 md:pb-20">
        <div className="container-custom">
          <FadeIn>
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-10 text-center md:flex-row md:text-left">
              <div>
                <h2 className="text-2xl font-bold text-white">Ready to skip the lab queue?</h2>
                <p className="mt-2 max-w-xl text-sm text-primary-100">
                  Browse the full catalogue of {loading ? 'our' : `${homeTests.length}+`} home-collectable tests and
                  book a doorstep slot in under two minutes.
                </p>
              </div>
              <Link to="/diagnostic-tests" className="btn shrink-0 bg-white text-primary-700 hover:bg-primary-50">
                Browse Lab Tests
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
