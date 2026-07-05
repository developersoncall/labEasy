import { STATUS_LABELS, STATUS_COLORS } from '../../constants/index.js';

/** Colour-coded status pill used across appointments & lab bookings. */
export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
