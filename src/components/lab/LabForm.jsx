import { useForm } from 'react-hook-form';

/**
 * The laboratory's own details.
 *
 * Shared by all three places a lab is described: the public registration page,
 * the "finish your registration" step (when signup needed e-mail confirmation
 * first) and Lab Settings. Same fields, same validation, one file.
 */
export default function LabForm({
  defaultValues = {},
  onSubmit,
  submitLabel = 'Submit',
  disabled = false,
  compact = false,
}) {
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues });

  const busy = disabled || isSubmitting;

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="lab-name" className="form-label">Laboratory name *</label>
        <input
          id="lab-name"
          className={`input-field ${errors.name ? 'input-error' : ''}`}
          placeholder="e.g. City Diagnostic Centre"
          {...field('name', {
            required: 'Laboratory name is required.',
            minLength: { value: 3, message: 'Use at least 3 characters.' },
          })}
        />
        {errors.name && <p className="error-text">{errors.name.message}</p>}
      </div>

      <div className={compact ? '' : 'grid gap-4 sm:grid-cols-2'}>
        <div>
          <label htmlFor="lab-contact" className="form-label">Contact person *</label>
          <input
            id="lab-contact"
            className={`input-field ${errors.contactPerson ? 'input-error' : ''}`}
            placeholder="Who should we speak to?"
            {...field('contactPerson', { required: 'Tell us who to contact.' })}
          />
          {errors.contactPerson && <p className="error-text">{errors.contactPerson.message}</p>}
        </div>
        <div>
          <label htmlFor="lab-phone" className="form-label">Phone *</label>
          <input
            id="lab-phone"
            type="tel"
            className={`input-field ${errors.phone ? 'input-error' : ''}`}
            placeholder="+880 1XXX-XXXXXX"
            {...field('phone', {
              required: 'Phone number is required.',
              minLength: { value: 6, message: 'Enter a valid phone number.' },
            })}
          />
          {errors.phone && <p className="error-text">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lab-licence" className="form-label">Licence number *</label>
          <input
            id="lab-licence"
            className={`input-field ${errors.licenseNo ? 'input-error' : ''}`}
            placeholder="As printed on your licence"
            {...field('licenseNo', { required: 'We verify labs by licence number.' })}
          />
          {errors.licenseNo && <p className="error-text">{errors.licenseNo.message}</p>}
        </div>
        <div>
          <label htmlFor="lab-reg" className="form-label">Registration number</label>
          <input id="lab-reg" className="input-field" placeholder="Optional" {...field('registrationNo')} />
        </div>
      </div>

      <div>
        <label htmlFor="lab-address" className="form-label">Address *</label>
        <textarea
          id="lab-address"
          rows={2}
          className={`input-field ${errors.address ? 'input-error' : ''}`}
          placeholder="Street, area, landmark"
          {...field('address', { required: 'Address is required.' })}
        />
        {errors.address && <p className="error-text">{errors.address.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lab-city" className="form-label">City *</label>
          <input
            id="lab-city"
            className={`input-field ${errors.city ? 'input-error' : ''}`}
            {...field('city', { required: 'City is required.' })}
          />
          {errors.city && <p className="error-text">{errors.city.message}</p>}
        </div>
        <div>
          <label htmlFor="lab-pin" className="form-label">Postcode</label>
          <input id="lab-pin" className="input-field" {...field('pincode')} />
        </div>
      </div>

      <div>
        <label htmlFor="lab-desc" className="form-label">About the laboratory</label>
        <textarea
          id="lab-desc"
          rows={3}
          className="input-field"
          placeholder="Tests you specialise in, working hours, anything we should know."
          {...field('description')}
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? (
          <>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden="true"
            />
            Working…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
