import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { IoCall, IoMail, IoLocationSharp, IoTime } from 'react-icons/io5';
import { useSettings } from '../../context/SettingsContext.jsx';

// Maps a social key to its icon + accessible label.
const SOCIAL_ICONS = {
  facebook: { icon: FaFacebookF, label: 'Facebook' },
  twitter: { icon: FaXTwitter, label: 'X (Twitter)' },
  instagram: { icon: FaInstagram, label: 'Instagram' },
  linkedin: { icon: FaLinkedinIn, label: 'LinkedIn' },
  youtube: { icon: FaYoutube, label: 'YouTube' },
};

const QUICK_LINKS = [
  { label: 'About Us', to: '/about' },
  { label: 'Our Services', to: '/services' },
  { label: 'Find Doctors', to: '/doctors' },
  { label: 'Video Consultation', to: '/video-consultation' },
  { label: 'FAQ', to: '/faq' },
];

const SERVICES_LINKS = [
  { label: 'Book Appointment', to: '/doctors' },
  { label: 'Diagnostic Tests', to: '/diagnostic-tests' },
  { label: 'Health Packages', to: '/health-packages' },
  { label: 'Home Sample Collection', to: '/home-collection' },
  { label: 'Specialties', to: '/specialties' },
  { label: 'Contact Us', to: '/contact' },
];

export default function Footer() {
  const { socialLinks, contactPhone, contactEmail, contactAddress, contactHours, brandName, brandTagline } = useSettings();

  const handleLogoClick = () => {
    if (window.location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="mt-auto bg-gray-900 text-gray-300">
      <div className="container-custom grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2" aria-label={`${brandName} home`}>
            <img src="/logo.png" alt={brandName} className="h-16 w-auto" width="64" height="64" />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            {brandTagline} Book doctor appointments, video consultations, lab tests
            and home sample collection — all in one place, backed by accredited labs.
          </p>
          <div className="mt-5 flex gap-2">
            {socialLinks.map(({ key, url }) => {
              const meta = SOCIAL_ICONS[key];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={meta.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-primary-600 hover:text-white"
                >
                  <Icon size={14} />
                </a>
              );
            })}
          </div>
        </div>

        {/* Quick links */}
        <nav aria-label="Quick links">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Quick Links</h3>
          <ul className="space-y-2.5">
            {QUICK_LINKS.map((link) => (
              <li key={link.to + link.label}>
                <Link to={link.to} className="text-sm text-gray-400 transition hover:text-primary-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Services */}
        <nav aria-label="Services">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Services</h3>
          <ul className="space-y-2.5">
            {SERVICES_LINKS.map((link) => (
              <li key={link.to + link.label}>
                <Link to={link.to} className="text-sm text-gray-400 transition hover:text-primary-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Get in Touch</h3>
          <ul className="space-y-3 text-sm text-gray-400">
            {contactAddress && (
              <li className="flex items-start gap-3">
                <IoLocationSharp className="mt-0.5 shrink-0 text-primary-400" aria-hidden="true" />
                {contactAddress}
              </li>
            )}
            {contactPhone && (
              <li className="flex items-center gap-3">
                <IoCall className="shrink-0 text-primary-400" aria-hidden="true" />
                <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="hover:text-primary-400">
                  {contactPhone}
                </a>
              </li>
            )}
            {contactEmail && (
              <li className="flex items-center gap-3">
                <IoMail className="shrink-0 text-primary-400" aria-hidden="true" />
                <a href={`mailto:${contactEmail}`} className="hover:text-primary-400">
                  {contactEmail}
                </a>
              </li>
            )}
            {contactHours && (
              <li className="flex items-center gap-3">
                <IoTime className="shrink-0 text-primary-400" aria-hidden="true" />
                {contactHours}
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="container-custom flex flex-col items-center justify-between gap-3 py-5 text-xs text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {brandName} Healthcare. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/privacy-policy" className="transition hover:text-primary-400">Privacy Policy</Link>
            <Link to="/terms" className="transition hover:text-primary-400">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
