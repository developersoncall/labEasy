/** Consistent heading block for landing/section headers. */
export default function SectionHeading({ eyebrow, title, subtitle, align = 'center' }) {
  const alignClass = align === 'left' ? 'text-left items-start' : 'text-center items-center';
  return (
    <div className={`mb-10 flex flex-col gap-3 ${alignClass}`}>
      {eyebrow && (
        <span className="badge bg-primary-50 text-primary-700 uppercase tracking-wide">{eyebrow}</span>
      )}
      <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl text-balance">{title}</h2>
      {subtitle && <p className="max-w-2xl text-sm text-gray-500 sm:text-base">{subtitle}</p>}
    </div>
  );
}
