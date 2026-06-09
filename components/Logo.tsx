// SSL crest — inline SVG so it renders instantly with no asset fetch.
// Same artwork as app/icon.svg (favicon); keep the two in sync.
export default function Logo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ssl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f7a38" />
          <stop offset="1" stopColor="#0f3d1a" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="31" fill="url(#ssl-bg)" />
      <circle cx="32" cy="32" r="28.5" fill="none" stroke="#facc15" strokeWidth="1.8" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="2.5 3.2" />

      <line x1="32" y1="10.5" x2="32" y2="22" stroke="#f8fafc" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M32 10.5 L42 13.6 L32 16.7 Z" fill="#ef4444" />

      <text
        x="32" y="43" textAnchor="middle"
        fontFamily="Inter, 'Arial Black', Arial, sans-serif"
        fontSize="19" fontWeight="800" fill="#ffffff" letterSpacing="0.5"
      >
        SSL
      </text>
      <text
        x="32" y="53.5" textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontSize="7.5" fontWeight="700" fill="#facc15" letterSpacing="2"
      >
        2026
      </text>
    </svg>
  )
}
