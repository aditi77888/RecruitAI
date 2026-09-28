// Distinct from the old frontend's gradient calendar/podium mark -- a single
// flat monogram, ink + one accent stroke, matching the "calm, precise"
// brief rather than the old app's purple-gradient AI aesthetic.
export function Logo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#17181A" />
      <path
        d="M9 22V10h6.2c2.9 0 4.8 1.7 4.8 4.3 0 2-1.1 3.4-2.9 3.9L20.5 22h-3.1l-3.1-5.4H11.7V22H9Zm2.7-7.6h3.2c1.5 0 2.4-.7 2.4-2s-.9-2-2.4-2h-3.2v4Z"
        fill="#3158D4"
      />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display text-[15px] font-semibold tracking-tight text-text ${className}`}>
      RecruitAI
    </span>
  )
}
