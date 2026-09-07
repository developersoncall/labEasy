import { useEffect } from 'react';
import { FaMoneyBillWave } from 'react-icons/fa';

/**
 * Payment method — CASH ONLY.
 *
 * Lab Easy currently accepts cash at the time of service (clinic visit, or
 * to the phlebotomist after home sample collection). This is an
 * informational block; it reports 'cash' to the parent via onChange so the
 * existing booking flow keeps working without changes.
 */
export default function PaymentMethods({ onChange }) {
  useEffect(() => {
    onChange?.('cash');
  }, [onChange]);

  return (
    <div>
      <div className="flex w-full items-center gap-4 rounded-xl border-2 border-primary-600 bg-primary-50/60 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
          <FaMoneyBillWave aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-800">Cash on Service</span>
          <span className="block text-xs text-gray-500">
            Pay in cash at the clinic, or to the phlebotomist after home sample collection.
          </span>
        </span>
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 rounded-full border-2 border-primary-600 bg-primary-600 ring-2 ring-white"
        />
      </div>
      <p className="mt-3 text-[11px] text-gray-400">
        No online payment required — please keep the amount ready at the time of service.
      </p>
    </div>
  );
}
