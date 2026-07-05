import { FaSearch, FaCalendarCheck, FaUserMd, FaFileMedicalAlt } from 'react-icons/fa';
import SectionHeading from '../common/SectionHeading.jsx';

const STEPS = [
  {
    number: 1,
    icon: FaSearch,
    title: 'Search',
    description: 'Find a doctor by symptom or specialty, or pick the lab tests and packages you need.',
  },
  {
    number: 2,
    icon: FaCalendarCheck,
    title: 'Book a slot',
    description: 'Choose a date and time that suits you — clinic visit, video call or home sample collection.',
  },
  {
    number: 3,
    icon: FaUserMd,
    title: 'Consult / give sample',
    description: 'Meet your doctor, or relax at home while our phlebotomist collects your sample hygienically.',
  },
  {
    number: 4,
    icon: FaFileMedicalAlt,
    title: 'Get reports & prescriptions',
    description: 'Reports and digital prescriptions land in your dashboard — securely stored, forever accessible.',
  },
];

/** Four-step journey with numbered circles and a connecting line on desktop. */
export default function HowItWorksSection() {
  return (
    <div className="container-custom">
      <SectionHeading
        eyebrow="How it works"
        title="Healthcare in four simple steps"
        subtitle="From your first search to your final report, everything happens in one place — no phone tag, no paper files."
      />

      <ol className="relative grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* connecting line (desktop) */}
        <div
          aria-hidden="true"
          className="absolute left-[12.5%] right-[12.5%] top-7 hidden border-t-2 border-dashed border-primary-200 lg:block"
        />

        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.number} className="relative flex flex-col items-center text-center">
              <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-card">
                <Icon size={20} aria-hidden="true" />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary-500 text-xs font-bold text-white ring-2 ring-white">
                  {step.number}
                </span>
              </span>
              <h3 className="mt-4 font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
