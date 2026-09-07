import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaHeart, FaRegHeart, FaUserMd } from 'react-icons/fa';
import { IoCheckmarkCircle, IoChevronForward, IoLocationOutline, IoVideocamOutline } from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import Modal from '../../components/common/Modal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import StarRating from '../../components/common/StarRating.jsx';
import { SkeletonCard, SkeletonGrid, SkeletonLine } from '../../components/common/Skeleton.jsx';
import DoctorCard from '../../components/doctors/DoctorCard.jsx';
import DatePicker from '../../components/booking/DatePicker.jsx';
import TimeSlotPicker from '../../components/booking/TimeSlotPicker.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { doctorService } from '../../services/doctorService.js';
import { reviewService } from '../../services/reviewService.js';
import { favoriteService } from '../../services/favoriteService.js';
import { CONSULTATION_TYPES } from '../../constants/index.js';
import { formatCurrency, formatDate } from '../../utils/helpers.js';

export default function DoctorDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const { data: doctor, loading, error } = useFetch(() => doctorService.getBySlug(slug), [slug]);
  useDocumentTitle(doctor ? doctor.name : 'Doctor Profile');

  // ---- reviews ----
  const {
    data: reviews,
    loading: reviewsLoading,
    refetch: refetchReviews,
  } = useFetch(
    () => (doctor ? reviewService.getForDoctor(doctor.id) : Promise.resolve([])),
    [doctor?.id],
  );

  // ---- related doctors (same specialty, excluding self) ----
  const { data: related, loading: relatedLoading } = useFetch(
    () => (doctor ? doctorService.search({ specialty: doctor.specialty }) : Promise.resolve([])),
    [doctor?.specialty, doctor?.id],
  );
  const relatedDoctors = (related || [])
    .filter((d) => String(d.id) !== String(doctor?.id))
    .slice(0, 3);

  // ---- favourite ----
  const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => {
    let active = true;
    if (isAuthenticated && user && doctor) {
      favoriteService
        .getMyFavorites(user.id)
        .then((ids) => active && setIsFavorite(ids.some((id) => String(id) === String(doctor.id))))
        .catch(() => {});
    } else {
      setIsFavorite(false);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, user, doctor]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const nowFavorite = await favoriteService.toggle(user.id, doctor.id);
      setIsFavorite(nowFavorite);
    } catch {
      // keep previous state on failure
    }
  };

  // ---- inline booking teaser ----
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('clinic');

  const proceedToBooking = () => {
    navigate(`/book-appointment/${doctor.slug}`, { state: { date, time, type } });
  };

  // ---- write a review ----
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { rating: 0, comment: '' } });
  const ratingValue = Number(watch('rating')) || 0;

  const onSubmitReview = async (values) => {
    setReviewError('');
    try {
      await reviewService.add({
        userId: user.id,
        doctorId: doctor.id,
        reviewerName: user.user_metadata?.full_name || 'Lab Easy Patient',
        rating: Number(values.rating),
        comment: values.comment.trim(),
      });
      reset();
      setReviewOpen(false);
      refetchReviews();
    } catch {
      setReviewError('We could not save your review right now. Please try again.');
    }
  };

  // ---------- loading ----------
  if (loading) {
    return (
      <PageTransition>
        <section className="section-padding">
          <div className="container-custom space-y-6">
            <SkeletonLine className="w-64" />
            <SkeletonCard lines={4} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <SkeletonCard lines={5} />
                <SkeletonCard lines={3} />
              </div>
              <SkeletonCard lines={6} />
            </div>
          </div>
        </section>
      </PageTransition>
    );
  }

  // ---------- not found ----------
  if (error || !doctor) {
    return (
      <PageTransition>
        <section className="section-padding">
          <div className="container-custom max-w-xl">
            <EmptyState
              icon={FaUserMd}
              title="Doctor not found"
              message="The profile you are looking for may have been moved or is no longer available on Lab Easy."
              actionLabel="Browse all doctors"
              actionTo="/doctors"
            />
          </div>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="section-padding">
        <div className="container-custom">
          {/* ---------- breadcrumb ---------- */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
              <li><Link to="/" className="hover:text-primary-600">Home</Link></li>
              <li aria-hidden="true"><IoChevronForward size={12} /></li>
              <li><Link to="/doctors" className="hover:text-primary-600">Doctors</Link></li>
              <li aria-hidden="true"><IoChevronForward size={12} /></li>
              <li aria-current="page" className="font-medium text-gray-800">{doctor.name}</li>
            </ol>
          </nav>

          {/* ---------- profile header ---------- */}
          <div className="card relative p-6 md:p-8">
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              className="absolute right-5 top-5 rounded-full p-2.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
            >
              {isFavorite ? <FaHeart className="text-red-500" size={20} /> : <FaRegHeart size={20} />}
            </button>

            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <img
                src={doctor.photo}
                alt={doctor.name}
                width="112"
                height="112"
                className="h-28 w-28 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                  {doctor.name}
                  {doctor.verified && (
                    <IoCheckmarkCircle
                      className="shrink-0 text-secondary-500"
                      size={22}
                      aria-label="Verified doctor"
                    />
                  )}
                </h1>
                <p className="mt-1 font-medium text-primary-600">{doctor.specialty}</p>
                <p className="text-sm text-gray-500">{doctor.qualifications}</p>
                <p className="mt-1 text-sm text-gray-600">{doctor.experienceYears} years of experience</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {doctor.languages.map((lang) => (
                    <span key={lang} className="badge bg-gray-100 text-gray-600">{lang}</span>
                  ))}
                </div>

                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <IoLocationOutline aria-hidden="true" className="text-primary-600" />
                  {doctor.clinic}, {doctor.city}
                </p>

                <div className="mt-3 flex items-center gap-2 text-sm">
                  <StarRating rating={doctor.rating} />
                  <span className="font-semibold text-gray-900">{doctor.rating}</span>
                  <span className="text-gray-400">({doctor.reviewCount} reviews)</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-4 md:w-56 md:border-l md:border-gray-100 md:pl-6">
                <div className="flex gap-6 md:flex-col md:gap-3">
                  <div>
                    <p className="text-xs text-gray-400">In-clinic visit</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(doctor.consultationFee)}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <IoVideocamOutline aria-hidden="true" /> Video consult
                    </p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(doctor.videoFee)}</p>
                  </div>
                </div>
                <Link to={`/book-appointment/${doctor.slug}`} className="btn-primary w-full">
                  Book Appointment
                </Link>
              </div>
            </div>
          </div>

          {/* ---------- body ---------- */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              {/* about */}
              <FadeIn>
                <div className="card p-6 md:p-8">
                  <h2 className="mb-3 text-xl font-bold">About {doctor.name}</h2>
                  <p className="text-sm leading-relaxed text-gray-600 sm:text-base">{doctor.about}</p>
                </div>
              </FadeIn>

              {/* how booking works */}
              <FadeIn delay={0.05}>
                <div className="card p-6 md:p-8">
                  <h2 className="mb-4 text-xl font-bold">How booking works</h2>
                  <ol className="space-y-3 text-sm text-gray-600">
                    <li>
                      <span className="font-semibold text-gray-800">1. Request a slot</span> — pick a date and time and share the patient details.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-800">2. We confirm it</span> — our team reviews your request and confirms the appointment, and you're notified. If the slot isn't available we'll help you reschedule or cancel.
                    </li>
                    <li>
                      <span className="font-semibold text-gray-800">3. Consult &amp; pay</span> — attend your visit or video call and pay in cash at the time of service.
                    </li>
                  </ol>
                </div>
              </FadeIn>

              {/* reviews */}
              <FadeIn delay={0.1}>
                <div className="card p-6 md:p-8">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">Patient Reviews</h2>
                    {isAuthenticated ? (
                      <button type="button" onClick={() => setReviewOpen(true)} className="btn-outline text-sm">
                        Write a review
                      </button>
                    ) : (
                      <Link to="/login" className="text-sm font-medium text-primary-600 hover:underline">
                        Log in to write a review
                      </Link>
                    )}
                  </div>

                  {reviewsLoading ? (
                    <div className="space-y-3">
                      <SkeletonLine className="w-full" />
                      <SkeletonLine className="w-5/6" />
                      <SkeletonLine className="w-2/3" />
                    </div>
                  ) : (reviews || []).length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No reviews yet. Be the first to share your experience with {doctor.name}.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {reviews.map((review) => (
                        <li key={review.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-gray-900">{review.reviewer_name}</p>
                            <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                          </div>
                          <div className="mt-1">
                            <StarRating rating={review.rating} />
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-gray-600">{review.comment}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </FadeIn>
            </div>

            {/* booking teaser */}
            <aside>
              <div className="card sticky top-24 p-6">
                <h2 className="mb-4 text-lg font-bold">Book a slot</h2>

                <fieldset className="mb-5">
                  <legend className="form-label">Consultation type</legend>
                  <div className="space-y-2">
                    {CONSULTATION_TYPES.map((ct) => (
                      <label
                        key={ct.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
                          type === ct.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="consultation-type"
                          value={ct.id}
                          checked={type === ct.id}
                          onChange={() => setType(ct.id)}
                          className="mt-0.5 h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-gray-800">{ct.label}</span>
                          <span className="block text-xs text-gray-500">{ct.description}</span>
                          <span className="mt-0.5 block text-xs font-semibold text-primary-600">
                            {formatCurrency(ct.id === 'video' ? doctor.videoFee : doctor.consultationFee)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <p className="form-label">Pick a date</p>
                <DatePicker value={date} onChange={setDate} days={7} />

                <p className="form-label mt-4">Pick a time</p>
                <div className="max-h-56 overflow-y-auto pr-1">
                  <TimeSlotPicker value={time} onChange={setTime} />
                </div>

                <button
                  type="button"
                  onClick={proceedToBooking}
                  disabled={!date || !time}
                  className="btn-primary mt-5 w-full"
                >
                  Continue Booking
                </button>
                <p className="mt-2 text-center text-xs text-gray-400">
                  No charge yet — you confirm and pay on the next step.
                </p>
              </div>
            </aside>
          </div>

          {/* ---------- related doctors ---------- */}
          {(relatedLoading || relatedDoctors.length > 0) && (
            <FadeIn className="mt-14">
              <h2 className="mb-6 text-xl font-bold">More {doctor.specialty} specialists</h2>
              {relatedLoading ? (
                <SkeletonGrid count={3} lines={3} />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedDoctors.map((d) => (
                    <DoctorCard key={d.id} doctor={d} />
                  ))}
                </div>
              )}
            </FadeIn>
          )}
        </div>
      </section>

      {/* ---------- write review modal ---------- */}
      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={`Review ${doctor.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit(onSubmitReview)} noValidate>
          <input
            type="hidden"
            {...register('rating', {
              validate: (v) => Number(v) > 0 || 'Please select a star rating',
            })}
          />
          <p className="form-label">Your rating</p>
          <StarRating
            rating={ratingValue}
            size={26}
            interactive
            onChange={(star) => setValue('rating', star, { shouldValidate: true })}
          />
          {errors.rating && <p className="error-text">{errors.rating.message}</p>}

          <label htmlFor="review-comment" className="form-label mt-4">Your experience</label>
          <textarea
            id="review-comment"
            rows={4}
            placeholder="How was the consultation? Was the doctor on time, attentive and clear?"
            className={`input-field resize-none ${errors.comment ? 'input-error' : ''}`}
            {...register('comment', {
              required: 'Please share a few words about your visit',
              minLength: { value: 20, message: 'Reviews need at least 20 characters to help other patients' },
            })}
          />
          {errors.comment && <p className="error-text">{errors.comment.message}</p>}

          {reviewError && <p className="error-text mt-2">{reviewError}</p>}

          <button type="submit" disabled={isSubmitting} className="btn-primary mt-5 w-full">
            {isSubmitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      </Modal>
    </PageTransition>
  );
}
