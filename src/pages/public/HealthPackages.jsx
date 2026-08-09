import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBoxOpen, FaPiggyBank } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Accordion from '../../components/common/Accordion.jsx';
import { SkeletonGrid } from '../../components/common/Skeleton.jsx';
import PackageCard from '../../components/diagnostics/PackageCard.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useCart } from '../../context/CartContext.jsx';
import { diagnosticService } from '../../services/diagnosticService.js';

const PACKAGE_FAQS = [
  {
    id: 'faq-fasting',
    question: 'Do I need to fast before a health package?',
    answer:
      'Most full-body packages include sugar and lipid tests, so an 8–12 hour overnight fast is recommended. Water is absolutely fine. If your package does not require fasting, it is clearly marked on the package card.',
  },
  {
    id: 'faq-home',
    question: 'Is home sample collection included in the price?',
    answer:
      'Yes. Every package price you see includes a certified phlebotomist visiting your home at your chosen slot — there are no hidden collection charges.',
  },
  {
    id: 'faq-report',
    question: 'When will I receive my reports?',
    answer:
      'Most packages deliver verified digital reports within 24–48 hours of sample collection. Reports appear in your Medis dashboard and can be downloaded as PDFs anytime.',
  },
  {
    id: 'faq-family',
    question: 'Can I book one package for a family member?',
    answer:
      'Of course. During checkout you enter the patient’s name, age and gender — book from your account for anyone in your household.',
  },
];

export default function HealthPackages() {
  useDocumentTitle('Health Packages');
  const navigate = useNavigate();
  const { toggleItem, inCart } = useCart();
  const [category, setCategory] = useState('All');

  const { data: packages, loading, error, refetch } = useFetch(
    () => diagnosticService.getAllPackages(),
    []
  );

  const categories = useMemo(() => {
    const unique = [...new Set((packages || []).map((p) => p.category))];
    return ['All', ...unique];
  }, [packages]);

  const filtered = useMemo(() => {
    if (!packages) return [];
    if (category === 'All') return packages;
    return packages.filter((p) => p.category === category);
  }, [packages, category]);

  const handleBook = (pkg) => {
    if (!inCart(pkg.id, 'package')) toggleItem(pkg, 'package');
    navigate('/book-tests');
  };

  return (
    <PageTransition>
      {/* ---------- header ---------- */}
      <section className="border-b border-gray-100 bg-white">
        <div className="container-custom py-10 md:py-14">
          <SectionHeading
            eyebrow="Health Packages"
            title="Complete Checkups, Curated by Doctors"
            subtitle="Bundled screenings for every life stage — priced up to 45% below booking each test individually, with free home collection."
          />

          <div
            className="flex flex-wrap justify-center gap-2"
            role="group"
            aria-label="Filter packages by category"
          >
            {categories.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={active}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    active
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- packages grid ---------- */}
      <section className="section-padding">
        <div className="container-custom">
          {loading ? (
            <SkeletonGrid count={6} lines={4} />
          ) : error ? (
            <div className="card mx-auto max-w-md px-6 py-12 text-center">
              <h3 className="text-lg font-semibold">Couldn’t load packages</h3>
              <p className="mt-2 text-sm text-gray-500">{error}</p>
              <button type="button" onClick={refetch} className="btn-primary mt-5">
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FaBoxOpen}
              title="No packages in this category"
              message="Try another category — from full-body checkups to focused diabetes and heart panels, there’s a package for every need."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} onBook={handleBook} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- comparison note strip ---------- */}
      <section className="bg-secondary-50">
        <div className="container-custom py-8">
          <FadeIn>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-secondary-600 shadow-card">
                <FaPiggyBank size={20} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold text-gray-900">Packages vs individual tests — why bundles win</h3>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
                  Booking the tests inside a package one by one can cost 30–45% more. Packages also share a single
                  sample-collection visit and one fasting window, so you save money, needle pricks and mornings. If you
                  only need one or two specific tests, browse{' '}
                  <Link to="/diagnostic-tests" className="font-semibold text-primary-600 hover:underline">
                    individual lab tests
                  </Link>{' '}
                  instead.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ---------- FAQ teaser ---------- */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Good to Know"
            title="Health package FAQs"
            subtitle="Quick answers to what patients ask most before booking a checkup."
          />
          <Accordion items={PACKAGE_FAQS} />
          <div className="mt-8 text-center">
            <Link to="/faq" className="btn-outline">
              View All FAQs
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
