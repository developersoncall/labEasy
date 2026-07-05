/** Shimmer skeleton primitives for loading states. */
export function SkeletonLine({ className = '' }) {
  return <div className={`skeleton h-4 ${className}`} aria-hidden="true" />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card p-5" aria-hidden="true">
      <div className="mb-4 flex items-center gap-3">
        <div className="skeleton h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-2/3" />
          <SkeletonLine className="w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} className={i === lines - 1 ? 'w-1/2' : 'w-full'} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, lines = 3 }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}
