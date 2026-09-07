import { useMemo, useState } from 'react';
import { FaSearch, FaPlus, FaTimes, FaCheck } from 'react-icons/fa';
import { testCatalogService } from '../../services/testCatalogService.js';
import { formatCurrency } from '../../utils/helpers.js';

/**
 * Pick the tests for a booking from the admin's catalogue.
 *
 * Search by name, code or category, filter by category, click to add. The lab
 * cannot invent a test or change a price here — the catalogue is maintained by
 * the platform admin, so the same test costs the same everywhere.
 */
export default function TestPicker({ tests, selected, onChange, loading }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => testCatalogService.categories(tests), [tests]);
  const results = useMemo(
    () => testCatalogService.search(tests, query, category),
    [tests, query, category],
  );

  const isPicked = (id) => selected.some((s) => s.id === id);
  const add = (t) => !isPicked(t.id) && onChange([...selected, t]);
  const remove = (id) => onChange(selected.filter((s) => s.id !== id));
  const total = selected.reduce((sum, t) => sum + Number(t.price || 0), 0);

  return (
    <div className="space-y-3">
      {/* search + category */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <FaSearch
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400"
            aria-hidden="true"
          />
          <input
            className="input-field h-11 pl-10"
            placeholder="Search tests by name, code or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tests"
          />
        </div>
        <select
          className="input-field h-11 sm:w-44"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* results */}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Loading the catalogue…</p>
        ) : !results.length ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            {tests.length
              ? 'No test matches that search.'
              : 'No tests yet — your Lab Admin adds them under Tests, with their prices and parameters.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((t) => {
              const picked = isPicked(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => (picked ? remove(t.id) : add(t))}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                      picked ? 'bg-primary-50/70' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] ${
                        picked ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                      aria-hidden="true"
                    >
                      {picked ? <FaCheck /> : <FaPlus />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{t.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {t.category}
                        {t.sampleType ? ` · ${t.sampleType}` : ''}
                        {t.reportHours ? ` · report in ${t.reportHours}h` : ''}
                        {t.fastingRequired ? ' · fasting' : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">
                      {formatCurrency(t.price)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* selection */}
      {selected.length > 0 && (
        <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary-700">
            {selected.length} test{selected.length === 1 ? '' : 's'} selected
          </p>
          <ul className="space-y-1.5">
            {selected.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-gray-800">{t.name}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold tabular-nums text-gray-900">{formatCurrency(t.price)}</span>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    className="text-gray-400 transition hover:text-red-600"
                    aria-label={`Remove ${t.name}`}
                  >
                    <FaTimes />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex justify-between border-t border-primary-200/70 pt-2.5 text-sm font-bold text-gray-900">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
