import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FaCheck, FaVideo, FaClinicMedical, FaUserMd } from 'react-icons/fa';
import { IoLocationOutline, IoCheckmarkCircle } from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import StarRating from '../../components/common/StarRating.jsx';
import DatePicker from '../../components/booking/DatePicker.jsx';
import TimeSlotPicker from '../../components/booking/TimeSlotPicker.jsx';
import PaymentMethods from '../../components/payment/PaymentMethods.jsx';
import PaymentSummary from '../../components/payment/PaymentSummary.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { doctorService } from '../../services/doctorService.js';
import { appointmentService } from '../../services/appointmentService.js';
import { CONSULTATION_TYPES } from '../../constants/index.js';
import { formatCurrency, formatDateLong, getUpcomingDates, scrollTop, phoneRule } from '../../utils/helpers.js';

const STEPS = [
  { n: 1, label: 'Choose Slot' },
  { n: 2, label: 'Patient Details' },
  { n: 3, label: 'Confirm' },
  { n: 4, label: 'Done' },
];

const TYPE_ICONS = { clinic: FaClinicMedical, video: FaVideo };

/** Numbered progress stepper across the top of the wizard. */
function Stepper({ current }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Booking progress">
      {STEPS.map((s, i) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <li key={s.n} className={`flex items-center gap-2 sm:gap-3 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
            <span
              aria-current={active ? 'step' : undefined}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                done || active ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {done ? <FaCheck size={11} aria-hidden="true" /> : s.n}
            </span>
            <span
              className={`hidden whitespace-nowrap text-xs font-medium sm:block ${
                active ? 'text-primary-700' : done ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`h-0.5 min-w-[12px] flex-1 rounded-full ${done ? 'bg-primary-600' : 'bg-gray-200'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function BookAppointment() {
  useDocumentTitle('Book Appointment');
  const pr = phoneRule();
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const preset = location.state || {};
  const { data: doctor, loading } = useFetch(() => doctorService.getBySlug(slug), [slug]);

  const [step, setStep] = useState(1);
  const [consultationType, setConsultationType] = useState(preset.consultationType || 'clinic');
  const [date, setDate] = useState(preset.date || getUpcomingDates(1)[0].iso);
  const [time, setTime] = useState(preset.time || '');
  const [slotError, setSlotError] = useState('');
  const [patient, setPatient] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [placing, setPlacing] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      patientName: user?.user_metadata?.full_name || '',
      patientAge: '',
      patientGender: '',
      patientPhone: user?.user_metadata?.phone || '',
      symptoms: '',
    },
  });

  const fee = doctor ? (consultationType === 'video' ? doctor.videoFee : doctor.consultationFee) : 0;

  const goToStep = (n) => {
    setStep(n);
    scrollTop();
  };

  const handleSlotNext = () => {
    if (!date) {
      setSlotError('Please pick an appointment date.');
      return;
    }
    if (!time) {
      setSlotError('Please select a time slot to continue.');
      return;
    }
    setSlotError('');
    goToStep(2);
  };

  const onPatientSubmit = (data) => {
    setPatient(data);
    goToStep(3);
  };

  const confirmBooking = async () => {
    if (!doctor || !patient) return;
    setPlacing(true);
    setBookingError('');
    try {
      const saved = await appointmentService.book({
        userId: user.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorPhoto: doctor.photo,
        specialty: doctor.specialty,
        date,
        time,
        consultationType,
        fee,
        patientName: patient.patientName,
        patientAge: Number(patient.patientAge),
        patientGender: patient.patientGender,
        patientPhone: patient.patientPhone,
        symptoms: patient.symptoms,
      });
      navigate('/booking-success', {
        state: { kind: 'appointment', record: saved, doctorName: doctor.name, date, time },
      });
    } catch (err) {
      setBookingError(err.message || 'We could not confirm your appointment. Please try again.');
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="section-padding">
          <div className="container-custom grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={3} />
            </div>
            <SkeletonCard lines={5} />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!doctor) {
    return (
      <PageTransition>
        <div className="section-padding">
          <div className="container-custom max-w-2xl">
            <EmptyState
              icon={FaUserMd}
              title="Doctor not found"
              message="The doctor you are trying to book may no longer be available on LabEasy. Browse our directory to find another specialist."
              actionLabel="Browse Doctors"
              actionTo="/doctors"
            />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="section-padding">
        <div className="container-custom">
          <div className="mb-8">
            <h1 className="text-2xl font-bold sm:text-3xl">Book an Appointment</h1>
            <p className="mt-1 text-sm text-gray-500">
              Reserve your slot with {doctor.name} in three quick steps.
            </p>
          </div>

          <Stepper current={step} />

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {/* ---------------- main wizard column ---------------- */}
            <div className="lg:col-span-2">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {/* ---- Step 1: consultation type + slot ---- */}
                {step === 1 && (
                  <div className="card space-y-8 p-6">
                    <section>
                      <h2 className="mb-3 text-base font-semibold">Consultation type</h2>
                      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Consultation type">
                        {CONSULTATION_TYPES.map(({ id, label, description }) => {
                          const Icon = TYPE_ICONS[id];
                          const typeFee = id === 'video' ? doctor.videoFee : doctor.consultationFee;
                          const selected = consultationType === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setConsultationType(id)}
                              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                                selected
                                  ? 'border-primary-600 bg-primary-50/60'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                  selected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                <Icon aria-hidden="true" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-gray-800">{label}</span>
                                <span className="block text-xs text-gray-500">{description}</span>
                                <span className="mt-1 block text-sm font-bold text-primary-700">
                                  {formatCurrency(typeFee)}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h2 className="mb-3 text-base font-semibold">Pick a date</h2>
                      <DatePicker value={date} onChange={setDate} days={7} />
                    </section>

                    <section>
                      <h2 className="mb-3 text-base font-semibold">Pick a time slot</h2>
                      <TimeSlotPicker
                        value={time}
                        onChange={(slot) => {
                          setTime(slot);
                          setSlotError('');
                        }}
                      />
                      {slotError && <p className="error-text mt-3">{slotError}</p>}
                    </section>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-5">
                      <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
                        Back
                      </button>
                      <button type="button" onClick={handleSlotNext} className="btn-primary">
                        Continue to Patient Details
                      </button>
                    </div>
                  </div>
                )}

                {/* ---- Step 2: patient details ---- */}
                {step === 2 && (
                  <form className="card space-y-5 p-6" onSubmit={handleSubmit(onPatientSubmit)} noValidate>
                    <div>
                      <h2 className="text-base font-semibold">Patient details</h2>
                      <p className="mt-0.5 text-xs text-gray-500">
                        The consultation will be registered under this patient's name.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="patientName" className="form-label">
                        Patient full name
                      </label>
                      <input
                        id="patientName"
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        className={`input-field ${errors.patientName ? 'input-error' : ''}`}
                        {...register('patientName', {
                          required: 'Patient name is required.',
                          minLength: { value: 3, message: 'Name must be at least 3 characters.' },
                        })}
                      />
                      {errors.patientName && <p className="error-text">{errors.patientName.message}</p>}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="patientAge" className="form-label">
                          Age (years)
                        </label>
                        <input
                          id="patientAge"
                          type="number"
                          placeholder="e.g. 32"
                          className={`input-field ${errors.patientAge ? 'input-error' : ''}`}
                          {...register('patientAge', {
                            required: 'Age is required.',
                            min: { value: 1, message: 'Age must be at least 1.' },
                            max: { value: 120, message: 'Age must be 120 or below.' },
                          })}
                        />
                        {errors.patientAge && <p className="error-text">{errors.patientAge.message}</p>}
                      </div>
                      <div>
                        <label htmlFor="patientGender" className="form-label">
                          Gender
                        </label>
                        <select
                          id="patientGender"
                          className={`input-field ${errors.patientGender ? 'input-error' : ''}`}
                          {...register('patientGender', { required: 'Please select a gender.' })}
                        >
                          <option value="">Select gender</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                        </select>
                        {errors.patientGender && <p className="error-text">{errors.patientGender.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="patientPhone" className="form-label">
                        Mobile number
                      </label>
                      <input
                        id="patientPhone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={pr.maxLength}
                        placeholder={pr.placeholder}
                        className={`input-field ${errors.patientPhone ? 'input-error' : ''}`}
                        {...register('patientPhone', {
                          required: 'Mobile number is required.',
                          pattern: { value: pr.pattern, message: pr.message },
                        })}
                      />
                      {errors.patientPhone && <p className="error-text">{errors.patientPhone.message}</p>}
                    </div>

                    <div>
                      <label htmlFor="symptoms" className="form-label">
                        Symptoms / reason for visit <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <textarea
                        id="symptoms"
                        rows={3}
                        placeholder="Briefly describe your symptoms so the doctor can prepare, e.g. recurring headaches for two weeks"
                        className="input-field resize-none"
                        {...register('symptoms')}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-5">
                      <button type="button" onClick={() => goToStep(1)} className="btn-ghost">
                        Back
                      </button>
                      <button type="submit" className="btn-primary">
                        Review &amp; Confirm
                      </button>
                    </div>
                  </form>
                )}

                {/* ---- Step 3: review + payment ---- */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="card p-6">
                      <h2 className="mb-4 text-base font-semibold">Review your appointment</h2>
                      <div className="mb-5 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                        <img
                          src={doctor.photo}
                          alt={doctor.name}
                          width="56"
                          height="56"
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-semibold text-gray-900">
                            {doctor.name}
                            {doctor.verified && (
                              <IoCheckmarkCircle className="shrink-0 text-secondary-500" aria-label="Verified doctor" />
                            )}
                          </p>
                          <p className="text-sm text-primary-600">{doctor.specialty}</p>
                          <p className="truncate text-xs text-gray-500">{doctor.clinic}</p>
                        </div>
                      </div>
                      <dl className="space-y-2.5 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Date</dt>
                          <dd className="text-right font-medium text-gray-800">{formatDateLong(date)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Time</dt>
                          <dd className="font-medium text-gray-800">{time}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Consultation type</dt>
                          <dd className="font-medium text-gray-800">
                            {consultationType === 'video' ? 'Video Consultation' : 'In-Clinic Visit'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Patient</dt>
                          <dd className="text-right font-medium text-gray-800">
                            {patient?.patientName} ({patient?.patientAge} yrs)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-gray-500">Contact</dt>
                          <dd className="font-medium text-gray-800">{patient?.patientPhone}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="card p-6">
                      <h2 className="mb-4 text-base font-semibold">Payment</h2>
                      <PaymentMethods value={paymentMethod} onChange={setPaymentMethod} />
                    </div>

                    <PaymentSummary title="Fee summary" items={[{ label: 'Consultation fee', amount: fee }]} />

                    {bookingError && (
                      <p className="error-text text-sm" role="alert">
                        {bookingError}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => goToStep(2)} className="btn-ghost" disabled={placing}>
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={confirmBooking}
                        className="btn-primary"
                        disabled={placing}
                        aria-label="Confirm appointment booking"
                      >
                        {placing ? (
                          <>
                            <Spinner size="sm" label="Confirming appointment" /> Confirming…
                          </>
                        ) : (
                          <>Confirm Booking</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* ---------------- doctor summary sidebar ---------------- */}
            <aside className="h-fit lg:sticky lg:top-24">
              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <img
                    src={doctor.photo}
                    alt={doctor.name}
                    width="64"
                    height="64"
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 truncate font-semibold text-gray-900">
                      {doctor.name}
                      {doctor.verified && (
                        <IoCheckmarkCircle className="shrink-0 text-secondary-500" aria-label="Verified doctor" />
                      )}
                    </h3>
                    <p className="text-sm font-medium text-primary-600">{doctor.specialty}</p>
                    <p className="truncate text-xs text-gray-500">{doctor.qualifications}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm">
                  <StarRating rating={doctor.rating} />
                  <span className="font-semibold text-gray-800">{doctor.rating}</span>
                  <span className="text-xs text-gray-400">({doctor.reviewCount} reviews)</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>{doctor.experienceYears} yrs experience</span>
                  <span className="inline-flex items-center gap-1">
                    <IoLocationOutline aria-hidden="true" /> {doctor.city}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{doctor.clinic}</p>

                <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
                  <div
                    className={`flex justify-between gap-4 ${
                      consultationType === 'clinic' ? 'font-semibold text-primary-700' : 'text-gray-500'
                    }`}
                  >
                    <dt>In-clinic visit</dt>
                    <dd>{formatCurrency(doctor.consultationFee)}</dd>
                  </div>
                  <div
                    className={`flex justify-between gap-4 ${
                      consultationType === 'video' ? 'font-semibold text-primary-700' : 'text-gray-500'
                    }`}
                  >
                    <dt>Video consultation</dt>
                    <dd>{formatCurrency(doctor.videoFee)}</dd>
                  </div>
                </dl>

                {time && (
                  <div className="mt-4 rounded-xl bg-primary-50 px-4 py-3 text-xs text-primary-800">
                    <span className="font-semibold">Selected slot:</span> {formatDateLong(date)} at {time}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
