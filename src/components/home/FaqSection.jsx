import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import useFetch from '../../hooks/useFetch.js';
import { contactService } from '../../services/contactService.js';
import SectionHeading from '../common/SectionHeading.jsx';
import Accordion from '../common/Accordion.jsx';
import { SkeletonLine } from '../common/Skeleton.jsx';

/** First six FAQs in an accordion, with a link to the full FAQ page. */
export default function FaqSection() {
  const { data: faqs, loading, error } = useFetch(() => contactService.getFaqs(), []);

  return (
    <div className="container-custom">
      <SectionHeading
        eyebrow="Good to know"
        title="Frequently asked questions"
        subtitle="Quick answers about appointments, home collection, reports and payments."
      />

      <div className="mx-auto max-w-3xl">
        {loading && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading frequently asked questions">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-5">
                <SkeletonLine className="w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-center text-sm text-gray-500">
            We could not load the FAQs right now. Please visit the{' '}
            <Link to="/faq" className="font-medium text-primary-600 hover:underline">
              FAQ page
            </Link>{' '}
            instead.
          </p>
        )}

        {!loading && !error && <Accordion items={(faqs || []).slice(0, 6)} />}

        <div className="mt-8 text-center">
          <Link to="/faq" className="btn-ghost text-primary-600" aria-label="View all frequently asked questions">
            View all FAQs <FaArrowRight aria-hidden="true" size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
