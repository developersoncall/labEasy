import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaCheckCircle,
  FaBoxOpen,
  FaHome,
  FaClock,
  FaUtensils,
  FaShieldAlt,
  FaUserNurse,
  FaFileMedicalAlt,
  FaArrowLeft,
} from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import PackageCard from '../../components/diagnostics/PackageCard.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useCart } from '../../context/CartContext.jsx';
import { diagnosticService } from '../../services/diagnosticService.js';
import { formatCurrency, discountPercent } from '../../utils/helpers.js';

const REASSURANCE = [
  { icon: FaShieldAlt, text: 'Processed in NABL-accredited partner labs' },
  { icon: FaUserNurse, text: 'Certified phlebotomist, sealed single-use kit' },
  { icon: FaFileMedicalAlt, text: 'Verified digital report on your dashboard' },
];

export default function PackageDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toggleItem, inCart } = useCart();

  const { data, loading } = useFetch(async () => {
    const [pkg, all] = await Promise.all([
      diagnosticService.getPackageBySlug(slug),
      diagnosticService.getAllPackages(),
    ]);
    return { pkg, all };
  }, [slug]);

  const pkg = data?.pkg || null;
  useDocumentTitle(pkg ? pkg.name : 'Health Package');

  const related = useMemo(() => {
    if (!pkg || !data?.all) return [];
    return data.all
      .filter((p) => p.id !== pkg.id && (p.category === pkg.category || p.popular))
      .slice(0, 3);
  }, [data, pkg]);

  const handleBook = (target) => {
    if (!inCart(target.id, 'package')) toggleItem(target, 'package');
    navigate('/book-tests');
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="container-custom section-padding">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <SkeletonCard lines={6} />
              <SkeletonCard lines={5} />
            </div>
            <SkeletonCard lines={4} />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!pkg) {
    return (
      <PageTransition>
        <div className="container-custom section-padding">
          <EmptyState
            icon={FaBoxOpen}
            title="Package not found"
            message="The health package you’re looking for doesn’t exist or may have been retired. Browse our current packages instead."
            actionLabel="Browse Health Packages"
            actionTo="/health-packages"
          />
        </div>
      </PageTransition>
    );
  }

  const off = discountPercent(pkg.price, pkg.mrp);
  const savings = pkg.mrp - pkg.price;
  const booked = inCart(pkg.id, 'package');

  return (
    <PageTransition>
      <div className="container-custom py-10 md:py-14">
        <Link
          to="/health-packages"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <FaArrowLeft aria-hidden="true" size={12} /> All Health Packages
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* ---------- left: package overview ---------- */}
          <div className="lg:col-span-2">
            <article className="card p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{pkg.name}</h1>
                  <p className="mt-1.5 text-sm font-medium text-primary-600">{pkg.idealFor}</p>
                </div>
                {pkg.popular && <span className="badge bg-primary-50 text-primary-700">Popular</span>}
              </div>

              <p className="mt-4 leading-relaxed text-gray-600">{pkg.description}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className={`badge ${
                    pkg.fastingRequired ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <FaUtensils aria-hidden="true" />
                  {pkg.fastingRequired ? 'Fasting required (8–12 hrs)' : 'No fasting needed'}
                </span>
                <span className="badge bg-primary-50 text-primary-700">
                  <FaClock aria-hidden="true" /> Report in {pkg.reportHours} hours
                </span>
                {pkg.homeCollection && (
                  <span className="badge bg-secondary-50 text-secondary-700">
                    <FaHome aria-hidden="true" /> Free home collection
                  </span>
                )}
              </div>

              <div className="mt-8 border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900">What’s included</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Key profiles in this package — together they cover{' '}
                  <span className="font-semibold text-gray-800">{pkg.testsCount} parameters</span> in total.
                </p>
                <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {pkg.includedTests.map((test) => (
                    <li key={test} className="flex items-start gap-2 text-sm text-gray-700">
                      <FaCheckCircle aria-hidden="true" className="mt-0.5 shrink-0 text-secondary-500" />
                      {test}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>

          {/* ---------- right: sticky booking card ---------- */}
          <aside>
            <div className="card p-6 lg:sticky lg:top-24">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Package price</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">{formatCurrency(pkg.price)}</span>
                    {off > 0 && (
                      <span className="text-sm text-gray-400 line-through">{formatCurrency(pkg.mrp)}</span>
                    )}
                  </div>
                </div>
                {off > 0 && <span className="badge bg-secondary-50 text-secondary-700">{off}% OFF</span>}
              </div>

              {savings > 0 && (
                <p className="mt-2 text-sm font-medium text-secondary-600">
                  You save {formatCurrency(savings)} versus booking these tests individually.
                </p>
              )}

              <button
                type="button"
                onClick={() => handleBook(pkg)}
                className="btn-primary mt-5 w-full"
                aria-label={`Book ${pkg.name}`}
              >
                {booked ? 'Continue to Booking' : 'Book This Package'}
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">
                Pay in cash at the time of service — no online payment needed.
              </p>

              <ul className="mt-6 space-y-3 border-t border-gray-100 pt-5">
                {REASSURANCE.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-gray-600">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <Icon size={13} aria-hidden="true" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* ---------- related packages ---------- */}
        {related.length > 0 && (
          <section className="mt-16">
            <SectionHeading
              eyebrow="You May Also Like"
              title="Related health packages"
              subtitle="Similar checkups our patients frequently compare before booking."
              align="left"
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((rp) => (
                <PackageCard key={rp.id} pkg={rp} onBook={handleBook} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
