import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoChatbubbles, IoCall, IoHelpCircle } from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import Accordion from '../../components/common/Accordion.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonLine } from '../../components/common/Skeleton.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import useFetch from '../../hooks/useFetch.js';
import { contactService } from '../../services/contactService.js';
import { useSettings } from '../../context/SettingsContext.jsx';

function FaqSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-5">
          <SkeletonLine className="w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function FAQ() {
  useDocumentTitle('Frequently Asked Questions');
  const { contactPhone } = useSettings();
  const { data: faqs, loading, error } = useFetch(() => contactService.getFaqs(), []);
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => {
    const unique = [...new Set((faqs || []).map((f) => f.category).filter(Boolean))];
    return ['All', ...unique];
  }, [faqs]);

  const filtered = useMemo(() => {
    if (!faqs) return [];
    return category === 'All' ? faqs : faqs.filter((f) => f.category === category);
  }, [faqs, category]);

  return (
    <PageTransition>
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Help centre"
            title="Frequently asked questions"
            subtitle="Quick answers about appointments, lab tests, payments and your account — updated regularly based on what patients ask us."
          />

          {/* Category filter pills */}
          {!loading && !error && (
            <div
              className="mb-8 flex flex-wrap items-center justify-center gap-2"
              role="group"
              aria-label="Filter questions by category"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                    category === cat
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            {/* FAQ list */}
            <div className="lg:col-span-2">
              {loading && <FaqSkeleton />}

              {!loading && error && (
                <EmptyState
                  icon={IoHelpCircle}
                  title="Could not load FAQs"
                  message="Something went wrong while fetching the questions. Please refresh the page or reach out to us directly."
                  actionLabel="Contact support"
                  actionTo="/contact"
                />
              )}

              {!loading && !error && filtered.length === 0 && (
                <EmptyState
                  icon={IoHelpCircle}
                  title="No questions in this category yet"
                  message="Try another category, or write to us and we will answer personally."
                  actionLabel="Ask us directly"
                  actionTo="/contact"
                />
              )}

              {!loading && !error && filtered.length > 0 && (
                <FadeIn key={category}>
                  <Accordion items={filtered} />
                </FadeIn>
              )}
            </div>

            {/* Side card */}
            <FadeIn delay={0.1}>
              <aside className="card sticky top-24 p-6 sm:p-8">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
                  <IoChatbubbles size={24} aria-hidden="true" />
                </span>
                <h3 className="mb-2 text-lg font-semibold">Still stuck?</h3>
                <p className="mb-6 text-sm leading-relaxed text-gray-600">
                  Could not find what you were looking for? Our care team answers every message
                  within one working day — and by phone from 7 AM to 10 PM, every day.
                </p>
                <Link to="/contact" className="btn-primary w-full">
                  Contact support
                </Link>
                <a
                  href={`tel:${contactPhone.replace(/\s/g, '')}`}
                  className="btn-ghost mt-3 w-full"
                  aria-label={`Call LabEasy support on ${contactPhone}`}
                >
                  <IoCall aria-hidden="true" />
                  {contactPhone}
                </a>
              </aside>
            </FadeIn>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
