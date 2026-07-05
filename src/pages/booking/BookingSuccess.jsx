import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheck, FaBell, FaRegClock, FaFileMedical } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { formatCurrency, formatDateLong } from '../../utils/helpers.js';

/** Animated green check mark with a spring pop-in. */
function SuccessCheck() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
      className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-secondary-100"
      aria-hidden="true"
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.3 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-500 text-white shadow-sm"
      >
        <FaCheck size={28} />
      </motion.span>
    </motion.div>
  );
}

export default function BookingSuccess() {
  useDocumentTitle('Booking Confirmed');
  const { state } = useLocation();

  const kind = state?.kind;
  const record = state?.record;
  const isLab = kind === 'lab';
  const isAppointment = kind === 'appointment';

  const heading = isLab
    ? 'Lab Booking Requested!'
    : isAppointment
      ? 'Appointment Requested!'
      : 'Booking Requested!';

  const timeline = [
    {
      icon: FaBell,
      title: 'Request received',
      text: 'Your request has been sent to our team. You will be notified as soon as it is confirmed.',
    },
    {
      icon: FaRegClock,
      title: 'Reminder before your slot',
      text: isLab
        ? 'We will remind you before your collection slot — remember to follow any fasting instructions for your tests.'
        : 'We will remind you shortly before your consultation so you never miss your slot.',
    },
    {
      icon: FaFileMedical,
      title: isLab ? 'Reports in your dashboard' : 'Prescription in your dashboard',
      text: isLab
        ? 'Digital reports are usually ready within 24–48 hours and appear under My Reports in your dashboard.'
        : 'After the consultation, your prescription is uploaded to the Prescriptions section of your dashboard.',
    },
  ];

  const primaryTo = isLab ? '/dashboard/diagnostic-bookings' : '/dashboard/appointments';
  const primaryLabel = isLab ? 'My Lab Bookings' : 'View My Appointments';

  // ---- graceful fallback when the page is opened without booking state ----
  if (!state) {
    return (
      <PageTransition>
        <div className="section-padding">
          <div className="container-custom max-w-xl text-center">
            <SuccessCheck />
            <h1 className="mt-6 text-2xl font-bold sm:text-3xl">Booking Confirmed!</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Your booking has been placed successfully. You can view all your appointments and lab bookings anytime
              from your dashboard.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/dashboard" className="btn-primary">
                Go to Dashboard
              </Link>
              <Link to="/" className="btn-outline">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="section-padding">
        <div className="container-custom max-w-2xl">
          <div className="text-center">
            <SuccessCheck />
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.35 }}
              className="mt-6 text-2xl font-bold sm:text-3xl"
            >
              {heading}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.35 }}
              className="mx-auto mt-2 max-w-md text-sm text-gray-500"
            >
              {isLab
                ? 'Your diagnostic booking request has been received and is pending confirmation. We will notify you once it is confirmed.'
                : `Your consultation request${state.doctorName ? ` with ${state.doctorName}` : ''} has been received and is pending confirmation. We will notify you shortly.`}
            </motion.p>
          </div>

          {/* ---- booking summary ---- */}
          <FadeIn delay={0.15} className="mt-8">
            <div className="card p-6">
              <h2 className="mb-4 text-base font-semibold">Booking details</h2>
              <dl className="space-y-2.5 text-sm">
                {(record?.booking_ref || record?.appointment_ref || record?.id) && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Booking reference</dt>
                    <dd className="font-mono text-xs font-semibold uppercase text-gray-800">
                      {record.booking_ref || record.appointment_ref || `#${String(record.id).slice(0, 8)}`}
                    </dd>
                  </div>
                )}
                {isAppointment && state.doctorName && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Doctor</dt>
                    <dd className="text-right font-medium text-gray-800">{state.doctorName}</dd>
                  </div>
                )}
                {isLab && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Collection type</dt>
                    <dd className="font-medium text-gray-800">
                      {state.collectionType === 'home' ? 'Home Sample Collection' : 'Lab Visit'}
                    </dd>
                  </div>
                )}
                {isLab && record?.items?.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Items booked</dt>
                    <dd className="font-medium text-gray-800">
                      {record.items.length} {record.items.length === 1 ? 'item' : 'items'}
                    </dd>
                  </div>
                )}
                {state.date && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Date</dt>
                    <dd className="text-right font-medium text-gray-800">{formatDateLong(state.date)}</dd>
                  </div>
                )}
                {state.time && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Time</dt>
                    <dd className="font-medium text-gray-800">{state.time}</dd>
                  </div>
                )}
                {(record?.fee || record?.total_amount) && (
                  <div className="flex justify-between gap-4 border-t border-dashed border-gray-200 pt-3">
                    <dt className="font-semibold text-gray-900">Amount</dt>
                    <dd className="font-bold text-primary-700">
                      {formatCurrency(isLab ? record.total_amount : record.fee)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </FadeIn>

          {/* ---- what happens next ---- */}
          <FadeIn delay={0.25} className="mt-6">
            <div className="card p-6">
              <h2 className="mb-5 text-base font-semibold">What happens next</h2>
              <ol className="space-y-6">
                {timeline.map(({ icon: Icon, title, text }, i) => (
                  <li key={title} className="relative flex gap-4">
                    {i < timeline.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-5 top-11 h-[calc(100%-1.25rem)] w-px bg-gray-200"
                      />
                    )}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </FadeIn>

          <FadeIn delay={0.35} className="mt-8">
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={primaryTo} className="btn-primary">
                {primaryLabel}
              </Link>
              <Link to="/" className="btn-outline">
                Back to Home
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
