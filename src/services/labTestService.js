import { supabase } from '../supabase/supabase.js';

/**
 * The laboratory's own test catalogue — curated by the Lab Admin.
 *
 * A test is a row in `diagnostic_tests` carrying this lab's `lab_id`; the
 * analytes inside it are rows in `test_parameters`. That is the whole model:
 * CBC is one bookable, priced test, and Haemoglobin, RBC, WBC … are its
 * parameters, each with a unit and a reference range. The values a tester
 * later types against those parameters become the report.
 *
 * Rows with `lab_id = null` are the shared catalogue the platform admin
 * maintains — visible to every lab, editable by none of them.
 */

const slugify = (t = '') =>
  t.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').slice(0, 60);

const testFromRow = (row) => ({
  id: row.id,
  labId: row.lab_id ?? null,
  name: row.name,
  code: row.test_code || '',
  category: row.category || 'General',
  price: Number(row.price || 0),
  mrp: Number(row.mrp || 0),
  sampleType: row.sample_type || '',
  fastingRequired: !!row.fasting_required,
  reportHours: row.report_hours ?? null,
  description: row.description || '',
  isActive: row.is_active !== false,
});

const paramFromRow = (row) => ({
  id: row.id,
  testId: row.test_id,
  name: row.name,
  unit: row.unit || '',
  refRange: row.ref_range || '',
  refLow: row.ref_low,
  refHigh: row.ref_high,
  sex: row.sex || 'any',
  // The age window this row's range applies to. Null on both sides means the
  // row applies at every age, which is what an unsplit catalogue looks like.
  ageMin: row.age_min,
  ageMax: row.age_max,
  ageUnit: row.age_unit || 'years',
  interpretation: row.interpretation || '',
  formula: row.formula || '',
  isCalculated: !!row.is_calculated,
  decimals: row.decimals,
  groupLabel: row.group_label || '',
  method: row.method || '',
  sortOrder: row.sort_order ?? 0,
});

/**
 * The columns phase2.sql adds to test_parameters. Written separately so a
 * database that has not run it yet still saves the parameter itself rather
 * than failing the whole test.
 */
let paramPhase2 = true;
const phase2Columns = (p) => ({
  age_min: p.ageMin === '' || p.ageMin == null ? null : Number(p.ageMin),
  age_max: p.ageMax === '' || p.ageMax == null ? null : Number(p.ageMax),
  age_unit: p.ageUnit || 'years',
  interpretation: p.interpretation || '',
  formula: p.formula || '',
  is_calculated: !!p.isCalculated,
  decimals: p.decimals === '' || p.decimals == null ? null : Number(p.decimals),
});

/** The catalogue tables only arrive with section 20 of newSQL.html. */
const isMissingSchema = (err) => {
  const msg = err?.message || '';
  return (
    ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(err?.code) ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
};

export const labTestService = {
  /** This lab's own tests (not the shared catalogue). */
  async listOwn(labId) {
    const { data, error } = await supabase
      .from('diagnostic_tests')
      .select('*')
      .eq('lab_id', labId)
      .order('name');
    if (error) throw error;
    return (data || []).map(testFromRow);
  },

  /** Parameters for one test, in display order. */
  async parameters(testId) {
    const { data, error } = await supabase
      .from('test_parameters')
      .select('*')
      .eq('test_id', testId)
      .order('sort_order');
    if (!error) return { parameters: (data || []).map(paramFromRow), schemaMissing: false };
    if (isMissingSchema(error)) return { parameters: [], schemaMissing: true };
    throw error;
  },

  /** Parameters for several tests at once — the report entry form needs this. */
  async parametersForTests(testIds) {
    if (!testIds?.length) return { byTest: {}, schemaMissing: false };
    const { data, error } = await supabase
      .from('test_parameters')
      .select('*')
      .in('test_id', testIds)
      .eq('is_active', true)
      .order('sort_order');
    if (error) {
      if (isMissingSchema(error)) return { byTest: {}, schemaMissing: true };
      throw error;
    }
    const byTest = {};
    (data || []).forEach((row) => {
      const p = paramFromRow(row);
      (byTest[p.testId] ||= []).push(p);
    });
    return { byTest, schemaMissing: false };
  },

  /** Create or update a test. `id` present = update. */
  async saveTest(labId, test) {
    const row = {
      lab_id: labId,
      name: test.name,
      test_code: test.code || null,
      category: test.category || 'General',
      price: Number(test.price || 0),
      mrp: Number(test.mrp || test.price || 0),
      sample_type: test.sampleType || '',
      fasting_required: !!test.fastingRequired,
      report_hours: test.reportHours ? Number(test.reportHours) : null,
      description: test.description || '',
      is_active: test.isActive !== false,
      slug: `${slugify(test.name)}-${labId.slice(0, 6)}`,
    };

    const q = test.id
      ? supabase.from('diagnostic_tests').update(row).eq('id', test.id)
      : supabase.from('diagnostic_tests').insert(row);

    const { data, error } = await q.select('*').single();
    if (error) {
      // Until section 20 scopes them per lab, name and short code are unique
      // across the whole platform — say which one clashed rather than leaking
      // a constraint name at the user.
      if (error.code === '23505') {
        throw new Error(
          'Another test already uses that short code. Change it, or leave the code blank.',
        );
      }
      throw error;
    }
    return testFromRow(data);
  },

  /**
   * Replace a test's parameters with exactly this list.
   *
   * Delete-then-insert rather than a diff: the editor hands over the finished
   * list, order included, and a report never reads these rows — it snapshots
   * name, unit and range at the moment results are entered — so rewriting
   * them cannot disturb an issued report.
   */
  async saveParameters(testId, parameters) {
    const { error: delErr } = await supabase.from('test_parameters').delete().eq('test_id', testId);
    if (delErr) throw delErr;
    if (!parameters.length) return [];

    const base = parameters.map((p, i) => ({
      test_id: testId,
      name: p.name,
      unit: p.unit || '',
      ref_range: p.refRange || '',
      ref_low: p.refLow === '' || p.refLow == null ? null : Number(p.refLow),
      ref_high: p.refHigh === '' || p.refHigh == null ? null : Number(p.refHigh),
      sex: p.sex || 'any',
      group_label: p.groupLabel || '',
      method: p.method || '',
      sort_order: i,
      is_active: true,
    }));

    const rows = paramPhase2
      ? base.map((row, i) => ({ ...row, ...phase2Columns(parameters[i]) }))
      : base;

    const { data, error } = await supabase.from('test_parameters').insert(rows).select('*');
    if (!error) return (data || []).map(paramFromRow);

    // Age windows, formulas and notes only exist after phase2.sql. Losing them
    // is a smaller failure than losing the parameter list.
    if (paramPhase2 && isMissingSchema(error)) {
      paramPhase2 = false;
      const retry = await supabase.from('test_parameters').insert(base).select('*');
      if (retry.error) throw retry.error;
      return (retry.data || []).map(paramFromRow);
    }
    throw error;
  },

  /**
   * The platform catalogue — the admin's shared tests.
   *
   * A lab cannot book these directly any more, but it can copy one into its
   * own catalogue as a starting point, which is why they are still readable.
   */
  async listPlatform() {
    const { data, error } = await supabase
      .from('diagnostic_tests')
      .select('*')
      .is('lab_id', null)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data || []).map(testFromRow);
  },

  /**
   * Copy several tests into this lab in one go.
   *
   * Each entry is { test, parameters } — a template, or a platform test with
   * whatever parameters the admin defined on it. Failures are collected rather
   * than thrown so one bad row cannot lose the other nine.
   */
  async importMany(labId, entries) {
    const added = [];
    const failed = [];
    for (const entry of entries) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const saved = await labTestService.saveTest(labId, entry.test);
        if (entry.parameters?.length) {
          // eslint-disable-next-line no-await-in-loop
          await labTestService.saveParameters(saved.id, entry.parameters).catch(() => {});
        }
        added.push(saved);
      } catch (err) {
        failed.push({ name: entry.test?.name || 'test', message: err?.message || 'Failed' });
      }
    }
    return { added, failed };
  },
  async removeTest(id) {
    const { error } = await supabase.from('diagnostic_tests').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async setActive(id, isActive) {
    const { error } = await supabase.from('diagnostic_tests').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
    return true;
  },
};

export default labTestService;
