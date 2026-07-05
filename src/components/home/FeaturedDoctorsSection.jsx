import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import useFetch from '../../hooks/useFetch.js';
import { doctorService } from '../../services/doctorService.js';
import SectionHeading from '../common/SectionHeading.jsx';
import { SkeletonGrid } from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';
import DoctorCard from '../doctors/DoctorCard.jsx';

/** Featured doctors picked from the catalogue for the landing page. */
export default function FeaturedDoctorsSection() {
  const { data: doctors, loading, error } = useFetch(() => doctorService.getFeatured(), []);

  return (
    <div className="container-custom">
      <SectionHeading
        eyebrow="Top rated"
        title="Consult our featured doctors"
        subtitle="Hand-picked specialists with outstanding patient ratings, verified credentials and availability this week."
      />

      {loading && <SkeletonGrid count={6} lines={3} />}

      {!loading && error && (
        <EmptyState
          title="Could not load doctors"
          message="Something went wrong while fetching our featured doctors. Please try again shortly."
        />
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(doctors || []).map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/doctors" className="btn-outline" aria-label="View all doctors">
          View all doctors <FaArrowRight aria-hidden="true" size={12} />
        </Link>
      </div>
    </div>
  );
}
