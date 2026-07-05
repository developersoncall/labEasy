import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';
import { formatCurrency, discountPercent } from '../../utils/helpers.js';

/** Health package card with included-test highlights. */
export default function PackageCard({ pkg, onBook }) {
  const off = discountPercent(pkg.price, pkg.mrp);

  return (
    <motion.article whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="card-hover flex flex-col p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{pkg.idealFor}</p>
        </div>
        {pkg.popular && <span className="badge shrink-0 bg-primary-50 text-primary-700">Popular</span>}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500 line-clamp-2">{pkg.description}</p>

      <ul className="mt-4 space-y-1.5">
        {pkg.includedTests.slice(0, 4).map((t) => (
          <li key={t} className="flex items-center gap-2 text-xs text-gray-600">
            <FaCheckCircle className="shrink-0 text-secondary-500" aria-hidden="true" /> {t}
          </li>
        ))}
        {pkg.testsCount > 4 && (
          <li className="text-xs font-medium text-primary-600">+ {pkg.testsCount - 4} more parameters</li>
        )}
      </ul>

      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
        <div>
          <span className="text-xl font-bold text-gray-900">{formatCurrency(pkg.price)}</span>
          {off > 0 && (
            <>
              <span className="ml-2 text-xs text-gray-400 line-through">{formatCurrency(pkg.mrp)}</span>
              <span className="ml-2 text-xs font-semibold text-secondary-600">{off}% OFF</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to={`/health-packages/${pkg.slug}`} className="btn-outline text-center text-xs">
          View Details
        </Link>
        <button type="button" onClick={() => onBook?.(pkg)} className="btn-primary text-xs">
          Book Package
        </button>
      </div>
    </motion.article>
  );
}
