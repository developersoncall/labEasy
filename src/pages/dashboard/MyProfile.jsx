import { Link } from 'react-router-dom';
import { FaUserEdit, FaEnvelope, FaPhoneAlt, FaInfoCircle } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { profileService } from '../../services/profileService.js';
import { formatDate } from '../../utils/helpers.js';

/** Show '—' for blank values so cards stay tidy. */
const show = (value) => (value === undefined || value === null || value === '' ? '—' : value);

const bmiCategory = (bmi) => {
  if (bmi < 18.5) return { label: 'Underweight', className: 'bg-amber-100 text-amber-700' };
  if (bmi < 25) return { label: 'Normal', className: 'bg-green-100 text-green-700' };
  if (bmi < 30) return { label: 'Overweight', className: 'bg-orange-100 text-orange-700' };
  return { label: 'Obese', className: 'bg-red-100 text-red-600' };
};

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-50 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-800">{value}</dd>
    </div>
  );
}

/** Read-only view of the patient's personal & medical profile. */
export default function MyProfile() {
  useDocumentTitle('My Profile');
  const { user } = useAuth();

  const { data: profile, loading } = useFetch(() => profileService.getProfile(user.id), [user.id]);

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <SkeletonCard lines={2} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SkeletonCard lines={5} />
            <SkeletonCard lines={5} />
          </div>
        </div>
      </PageTransition>
    );
  }

  const name = profile?.full_name || user.user_metadata?.full_name || 'LabEasy Member';
  const phone = profile?.phone || user.user_metadata?.phone || '';
  const avatar =
    profile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ff0000&color=fff&size=160`;

  const height = Number(profile?.height_cm);
  const weight = Number(profile?.weight_kg);
  const bmi = height > 0 && weight > 0 ? weight / ((height / 100) ** 2) : null;
  const category = bmi ? bmiCategory(bmi) : null;

  const profileFields = [
    profile?.date_of_birth, profile?.gender, profile?.blood_group, profile?.address,
    profile?.city, profile?.pincode, profile?.height_cm, profile?.weight_kg,
    profile?.allergies, profile?.chronic_conditions, profile?.current_medications,
    profile?.emergency_contact_name,
  ];
  const filledCount = profileFields.filter((v) => v !== undefined && v !== null && v !== '').length;
  const mostlyEmpty = filledCount < 4;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header card */}
        <div className="card flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
          <img
            src={avatar}
            alt={`${name}'s avatar`}
            className="h-20 w-20 rounded-2xl object-cover ring-4 ring-primary-50"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-gray-900">{name}</h1>
            <div className="mt-1.5 flex flex-col items-center gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:gap-4">
              <span className="inline-flex items-center gap-1.5">
                <FaEnvelope className="text-gray-400" size={12} aria-hidden="true" />
                {user.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FaPhoneAlt className="text-gray-400" size={12} aria-hidden="true" />
                {show(phone)}
              </span>
            </div>
          </div>
          <Link to="/dashboard/edit-profile" className="btn-primary shrink-0">
            <FaUserEdit aria-hidden="true" /> Edit Profile
          </Link>
        </div>

        {/* Gentle nudge when the profile is mostly empty */}
        {mostlyEmpty && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50 px-5 py-4 text-sm text-primary-800"
            role="status"
          >
            <FaInfoCircle className="mt-0.5 shrink-0 text-primary-500" aria-hidden="true" />
            <p>
              Your health profile looks a little empty. Adding details like your blood group,
              allergies and emergency contact helps doctors care for you faster.{' '}
              <Link to="/dashboard/edit-profile" className="font-semibold underline">
                Complete your profile
              </Link>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Personal information */}
          <section className="card p-6" aria-labelledby="personal-info-heading">
            <h2 id="personal-info-heading" className="mb-3 text-base font-bold text-gray-900">
              Personal Information
            </h2>
            <dl>
              <InfoRow
                label="Date of birth"
                value={profile?.date_of_birth ? formatDate(profile.date_of_birth) : '—'}
              />
              <InfoRow label="Gender" value={show(profile?.gender)} />
              <InfoRow label="Blood group" value={show(profile?.blood_group)} />
              <InfoRow label="Address" value={show(profile?.address)} />
              <InfoRow label="City" value={show(profile?.city)} />
              <InfoRow label="Pincode" value={show(profile?.pincode)} />
            </dl>
          </section>

          {/* Medical information */}
          <section className="card p-6" aria-labelledby="medical-info-heading">
            <h2 id="medical-info-heading" className="mb-3 text-base font-bold text-gray-900">
              Medical Information
            </h2>
            <dl>
              <InfoRow label="Height" value={height > 0 ? `${height} cm` : '—'} />
              <InfoRow label="Weight" value={weight > 0 ? `${weight} kg` : '—'} />
              <InfoRow
                label="BMI"
                value={
                  bmi ? (
                    <span className="inline-flex items-center gap-2">
                      {bmi.toFixed(1)}
                      <span className={`badge ${category.className}`}>{category.label}</span>
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow label="Allergies" value={show(profile?.allergies)} />
              <InfoRow label="Chronic conditions" value={show(profile?.chronic_conditions)} />
              <InfoRow label="Current medications" value={show(profile?.current_medications)} />
              <InfoRow
                label="Emergency contact"
                value={
                  profile?.emergency_contact_name
                    ? `${profile.emergency_contact_name}${
                        profile.emergency_contact_phone ? ` · ${profile.emergency_contact_phone}` : ''
                      }`
                    : '—'
                }
              />
            </dl>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
