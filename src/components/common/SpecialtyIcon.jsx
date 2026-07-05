import {
  FaStethoscope, FaHeartbeat, FaBaby, FaBone, FaFemale, FaBrain,
  FaEye, FaLungs, FaTooth, FaAllergies, FaHeadSideVirus,
} from 'react-icons/fa';
import { GiKidneys, GiStomach, GiEarbuds, GiMedicalDrip } from 'react-icons/gi';

// Maps the `icon` key stored on each specialty to a react-icon.
const ICON_MAP = {
  stethoscope: FaStethoscope,
  heart: FaHeartbeat,
  skin: FaAllergies,
  baby: FaBaby,
  bone: FaBone,
  female: FaFemale,
  brain: FaBrain,
  mind: FaHeadSideVirus,
  ear: GiEarbuds,
  eye: FaEye,
  stomach: GiStomach,
  hormone: GiMedicalDrip,
  lungs: FaLungs,
  kidney: GiKidneys,
  tooth: FaTooth,
};

/** Coloured circular icon for a specialty. */
export default function SpecialtyIcon({ icon, size = 22, className = '' }) {
  const Icon = ICON_MAP[icon] || FaStethoscope;
  return (
    <span
      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ${className}`}
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  );
}
