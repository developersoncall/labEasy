import { motion } from 'framer-motion';
import { FaVial, FaHome, FaClock } from 'react-icons/fa';
import { formatCurrency, discountPercent } from '../../utils/helpers.js';

/**
 * Diagnostic test card with an "Add" action used on listing pages
 * and the landing page. `inCart` toggles the button state.
 */
export default function TestCard({ test, inCart, onAdd }) {
  const off = discountPercent(test.price, test.mrp);

  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="card-hover flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug text-gray-900">{test.name}</h3>
          <p className="mt-0.5 text-xs text-gray-400">{test.code} · {test.category}</p>
        </div>
        {off > 0 && <span className="badge shrink-0 bg-secondary-50 text-secondary-700">{off}% OFF</span>}
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{test.description}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1"><FaVial aria-hidden="true" className="text-primary-400" /> {test.sampleType}</span>
        <span className="inline-flex items-center gap-1"><FaClock aria-hidden="true" className="text-primary-400" /> Report in {test.reportHours}h</span>
        {test.homeCollection && (
          <span className="inline-flex items-center gap-1"><FaHome aria-hidden="true" className="text-primary-400" /> Home collection</span>
        )}
      </div>

      {test.fastingRequired && (
        <p className="mt-2 text-[11px] font-medium text-amber-600">Fasting required (8-12 hours)</p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
        <div>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(test.price)}</span>
          {off > 0 && <span className="ml-2 text-xs text-gray-400 line-through">{formatCurrency(test.mrp)}</span>}
        </div>
        <button
          type="button"
          onClick={() => onAdd?.(test)}
          className={inCart ? 'btn-secondary text-xs' : 'btn-primary text-xs'}
          aria-pressed={inCart}
        >
          {inCart ? 'Added ✓' : 'Add to Booking'}
        </button>
      </div>
    </motion.article>
  );
}
