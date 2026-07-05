import { FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';

/** Read-only star rating display. Pass `interactive` + `onChange` to make it clickable. */
export default function StarRating({ rating = 0, size = 14, interactive = false, onChange }) {
  const stars = [1, 2, 3, 4, 5].map((star) => {
    let Icon = FaRegStar;
    if (rating >= star) Icon = FaStar;
    else if (rating >= star - 0.5) Icon = FaStarHalfAlt;

    if (!interactive) {
      return <Icon key={star} size={size} className="text-amber-400" aria-hidden="true" />;
    }
    return (
      <button
        key={star}
        type="button"
        onClick={() => onChange?.(star)}
        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        className="text-amber-400 transition hover:scale-110"
      >
        <Icon size={size} />
      </button>
    );
  });

  return (
    <span role="img" aria-label={`Rated ${rating} out of 5`} className="inline-flex items-center gap-0.5">
      {stars}
    </span>
  );
}
