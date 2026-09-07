import React, { useEffect, useState } from 'react';
import { Modal } from './Shared';
import { labTestService } from '../../services/labTestService.js';
import { UNIT_GROUPS, ALL_UNITS, RANGE_KINDS, composeRange, boundsFor, kindFor } from '../../config/units.js';

/**
 * Edit the sub-tests of a platform catalogue test.
 *
 * The same model the laboratories use — a test holds parameters, each with a
 * unit and a reference range — so anything the admin defines here travels with
 * the test when a lab copies it into its own catalogue, and the lab's report
 * for that test is complete from the first booking.
 *
 * Styled for the admin panel rather than reusing the lab's Tailwind editor,
 * because this sits inside `.admin-root` and should look like the rest of it.
 */

const emptyRow = { name: '', unit: '', refRange: '', refLow: '', refHigh: '', groupLabel: '' };

function UnitCell({ value, onChange }) {
  const known = !value || ALL_UNITS.includes(value);
  const [custom, setCustom] = useState(!known);

  if (custom) {
    return (
      <div className="pm-unit-custom">
        <input className="form-input" value={value} placeholder="Unit" onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="pm-revert" title="Back to the list" onClick={() => { setCustom(false); onChange(''); }}>↺</button>
      </div>
    );
  }
  return (
    <select
      className="form-select"
      value={value}
      onChange={(e) => {
        if (e.target.value === '__custom__') { setCustom(true); onChange(''); return; }
        onChange(e.target.value);
      }}
    >
      <option value="">— none —</option>
      {UNIT_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.units.map((u) => <option key={u} value={u}>{u}</option>)}
        </optgroup>
      ))}
      <option value="__custom__">Other…</option>
    </select>
  );
}

const ParametersModal = ({ test, onClose, onSaved }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    labTestService
      .parameters(test.id)
      .then(({ parameters, schemaMissing }) => {
        if (!alive) return;
        if (schemaMissing) setError('Sub-tests need section 20 of newSQL.html to be run first.');
        setRows(parameters.map((p) => ({ ...p, refLow: p.refLow ?? '', refHigh: p.refHigh ?? '' })));
      })
      .catch((e) => alive && setError(e.message || 'Could not load sub-tests.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [test.id]);

  const setCell = (i, key, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));

  /** A bound rewrites what the report prints, unless it was typed by hand. */
  const setBound = (i, key, v) =>
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, [key]: v };
        const kind = next.rangeKind || kindFor(next);
        const auto = composeRange({ kind, low: next.refLow, high: next.refHigh, text: '' });
        const wasAuto = !r.refRange || r.refRange === composeRange({ kind, low: r.refLow, high: r.refHigh, text: '' });
        return wasAuto && auto ? { ...next, refRange: auto } : next;
      }),
    );

  const setKind = (i, kind) =>
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const b = boundsFor(kind);
        const next = { ...r, rangeKind: kind, refLow: b.low ? r.refLow : '', refHigh: b.high ? r.refHigh : '' };
        const auto = composeRange({ kind, low: next.refLow, high: next.refHigh, text: '' });
        return auto ? { ...next, refRange: auto } : next;
      }),
    );

  const move = (i, dir) =>
    setRows((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await labTestService.saveParameters(test.id, rows.filter((r) => r.name.trim()));
      onSaved?.(rows.filter((r) => r.name.trim()).length);
    } catch (e) {
      setError(e.message || 'Could not save the sub-tests.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal size="lg" onClose={onClose}>
      <div className="modal-header">
        <div>
          <div className="modal-user-name">Sub-tests — {test.name}</div>
          <div className="modal-user-meta">
            What the report for this test contains. Laboratories inherit these when they copy the test.
          </div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      <div className="modal-body">
        {error && <div className="alert alert-red">{error}</div>}

        {loading ? (
          <div className="pm-empty">Loading sub-tests…</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table pm-table">
                <thead>
                  <tr>
                    <th style={{ width: 28 }} />
                    <th>Parameter</th>
                    <th style={{ width: 120 }}>Unit</th>
                    <th style={{ width: 130 }}>Range type</th>
                    <th style={{ width: 80 }}>Low</th>
                    <th style={{ width: 80 }}>High</th>
                    <th style={{ width: 130 }}>Prints as</th>
                    <th style={{ width: 120 }}>Group</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const kind = r.rangeKind || kindFor(r);
                    const b = boundsFor(kind);
                    return (
                      <tr key={i}>
                        <td>
                          <div className="pm-move">
                            <button type="button" onClick={() => move(i, -1)} aria-label="Move up">▲</button>
                            <button type="button" onClick={() => move(i, 1)} aria-label="Move down">▼</button>
                          </div>
                        </td>
                        <td><input className="form-input" value={r.name} placeholder="Haemoglobin (Hb)" onChange={(e) => setCell(i, 'name', e.target.value)} /></td>
                        <td><UnitCell value={r.unit} onChange={(v) => setCell(i, 'unit', v)} /></td>
                        <td>
                          <select className="form-select" value={kind} onChange={(e) => setKind(i, e.target.value)}>
                            {RANGE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                          </select>
                        </td>
                        <td>{b.low ? <input className="form-input" type="number" step="any" value={r.refLow} onChange={(e) => setBound(i, 'refLow', e.target.value)} /> : <span className="pm-dash">—</span>}</td>
                        <td>{b.high ? <input className="form-input" type="number" step="any" value={r.refHigh} onChange={(e) => setBound(i, 'refHigh', e.target.value)} /> : <span className="pm-dash">—</span>}</td>
                        <td><input className="form-input" value={r.refRange} placeholder={kind === 'text' ? 'Negative' : 'auto'} onChange={(e) => setCell(i, 'refRange', e.target.value)} /></td>
                        <td><input className="form-input" value={r.groupLabel} placeholder="Differential" onChange={(e) => setCell(i, 'groupLabel', e.target.value)} /></td>
                        <td>
                          <button type="button" className="btn btn-secondary btn-sm btn-icon del-btn" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} aria-label="Remove">🗑</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!rows.length && (
              <div className="pm-empty">
                No sub-tests yet. Add rows to describe what this test reports.
              </div>
            )}

            <div className="pm-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setRows((rs) => [...rs, { ...emptyRow }])}>
                ＋ Add row
              </button>
              <span className="pm-hint">
                Low and High are optional — fill them in and a result outside the range is flagged
                automatically on the report.
              </span>
            </div>
          </>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
          {saving ? 'Saving…' : `Save ${rows.filter((r) => r.name.trim()).length} sub-test(s)`}
        </button>
      </div>
    </Modal>
  );
};

export default ParametersModal;
