export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer geometric ring */}
      <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      {/* Inner octagon */}
      <path
        d="M40 8 L62 18 L72 40 L62 62 L40 72 L18 62 L8 40 L18 18 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      {/* Arabic ornament - center diamond */}
      <path
        d="M40 22 L52 40 L40 58 L28 40 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.12"
      />
      {/* Small decorative dots at cardinal points */}
      <circle cx="40" cy="16" r="2.5" fill="currentColor" opacity="0.6" />
      <circle cx="64" cy="40" r="2.5" fill="currentColor" opacity="0.6" />
      <circle cx="40" cy="64" r="2.5" fill="currentColor" opacity="0.6" />
      <circle cx="16" cy="40" r="2.5" fill="currentColor" opacity="0.6" />
      {/* Center dot */}
      <circle cx="40" cy="40" r="4" fill="currentColor" opacity="0.8" />
      {/* Corner ornaments */}
      <path d="M28 22 L32 26" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <path d="M52 22 L48 26" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <path d="M28 58 L32 54" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <path d="M52 58 L48 54" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}