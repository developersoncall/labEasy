import { Link } from 'react-router-dom';
import { FaPhoneAlt, FaHeadset } from 'react-icons/fa';
import { useSettings } from '../../context/SettingsContext.jsx';

/** Gradient call-to-action band inviting users to talk to the care team. */
export default function ContactCtaSection() {
  const { contactPhone, contactHours } = useSettings();
  return (
    <div className="bg-gradient-to-r from-primary-600 to-secondary-600">
      <div className="container-custom section-padding">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white"
              aria-hidden="true"
            >
              <FaHeadset size={24} />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Need help choosing?</h2>
              <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
                Not sure which test, package or specialist is right for you? Our care advisors are
                available every day, {contactHours.replace('Mon - Sun: ', '')} — no bots, real people.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <a
              href={`tel:${contactPhone.replace(/\s/g, '')}`}
              className="btn bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25"
              aria-label={`Call us at ${contactPhone}`}
            >
              <FaPhoneAlt aria-hidden="true" size={14} /> {contactPhone}
            </a>
            <Link
              to="/contact"
              className="btn bg-white text-primary-700 shadow-sm hover:bg-primary-50"
              aria-label="Contact our care team"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
