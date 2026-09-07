import { Link } from 'react-router-dom';
import { FaStethoscope } from 'react-icons/fa';
import { IoHome, IoSearch } from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function NotFound() {
  useDocumentTitle('Page Not Found');

  return (
    <PageTransition>
      <section className="section-padding">
        <div className="container-custom flex min-h-[55vh] flex-col items-center justify-center py-10 text-center">
          <span
            className="mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-primary-50 text-primary-600"
            aria-hidden="true"
          >
            <FaStethoscope size={36} />
          </span>

          <p className="text-7xl font-extrabold tracking-tight text-primary-600 sm:text-8xl">404</p>

          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
            This page seems to have missed its appointment.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            The link may be outdated, or the page has been moved to a new address. Do not worry —
            your health journey is just a click away.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/" className="btn-primary" aria-label="Go back to the Lab Easy home page">
              <IoHome aria-hidden="true" />
              Back to Home
            </Link>
            <Link to="/doctors" className="btn-outline" aria-label="Browse and find doctors">
              <IoSearch aria-hidden="true" />
              Find Doctors
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
