import { supabase } from '../supabase/supabase.js';

/**
 * The test catalogue a laboratory books from.
 *
 * A lab books its OWN tests only — the rows it created under Lab → Tests,
 * at its own prices. The platform admin's shared catalogue is deliberately
 * excluded: a booking has to end in a report, and only a lab-owned test
 * carries the parameters, units and reference ranges that make one.
 *
 * The filtering is done here in JS rather than in the query so the screen
 * still works on a database where newSQL.html has not added lab_id yet.
 */

const fromRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  code: row.test_code,
  category: row.category || 'General',
  price: Number(row.price || 0),
  mrp: Number(row.mrp || 0),
  sampleType: row.sample_type || '',
  fastingRequired: !!row.fasting_required,
  reportHours: row.report_hours,
  labId: row.lab_id ?? null,
});

export const testCatalogService = {
  /** Everything this lab may book — its own tests, nobody else's. */
  async listForLab(labId) {
    const { data, error } = await supabase
      .from('diagnostic_tests')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data || [])
      .map(fromRow)
      .filter((t) => t.labId === labId);
  },

  /** Distinct category names, for the picker's filter. */
  categories(tests) {
    return [...new Set(tests.map((t) => t.category).filter(Boolean))].sort();
  },

  /** Free-text search across name, code and category. */
  search(tests, query, category) {
    const q = query.trim().toLowerCase();
    return tests.filter((t) => {
      if (category && category !== 'all' && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.code || '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  },
};

export default testCatalogService;
