import { Fragment, useEffect, useState } from 'react';
import { FaPlus, FaTrash, FaMagic, FaGripVertical, FaSlidersH, FaCalculator } from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';
import { labTestService } from '../../services/labTestService.js';
import { TEST_TEMPLATES } from '../../config/testTemplates.js';
import { RANGE_KINDS, composeRange, boundsFor, kindFor } from '../../config/units.js';
import { describeFormula } from '../report/ranges.js';
import { TEST_CATEGORIES } from '../../config/testCategories.js';
import UnitSelect from './UnitSelect.jsx';
import { Alert } from './ui.jsx';

/**
 * Create or edit one test and the parameters inside it.
 *
 * The parameter rows are the point of this screen: they define what the
 * report for this test will ask a tester to fill in. A template drops in a
 * conventional set (CBC's fourteen analytes, say) as a starting draft, which
 * the lab is expected to edit to match its own analyser.
 */

const emptyTest = {
  name: '', code: '', category: 'General', price: '', sampleType: '',
  reportHours: '', fastingRequired: false, description: '', isActive: true,
};

const emptyParam = {
  name: '', unit: '', refRange: '', refLow: '', refHigh: '', groupLabel: '',
  // A range can be narrowed to a sex and an age window. Left as they are, the
  // row applies to everyone — which is what most parameters want.
  sex: 'any', ageMin: '', ageMax: '', ageUnit: 'years',
  // Set on a parameter the analyser never measures: it is arithmetic over the
  // others on the same report.
  formula: '', isCalculated: false, decimals: '',
  interpretation: '', method: '',
};

const SEXES = [
  { value: 'any', label: 'Any' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export default function TestEditor({ labId, test, onClose, onSaved }) {
  const [form, setForm] = useState(emptyTest);
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(!!test);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [schemaMissing, setSchemaMissing] = useState(false);
  // A department the standard list does not cover.
  const [customCategory, setCustomCategory] = useState(false);
  // Which rows have their advanced panel open. Formulas and standing comments
  // matter to a handful of parameters, so they stay folded away by default.
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    if (!test) {
      setForm(emptyTest);
      setParams([]);
      return () => { alive = false; };
    }
    setForm({
      name: test.name || '',
      code: test.code || '',
      category: test.category || 'General',
      price: String(test.price ?? ''),
      sampleType: test.sampleType || '',
      reportHours: test.reportHours ?? '',
      fastingRequired: !!test.fastingRequired,
      description: test.description || '',
      isActive: test.isActive !== false,
    });
    setCustomCategory(!!test.category && !TEST_CATEGORIES.includes(test.category));
    setLoading(true);
    labTestService
      .parameters(test.id)
      .then(({ parameters, schemaMissing: missing }) => {
        if (!alive) return;
        setParams(
          parameters.map((p) => ({
            ...emptyParam,
            ...p,
            refLow: p.refLow ?? '',
            refHigh: p.refHigh ?? '',
            ageMin: p.ageMin ?? '',
            ageMax: p.ageMax ?? '',
            decimals: p.decimals ?? '',
          })),
        );
        setSchemaMissing(missing);
      })
      .catch((e) => alive && setError(e?.message || 'Could not load parameters.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [test]);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const setParam = (i, k, v) =>
    setParams((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  /** Changing a bound rewrites the printed range, unless it was hand-edited. */
  const setBound = (i, k, v) =>
    setParams((rows) =>
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, [k]: v };
        const kind = next.rangeKind || kindFor(next);
        const auto = composeRange({ kind, low: next.refLow, high: next.refHigh, text: '' });
        const wasAuto = !r.refRange
          || r.refRange === composeRange({ kind, low: r.refLow, high: r.refHigh, text: '' });
        return wasAuto && auto ? { ...next, refRange: auto } : next;
      }),
    );

  const setRangeKind = (i, kind) =>
    setParams((rows) =>
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const bounds = boundsFor(kind);
        const next = {
          ...r,
          rangeKind: kind,
          refLow: bounds.low ? r.refLow : '',
          refHigh: bounds.high ? r.refHigh : '',
        };
        const auto = composeRange({ kind, low: next.refLow, high: next.refHigh, text: '' });
        return auto ? { ...next, refRange: auto } : next;
      }),
    );

  const toggleAdvanced = (i) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });

  const addParam = () => setParams((rows) => [...rows, { ...emptyParam }]);
  const removeParam = (i) => setParams((rows) => rows.filter((_, idx) => idx !== i));
  const move = (i, dir) =>
    setParams((rows) => {
      const j = i + dir;
      if (j < 0 || j >= rows.length) return rows;
      const copy = [...rows];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const applyTemplate = (key) => {
    const tpl = TEST_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    setForm((f) => ({
      ...f,
      name: f.name || tpl.name,
      category: tpl.category || f.category,
      sampleType: tpl.sampleType || f.sampleType,
      fastingRequired: tpl.fastingRequired ?? f.fastingRequired,
    }));
    setParams(tpl.parameters.map((p) => ({ ...emptyParam, ...p })));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Give the test a name.');
    const named = params.filter((p) => p.name.trim());
    setSaving(true);
    setError('');
    try {
      const saved = await labTestService.saveTest(labId, { ...form, id: test?.id });
      if (!schemaMissing) await labTestService.saveParameters(saved.id, named);
      await onSaved?.(saved.name);
    } catch (err) {
      setError(err?.message || 'Could not save that test.');
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={test ? `Edit — ${test.name}` : 'Add a test'}
      maxWidth="max-w-4xl"
    >
      <form className="space-y-6" onSubmit={submit}>
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
        {schemaMissing && (
          <Alert tone="warning">
            Parameters need section 20 of newSQL.html. The test itself will still save.
          </Alert>
        )}

        {/* ---- the test ---- */}
        <section>
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            The test
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="t-name">Test name *</label>
              <input
                id="t-name"
                className="input-field"
                placeholder="e.g. CBC (Complete Blood Count)"
                value={form.name}
                onChange={set('name')}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="t-code">Short code</label>
              <input id="t-code" className="input-field" placeholder="CBC" value={form.code} onChange={set('code')} />
            </div>
            <div>
              <label className="form-label" htmlFor="t-cat">Category</label>
              {customCategory ? (
                <div className="flex gap-1">
                  <input
                    id="t-cat"
                    className="input-field"
                    placeholder="Your department"
                    value={form.category}
                    onChange={set('category')}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 text-xs text-gray-400 hover:text-primary-600"
                    onClick={() => { setCustomCategory(false); setForm((f) => ({ ...f, category: 'General' })); }}
                    title="Back to the standard list"
                  >
                    ↺
                  </button>
                </div>
              ) : (
                <select
                  id="t-cat"
                  className="input-field"
                  value={form.category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') { setCustomCategory(true); setForm((f) => ({ ...f, category: '' })); return; }
                    setForm((f) => ({ ...f, category: e.target.value }));
                  }}
                >
                  {TEST_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__custom__">Other…</option>
                </select>
              )}
            </div>
            <div>
              <label className="form-label" htmlFor="t-price">Price *</label>
              <input
                id="t-price"
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={form.price}
                onChange={set('price')}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="t-sample">Sample type</label>
              <input id="t-sample" className="input-field" placeholder="Whole blood (EDTA)" value={form.sampleType} onChange={set('sampleType')} />
            </div>
            <div>
              <label className="form-label" htmlFor="t-hours">Report in (hours)</label>
              <input id="t-hours" type="number" min="0" className="input-field" value={form.reportHours} onChange={set('reportHours')} />
            </div>
            <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={form.fastingRequired} onChange={set('fastingRequired')} />
              Fasting required
            </label>
          </div>
        </section>

        {/* ---- parameters ---- */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                Sub-tests / parameters
              </h4>
              <p className="mt-0.5 text-xs text-gray-500">
                What the report for this test will contain. {params.length} row{params.length === 1 ? '' : 's'}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="input-field h-9 w-auto py-1 text-sm"
                value=""
                onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                aria-label="Start from a template"
              >
                <option value="">Start from a template…</option>
                {TEST_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>{t.name}</option>
                ))}
              </select>
              <button type="button" className="btn-outline whitespace-nowrap px-3 py-2 text-xs" onClick={addParam}>
                <FaPlus aria-hidden="true" /> Add row
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Loading parameters…</p>
          ) : params.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
              <FaMagic className="mx-auto text-xl text-gray-300" aria-hidden="true" />
              <p className="mt-2 text-sm text-gray-500">
                No parameters yet. Pick a template above, or add rows one at a time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full min-w-[1140px] text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="w-8" />
                    <th className="px-3 py-2 text-left font-semibold">Parameter *</th>
                    <th className="px-3 py-2 text-left font-semibold">Unit</th>
                    <th className="px-3 py-2 text-left font-semibold">Sex</th>
                    <th className="px-3 py-2 text-left font-semibold">Age (from–to)</th>
                    <th className="px-3 py-2 text-left font-semibold">Range type</th>
                    <th className="px-3 py-2 text-left font-semibold">Low</th>
                    <th className="px-3 py-2 text-left font-semibold">High</th>
                    <th className="px-3 py-2 text-left font-semibold">Prints as</th>
                    <th className="px-3 py-2 text-left font-semibold">Group</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {params.map((p, i) => {
                    const kind = p.rangeKind || kindFor(p);
                    const bounds = boundsFor(kind);
                    const open = expanded.has(i);
                    return (
                      <Fragment key={i}>
                      <tr className={`align-top ${open ? 'bg-primary-50/40' : 'hover:bg-gray-50/60'}`}>
                        <td className="pl-2 pt-3">
                          <div className="flex flex-col text-gray-300">
                            <button type="button" onClick={() => move(i, -1)} className="hover:text-primary-600" aria-label="Move up">▲</button>
                            <button type="button" onClick={() => move(i, 1)} className="hover:text-primary-600" aria-label="Move down">▼</button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className="input-field h-9 py-1 text-sm"
                            placeholder="Haemoglobin (Hb)"
                            value={p.name}
                            onChange={(e) => setParam(i, 'name', e.target.value)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <UnitSelect
                            className="h-9 w-28 py-1 text-sm"
                            value={p.unit}
                            onChange={(v) => setParam(i, 'unit', v)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            className="input-field h-9 w-24 py-1 text-sm"
                            value={p.sex || 'any'}
                            onChange={(e) => setParam(i, 'sex', e.target.value)}
                            aria-label="Applies to"
                          >
                            {SEXES.map((sx) => (
                              <option key={sx.value} value={sx.value}>{sx.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <input
                              className="input-field h-9 w-14 py-1 text-sm"
                              type="number"
                              min="0"
                              step="any"
                              placeholder="—"
                              value={p.ageMin ?? ''}
                              onChange={(e) => setParam(i, 'ageMin', e.target.value)}
                              aria-label="Age from"
                            />
                            <span className="text-xs text-gray-300">–</span>
                            <input
                              className="input-field h-9 w-14 py-1 text-sm"
                              type="number"
                              min="0"
                              step="any"
                              placeholder="—"
                              value={p.ageMax ?? ''}
                              onChange={(e) => setParam(i, 'ageMax', e.target.value)}
                              aria-label="Age to"
                            />
                            <select
                              className="input-field h-9 w-16 py-1 text-xs"
                              value={p.ageUnit || 'years'}
                              onChange={(e) => setParam(i, 'ageUnit', e.target.value)}
                              aria-label="Age unit"
                            >
                              <option value="years">yr</option>
                              <option value="months">mo</option>
                              <option value="days">d</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            className="input-field h-9 w-32 py-1 text-sm"
                            value={kind}
                            onChange={(e) => setRangeKind(i, e.target.value)}
                            aria-label="Range type"
                          >
                            {RANGE_KINDS.map((k) => (
                              <option key={k.value} value={k.value}>{k.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          {bounds.low ? (
                            <input
                              className="input-field h-9 w-20 py-1 text-sm"
                              type="number"
                              step="any"
                              value={p.refLow ?? ''}
                              onChange={(e) => setBound(i, 'refLow', e.target.value)}
                            />
                          ) : (
                            <span className="block pt-2 text-center text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {bounds.high ? (
                            <input
                              className="input-field h-9 w-20 py-1 text-sm"
                              type="number"
                              step="any"
                              value={p.refHigh ?? ''}
                              onChange={(e) => setBound(i, 'refHigh', e.target.value)}
                            />
                          ) : (
                            <span className="block pt-2 text-center text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className="input-field h-9 w-32 py-1 text-sm"
                            placeholder={kind === 'text' ? 'Negative' : 'auto'}
                            value={p.refRange}
                            onChange={(e) => setParam(i, 'refRange', e.target.value)}
                            title="What the report prints. Filled in automatically from the numbers."
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className="input-field h-9 w-28 py-1 text-sm"
                            placeholder="Differential"
                            value={p.groupLabel}
                            onChange={(e) => setParam(i, 'groupLabel', e.target.value)}
                          />
                        </td>
                        <td className="pr-2 pt-2.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              className={`rounded-lg p-2 ${
                                open || p.isCalculated || p.interpretation
                                  ? 'bg-primary-100 text-primary-700'
                                  : 'text-gray-400 hover:bg-primary-50 hover:text-primary-600'
                              }`}
                              onClick={() => toggleAdvanced(i)}
                              aria-expanded={open}
                              aria-label={`More settings for ${p.name || 'this row'}`}
                              title="Formula, comment and method"
                            >
                              {p.isCalculated ? <FaCalculator /> : <FaSlidersH />}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => removeParam(i)}
                              aria-label={`Remove ${p.name || 'row'}`}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {open && (
                        <tr className="bg-primary-50/40">
                          <td />
                          <td colSpan={10} className="px-2 pb-4 pt-0">
                            <div className="grid gap-3 rounded-xl border border-primary-100 bg-white p-3 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300"
                                    checked={!!p.isCalculated}
                                    onChange={(e) => setParam(i, 'isCalculated', e.target.checked)}
                                  />
                                  <FaCalculator className="text-gray-400" aria-hidden="true" />
                                  Calculated &mdash; the tester never types this one
                                </label>
                              </div>

                              {p.isCalculated && (
                                <>
                                  <div>
                                    <label className="form-label" htmlFor={`f-${i}`}>Formula</label>
                                    <input
                                      id={`f-${i}`}
                                      className="input-field h-9 py-1 font-mono text-sm"
                                      placeholder="{Albumin} / ({Total Protein} - {Albumin})"
                                      value={p.formula || ''}
                                      onChange={(e) => setParam(i, 'formula', e.target.value)}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                      {describeFormula(p.formula)}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="form-label" htmlFor={`d-${i}`}>Decimal places</label>
                                    <input
                                      id={`d-${i}`}
                                      type="number"
                                      min="0"
                                      max="4"
                                      className="input-field h-9 w-24 py-1 text-sm"
                                      placeholder="2"
                                      value={p.decimals ?? ''}
                                      onChange={(e) => setParam(i, 'decimals', e.target.value)}
                                    />
                                  </div>
                                </>
                              )}

                              <div>
                                <label className="form-label" htmlFor={`m-${i}`}>Method</label>
                                <input
                                  id={`m-${i}`}
                                  className="input-field h-9 py-1 text-sm"
                                  placeholder="Photometric, ELISA, Flow cytometry…"
                                  value={p.method || ''}
                                  onChange={(e) => setParam(i, 'method', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="form-label" htmlFor={`n-${i}`}>Standing comment</label>
                                <input
                                  id={`n-${i}`}
                                  className="input-field h-9 py-1 text-sm"
                                  placeholder="Printed under the results when this one is abnormal"
                                  value={p.interpretation || ''}
                                  onChange={(e) => setParam(i, 'interpretation', e.target.value)}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
            <FaGripVertical className="mt-0.5 shrink-0 text-gray-300" aria-hidden="true" />
            <span>
              Low and High are optional. Fill them in and a result outside the range is flagged
              automatically on the report; leave them blank and only the written range is shown.
              To give one analyte different ranges by sex or age, add it more than once and set a
              window on each row — the report picks the row that fits the patient.
            </span>
          </p>
        </section>

        <div className="flex gap-2 border-t border-gray-100 pt-4">
          <button type="button" className="btn-outline flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : test ? 'Save changes' : 'Create test'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
