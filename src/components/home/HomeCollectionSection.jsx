import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaSyringe, FaTemperatureLow, FaShieldAlt, FaFileMedical, FaArrowRight } from 'react-icons/fa';
import SectionHeading from '../common/SectionHeading.jsx';

const BENEFITS = [
  'Certified phlebotomists trained in gentle, single-prick collection',
  'Sealed, single-use kits opened in front of you for complete hygiene',
  'Cold-chain transport keeps every sample lab-fresh until testing',
  'Processed only at NABL-accredited partner laboratories',
  'Digital reports on your phone, most within 6–24 hours',
];

const FEATURE_TILES = [
  { icon: FaSyringe, label: 'Painless collection', caption: 'Single-use, sealed kits', color: 'bg-primary-50 text-primary-600' },
  { icon: FaTemperatureLow, label: 'Cold-chain transit', caption: 'Temperature controlled', color: 'bg-secondary-50 text-secondary-600' },
  { icon: FaShieldAlt, label: 'NABL labs', caption: 'Double-verified results', color: 'bg-amber-50 text-amber-600' },
  { icon: FaFileMedical, label: 'Digital reports', caption: 'PDF in 6–24 hours', color: 'bg-purple-50 text-purple-600' },
];

/** Two-column banner promoting doorstep sample collection. */
export default function HomeCollectionSection() {
  return (
    <div className="container-custom">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        {/* copy */}
        <div>
          <SectionHeading
            eyebrow="Home collection"
            title="Lab-quality testing, from your living room"
            subtitle="Skip the queue. A certified phlebotomist comes to your doorstep at a time you choose — mornings, evenings and weekends included."
            align="left"
          />

          <ul className="space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-gray-600">
                <FaCheckCircle aria-hidden="true" className="mt-0.5 shrink-0 text-secondary-500" />
                {benefit}
              </li>
            ))}
          </ul>

          <Link to="/home-collection" className="btn-primary mt-8" aria-label="Learn more about home sample collection">
            Book Home Collection <FaArrowRight aria-hidden="true" size={12} />
          </Link>
        </div>

        {/* icon composition */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 -m-4 rounded-[3rem] bg-gradient-to-br from-primary-50 to-secondary-50"
          />
          <div className="relative grid grid-cols-2 gap-4 p-4">
            {FEATURE_TILES.map((tile, index) => {
              const Icon = tile.icon;
              return (
                <motion.div
                  key={tile.label}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className={`card p-5 ${index % 2 === 1 ? 'sm:mt-6' : ''}`}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tile.color}`} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-gray-900">{tile.label}</h3>
                  <p className="mt-1 text-xs text-gray-500">{tile.caption}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
