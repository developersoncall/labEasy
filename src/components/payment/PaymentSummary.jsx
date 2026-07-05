import { formatCurrency } from '../../utils/helpers.js';

/**
 * Order/price summary card — reusable across appointment & lab checkouts.
 * items: [{ label, amount }], discount is subtracted.
 */
export default function PaymentSummary({ items = [], discount = 0, title = 'Payment Summary' }) {
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const total = Math.max(subtotal - discount, 0);

  return (
    <div className="card p-5">
      <h3 className="mb-4 font-semibold text-gray-900">{title}</h3>
      <dl className="space-y-2.5 text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between gap-4">
            <dt className="text-gray-500">{item.label}</dt>
            <dd className="font-medium text-gray-800">{formatCurrency(item.amount)}</dd>
          </div>
        ))}
        {discount > 0 && (
          <div className="flex justify-between gap-4 text-secondary-600">
            <dt>Discount</dt>
            <dd className="font-medium">- {formatCurrency(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-dashed border-gray-200 pt-3 text-base">
          <dt className="font-semibold text-gray-900">Payable in cash</dt>
          <dd className="font-bold text-primary-700">{formatCurrency(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
