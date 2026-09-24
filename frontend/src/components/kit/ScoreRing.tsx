export function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)))
  const r = 18
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#6366f1' : '#f43f5e'
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ height: size, width: size }}
    >
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#eef0f4" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-700">{pct}</span>
    </div>
  )
}
