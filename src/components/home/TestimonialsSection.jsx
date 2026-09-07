import { motion } from 'framer-motion';
import { FaQuoteLeft } from 'react-icons/fa';
import useFetch from '../../hooks/useFetch.js';
import { testimonialService } from '../../services/testimonialService.js';
import SectionHeading from '../common/SectionHeading.jsx';
import StarRating from '../common/StarRating.jsx';
import FadeIn from '../common/FadeIn.jsx';
import { APP_CONFIG } from '../../config/appConfig.js';

/**
 * Patient testimonials, loaded from the database. The whole section
 * (its background band included) is hidden when there are none.
 */
export default function TestimonialsSection() {
  const { data: testimonials, loading } = useFetch(() => testimonialService.getAll(), []);

  // Nothing to show (empty table or fetch failed) — render nothing at all.
  if (loading) return null;
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="section-padding bg-white">
     <FadeIn>
      <div className="container-custom">
        <SectionHeading
          eyebrow="Patient stories"
          title={`Loved by patients across ${APP_CONFIG.country}`}
          subtitle="Real experiences from people who booked doctors, tests and home collections through Lab Easy."
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <motion.figure
              key={testimonial.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="card-hover flex flex-col p-6"
            >
              <FaQuoteLeft aria-hidden="true" className="text-primary-200" size={22} />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">
                {testimonial.text}
              </blockquote>

              <div className="mt-4">
                <StarRating rating={testimonial.rating} />
              </div>

              <figcaption className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  loading="lazy"
                  width="40"
                  height="40"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-xs text-gray-400">
                    {testimonial.service} · {testimonial.city}
                  </p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
     </FadeIn>
    </section>
  );
}
