import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { IoArrowForward } from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import SpecialtyIcon from '../../components/common/SpecialtyIcon.jsx';
import { SkeletonGrid } from '../../components/common/Skeleton.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { doctorService } from '../../services/doctorService.js';

export default function Specialties() {
  useDocumentTitle('Specialties');

  const { data: specialties, loading: specialtiesLoading } = useFetch(() => doctorService.getSpecialties(), []);
  const { data: doctors, loading: doctorsLoading } = useFetch(() => doctorService.getAll(), []);
  const loading = specialtiesLoading || doctorsLoading;

  const countBySpecialty = useMemo(() => {
    const counts = {};
    (doctors || []).forEach((d) => {
      counts[d.specialty] = (counts[d.specialty] || 0) + 1;
    });
    return counts;
  }, [doctors]);

  return (
    <PageTransition>
      {/* ---------- hero ---------- */}
      <section className="bg-gradient-to-r from-primary-50 via-white to-secondary-50 py-14 md:py-20">
        <div className="container-custom text-center">
          <span className="badge bg-primary-100 uppercase tracking-wide text-primary-700">
            15 Medical Specialties
          </span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl text-balance">
            The right specialist for every health concern
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-500 sm:text-base">
            From everyday fevers to heart health and mental wellness — browse our departments and
            connect with verified, experienced doctors across Bangladesh.
          </p>
        </div>
      </section>

      {/* ---------- specialties grid ---------- */}
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Departments"
            title="Browse by specialty"
            subtitle="Every doctor on LabEasy is credential-verified. Pick a department to see available specialists, fees and next slots."
          />

          {loading ? (
            <SkeletonGrid count={6} lines={2} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(specialties || []).map((specialty, index) => {
                const count = countBySpecialty[specialty.name] || 0;
                return (
                  <FadeIn key={specialty.id} delay={Math.min(index * 0.04, 0.3)}>
                    <div className="card-hover flex h-full flex-col p-6">
                      <div className="flex items-start justify-between gap-3">
                        <SpecialtyIcon icon={specialty.icon} size={24} />
                        <span className="badge bg-secondary-50 text-secondary-700">
                          {count} doctor{count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-gray-900">{specialty.name}</h3>
                      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-gray-500">
                        {specialty.description}
                      </p>
                      <Link
                        to={`/doctors?specialty=${encodeURIComponent(specialty.name)}`}
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition hover:gap-2.5 hover:text-primary-700"
                        aria-label={`View ${specialty.name} doctors`}
                      >
                        View doctors <IoArrowForward aria-hidden="true" />
                      </Link>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------- CTA band ---------- */}
      <section className="pb-14 md:pb-20">
        <div className="container-custom">
          <FadeIn>
            <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-12 text-center text-white md:px-12">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Not sure which specialist you need?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-primary-100 sm:text-base">
                Start with a General Medicine consultation — our physicians will assess your symptoms
                and refer you to the right department if needed.
              </p>
              <Link
                to="/doctors"
                className="btn mt-6 bg-white text-primary-700 shadow-sm hover:bg-primary-50"
              >
                Find a Doctor
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
