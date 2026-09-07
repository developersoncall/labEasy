import { useEffect, useMemo, useState } from 'react';
import { FaSearch, FaCheck, FaLayerGroup, FaBoxOpen, FaFlask } from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';
import { labTestService } from '../../services/labTestService.js';
import { TEST_TEMPLATES } from '../../config/testTemplates.js';
import { formatCurrency } from '../../utils/helpers.js';
import { Alert } from './ui.jsx';

/**
 * Add several tests to the lab's catalogue at once.
 *
 * Two sources, one basket. **Sample templates** are ready-made panels with
 * their analytes, units and ranges already filled in — the fastest way to a
 * working catalogue. **Platform catalogue** is the shared list the admin
 * maintains: copying one brings across its name, category and any parameters
 * the admin defined, and the lab then sets its own price.
 *
 * Nothing is shared after the copy. Each becomes the lab's own row, editable
 * and priceable independently, which is the point.
 */
export default function TestImporter({ labId, onClose, onImported }) {
  const [tab, setTab] = useState('templates');
  const [platform, setPlatform] = useState([]);
  const [platformParams, setPlatformParams] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState({}); // key -> { source, price }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tab !== 'platform' || platform.length) return;
    setLoading(true);
    labTestService
      .listPlatform()
      .then(setPlatform)
      .catch((e) => setError(e?.message || 'Could not load the platform catalogue.'))
      .finally(() => setLoading(false));
  }, [tab, platform.length]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list =
      tab === 'templates'
        ? TEST_TEMPLATES.map((t) => ({
            key: `tpl:${t.key}`,
            name: t.name,
            category: t.category,
            sampleType: t.sampleType,
            price: '',
            count: t.parameters.length,
            source: 'template',
            raw: t,
          }))
        : platform.map((t) => ({
            key: `plt:${t.id}`,
            name: t.name,
            category: t.category,
            sampleType: t.sampleType,
            price: String(t.price ?? ''),
            count: platformParams[t.id]?.length ?? null,
            source: 'platform',
            raw: t,
          }));
    if (!q) return list;
    return list.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q),
    );
  }, [tab, platform, platformParams, search]);

  const toggle = (row) =>
    setPicked((p) => {
      const next = { ...p };
      if (next[row.key]) delete next[row.key];
      else next[row.key] = { row, price: row.price };
      return next;
    });

  const setPrice = (key, price) =>
    setPicked((p) => (p[key] ? { ...p, [key]: { ...p[key], price } } : p));

  const chosen = Object.values(picked);

  const submit = async () => {
    if (!chosen.length) return;
    setSaving(true);
    setError('');
    try {
      const entries = await Promise.all(
        chosen.map(async ({ row, price }) => {
          if (row.source === 'template') {
            const t = row.raw;
            return {
              test: {
                name: t.name,
                category: t.category,
                sampleType: t.sampleType || '',
                fastingRequired: !!t.fastingRequired,
                price: price || 0,
                isActive: true,
              },
              parameters: t.parameters,
            };
          }
          // A platform test brings its parameters with it, when it has any.
          const { parameters } = await labTestService.parameters(row.raw.id).catch(() => ({ parameters: [] }));
          return {
            test: {
              name: row.raw.name,
              category: row.raw.category,
              sampleType: row.raw.sampleType || '',
              fastingRequired: !!row.raw.fastingRequired,
              reportHours: row.raw.reportHours,
              price: price || row.raw.price || 0,
              isActive: true,
            },
            parameters,
          };
        }),
      );

      const { added, failed } = await labTestService.importMany(labId, entries);
      if (failed.length) {
        setError(`${failed.length} could not be added: ${failed[0].message}`);
        if (!added.length) return;
      }
      await onImported?.(added.length);
    } catch (err) {
      setError(err?.message || 'Could not add those tests.');
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <Modal open onClose={onClose} title="Add tests to your catalogue" maxWidth="max-w-3xl">
      <div className="space-y-4">
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

        <div className="flex flex-wrap items-center gap-2">
          {[
            ['templates', 'Sample templates', <FaBoxOpen key="i" />],
            ['platform', 'Platform catalogue', <FaFlask key="i" />],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === key
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-300'
              }`}
            >
              {icon} {label}
            </button>
          ))}
          <div className="relative ml-auto">
            <FaSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
              aria-hidden="true"
            />
            <input
              className="input-field w-52 pl-9"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tests"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          {tab === 'templates'
            ? 'Ready-made panels with their sub-tests, units and reference ranges. Edit any of them after adding.'
            : 'Tests the platform maintains. Copying one makes it yours — your price, your parameters.'}
        </p>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
        ) : !rows.length ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
            {tab === 'platform'
              ? 'The platform catalogue is empty.'
              : 'No template matches that search.'}
          </p>
        ) : (
          <ul className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
            {rows.map((row) => {
              const on = !!picked[row.key];
              return (
                <li key={row.key}>
                  <div
                    className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      on ? 'border-primary-300 bg-primary-50/60' : 'border-gray-200 bg-white hover:border-primary-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(row)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[9px] ${
                        on ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 bg-white text-transparent'
                      }`}
                      aria-label={on ? `Remove ${row.name}` : `Add ${row.name}`}
                    >
                      <FaCheck />
                    </button>

                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => toggle(row)}>
                      <p className="truncate text-sm font-semibold text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-500">
                        {row.category}
                        {row.sampleType ? ` · ${row.sampleType}` : ''}
                        {row.count != null && (
                          <span className="ml-2 inline-flex items-center gap-1 text-gray-400">
                            <FaLayerGroup aria-hidden="true" /> {row.count} sub-test{row.count === 1 ? '' : 's'}
                          </span>
                        )}
                      </p>
                    </button>

                    {on ? (
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-gray-500" htmlFor={`price-${row.key}`}>
                          Your price
                        </label>
                        <input
                          id={`price-${row.key}`}
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-field h-9 w-28 py-1 text-sm"
                          value={picked[row.key].price}
                          onChange={(e) => setPrice(row.key, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      row.price !== '' && (
                        <span className="text-xs text-gray-400">
                          platform {formatCurrency(row.price)}
                        </span>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
          <p className="mr-auto text-sm text-gray-600">
            {chosen.length
              ? `${chosen.length} test${chosen.length === 1 ? '' : 's'} selected`
              : 'Nothing selected yet'}
          </p>
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={saving || !chosen.length}>
            {saving ? 'Adding…' : `Add ${chosen.length || ''} to my catalogue`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
