import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  IoCall,
  IoMail,
  IoLocation,
  IoTime,
  IoMap,
  IoCheckmarkCircle,
} from 'react-icons/io5';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { contactService } from '../../services/contactService.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { phoneRule } from '../../utils/helpers.js';

const SUBJECTS = ['General', 'Appointments', 'Lab Tests', 'Reports', 'Feedback'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+]?[\d\s-]{10,15}$/;

export default function Contact() {
  useDocumentTitle('Contact Us');
  const { contactPhone, contactEmail, contactAddress, contactHours, brandName } = useSettings();
  const phonePlaceholder = phoneRule().placeholder;
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Only show a row when its value is actually set (e.g. hide Email if empty).
  const CONTACT_ROWS = [
    { icon: IoCall, label: 'Phone', value: contactPhone, href: `tel:${(contactPhone || '').replace(/\s/g, '')}` },
    { icon: IoMail, label: 'Email', value: contactEmail, href: `mailto:${contactEmail}` },
    { icon: IoLocation, label: 'Address', value: contactAddress },
    { icon: IoTime, label: 'Support hours', value: contactHours },
  ].filter((r) => r.value && String(r.value).trim());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  });

  const onSubmit = async (values) => {
    setSubmitError('');
    try {
      await contactService.sendMessage(values);
      setSent(true);
      reset();
    } catch (err) {
      setSubmitError(err?.message || 'We could not send your message right now. Please try again.');
    }
  };

  const handleSendAnother = () => {
    setSent(false);
    setSubmitError('');
    reset();
  };

  return (
    <PageTransition>
      <section className="section-padding">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Contact us"
            title="We are here to help, every day"
            subtitle="Questions about an appointment, a report or anything else — write to us and our care team will respond within one working day."
          />

          <div className="grid gap-8 lg:grid-cols-5">
            {/* Left: contact info */}
            <FadeIn className="lg:col-span-2">
              <div className="card h-full p-6 sm:p-8">
                <h3 className="mb-6 text-lg font-semibold">Reach us directly</h3>
                <ul className="space-y-5">
                  {CONTACT_ROWS.map((row) => (
                    <li key={row.label} className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <row.icon size={18} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          {row.label}
                        </p>
                        {row.href ? (
                          <a
                            href={row.href}
                            className="text-sm font-medium text-gray-800 hover:text-primary-600"
                          >
                            {row.value}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-gray-800">{row.value}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Map-style placeholder */}
                <div
                  className="mt-8 flex h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-200 bg-gradient-to-br from-primary-50 to-secondary-50 text-center"
                  role="img"
                  aria-label={`Map showing the ${brandName} head office`}
                >
                  <IoMap size={32} className="text-primary-500" aria-hidden="true" />
                  <p className="text-sm font-semibold text-gray-700">{brandName} Head Office</p>
                  {contactAddress && <p className="px-6 text-xs text-gray-500">{contactAddress}</p>}
                </div>
              </div>
            </FadeIn>

            {/* Right: form / success state */}
            <FadeIn delay={0.1} className="lg:col-span-3">
              <div className="card h-full p-6 sm:p-8">
                {sent ? (
                  <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
                    <IoCheckmarkCircle size={64} className="text-secondary-500" aria-hidden="true" />
                    <h3 className="text-xl font-semibold">Message sent successfully</h3>
                    <p className="max-w-md text-sm leading-relaxed text-gray-600">
                      Thank you for writing to us. Our care team will get back to you within one
                      working day at the email address you shared.
                    </p>
                    <button type="button" onClick={handleSendAnother} className="btn-outline mt-2">
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <h3 className="mb-6 text-lg font-semibold">Send us a message</h3>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="contact-name" className="form-label">
                          Full name
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          placeholder="e.g. Priya Sharma"
                          aria-invalid={errors.name ? 'true' : 'false'}
                          className={`input-field ${errors.name ? 'input-error' : ''}`}
                          {...register('name', {
                            required: 'Please enter your name',
                            minLength: { value: 2, message: 'Name must be at least 2 characters' },
                          })}
                        />
                        {errors.name && <p className="error-text" role="alert">{errors.name.message}</p>}
                      </div>

                      <div>
                        <label htmlFor="contact-email" className="form-label">
                          Email address
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          placeholder="you@example.com"
                          aria-invalid={errors.email ? 'true' : 'false'}
                          className={`input-field ${errors.email ? 'input-error' : ''}`}
                          {...register('email', {
                            required: 'Please enter your email address',
                            pattern: { value: EMAIL_PATTERN, message: 'Please enter a valid email address' },
                          })}
                        />
                        {errors.email && <p className="error-text" role="alert">{errors.email.message}</p>}
                      </div>

                      <div>
                        <label htmlFor="contact-phone" className="form-label">
                          Phone <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                          id="contact-phone"
                          type="tel"
                          placeholder={phonePlaceholder}
                          aria-invalid={errors.phone ? 'true' : 'false'}
                          className={`input-field ${errors.phone ? 'input-error' : ''}`}
                          {...register('phone', {
                            validate: (value) =>
                              !value || PHONE_PATTERN.test(value) || 'Please enter a valid phone number',
                          })}
                        />
                        {errors.phone && <p className="error-text" role="alert">{errors.phone.message}</p>}
                      </div>

                      <div>
                        <label htmlFor="contact-subject" className="form-label">
                          Subject
                        </label>
                        <select
                          id="contact-subject"
                          aria-invalid={errors.subject ? 'true' : 'false'}
                          className={`input-field ${errors.subject ? 'input-error' : ''}`}
                          {...register('subject', { required: 'Please choose a subject' })}
                        >
                          <option value="">Select a subject</option>
                          {SUBJECTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {errors.subject && (
                          <p className="error-text" role="alert">{errors.subject.message}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="contact-message" className="form-label">
                          Message
                        </label>
                        <textarea
                          id="contact-message"
                          rows={5}
                          placeholder="Tell us how we can help…"
                          aria-invalid={errors.message ? 'true' : 'false'}
                          className={`input-field resize-y ${errors.message ? 'input-error' : ''}`}
                          {...register('message', {
                            required: 'Please write a short message',
                            minLength: { value: 10, message: 'Message must be at least 10 characters' },
                          })}
                        />
                        {errors.message && (
                          <p className="error-text" role="alert">{errors.message.message}</p>
                        )}
                      </div>
                    </div>

                    {submitError && (
                      <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
                        {submitError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary mt-6 w-full sm:w-auto"
                    >
                      {isSubmitting ? 'Sending…' : 'Send message'}
                    </button>
                  </form>
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
