import { useState } from 'react';
import {
  FaSearch,
  FaVial,
  FaHome,
  FaFileMedicalAlt,
  FaCertificate,
  FaUserNurse,
  FaMobileAlt,
} from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonGrid } from '../../components/common/Skeleton.jsx';
import TestCard from '../../components/diagnostics/TestCard.jsx';
import useFetch from '../../hooks/useFetch.js';
import useDebounce from '../../hooks/useDebounce.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useCart } from '../../context/CartContext.jsx';
import { diagnosticService } from '../../services/diagnosticService.js';

const INFO_POINTS = [
  { icon: FaCertificate, title: 'NABL-accredited labs', text: 'Every sample is processed in certified partner laboratories.' },
  { icon: FaHome, title: 'Free home collection', text: 'Certified phlebotomists visit at a slot you choose.' },
  { icon: FaFileMedicalAlt, title: 'Digital reports', text: 'Reports land on your dashboard, most within 24 hours.' },
];

const HOW_IT_WORKS = [
  { icon: FaSearch, step: '1', title: 'Pick your tests', text: 'Search the catalogue or filter by category and add tests to your booking.' },
  { icon: FaUserNurse, step: '2', title: 'Sample collection', text: 'A trained phlebotomist visits your home, or walk in to a LabEasy centre.' },
  { icon: FaMobileAlt, step: '3', title: 'Report on your phone', text: 'Track processing live and download the verified digital report.' },
];

export default function DiagnosticTests() {
  useDocumentTitle('Lab Tests');
  const { toggleItem, inCart } = useCart();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: tests, loading, error, refetch } = useFetch(
    () => diagnosticService.searchTests({ query: debouncedQuery, category }),
    [debouncedQuery, category]
  );

  const { data: categories } = useFetch(() => diagnosticService.getCategories(), []);

  const pills = ['All', ...(categories || [])];

  return (
    <PageTransition>
      {/* ---------- header: title + search + category pills ---------- */}
      <section className="border-b border-gray-100 bg-white">
        <div className="container-custom py-10 md:py-14">
          <SectionHeading
            eyebrow="Diagnostics"
            title="Book Lab Tests Online"
            subtitle="Transparent pricing, NABL-accredited processing and reports delivered straight to your dashboard."
          />

          <div className="mx-auto max-w-2xl">
            <label htmlFor="test-search" className="sr-only">
              Search lab tests
            </label>
            <div className="relative">
              <FaSearch aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="test-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tests, e.g. CBC, thyroid, vitamin D…"
                className="input-field pl-11"
              />
            </div>
          </div>

          <div
            className="mt-6 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Filter tests by category"
          >
            {pills.map((pill) => {
              const value = pill === 'All' ? '' : pill;
              const active = category === value;
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setCategory(value)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    active
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- info strip ---------- */}
      <section className="bg-primary-50/60">
        <div className="container-custom grid grid-cols-1 gap-4 py-6 sm:grid-cols-3">
          {INFO_POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-card">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- results grid ---------- */}
      <section className="section-padding">
        <div className="container-custom">
          {loading ? (
            <SkeletonGrid count={6} lines={3} />
          ) : error ? (
            <div className="card mx-auto max-w-md px-6 py-12 text-center">
              <h3 className="text-lg font-semibold">Couldn’t load tests</h3>
              <p className="mt-2 text-sm text-gray-500">{error}</p>
              <button type="button" onClick={refetch} className="btn-primary mt-5">
                Try Again
              </button>
            </div>
          ) : !tests || tests.length === 0 ? (
            <EmptyState
              icon={FaVial}
              title="No tests match your search"
              message="Try a different keyword or clear the category filter — our catalogue covers everything from CBC to allergy panels."
            />
          ) : (
            <>
              <p className="mb-6 text-sm text-gray-500" aria-live="polite">
                Showing <span className="font-semibold text-gray-800">{tests.length}</span>{' '}
                {tests.length === 1 ? 'test' : 'tests'}
                {category ? ` in ${category}` : ''}
              </p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tests.map((test) => (
                  <TestCard
                    key={test.id}
                    test={test}
                    inCart={inCart(test.id, 'test')}
                    onAdd={(t) => toggleItem(t, 'test')}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="border-t border-gray-100 bg-white">
        <div className="container-custom py-12 md:py-16">
          <SectionHeading
            eyebrow="Simple Process"
            title="How lab testing works with LabEasy"
            subtitle="Three steps between you and a verified report — no queues, no paperwork."
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, text }, i) => (
              <FadeIn key={step} delay={i * 0.1}>
                <div className="card h-full p-6 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary-600">Step {step}</p>
                  <h3 className="mt-1 font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
