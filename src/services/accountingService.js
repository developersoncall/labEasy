import { supabase } from '../supabase/supabase.js';
import { billingService } from './billingService.js';

/**
 * The lab's day book.
 *
 * Collection is already answerable from `booking_payments` and what is owed
 * from `booked_tests.amount_due`, so the only thing this table adds is what
 * went out. Everything else on this screen is arithmetic over rows that were
 * written as a side effect of doing the work — which is the only kind of
 * accounting a busy lab actually keeps up to date.
 */

const isMissingSchema = (err) => {
  const msg = err?.message || '';
  return (
    ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(err?.code) ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
};

export const EXPENSE_CATEGORIES = [
  { value: 'reagents', label: 'Reagents' },
  { value: 'consumables', label: 'Consumables' },
  { value: 'salary', label: 'Salaries' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'courier', label: 'Courier & logistics' },
  { value: 'outsourced_tests', label: 'Outsourced tests' },
  { value: 'tax', label: 'Tax & fees' },
  { value: 'other', label: 'Other' },
];

export const categoryLabel = (v) =>
  EXPENSE_CATEGORIES.find((c) => c.value === v)?.label || v || 'Other';

export const todayISO = () => new Date().toLocaleDateString('en-CA');

/** The first day of the month `date` falls in, as YYYY-MM-DD. */
export const monthStart = (date = new Date()) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
};

export const accountingService = {
  async listExpenses(labId, { from, to, limit = 500 } = {}) {
    let q = supabase
      .from('lab_expenses')
      .select('id, lab_id, spent_on, category, description, vendor, amount, payment_method, reference, created_at')
      .eq('lab_id', labId)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (from) q = q.gte('spent_on', from);
    if (to) q = q.lte('spent_on', to);

    const { data, error } = await q;
    if (error) {
      if (isMissingSchema(error)) return { expenses: [], schemaMissing: true };
      throw error;
    }
    return { expenses: data || [], schemaMissing: false };
  },

  async addExpense(labId, expense, createdBy) {
    const value = Number(expense.amount);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Enter an amount greater than zero.');

    const { data, error } = await supabase
      .from('lab_expenses')
      .insert({
        lab_id: labId,
        spent_on: expense.spentOn || todayISO(),
        category: expense.category || 'other',
        description: expense.description || '',
        vendor: expense.vendor || '',
        amount: value,
        payment_method: expense.paymentMethod || 'cash',
        reference: expense.reference || '',
        created_by: createdBy || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async removeExpense(id) {
    const { error } = await supabase.from('lab_expenses').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  /**
   * One period, summarised: what came in, what went out, what is still owed.
   *
   * Outstanding is deliberately not date-filtered — a bill from March that is
   * still unpaid is owed today, and hiding it inside its own month is how it
   * gets forgotten.
   */
  async summary(labId, { from, to } = {}) {
    const [{ payments, schemaMissing: payMissing }, { expenses, schemaMissing: expMissing }, owed] =
      await Promise.all([
        billingService.collections(labId, { from, to }),
        accountingService.listExpenses(labId, { from, to }),
        billingService.outstanding(labId).catch(() => []),
      ]);

    const collected = payments
      .filter((p) => !p.is_refund)
      .reduce((n, p) => n + Number(p.amount || 0), 0);
    const refunded = payments
      .filter((p) => p.is_refund)
      .reduce((n, p) => n + Number(p.amount || 0), 0);
    const spent = expenses.reduce((n, e) => n + Number(e.amount || 0), 0);
    const outstanding = owed.reduce(
      (n, b) => n + Math.max(Number(b.total_amount || 0) - Number(b.amount_paid || 0), 0),
      0,
    );

    // Method split, for the cash-drawer reconciliation at close of day.
    const byMethod = {};
    payments.forEach((p) => {
      const k = p.method || 'other';
      byMethod[k] = (byMethod[k] || 0) + Number(p.amount || 0) * (p.is_refund ? -1 : 1);
    });

    // Expense split, so an unusual month is explainable.
    const byCategory = {};
    expenses.forEach((e) => {
      const k = e.category || 'other';
      byCategory[k] = (byCategory[k] || 0) + Number(e.amount || 0);
    });

    // Day-by-day, oldest first — the shape a chart wants.
    const byDay = {};
    payments.forEach((p) => {
      const d = String(p.received_at).slice(0, 10);
      byDay[d] ||= { date: d, collected: 0, spent: 0 };
      byDay[d].collected += Number(p.amount || 0) * (p.is_refund ? -1 : 1);
    });
    expenses.forEach((e) => {
      const d = e.spent_on;
      byDay[d] ||= { date: d, collected: 0, spent: 0 };
      byDay[d].spent += Number(e.amount || 0);
    });

    return {
      collected,
      refunded,
      spent,
      net: collected - refunded - spent,
      outstanding,
      outstandingCount: owed.length,
      payments,
      expenses,
      owed,
      byMethod,
      byCategory,
      days: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      schemaMissing: payMissing || expMissing,
    };
  },
};

export default accountingService;
