import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import useFetch from '../../hooks/useFetch.js';
import { diagnosticService } from '../../services/diagnosticService.js';
import { useCart } from '../../context/CartContext.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import { SkeletonGrid } from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';
import PackageCard from '../diagnostics/PackageCard.jsx';

export default function PackagesSection() {
  const navigate = useNavigate();
  const { data: packages, loading, error } = useFetch(() => diagnosticService.getAllPackages(), []);
  const { toggleItem, inCart } = useCart();

  const handleBook = (pkg) => {
    if (!inCart(pkg.id, 'package')) {
      toggleItem(pkg, 'package');
    }
    navigate('/book-tests');
  };

  return (
    <div className="container-custom">
      <SectionHeading
        eyebrow="Health packages"
        title="Complete checkups, honest prices"
        subtitle="Thoughtfully bundled panels for every life stage — save up to 45% compared to booking tests individually."
      />

      {loading && <SkeletonGrid count={4} lines={4} />}

      {!loading && error && (
        <EmptyState
          title="Could not load packages"
          message="Something went wrong while fetching health packages. Please try again shortly."
        />
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(packages || []).slice(0, 4).map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} onBook={handleBook} />
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/health-packages" className="btn-outline" aria-label="View all health packages">
          View all packages <FaArrowRight aria-hidden="true" size={12} />
        </Link>
      </div>
    </div>
  );
}
