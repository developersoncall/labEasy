import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowRight } from 'react-icons/fa';
import useFetch from '../../hooks/useFetch.js';
import { doctorService } from '../../services/doctorService.js';
import SectionHeading from '../common/SectionHeading.jsx';
import SpecialtyIcon from '../common/SpecialtyIcon.jsx';

/** Grid of the ten most-consulted specialties, each linking to a filtered doctor list. */
export default function SpecialtiesSection() {
  const { data, loading } = useFetch(() => doctorService.getSpecialties(), []);
  const specialties = (data || []).slice(0, 10);

  // Nothing to show (empty catalogue or fetch failed) — hide the section entirely.
  if (!loading && specialties.length === 0) return null;

  return (
    <div className="container-custom">
      <SectionHeading
        eyebrow="Browse by specialty"
        title="Find the right specialist"
        subtitle="From everyday fevers to heart health — connect with experienced doctors across every major specialty."
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {specialties.map((specialty) => (
            <motion.div key={specialty.id} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Link
                to={`/doctors?specialty=${encodeURIComponent(specialty.name)}`}
                aria-label={`Find ${specialty.name} doctors`}
                className="card-hover flex h-full flex-col items-center gap-3 p-5 text-center"
              >
                <SpecialtyIcon icon={specialty.icon} />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{specialty.name}</h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/specialties" className="btn-outline" aria-label="View all specialties">
          View all specialties <FaArrowRight aria-hidden="true" size={12} />
        </Link>
      </div>
    </div>
  );
}
