import { Link, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaFlask, FaClipboardCheck, FaFileMedical, FaShieldAlt } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext.jsx';
import BrandMark from '../components/common/BrandMark.jsx';

const HIGHLIGHTS = [
  { icon: FaFlask, text: 'One workflow from the counter to the report' },
  { icon: FaClipboardCheck, text: 'Role-based logins for every member of your team' },
  { icon: FaFileMedical, text: 'Digital reports delivered against the right booking' },
  { icon: FaShieldAlt, text: "Your lab's data is isolated and stays yours" },
];

/** Split-screen layout for auth pages: brand panel + form outlet. */
export default function AuthLayout() {
  const { brandName } = useSettings();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-gray-900 via-primary-900 to-primary-700 p-12 text-white lg:flex">
        <Link to="/" className="relative z-10 flex items-center gap-2" aria-label={`${brandName} home`}>
          <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-2.5 shadow-lg">
            <BrandMark size={44} title={brandName} className="h-full w-full" />
          </span>
        </Link>

        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold leading-tight text-white"
          >
            Diagnostics,
            <br /> organised.
          </motion.h1>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i, duration: 0.4 }}
                className="flex items-center gap-3 text-sm text-primary-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon size={14} aria-hidden="true" />
                </span>
                {text}
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-primary-100/70">
          Trusted by patients across Bangladesh · © {new Date().getFullYear()} {brandName} Healthcare
        </p>

        {/* decorative glow — subtle red accent on the dark panel */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-600/30 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-white/5" aria-hidden="true" />
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-gray-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center lg:hidden" aria-label={`${brandName} home`}>
            <BrandMark size={72} title={brandName} />
          </Link>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
