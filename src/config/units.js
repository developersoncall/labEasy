/**
 * The units a laboratory result is reported in.
 *
 * A closed list rather than a free-text box: units typed by hand drift
 * ("mg/dl", "mg/dL", "MG/DL") and a report that spells the same unit three
 * ways looks careless. Grouped the way a lab thinks about them, and the
 * editor still allows a custom value for the rare analyte none of these fit.
 */
export const UNIT_GROUPS = [
  {
    label: 'Concentration — mass',
    units: ['g/dL', 'mg/dL', 'µg/dL', 'ng/dL', 'g/L', 'mg/L', 'µg/L', 'ng/mL', 'pg/mL', 'µg/mL'],
  },
  {
    label: 'Concentration — molar',
    units: ['mmol/L', 'µmol/L', 'nmol/L', 'pmol/L', 'mEq/L'],
  },
  {
    label: 'Counts',
    units: ['/µL', 'x10^3/µL', 'x10^6/µL', 'x10^5/µL', 'cells/µL', 'million/mL', '/HPF', '/LPF'],
  },
  {
    label: 'Enzyme activity',
    units: ['U/L', 'IU/L', 'mIU/L', 'µIU/mL', 'IU/mL', 'U/mL'],
  },
  {
    label: 'Proportion',
    units: ['%', 'ratio', 'index', 'fL', 'pg'],
  },
  {
    label: 'Time & rate',
    units: ['seconds', 'minutes', 'mm/hr', 'mL/min', 'mL/min/1.73m²'],
  },
  {
    label: 'Other',
    units: ['pH', 'mmHg', 'kg/m²', 'copies/mL', 'titre', 'Positive / Negative', 'Reactive / Non-reactive'],
  },
];

/** Flat list, for validation and search. */
export const ALL_UNITS = UNIT_GROUPS.flatMap((g) => g.units);

/**
 * How a reference range is expressed. Not every analyte is a numeric window —
 * a serology result is Negative, a TSH is a band, an LDL is an upper limit —
 * and the report should say so in the lab's own words while still flagging
 * automatically where a number makes that possible.
 */
export const RANGE_KINDS = [
  { value: 'between', label: 'Between (low – high)', hint: 'Flags below low and above high' },
  { value: 'max', label: 'Up to (maximum)', hint: 'Flags anything above' },
  { value: 'min', label: 'At least (minimum)', hint: 'Flags anything below' },
  { value: 'text', label: 'Descriptive', hint: 'No automatic flagging' },
];

/** The written range a lab would print, composed from the numbers entered. */
export function composeRange({ kind, low, high, text }) {
  const l = low === '' || low == null ? null : Number(low);
  const h = high === '' || high == null ? null : Number(high);
  if (kind === 'between' && l != null && h != null) return `${l} – ${h}`;
  if (kind === 'max' && h != null) return `< ${h}`;
  if (kind === 'min' && l != null) return `> ${l}`;
  return text || '';
}

/** Which of low/high actually apply, so the editor can hide the other. */
export function boundsFor(kind) {
  if (kind === 'between') return { low: true, high: true };
  if (kind === 'max') return { low: false, high: true };
  if (kind === 'min') return { low: true, high: false };
  return { low: false, high: false };
}

/** Infer the kind from a stored parameter, for editing an existing row. */
export function kindFor({ refLow, refHigh }) {
  const hasLow = refLow != null && refLow !== '';
  const hasHigh = refHigh != null && refHigh !== '';
  if (hasLow && hasHigh) return 'between';
  if (hasHigh) return 'max';
  if (hasLow) return 'min';
  return 'text';
}
