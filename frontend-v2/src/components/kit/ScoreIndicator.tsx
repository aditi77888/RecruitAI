import { cn } from '../../core/cn'

function toneFor(score: number): { fg: string; ring: string } {
  if (score >= 70) return { fg: 'text-success', ring: '#178A5B' }
  if (score >= 40) return { fg: 'text-warning', ring: '#B7791F' }
  return { fg: 'text-danger', ring: '#C24141' }
}

// Compact numeric readout used inline in tables -- the ring variant below is
// for detail-page contexts where the score deserves more visual weight, but
// per the design brief it must never become the single dominant element.
export function ScoreValue({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-text-tertiary">—</span>
  const { fg } = toneFor(score)
  return <span className={cn('font-semibold tabular-nums', fg)}>{Math.round(score)}</span>
}

export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)))
  const r = 17
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  const { ring } = toneFor(pct)
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ height: size, width: size }}>
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#E7E7E5" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums text-text">{pct}</span>
    </div>
  )
}
