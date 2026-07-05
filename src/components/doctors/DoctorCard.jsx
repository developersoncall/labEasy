import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaRegHeart, FaHeart } from 'react-icons/fa';
import { IoLocationOutline, IoCheckmarkCircle } from 'react-icons/io5';
import StarRating from '../common/StarRating.jsx';
import { formatCurrency } from '../../utils/helpers.js';

/**
 * Doctor summary card used in listings and the landing page.
 * Optional favourite toggle: pass `isFavorite` + `onToggleFavorite`.
 */
export default function DoctorCard({ doctor, isFavorite, onToggleFavorite }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="card-hover relative flex flex-col p-5"
    >
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(doctor.id)}
          aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
        >
          {isFavorite ? <FaHeart className="text-red-500" size={18} /> : <FaRegHeart size={18} />}
        </button>
      )}

      <div className="flex items-start gap-4">
        <img
          src={doctor.photo}
          alt={doctor.name}
          loading="lazy"
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

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
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

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <div>
          <p className="text-xs text-gray-400">Consultation fee</p>
          <p className="font-bold text-gray-900">{formatCurrency(doctor.consultationFee)}</p>
        </div>
        <span
          className={`badge ${doctor.nextAvailable === 'Today' ? 'bg-secondary-50 text-secondary-700' : 'bg-gray-100 text-gray-600'}`}
        >
          Available {doctor.nextAvailable}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to={`/doctors/${doctor.slug}`} className="btn-outline text-center text-xs sm:text-sm">
          View Profile
        </Link>
        <Link to={`/book-appointment/${doctor.slug}`} className="btn-primary text-center text-xs sm:text-sm">
          Book Now
        </Link>
      </div>
    </motion.article>
  );
}
