import { useState } from 'react';
import { UNIT_GROUPS, ALL_UNITS } from '../../config/units.js';

/**
 * Pick a unit from the standard list, or type one the list does not cover.
 *
 * A plain <select> keeps spelling consistent across every report the lab
 * issues; the "Other…" escape hatch means an unusual analyte is never blocked
 * by a list someone else wrote.
 */
export default function UnitSelect({ value = '', onChange, id, className = '' }) {
  const known = !value || ALL_UNITS.includes(value);
  const [custom, setCustom] = useState(!known);

  if (custom) {
    return (
      <div className="flex gap-1">
        <input
          id={id}
          className={`input-field ${className}`}
          value={value}
          placeholder="Unit"
          onChange={(e) => onChange(e.target.value)}
          aria-label="Custom unit"
        />
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 text-xs text-gray-400 hover:text-primary-600"
          onClick={() => { setCustom(false); onChange(''); }}
          title="Back to the standard list"
        >
          ↺
        </button>
      </div>
    );
  }

  return (
    <select
      id={id}
      className={`input-field ${className}`}
      value={value}
      onChange={(e) => {
        if (e.target.value === '__custom__') { setCustom(true); onChange(''); return; }
        onChange(e.target.value);
      }}
    >
      <option value="">— none —</option>
      {UNIT_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </optgroup>
      ))}
      <option value="__custom__">Other…</option>
    </select>
  );
}
