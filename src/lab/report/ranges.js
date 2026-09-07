/**
 * Which reference range applies to this patient, and what to compute from it.
 *
 * A haemoglobin of 13.5 g/dL is normal in a man, borderline in a woman and
 * frankly high in a two-year-old. So one analyte becomes several parameter
 * rows — same name, different sex/age window — and the report picks the row
 * that fits the person in front of it. A row with sex "any" and no age window
 * is the fallback, which is what a lab that has not bothered to split its
 * ranges still gets.
 */

/** Age in years, whatever unit the parameter was defined in. */
const toYears = (value, unit) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (unit === 'months') return n / 12;
  if (unit === 'days') return n / 365.25;
  return n;
};

/** Does this parameter row apply to a patient of this sex and age? */
export function matchesPatient(param, { sex, age } = {}) {
  const rowSex = (param?.sex || 'any').toLowerCase();
  if (rowSex !== 'any') {
    const patientSex = String(sex || '').toLowerCase();
    // With no sex on file, a sex-specific row cannot be claimed to apply.
    if (!patientSex || patientSex !== rowSex) return false;
  }

  const lo = param?.ageMin == null || param.ageMin === '' ? null : toYears(param.ageMin, param.ageUnit);
  const hi = param?.ageMax == null || param.ageMax === '' ? null : toYears(param.ageMax, param.ageUnit);
  if (lo == null && hi == null) return true;

  const years = Number(age);
  if (!Number.isFinite(years)) return false; // an age window needs an age
  if (lo != null && years < lo) return false;
  // The upper bound is exclusive so consecutive bands (0–1, 1–5, 5–12) do not
  // both claim the boundary year.
  if (hi != null && years >= hi) return false;
  return true;
}

/** How specific a row is — the tightest matching window wins. */
function specificity(param) {
  let score = 0;
  if ((param?.sex || 'any') !== 'any') score += 2;
  if (param?.ageMin != null && param.ageMin !== '') score += 1;
  if (param?.ageMax != null && param.ageMax !== '') score += 1;
  return score;
}

/**
 * Collapse a test's parameter rows down to the one row per analyte that this
 * patient should be measured against, keeping the catalogue's own order.
 */
export function resolveParameters(params = [], patient = {}) {
  const order = [];
  const best = new Map();

  params.forEach((p) => {
    const key = (p.name || '').trim().toLowerCase();
    if (!order.includes(key)) order.push(key);

    const applies = matchesPatient(p, patient);
    const current = best.get(key);

    if (!current) {
      best.set(key, { param: p, applies, score: applies ? specificity(p) : -1 });
      return;
    }
    // A matching row always beats a non-matching one; among matches, the more
    // specific window wins.
    if (applies && (!current.applies || specificity(p) > current.score)) {
      best.set(key, { param: p, applies, score: specificity(p) });
    }
  });

  return order.map((k) => best.get(k).param).filter(Boolean);
}

/* ------------------------------------------------------------- formulas -- */

/**
 * Parameters computed from other parameters — A/G ratio, LDL by Friedewald,
 * an anion gap. Written as arithmetic over `{Parameter name}` tokens:
 *
 *   {Total Protein} - {Albumin}
 *   {Total Cholesterol} - {HDL Cholesterol} - {Triglycerides} / 5
 *
 * Names are matched case-insensitively against the other rows on the same
 * report, so a formula keeps working when the lab renames "Alb" to "Albumin".
 */
export const FORMULA_TOKEN = /\{([^{}]+)\}/g;

/** The parameter names a formula depends on. */
export function formulaInputs(formula = '') {
  const out = [];
  String(formula).replace(FORMULA_TOKEN, (_, name) => {
    const n = name.trim();
    if (n && !out.includes(n)) out.push(n);
    return '';
  });
  return out;
}

/**
 * Evaluate a formula against the values already entered.
 *
 * The substituted expression is checked character by character before it is
 * evaluated: digits, operators, parentheses and dots only. A formula is
 * written by the Lab Admin rather than a stranger, but "written by someone we
 * trust" is not a reason to hand arbitrary text to a JavaScript evaluator.
 */
export function evaluateFormula(formula, valuesByName = {}, decimals = 2) {
  if (!formula) return '';

  const lookup = {};
  Object.entries(valuesByName).forEach(([k, v]) => {
    lookup[String(k).trim().toLowerCase()] = v;
  });

  let missing = false;
  const expr = String(formula).replace(FORMULA_TOKEN, (_, name) => {
    const raw = lookup[String(name).trim().toLowerCase()];
    const n = Number(String(raw ?? '').replace(/[, ]/g, ''));
    if (!Number.isFinite(n)) { missing = true; return '0'; }
    return `(${n})`;
  });

  if (missing) return '';
  if (!/^[\d\s+\-*/().]+$/.test(expr)) return '';

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr});`)();
    if (!Number.isFinite(result)) return '';
    const dp = Number.isFinite(Number(decimals)) ? Number(decimals) : 2;
    return String(Number(result.toFixed(dp)));
  } catch {
    return '';
  }
}

/** A short, readable description of a formula for the editor. */
export function describeFormula(formula) {
  const inputs = formulaInputs(formula);
  if (!inputs.length) return 'No parameters referenced yet.';
  return `Uses ${inputs.join(', ')}`;
}
