import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import useFetch from '../../hooks/useFetch.js';
import { diagnosticService } from '../../services/diagnosticService.js';
import { useCart } from '../../context/CartContext.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import { SkeletonGrid } from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';
import TestCard from '../diagnostics/TestCard.jsx';

/** Most-booked diagnostic tests with add-to-booking wired to the cart. */
export default function PopularTestsSection() {
  const { data: tests, loading, error } = useFetch(() => diagnosticService.getPopularTests(), []);
  const { toggleItem, inCart } = useCart();

  return (
    <div className="container-custom">
      <SectionHeading
        eyebrow="Lab tests"
        title="Popular diagnostic tests"
        subtitle="Book the tests doctors recommend most — accurate results from NABL-accredited labs, with free home sample collection on most tests."
      />

      {loading && <SkeletonGrid count={8} lines={2} />}

      {!loading && error && (
        <EmptyState
          title="Could not load tests"
          message="Something went wrong while fetching popular tests. Please try again shortly."
        />
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(tests || []).map((test) => (
            <TestCard
              key={test.id}
              test={test}
              inCart={inCart(test.id, 'test')}
              onAdd={(t) => toggleItem(t, 'test')}
            />
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/diagnostic-tests" className="btn-outline" aria-label="Browse all diagnostic tests">
          Browse all tests <FaArrowRight aria-hidden="true" size={12} />
        </Link>
      </div>
    </div>
  );
}
