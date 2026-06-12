/** The TemplateGoblin wordmark glyph — a friendly goblin head in the brand
 *  gradient. Used in the navbar and footer. */

export function GoblinMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="goblin-mark-grad"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2EE6A6" />
          <stop offset="0.55" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#7B6CFF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#goblin-mark-grad)" />
      <path d="M20 26 L13 15 L25 21 Z M44 26 L51 15 L39 21 Z" fill="#0E1117" />
      <path
        d="M16 30 C16 22 23 17 32 17 C41 17 48 22 48 30 L48 36 C48 45 41 50 32 50 C23 50 16 45 16 36 Z"
        fill="#0E1117"
      />
      <circle cx="25" cy="32" r="3.4" fill="#2EE6A6" />
      <circle cx="39" cy="32" r="3.4" fill="#2EE6A6" />
      <path
        d="M27 41 C29 43 35 43 37 41"
        stroke="#2EE6A6"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
