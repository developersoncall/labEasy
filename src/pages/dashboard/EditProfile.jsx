import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaCamera, FaExclamationCircle } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { profileService } from '../../services/profileService.js';
import { phoneRule, postcodeRule } from '../../utils/helpers.js';

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function FormSection({ title, description, children }) {
  return (
    <section className="card p-6">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Edit personal, medical, emergency-contact and address details. */
export default function EditProfile() {
  useDocumentTitle('Edit Profile');
  const { user, updateUserMeta } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const pr = phoneRule();      // country-aware phone rule
  const pc = postcodeRule();   // country-aware post code rule

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register: field,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  useEffect(() => {
    let active = true;
    profileService
      .getProfile(user.id)
      .then((profile) => {
        if (!active) return;
        reset({
          full_name: profile.full_name || user.user_metadata?.full_name || '',
          phone: profile.phone || user.user_metadata?.phone || '',
          date_of_birth: profile.date_of_birth || '',
          gender: profile.gender || '',
          blood_group: profile.blood_group || '',
          height_cm: profile.height_cm || '',
          weight_kg: profile.weight_kg || '',
          allergies: profile.allergies || '',
          chronic_conditions: profile.chronic_conditions || '',
          current_medications: profile.current_medications || '',
          emergency_contact_name: profile.emergency_contact_name || '',
          emergency_contact_phone: profile.emergency_contact_phone || '',
          address: profile.address || '',
          city: profile.city || '',
          pincode: profile.pincode || '',
        });
        setAvatarUrl(profile.avatar_url || '');
      })
      .catch(() => {
        if (active) setServerError('Could not load your profile. Please try again.');
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, [user.id, user.user_metadata, reset]);

  const onAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setServerError('');
    setAvatarSaved(false);
    setUploadingAvatar(true);
    try {
      const url = await profileService.uploadAvatar(user.id, file);
      setAvatarUrl(url);
      // Auto-save the photo immediately — no need to press "Save changes".
      await profileService.updateProfile(user.id, { avatar_url: url });
      // Mirror into the auth user so the header updates right away.
      try { await updateUserMeta({ avatar_url: url }); } catch { /* header sync is best-effort */ }
      setAvatarSaved(true);
    } catch (err) {
      setServerError(err?.message || 'Photo upload failed. Please try a smaller image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await profileService.updateProfile(user.id, { ...values, avatar_url: avatarUrl });
      // Mirror the photo + name into the auth user so it shows in the header
      // and everywhere user.user_metadata is read (best-effort).
      try {
        await updateUserMeta({ avatar_url: avatarUrl, full_name: values.full_name, phone: values.phone });
      } catch { /* header sync is non-fatal — the profile row is saved */ }
      navigate('/dashboard/profile', { state: { updated: true } });
    } catch (err) {
      setServerError(err?.message || 'Could not save your profile. Please try again.');
    }
  };

  if (loadingProfile) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </PageTransition>
    );
  }

  const displayName = user.user_metadata?.full_name || 'LabEasy Member';
  const previewAvatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ff0000&color=fff&size=160`;

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Keep your details up to date so consultations and lab visits go smoothly.
        </p>
      </header>

      {serverError && (
        <div
          className="mb-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
          role="alert"
        >
          <FaExclamationCircle className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Avatar */}
        <section className="card flex flex-col items-center gap-5 p-6 sm:flex-row">
          <div className="relative">
            <img
              src={previewAvatar}
              alt="Profile avatar preview"
              className="h-20 w-20 rounded-2xl object-cover ring-4 ring-primary-50"
            />
            {uploadingAvatar && (
              <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
                <Spinner size="sm" label="Uploading avatar" />
              </span>
            )}
          </div>
          <div className="text-center sm:text-left">
            <p className="font-semibold text-gray-900">Profile photo</p>
            <p className="mt-0.5 text-xs text-gray-500">JPG or PNG. A clear face photo works best.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
              aria-label="Upload profile photo"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-outline mt-3 text-xs"
              disabled={uploadingAvatar}
            >
              <FaCamera aria-hidden="true" /> {uploadingAvatar ? 'Saving…' : 'Change photo'}
            </button>
            {avatarSaved && !uploadingAvatar && (
              <p className="mt-2 text-xs font-medium text-green-600">✓ Photo saved</p>
            )}
          </div>
        </section>

        {/* Personal */}
        <FormSection title="Personal Details" description="Basic information used across your bookings.">
          <div>
            <label htmlFor="ep-name" className="form-label">Full name</label>
            <input
              id="ep-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Ananya Sharma"
              className={`input-field ${errors.full_name ? 'input-error' : ''}`}
              aria-invalid={errors.full_name ? 'true' : 'false'}
              {...field('full_name', {
                required: 'Full name is required.',
                minLength: { value: 3, message: 'Name must be at least 3 characters.' },
              })}
            />
            {errors.full_name && <p className="error-text">{errors.full_name.message}</p>}
          </div>
          <div>
            <label htmlFor="ep-phone" className="form-label">Phone</label>
            <input
              id="ep-phone"
              type="tel"
              autoComplete="tel"
              placeholder={pr.placeholder}
              maxLength={pr.maxLength}
              className={`input-field ${errors.phone ? 'input-error' : ''}`}
              aria-invalid={errors.phone ? 'true' : 'false'}
              {...field('phone', {
                pattern: { value: pr.pattern, message: pr.message },
              })}
            />
            {errors.phone && <p className="error-text">{errors.phone.message}</p>}
          </div>
          <div>
            <label htmlFor="ep-dob" className="form-label">Date of birth</label>
            <input
              id="ep-dob"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className={`input-field ${errors.date_of_birth ? 'input-error' : ''}`}
              aria-invalid={errors.date_of_birth ? 'true' : 'false'}
              {...field('date_of_birth')}
            />
            {errors.date_of_birth && <p className="error-text">{errors.date_of_birth.message}</p>}
          </div>
          <div>
            <label htmlFor="ep-gender" className="form-label">Gender</label>
            <select id="ep-gender" className="input-field" {...field('gender')}>
              <option value="">Select gender</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ep-blood" className="form-label">Blood group</label>
            <select id="ep-blood" className="input-field" {...field('blood_group')}>
              <option value="">Select blood group</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </FormSection>

        {/* Medical */}
        <FormSection title="Medical Details" description="Shared with your doctor before consultations.">
          <div>
            <label htmlFor="ep-height" className="form-label">Height (cm)</label>
            <input
              id="ep-height"
              type="number"
              min="30"
              max="250"
              placeholder="e.g. 168"
              className={`input-field ${errors.height_cm ? 'input-error' : ''}`}
              aria-invalid={errors.height_cm ? 'true' : 'false'}
              {...field('height_cm', {
                min: { value: 30, message: 'Height must be at least 30 cm.' },
                max: { value: 250, message: 'Height cannot exceed 250 cm.' },
              })}
            />
            {errors.height_cm && <p className="error-text">{errors.height_cm.message}</p>}
          </div>
          <div>
            <label htmlFor="ep-weight" className="form-label">Weight (kg)</label>
            <input
              id="ep-weight"
              type="number"
              min="2"
              max="300"
              placeholder="e.g. 64"
              className={`input-field ${errors.weight_kg ? 'input-error' : ''}`}
              aria-invalid={errors.weight_kg ? 'true' : 'false'}
              {...field('weight_kg', {
                min: { value: 2, message: 'Weight must be at least 2 kg.' },
                max: { value: 300, message: 'Weight cannot exceed 300 kg.' },
              })}
            />
            {errors.weight_kg && <p className="error-text">{errors.weight_kg.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ep-allergies" className="form-label">Allergies</label>
            <input
              id="ep-allergies"
              type="text"
              placeholder="e.g. Penicillin, peanuts"
              className="input-field"
              {...field('allergies')}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ep-conditions" className="form-label">Chronic conditions</label>
            <input
              id="ep-conditions"
              type="text"
              placeholder="e.g. Type 2 diabetes, hypertension"
              className="input-field"
              {...field('chronic_conditions')}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ep-medications" className="form-label">Current medications</label>
            <input
              id="ep-medications"
              type="text"
              placeholder="e.g. Metformin 500mg twice daily"
              className="input-field"
              {...field('current_medications')}
            />
          </div>
        </FormSection>

        {/* Emergency contact */}
        <FormSection
          title="Emergency Contact"
          description="Who should we reach if something urgent comes up?"
        >
          <div>
            <label htmlFor="ep-ec-name" className="form-label">Contact name</label>
            <input
              id="ep-ec-name"
              type="text"
              placeholder="e.g. Rohit Sharma"
              className="input-field"
              {...field('emergency_contact_name')}
            />
          </div>
          <div>
            <label htmlFor="ep-ec-phone" className="form-label">Contact phone</label>
            <input
              id="ep-ec-phone"
              type="tel"
              placeholder={pr.placeholder}
              maxLength={pr.maxLength}
              className={`input-field ${errors.emergency_contact_phone ? 'input-error' : ''}`}
              aria-invalid={errors.emergency_contact_phone ? 'true' : 'false'}
              {...field('emergency_contact_phone', {
                pattern: { value: pr.pattern, message: pr.message },
              })}
            />
            {errors.emergency_contact_phone && (
              <p className="error-text">{errors.emergency_contact_phone.message}</p>
            )}
          </div>
        </FormSection>

        {/* Address */}
        <FormSection title="Address" description="Used for home sample collection visits.">
          <div className="sm:col-span-2">
            <label htmlFor="ep-address" className="form-label">Street address</label>
            <input
              id="ep-address"
              type="text"
              autoComplete="street-address"
              placeholder="House no., street, locality"
              className="input-field"
              {...field('address')}
            />
          </div>
          <div>
            <label htmlFor="ep-city" className="form-label">City</label>
            <input
              id="ep-city"
              type="text"
              autoComplete="address-level2"
              placeholder="e.g. Bengaluru"
              className="input-field"
              {...field('city')}
            />
          </div>
          <div>
            <label htmlFor="ep-pincode" className="form-label">{pc.label.replace(/^\w/, c => c.toUpperCase())}</label>
            <input
              id="ep-pincode"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={pc.maxLength}
              placeholder={pc.placeholder}
              className={`input-field ${errors.pincode ? 'input-error' : ''}`}
              aria-invalid={errors.pincode ? 'true' : 'false'}
              {...field('pincode', {
                pattern: { value: pc.pattern, message: pc.message },
              })}
            />
            {errors.pincode && <p className="error-text">{errors.pincode.message}</p>}
          </div>
        </FormSection>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link to="/dashboard/profile" className="btn-ghost text-center">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={isSubmitting || uploadingAvatar}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" /> Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </PageTransition>
  );
}
