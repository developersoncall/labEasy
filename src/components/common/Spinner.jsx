/** Simple accessible loading spinner. */
export default function Spinner({ size = 'md', label = 'Loading…', full = false }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-[3px]', lg: 'h-12 w-12 border-4' };
  const spinner = (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-primary-600 border-t-transparent ${sizes[size]}`}
    />
  );
  if (!full) return spinner;
  return <div className="flex min-h-[40vh] items-center justify-center">{spinner}</div>;
}
