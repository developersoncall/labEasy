import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft, FaCalendarCheck, FaVideo, FaClinicMedical, FaExclamationCircle, FaInfoCircle,
  FaFilePdf,
} from 'react-icons/fa';
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
import { diagnosticService } from '../../services/diagnosticService.js';
import { storageService } from '../../services/storageService.js';
import { formatCurrency, formatDate, formatDateLong } from '../../utils/helpers.js';
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

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-50 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-800">{value || '—'}</dd>
    </div>
  );
}

/** Full detail view for a single appointment with reschedule/cancel actions. */
export default function AppointmentDetails() {
  useDocumentTitle('Appointment Details');
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: appointment, loading, refetch } = useFetch(
    () => appointmentService.getById(id, user.id),
    [id, user.id],
  );

  // Prescription (if the doctor has issued one for this appointment).
  const { data: prescriptions } = useFetch(
    () => diagnosticService.getMyPrescriptions(user.id),
    [user.id],
  );
  const prescription = (prescriptions || []).find((p) => p.appointment_id === id) || null;

  const openPrescription = async () => {
    try {
      const url = await storageService.reportUrl(prescription?.prescription_url);
      if (url) window.open(url, '_blank', 'noopener');
    } catch {
      /* ignore — link simply won't open */
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </PageTransition>
    );
  }

  if (!appointment) {
    return (
      <PageTransition>
        <EmptyState
          icon={FaCalendarCheck}
          title="Appointment not found"
          message="This appointment doesn't exist or may have been removed from your account."
          actionLabel="Back to My Appointments"
          actionTo="/dashboard/appointments"
        />
      </PageTransition>
    );
  }

  const isVideo = appointment.consultation_type === 'video';
  const isUpcoming =
    (appointment.status === APPOINTMENT_STATUS.CONFIRMED ||
      appointment.status === APPOINTMENT_STATUS.PENDING) &&
    toDateTime(appointment.appointment_date, appointment.appointment_time) >= new Date();
  const canModify = appointment.status === APPOINTMENT_STATUS.CONFIRMED && isUpcoming;

  const openReschedule = () => {
    setActionError('');
    setNewDate(appointment.appointment_date);
    setNewTime(appointment.appointment_time);
    setRescheduleOpen(true);
  };

  const confirmReschedule = async () => {
    if (!newDate || !newTime) {
      setActionError('Please pick both a date and a time slot.');
      return;
    }
    setActionBusy(true);
    setActionError('');
    try {
      await appointmentService.reschedule(appointment.id, user.id, { date: newDate, time: newTime });
      setRescheduleOpen(false);
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
      await appointmentService.cancel(appointment.id, user.id);
      setCancelOpen(false);
      await refetch();
    } catch (err) {
      setActionError(err?.message || 'Could not cancel. Please try again.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <PageTransition>
      <button
        type="button"
        onClick={() => navigate('/dashboard/appointments')}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-primary-600"
      >
        <FaArrowLeft size={12} aria-hidden="true" /> Back to My Appointments
      </button>

      <div className="card p-6">
        {/* Doctor block */}
        <div className="flex flex-wrap items-start gap-4 border-b border-gray-100 pb-5">
          <img
            src={appointment.doctor_photo}
            alt={appointment.doctor_name}
            className="h-16 w-16 rounded-2xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{appointment.doctor_name}</h1>
              <StatusBadge status={appointment.status} />
            </div>
            <p className="text-sm font-medium text-primary-600">{appointment.specialty}</p>
            {appointment.clinic && <p className="mt-0.5 text-xs text-gray-500">{appointment.clinic}</p>}
          </div>
          <span
            className={`badge ${
              isVideo ? 'bg-purple-50 text-purple-700' : 'bg-primary-50 text-primary-700'
            }`}
          >
            {isVideo ? <FaVideo aria-hidden="true" /> : <FaClinicMedical aria-hidden="true" />}
            {isVideo ? 'Video consultation' : 'In-clinic visit'}
          </span>
        </div>

        {/* Schedule */}
        <div className="mt-5 rounded-xl bg-primary-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">Scheduled for</p>
          <p className="mt-1 font-semibold text-primary-800">
            {formatDateLong(appointment.appointment_date)} at {appointment.appointment_time}
          </p>
        </div>

        {/* Video join button */}
        {isVideo && appointment.status === APPOINTMENT_STATUS.CONFIRMED && (
          <div className="mt-5">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              aria-disabled="true"
              className="btn-primary w-full opacity-60 sm:w-auto"
            >
              <FaVideo aria-hidden="true" /> Join Video Call
            </a>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
              <FaInfoCircle aria-hidden="true" />
              The join link activates 15 minutes before your slot.
            </p>
          </div>
        )}

        {/* Detail grids */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-labelledby="patient-details-heading">
            <h2 id="patient-details-heading" className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
              Patient Details
            </h2>
            <dl className="rounded-xl border border-gray-100 px-4">
              <DetailRow label="Name" value={appointment.patient_name} />
              <DetailRow label="Age" value={appointment.patient_age ? `${appointment.patient_age} years` : '—'} />
              <DetailRow label="Gender" value={appointment.patient_gender} />
              <DetailRow label="Phone" value={appointment.patient_phone} />
            </dl>
          </section>

          <section aria-labelledby="booking-details-heading">
            <h2 id="booking-details-heading" className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
              Booking Details
            </h2>
            <dl className="rounded-xl border border-gray-100 px-4">
              <DetailRow label="Booking ID" value={appointment.appointment_ref || `#${String(appointment.id).slice(0, 8)}`} />
              <DetailRow label="Consultation fee" value={formatCurrency(appointment.fee)} />
              <DetailRow
                label="Booked on"
                value={appointment.created_at ? formatDate(appointment.created_at) : '—'}
              />
            </dl>
          </section>
        </div>

        {/* Symptoms */}
        <section className="mt-6" aria-labelledby="symptoms-heading">
          <h2 id="symptoms-heading" className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
            Symptoms / Reason for Visit
          </h2>
          <p className="rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-700">
            {appointment.symptoms || 'No symptoms were shared while booking.'}
          </p>
        </section>

        {/* Prescription — shown once the doctor has uploaded it */}
        {prescription?.prescription_url && (
          <section className="mt-6" aria-labelledby="prescription-heading">
            <h2 id="prescription-heading" className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
              Prescription
            </h2>
            <div className="rounded-xl border border-gray-100 px-4 py-4">
              {prescription.diagnosis && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Diagnosis:</span> {prescription.diagnosis}
                </p>
              )}
              {prescription.notes && (
                <p className="mt-1 text-sm text-gray-700">
                  <span className="font-semibold">Notes:</span> {prescription.notes}
                </p>
              )}
              <button
                type="button"
                onClick={openPrescription}
                className="btn-outline mt-3 text-xs"
                aria-label="View or download prescription"
              >
                <FaFilePdf aria-hidden="true" /> View / Download Prescription
              </button>
            </div>
          </section>
        )}

        {/* Actions */}
        {canModify && (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={openReschedule} className="btn-outline">
              Reschedule
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError('');
                setCancelOpen(true);
              }}
              className="btn-ghost text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              Cancel Appointment
            </button>
          </div>
        )}
      </div>

      {/* Reschedule modal */}
      <Modal
        open={rescheduleOpen}
        onClose={() => !actionBusy && setRescheduleOpen(false)}
        title="Reschedule appointment"
        maxWidth="max-w-xl"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Pick a new slot for your consultation with{' '}
            <span className="font-semibold text-gray-800">{appointment.doctor_name}</span>.
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
              onClick={() => setRescheduleOpen(false)}
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
      </Modal>

      {/* Cancel confirmation modal */}
      <Modal open={cancelOpen} onClose={() => !actionBusy && setCancelOpen(false)} title="Cancel appointment?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Your appointment with{' '}
            <span className="font-semibold text-gray-800">{appointment.doctor_name}</span> on{' '}
            {formatDate(appointment.appointment_date)} at {appointment.appointment_time} will be
            cancelled. Any payment made will be refunded in 3–5 working days.
          </p>
          {actionError && (
            <p className="flex items-center gap-2 text-sm text-red-600" role="alert">
              <FaExclamationCircle aria-hidden="true" /> {actionError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-ghost" onClick={() => setCancelOpen(false)} disabled={actionBusy}>
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
      </Modal>

      {/* Back link at the bottom for long pages */}
      <div className="mt-6">
        <Link
          to="/dashboard/appointments"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
        >
          ← All appointments
        </Link>
      </div>
    </PageTransition>
  );
}
