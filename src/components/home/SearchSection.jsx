import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaSearch } from 'react-icons/fa';
import { IoLocationOutline, IoMedkitOutline } from 'react-icons/io5';
import useFetch from '../../hooks/useFetch.js';
import { doctorService } from '../../services/doctorService.js';
import { CITIES } from '../../constants/index.js';

/** Doctor search card that overlaps the bottom of the hero. */
export default function SearchSection() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm({
    defaultValues: { query: '', specialty: '', city: '' },
  });
  const { data: specialties } = useFetch(() => doctorService.getSpecialties(), []);

  const onSubmit = ({ query, specialty, city }) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    if (specialty) params.set('specialty', specialty);
    if (city) params.set('city', city);
    const qs = params.toString();
    navigate(qs ? `/doctors?${qs}` : '/doctors');
  };

  return (
    <div className="container-custom relative z-10 -mt-16">
      <form
        onSubmit={handleSubmit(onSubmit)}
        aria-label="Search for doctors"
        className="card p-5 shadow-card-hover sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-[1.6fr_1fr_1fr_auto]">
          <div>
            <label htmlFor="home-search-query" className="form-label">
              Doctor, specialty or symptom
            </label>
            <div className="relative">
              <FaSearch
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                id="home-search-query"
                type="text"
                placeholder="e.g. fever, cardiologist, Dr. Mehta"
                className="input-field pl-10"
                {...register('query')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="home-search-specialty" className="form-label">
              Specialty
            </label>
            <div className="relative">
              <IoMedkitOutline
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select id="home-search-specialty" className="input-field pl-10" {...register('specialty')}>
                <option value="">All specialties</option>
                {(specialties || []).map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="home-search-city" className="form-label">
              City
            </label>
            <div className="relative">
              <IoLocationOutline
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select id="home-search-city" className="input-field pl-10" {...register('city')}>
                <option value="">All cities</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full px-8 py-2.5 md:w-auto" aria-label="Search doctors">
              <FaSearch aria-hidden="true" size={14} /> Search
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Popular searches: General physician · Diabetes check · Skin specialist · Full body checkup
        </p>
      </form>
    </div>
  );
}
