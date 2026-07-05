import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoSearch, IoFilter } from 'react-icons/io5';
import { FaUserMd } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import Modal from '../../components/common/Modal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import DoctorCard from '../../components/doctors/DoctorCard.jsx';
import { SkeletonGrid } from '../../components/common/Skeleton.jsx';
import useAuth from '../../hooks/useAuth.js';
import useDebounce from '../../hooks/useDebounce.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { doctorService } from '../../services/doctorService.js';
import { favoriteService } from '../../services/favoriteService.js';
import { CITIES, LANGUAGES } from '../../constants/index.js';
import { formatCurrency } from '../../utils/helpers.js';

const FEE_MIN = 200;
const FEE_MAX = 1500;

const SORT_OPTIONS = [
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'fee_asc', label: 'Fee: low to high' },
  { value: 'fee_desc', label: 'Fee: high to low' },
  { value: 'experience_desc', label: 'Most experienced' },
];

export default function Doctors() {
  useDocumentTitle('Find Doctors');
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- filter state (seeded from the URL on mount) ----
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [language, setLanguage] = useState('');
  const [gender, setGender] = useState('');
  const [maxFee, setMaxFee] = useState(FEE_MAX);
  const [availableToday, setAvailableToday] = useState(searchParams.get('availability') === 'today');
  const [sortBy, setSortBy] = useState('rating_desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const debouncedQuery = useDebounce(query, 400);

  // ---- keep shareable filters mirrored in the URL ----
  useEffect(() => {
    const params = {};
    if (debouncedQuery) params.query = debouncedQuery;
    if (specialty) params.specialty = specialty;
    if (city) params.city = city;
    if (availableToday) params.availability = 'today';
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, specialty, city, availableToday, setSearchParams]);

  // ---- fetch matching doctors whenever a filter changes ----
  const { data: doctors, loading } = useFetch(
    () =>
      doctorService.search({
        query: debouncedQuery,
        specialty,
        city,
        language,
        gender,
        maxFee: maxFee < FEE_MAX ? maxFee : '',
        availability: availableToday ? 'today' : '',
      }),
    [debouncedQuery, specialty, city, language, gender, maxFee, availableToday],
  );

  // ---- specialty options for the filter dropdowns ----
  const { data: specialties } = useFetch(() => doctorService.getSpecialties(), []);

  const sortedDoctors = useMemo(() => {
    const list = [...(doctors || [])];
    switch (sortBy) {
      case 'fee_asc':
        return list.sort((a, b) => a.consultationFee - b.consultationFee);
      case 'fee_desc':
        return list.sort((a, b) => b.consultationFee - a.consultationFee);
      case 'experience_desc':
        return list.sort((a, b) => b.experienceYears - a.experienceYears);
      default:
        return list.sort((a, b) => b.rating - a.rating);
    }
  }, [doctors, sortBy]);

  // ---- favourites ----
  useEffect(() => {
    let active = true;
    if (isAuthenticated && user) {
      favoriteService
        .getMyFavorites(user.id)
        .then((ids) => active && setFavorites(ids))
        .catch(() => active && setFavorites([]));
    } else {
      setFavorites([]);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  const isFavorite = (doctorId) => favorites.some((id) => String(id) === String(doctorId));

  const handleToggleFavorite = async (doctorId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const nowFavorite = await favoriteService.toggle(user.id, doctorId);
      setFavorites((prev) =>
        nowFavorite ? [...prev, doctorId] : prev.filter((id) => String(id) !== String(doctorId)),
      );
    } catch {
      // keep previous state on failure
    }
  };

  // ---- reset ----
  const resetFilters = () => {
    setQuery('');
    setSpecialty('');
    setCity('');
    setLanguage('');
    setGender('');
    setMaxFee(FEE_MAX);
    setAvailableToday(false);
    setSortBy('rating_desc');
  };

  const activeFilterCount =
    (specialty ? 1 : 0) +
    (city ? 1 : 0) +
    (language ? 1 : 0) +
    (gender ? 1 : 0) +
    (maxFee < FEE_MAX ? 1 : 0) +
    (availableToday ? 1 : 0);

  const renderFilters = (idPrefix) => (
    <div className="space-y-5">
      <div>
        <label htmlFor={`${idPrefix}-specialty`} className="form-label">Specialty</label>
        <select
          id={`${idPrefix}-specialty`}
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="input-field"
        >
          <option value="">All specialties</option>
          {(specialties || []).map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-city`} className="form-label">City</label>
        <select
          id={`${idPrefix}-city`}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="input-field"
        >
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-language`} className="form-label">Language</label>
        <select
          id={`${idPrefix}-language`}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="input-field"
        >
          <option value="">Any language</option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="form-label">Doctor gender</legend>
        <div className="flex flex-wrap gap-4">
          {[
            { value: '', label: 'Any' },
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ].map((opt) => (
            <label key={opt.label} className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name={`${idPrefix}-gender`}
                value={opt.value}
                checked={gender === opt.value}
                onChange={() => setGender(opt.value)}
                className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${idPrefix}-fee`} className="form-label flex items-center justify-between">
          <span>Max consultation fee</span>
          <span className="font-semibold text-primary-600">
            {maxFee >= FEE_MAX ? `${formatCurrency(FEE_MAX)}+` : formatCurrency(maxFee)}
          </span>
        </label>
        <input
          id={`${idPrefix}-fee`}
          type="range"
          min={FEE_MIN}
          max={FEE_MAX}
          step={50}
          value={maxFee}
          onChange={(e) => setMaxFee(Number(e.target.value))}
          className="w-full accent-primary-600"
          aria-label="Maximum consultation fee"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>{formatCurrency(FEE_MIN)}</span>
          <span>{formatCurrency(FEE_MAX)}+</span>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={availableToday}
          onChange={(e) => setAvailableToday(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        Available today
      </label>

      {activeFilterCount > 0 && (
        <button type="button" onClick={resetFilters} className="btn-ghost w-full text-sm">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <PageTransition>
      {/* ---------- page header ---------- */}
      <section className="bg-gradient-to-r from-primary-50 via-white to-secondary-50 py-10 md:py-14">
        <div className="container-custom">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Find Your Doctor</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
            Compare verified specialists by rating, fee and availability — then book a clinic visit
            or video consultation in minutes.
          </p>
          <div className="relative mt-6 max-w-xl">
            <IoSearch
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by doctor name, specialty or condition…"
              aria-label="Search doctors"
              className="input-field pl-11"
            />
          </div>
        </div>
      </section>

      {/* ---------- listing ---------- */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* filter sidebar (desktop) */}
            <aside className="hidden w-64 shrink-0 lg:block" aria-label="Doctor filters">
              <div className="card sticky top-24 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
                  <IoFilter aria-hidden="true" /> Filters
                </h2>
                {renderFilters('desktop')}
              </div>
            </aside>

            {/* results */}
            <div className="min-w-0 flex-1">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600" aria-live="polite">
                  {loading ? 'Searching doctors…' : (
                    <>
                      <span className="font-semibold text-gray-900">{sortedDoctors.length}</span>
                      {' '}doctor{sortedDoctors.length === 1 ? '' : 's'} found
                    </>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(true)}
                    className="btn-outline text-sm lg:hidden"
                    aria-label="Open filters"
                  >
                    <IoFilter aria-hidden="true" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="badge bg-primary-600 text-white">{activeFilterCount}</span>
                    )}
                  </button>
                  <label htmlFor="sort-doctors" className="sr-only">Sort doctors</label>
                  <select
                    id="sort-doctors"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <SkeletonGrid count={6} lines={3} />
              ) : sortedDoctors.length === 0 ? (
                <div className="space-y-4">
                  <EmptyState
                    icon={FaUserMd}
                    title="No doctors match your filters"
                    message="Try widening your search — remove a filter or two, raise the fee limit, or search a nearby city."
                  />
                  <div className="flex justify-center">
                    <button type="button" onClick={resetFilters} className="btn-primary">
                      Reset all filters
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedDoctors.map((doctor) => (
                    <DoctorCard
                      key={doctor.id}
                      doctor={doctor}
                      isFavorite={isFavorite(doctor.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- mobile filter drawer ---------- */}
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter doctors" maxWidth="max-w-md">
        {renderFilters('mobile')}
        <button
          type="button"
          onClick={() => setFiltersOpen(false)}
          className="btn-primary mt-6 w-full"
        >
          {loading ? 'Show results' : `Show ${sortedDoctors.length} doctor${sortedDoctors.length === 1 ? '' : 's'}`}
        </button>
      </Modal>
    </PageTransition>
  );
}
