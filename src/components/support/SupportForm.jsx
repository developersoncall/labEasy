import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaPaperPlane, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { supportService, SUPPORT_CATEGORIES } from '../../services/supportService.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One support form, two homes.
 *
 * In the Lab Dashboard the sender is known, so the name and email fields are
 * hidden and the ticket is stamped with the lab. On the public site the same
 * form asks who is writing, which is how a laboratory can ask something before
 * it registers. Either way the ticket lands in the admin's existing Support
 * Tickets queue.
 */
export default function SupportForm({
  lab = null,
  userId = null,
  defaults = {},
  onSent,
  submitLabel = 'Send to support',
}) {
  const identified = !!lab || !!userId;
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register: field,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: { category: 'general', ...defaults },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await supportService.submit({
        ...values,
        name: values.name || lab?.name || defaults.name || 'Lab user',
        email: values.email || lab?.email || defaults.email,
        lab,
        userId,
      });
      setSent(true);
      reset({ category: 'general', ...defaults });
      await onSent?.();
    } catch (err) {
      setServerError(err?.message || 'Could not send that message. Please try again.');
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center">
        <FaCheckCircle className="mx-auto text-3xl text-emerald-500" aria-hidden="true" />
        <h3 className="mt-3 text-base font-bold text-gray-900">Message sent</h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">
          {identified
            ? 'Our team will reply to this ticket. You can follow it in the list below.'
            : 'Thanks for getting in touch — we will reply to the email address you gave us.'}
        </p>
        <button type="button" className="btn-outline mt-5" onClick={() => setSent(false)}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          <FaExclamationCircle className="mt-0.5 shrink-0" aria-hidden="true" />
          {serverError}
        </p>
      )}

      {!identified && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sup-name" className="form-label">Your name *</label>
            <input
              id="sup-name"
              className={`input-field ${errors.name ? 'input-error' : ''}`}
              placeholder="Who should we reply to?"
              {...field('name', { required: 'Please tell us your name.' })}
            />
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="sup-email" className="form-label">Email *</label>
            <input
              id="sup-email"
              type="email"
              className={`input-field ${errors.email ? 'input-error' : ''}`}
              placeholder="you@yourlab.com"
              {...field('email', {
                required: 'We need an email to reply to.',
                pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address.' },
              })}
            />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {!identified && (
          <div>
            <label htmlFor="sup-phone" className="form-label">Phone</label>
            <input id="sup-phone" className="input-field" placeholder="Optional" {...field('phone')} />
          </div>
        )}
        <div className={identified ? 'sm:col-span-2' : ''}>
          <label htmlFor="sup-category" className="form-label">What is it about? *</label>
          <select id="sup-category" className="input-field" {...field('category')}>
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="sup-subject" className="form-label">Subject *</label>
        <input
          id="sup-subject"
          className={`input-field ${errors.subject ? 'input-error' : ''}`}
          placeholder="One line on what you need"
          {...field('subject', { required: 'A short subject helps us route this.' })}
        />
        {errors.subject && <p className="error-text">{errors.subject.message}</p>}
      </div>

      <div>
        <label htmlFor="sup-message" className="form-label">Message *</label>
        <textarea
          id="sup-message"
          rows={5}
          className={`input-field ${errors.message ? 'input-error' : ''}`}
          placeholder="Tell us what happened, and what you expected instead."
          {...field('message', {
            required: 'Please describe the issue or question.',
            minLength: { value: 15, message: 'A little more detail helps us answer properly.' },
          })}
        />
        {errors.message && <p className="error-text">{errors.message.message}</p>}
      </div>

      <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden="true"
            />
            Sending…
          </>
        ) : (
          <>
            <FaPaperPlane aria-hidden="true" /> {submitLabel}
          </>
        )}
      </button>
    </form>
  );
}
