import { Link } from 'react-router-dom';

/** Friendly empty-state block for lists with no data. */
export default function EmptyState({ icon: Icon, title, message, actionLabel, actionTo }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Icon size={26} aria-hidden="true" />
        </span>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {message && <p className="max-w-sm text-sm text-gray-500">{message}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-2">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
