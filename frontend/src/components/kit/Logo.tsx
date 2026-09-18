import { useId } from 'react'

export function Logo({ className = 'h-10 w-10' }: { className?: string }) {
  const gradientId = `recruitai-logo-bg-${useId()}`
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      <rect width="120" height="120" rx="26" fill={`url(#${gradientId})`} />

      {/* calendar */}
      <g transform="translate(12,30)">
        <rect x="6" y="0" width="4" height="11" rx="2" fill="#fff" />
        <rect x="24" y="0" width="4" height="11" rx="2" fill="#fff" />
        <rect x="0" y="6" width="34" height="27" rx="4" fill="#ffffff" fillOpacity="0.14" stroke="#fff" strokeWidth="2.5" />
        <path d="M0 15h34" stroke="#fff" strokeWidth="2.5" />
        <circle cx="7" cy="22" r="1.8" fill="#fff" />
        <circle cx="14" cy="22" r="1.8" fill="#fff" />
        <circle cx="21" cy="22" r="1.8" fill="#fff" />
        <circle cx="7" cy="28" r="1.8" fill="#fff" />
        <circle cx="14" cy="28" r="1.8" fill="#fff" />
      </g>

      {/* presentation board */}
      <g transform="translate(52,18)">
        <rect x="14" y="46" width="3.5" height="11" fill="#fff" fillOpacity="0.8" />
        <rect x="4" y="56" width="24" height="3" rx="1.5" fill="#fff" fillOpacity="0.8" />
        <rect x="0" y="0" width="56" height="42" rx="5" fill="#ffffff" fillOpacity="0.14" stroke="#fff" strokeWidth="2.5" />
        <rect x="6" y="7" width="11" height="2.4" rx="1.2" fill="#fff" fillOpacity="0.75" />
        <rect x="6" y="12.5" width="15" height="2.4" rx="1.2" fill="#fff" fillOpacity="0.55" />
        <path d="M9 33 20 21 32 28" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="9" cy="33" r="3" fill="#fff" />
        <circle cx="20" cy="21" r="3" fill="#fff" />
        <circle cx="32" cy="28" r="3" fill="#fff" />
        <circle cx="45" cy="14" r="7.5" fill="none" stroke="#fff" strokeWidth="2.2" />
        <path d="M45 14 L45 6.5 A7.5 7.5 0 0 1 51.8 17.5 Z" fill="#fff" />
      </g>

      {/* people */}
      <g opacity="0.55">
        <circle cx="80" cy="78" r="9" fill="#fff" />
        <path d="M60 108c0-13.3 9-22 20-22s20 8.7 20 22" fill="#fff" />
      </g>
      <g>
        <circle cx="46" cy="82" r="10" fill="#fff" />
        <path d="M23 112c0-14.9 10.3-25 23-25s23 10.1 23 25" fill="#fff" />
      </g>
    </svg>
  )
}
