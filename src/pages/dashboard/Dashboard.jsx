import { Link } from 'react-router-dom';
import {
  FaCalendarCheck, FaFlask, FaFileMedical, FaRegBell, FaUserMd,
  FaVial, FaVideo, FaBoxOpen, FaChevronRight, FaClinicMedical,
} from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonCard, SkeletonLine } from '../../components/common/Skeleton.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { appointmentService } from '../../services/appointmentService.js';
import { diagnosticService } from '../../services/diagnosticService.js';
import { notificationService } from '../../services/notificationService.js';
import { formatDate } from '../../utils/helpers.js';
import { APPOINTMENT_STATUS } from '../../constants/index.js';

/** Combine an ISO date with a "09:30 AM" slot into a comparable Date. */
const toDateTime = (dateStr, timeStr) => {
  const d = new Date(dateStr);
  const match = (timeStr || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1], 10) % 12;
    if (match[3].toUpperCase() === 'PM') hours += 12;
    d.setHours(hours, parseInt(match[2], 10), 0, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d;
};

const QUICK_ACTIONS = [
  { label: 'Book Doctor', description: 'Find a specialist near you', to: '/doctors', icon: FaUserMd, color: 'bg-primary-50 text-primary-600' },
  { label: 'Book Test', description: 'Lab tests with home collection', to: '/diagnostic-tests', icon: FaVial, color: 'bg-secondary-50 text-secondary-600' },
  { label: 'Video Consult', description: 'Talk to a doctor online', to: '/video-consultation', icon: FaVideo, color: 'bg-purple-50 text-purple-600' },
  { label: 'Health Packages', description: 'Full-body checkups & more', to: '/health-packages', icon: FaBoxOpen, color: 'bg-amber-50 text-amber-600' },
];

/** Landing page of the authenticated dashboard: stats, previews & shortcuts. */
export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();

  const { data: appointments, loading: apptLoading } = useFetch(
    () => appointmentService.getMyAppointments(user.id),
    [user.id],
  );
  const { data: bookings, loading: bookingsLoading } = useFetch(
    () => diagnosticService.getMyBookings(user.id),
    [user.id],
  );
  const { data: reports, loading: reportsLoading } = useFetch(
    () => diagnosticService.getMyReports(user.id),
    [user.id],
  );
  const { data: unreadCount, loading: unreadLoading } = useFetch(
    () => notificationService.getUnreadCount(user.id),
    [user.id],
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.user_metadata?.full_name || 'there').split(' ')[0];

  const now = new Date();
  const upcomingAppointments = (appointments || [])
    .filter(
      (a) =>
        a.status !== APPOINTMENT_STATUS.CANCELLED &&
        a.status !== APPOINTMENT_STATUS.COMPLETED &&
        toDateTime(a.appointment_date, a.appointment_time) >= now,
    )
    .sort(
      (a, b) =>
        toDateTime(a.appointment_date, a.appointment_time) -
        toDateTime(b.appointment_date, b.appointment_time),
    );

  const recentBookings = [...(bookings || [])]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 3);

  const activeBookings = (bookings || []).filter((b) => b.status !== 'cancelled');

  const stats = [
    {
      label: 'Upcoming appointments',
      value: upcomingAppointments.length,
      loading: apptLoading,
      icon: FaCalendarCheck,
      color: 'bg-primary-50 text-primary-600',
      to: '/dashboard/appointments',
    },
    {
      label: 'Lab bookings',
      value: activeBookings.length,
      loading: bookingsLoading,
      icon: FaFlask,
      color: 'bg-secondary-50 text-secondary-600',
      to: '/dashboard/diagnostic-bookings',
    },
    {
      label: 'Reports',
      value: (reports || []).length,
      loading: reportsLoading,
      icon: FaFileMedical,
      color: 'bg-teal-50 text-teal-600',
      to: '/dashboard/reports',
    },
    {
      label: 'Unread notifications',
      value: unreadCount || 0,
      loading: unreadLoading,
      icon: FaRegBell,
      color: 'bg-amber-50 text-amber-600',
      to: '/dashboard/notifications',
    },
  ];

  return (
    <PageTransition>
      {/* Greeting */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s a quick look at your health activity on Lab Easy.
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, loading, icon: Icon, color, to }, i) => (
          <FadeIn key={label} delay={i * 0.05}>
            <Link
              to={to}
              className="card-hover flex items-center gap-4 p-5"
              aria-label={`${label}: ${loading ? 'loading' : value}`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                {loading ? (
                  <SkeletonLine className="mb-1 h-6 w-10" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                )}
                <p className="truncate text-xs font-medium text-gray-500">{label}</p>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>

      {/* Quick actions */}
      <section className="mt-8" aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="mb-4 text-lg font-bold text-gray-900">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ label, description, to, icon: Icon, color }, i) => (
            <FadeIn key={to} delay={i * 0.05}>
              <Link to={to} className="card-hover flex h-full flex-col gap-3 p-5">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-gray-900">{label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{description}</p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Upcoming appointments preview */}
      <section className="mt-8" aria-labelledby="upcoming-appointments-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="upcoming-appointments-heading" className="text-lg font-bold text-gray-900">
            Upcoming appointments
          </h2>
          <Link
            to="/dashboard/appointments"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            View all <FaChevronRight size={10} aria-hidden="true" />
          </Link>
        </div>

        {apptLoading ? (
          <div className="space-y-4">
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <EmptyState
            icon={FaCalendarCheck}
            title="No upcoming appointments"
            message="When you book a consultation, it will show up here with all the details."
            actionLabel="Book a Doctor"
            actionTo="/doctors"
          />
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                to={`/dashboard/appointments/${a.id}`}
                className="card-hover flex flex-wrap items-center gap-4 p-4"
              >
                <img
                  src={a.doctor_photo}
                  alt={a.doctor_name}
                  loading="lazy"
                  className="h-12 w-12 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{a.doctor_name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                    {a.consultation_type === 'video' ? (
                      <FaVideo aria-hidden="true" />
                    ) : (
                      <FaClinicMedical aria-hidden="true" />
                    )}
                    {formatDate(a.appointment_date)} · {a.appointment_time}
                  </p>
                </div>
                <StatusBadge status={a.status} />
                <FaChevronRight className="text-gray-300" size={12} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent lab bookings preview */}
      <section className="mt-8" aria-labelledby="recent-bookings-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent-bookings-heading" className="text-lg font-bold text-gray-900">
            Recent lab bookings
          </h2>
          <Link
            to="/dashboard/diagnostic-bookings"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            View all <FaChevronRight size={10} aria-hidden="true" />
          </Link>
        </div>

        {bookingsLoading ? (
          <div className="space-y-4">
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
          </div>
        ) : recentBookings.length === 0 ? (
          <EmptyState
            icon={FaFlask}
            title="No lab bookings yet"
            message="Book a diagnostic test or health package and track its progress here."
            actionLabel="Browse Lab Tests"
            actionTo="/diagnostic-tests"
          />
        ) : (
          <div className="space-y-3">
            {recentBookings.map((b) => (
              <div key={b.id} className="card flex flex-wrap items-center gap-4 p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                  <FaFlask size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">
                    {(b.items || []).length} {(b.items || []).length === 1 ? 'item' : 'items'} ·{' '}
                    {b.collection_type === 'home' ? 'Home collection' : 'Lab visit'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDate(b.scheduled_date)} · {b.scheduled_time}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
