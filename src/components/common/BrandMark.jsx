/**
 * The Lab Easy mark — a flask in a rounded square.
 *
 * Drawn inline rather than loaded from a file so it stays sharp at every size,
 * follows the brand colour from the Tailwind palette, and needs no asset
 * pipeline. Used everywhere the old raster logo was.
 */
export default function BrandMark({ size = 40, className = '', title = 'Lab Easy' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="labeasy-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#labeasy-mark)" />
      {/* flask: neck, shoulders, body */}
      <path
        d="M19.5 11h9a1.6 1.6 0 0 1 0 3.2h-.9v6.4l7.1 12.2A4 4 0 0 1 31.3 39H16.7a4 4 0 0 1-3.4-6.2l7.1-12.2v-6.4h-.9a1.6 1.6 0 0 1 0-3.2Z"
        fill="#ffffff"
      />
      {/* liquid line */}
      <path
        d="M17.2 30.6h13.6l2.4 4.1a1.4 1.4 0 0 1-1.2 2.1H16a1.4 1.4 0 0 1-1.2-2.1Z"
        fill="#0ea5e9"
      />
      <circle cx="21.4" cy="34.2" r="1.3" fill="#ffffff" opacity="0.85" />
      <circle cx="26.6" cy="33.4" r="0.9" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}
