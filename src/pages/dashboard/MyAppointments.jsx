import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCalendarCheck, FaVideo, FaClinicMedical, FaExclamationCircle } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Modal from '../../components/common/Modal.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import DatePicker from '../../components/booking/DatePicker.jsx';
import TimeSlotPicker from '../../components/booking/TimeSlotPicker.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { appointmentService } from '../../services/appointmentService.js';
import { formatCurrency, formatDate } from '../../utils/helpers.js';
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

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const EMPTY_COPY = {
  upcoming: {
    title: 'No upcoming appointments',
    message: 'Book a consultation with one of our verified doctors and it will appear here.',
  },
  completed: {
    title: 'No completed appointments',
    message: 'Once a consultation is done, it moves here so you can revisit its details anytime.',
  },
  cancelled: {
    title: 'No cancelled appointments',
    message: 'Appointments you cancel will be listed here for your records.',
  },
};

/** List of the user's appointments with reschedule & cancel actions. */
export default function MyAppointments() {
  useDocumentTitle('My Appointments');
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('upcoming');
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: appointments, loading, refetch } = useFetch(
    () => appointmentService.getMyAppointments(user.id),
    [user.id],
  );

  const now = new Date();
  const isUpcoming = (a) =>
    (a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.PENDING) &&
    toDateTime(a.appointment_date, a.appointment_time) >= now;

  const filtered = (appointments || []).filter((a) => {
    if (activeTab === 'upcoming') return isUpcoming(a);
    if (activeTab === 'cancelled') return a.status === APPOINTMENT_STATUS.CANCELLED;
    // completed tab: explicitly completed, or a past appointment that was never cancelled
    return (
      a.status === APPOINTMENT_STATUS.COMPLETED ||
      (a.status !== APPOINTMENT_STATUS.CANCELLED && !isUpcoming(a))
    );
  });

  const sorted = [...filtered].sort((a, b) =>
    activeTab === 'upcoming'
      ? toDateTime(a.appointment_date, a.appointment_time) - toDateTime(b.appointment_date, b.appointment_time)
      : toDateTime(b.appointment_date, b.appointment_time) - toDateTime(a.appointment_date, a.appointment_time),
  );

  const openReschedule = (appointment) => {
    setActionError('');
    setNewDate(appointment.appointment_date);
    setNewTime(appointment.appointment_time);
    setRescheduleTarget(appointment);
  };

  const confirmReschedule = async () => {
    if (!newDate || !newTime) {
      setActionError('Please pick both a date and a time slot.');
      return;
    }
    setActionBusy(true);
    setActionError('');
    try {
      await appointmentService.reschedule(rescheduleTarget.id, user.id, { date: newDate, time: newTime });
      setRescheduleTarget(null);
      await refetch();
    } catch (err) {
      setActionError(err?.message || 'Could not reschedule. Please try again.');
    } finally {
      setActionBusy(false);
    }
  };

  const confirmCancel = async () => {
    setActionBusy(true);
    setActionError('');
    try {
      await appointmentService.cancel(cancelTarget.id, user.id);
      setCancelTarget(null);
      await refetch();
    } catch (err) {
      setActionError(err?.message || 'Could not cancel. Please try again.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track, reschedule or cancel your doctor consultations.
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto" role="tablist" aria-label="Appointment filters">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={FaCalendarCheck}
          title={EMPTY_COPY[activeTab].title}
          message={EMPTY_COPY[activeTab].message}
          actionLabel="Find a Doctor"
          actionTo="/doctors"
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((a) => {
            const canModify =
              (a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.PENDING) && isUpcoming(a);
            return (
              <article key={a.id} className="card p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <img
                    src={a.doctor_photo}
                    alt={a.doctor_name}
                    loading="lazy"
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{a.doctor_name}</h2>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-sm font-medium text-primary-600">{a.specialty}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        {formatDate(a.appointment_date)} · {a.appointment_time}
                      </span>
                      <span
                        className={`badge ${
                          a.consultation_type === 'video'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-primary-50 text-primary-700'
                        }`}
                      >
                        {a.consultation_type === 'video' ? (
                          <FaVideo aria-hidden="true" />
                        ) : (
                          <FaClinicMedical aria-hidden="true" />
                        )}
                        {a.consultation_type === 'video' ? 'Video consult' : 'Clinic visit'}
                      </span>
                      <span className="font-semibold text-gray-700">{formatCurrency(a.fee)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                  <Link to={`/dashboard/appointments/${a.id}`} className="btn-outline text-xs">
                    View Details
                  </Link>
                  {canModify && (
                    <>
                      <button
                        type="button"
                        onClick={() => openReschedule(a)}
                        className="btn-ghost text-xs"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionError('');
                          setCancelTarget(a);
                        }}
                        className="btn-ghost text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Reschedule modal */}
      <Modal
        open={!!rescheduleTarget}
        onClose={() => !actionBusy && setRescheduleTarget(null)}
        title="Reschedule appointment"
        maxWidth="max-w-xl"
      >
        {rescheduleTarget && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              Pick a new slot for your consultation with{' '}
              <span className="font-semibold text-gray-800">{rescheduleTarget.doctor_name}</span>.
            </p>
            <div>
              <p className="form-label">New date</p>
              <DatePicker value={newDate} onChange={setNewDate} days={7} />
            </div>
            <div>
              <p className="form-label">New time</p>
              <TimeSlotPicker value={newTime} onChange={setNewTime} />
            </div>
            {actionError && (
              <p className="flex items-center gap-2 text-sm text-red-600" role="alert">
                <FaExclamationCircle aria-hidden="true" /> {actionError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setRescheduleTarget(null)}
                disabled={actionBusy}
              >
                Keep current slot
              </button>
              <button type="button" className="btn-primary" onClick={confirmReschedule} disabled={actionBusy}>
                {actionBusy ? (
                  <>
                    <Spinner size="sm" /> Rescheduling…
                  </>
                ) : (
                  'Confirm New Slot'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel confirmation modal */}
      <Modal
        open={!!cancelTarget}
        onClose={() => !actionBusy && setCancelTarget(null)}
        title="Cancel appointment?"
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your appointment with{' '}
              <span className="font-semibold text-gray-800">{cancelTarget.doctor_name}</span> on{' '}
              {formatDate(cancelTarget.appointment_date)} at {cancelTarget.appointment_time} will be
              cancelled. Any payment made will be refunded in 3–5 working days.
            </p>
            {actionError && (
              <p className="flex items-center gap-2 text-sm text-red-600" role="alert">
                <FaExclamationCircle aria-hidden="true" /> {actionError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCancelTarget(null)}
                disabled={actionBusy}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                className="btn bg-red-600 text-white shadow-sm hover:bg-red-700"
                onClick={confirmCancel}
                disabled={actionBusy}
              >
                {actionBusy ? (
                  <>
                    <Spinner size="sm" /> Cancelling…
                  </>
                ) : (
                  'Yes, Cancel It'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
