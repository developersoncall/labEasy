import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFlask } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { useCart } from '../../context/CartContext.jsx';
import { formatCurrency } from '../../utils/helpers.js';

/**
 * Floating bottom bar that appears when lab tests/packages are in the cart.
 * Hidden on the checkout page itself.
 */
export default function CartBar() {
  const { count, total, clearCart } = useCart();
  const { pathname } = useLocation();
  const visible = count > 0 && pathname !== '/book-tests';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: '-50%', y: 80, opacity: 0 }}
          animate={{ x: '-50%', y: 0, opacity: 1 }}
          exit={{ x: '-50%', y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-xl"
        >
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-900 px-5 py-3.5 text-white shadow-card-hover">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600">
                <FaFlask size={14} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {count} {count === 1 ? 'item' : 'items'} selected
                </p>
                <p className="text-xs text-gray-400">Total {formatCurrency(total)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearCart}
                aria-label="Clear cart"
                className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                <IoClose size={16} aria-hidden="true" /> Clear
              </button>
              <Link to="/book-tests" className="btn-secondary text-xs sm:text-sm">
                Proceed to Book
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
