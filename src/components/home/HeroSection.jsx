import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserMd, FaFlask, FaHeartbeat, FaFileMedicalAlt, FaStar } from 'react-icons/fa';
import { IoVideocam, IoShieldCheckmark } from 'react-icons/io5';

/** Full-width landing hero with headline, CTAs and a decorative illustration. */
export default function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-primary-50/60 to-white">
      {/* soft background blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-100/70 blur-3xl" />
        <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-secondary-100/60 blur-3xl" />
      </div>

      <div className="container-custom relative grid items-center gap-12 pb-28 pt-14 md:pt-20 lg:grid-cols-2">
        {/* -------- copy -------- */}
        <div className="text-center lg:text-left">
          <span className="badge bg-white text-primary-700 shadow-sm ring-1 ring-primary-100">
            <IoShieldCheckmark aria-hidden="true" /> NABL-accredited labs · Verified doctors
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl lg:text-6xl text-balance">
            Your health, <span className="text-primary-600">one tap</span> away.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-gray-600 sm:text-lg lg:mx-0">
            Consult trusted doctors, book lab tests with free home sample collection, and get
            digital reports and prescriptions — all from a single, secure account.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link to="/doctors" className="btn-primary w-full px-7 py-3 text-base sm:w-auto" aria-label="Find a doctor">
              <FaUserMd aria-hidden="true" /> Find a Doctor
            </Link>
            <Link to="/diagnostic-tests" className="btn-outline w-full px-7 py-3 text-base sm:w-auto" aria-label="Book a lab test">
              <FaFlask aria-hidden="true" /> Book a Lab Test
            </Link>
          </div>

        </div>

        {/* -------- decorative illustration -------- */}
        <div className="relative mx-auto hidden w-full max-w-md lg:block" aria-hidden="true">
          <div className="relative flex h-96 items-center justify-center">
            {/* blob backdrop */}
            <div className="absolute inset-6 rounded-[45%_55%_60%_40%/50%_45%_55%_50%] bg-gradient-to-br from-primary-200 via-primary-100 to-secondary-100" />

            {/* central icon */}
            <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-white shadow-card-hover">
              <FaHeartbeat className="text-primary-600" size={52} />
            </div>

            {/* floating cards */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-0 top-8 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card-hover"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                <FaFileMedicalAlt size={18} />
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-900">Report ready</p>
                <p className="text-[11px] text-gray-500">CBC · in 6 hours</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute bottom-10 right-0 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card-hover"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <IoVideocam size={18} />
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-900">Video consult</p>
                <p className="text-[11px] text-gray-500">Dr. Ananya · 4:30 PM</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute bottom-2 left-10 flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 shadow-card-hover"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                <FaStar size={14} />
              </span>
              <p className="text-xs font-semibold text-gray-900">4.8 rated care</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
