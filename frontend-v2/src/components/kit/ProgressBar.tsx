export function ProgressBar({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'success' | 'danger' }) {
  const clamped = Math.max(0, Math.min(100, value))
  const barColor = tone === 'success' ? 'bg-success' : tone === 'danger' ? 'bg-danger' : 'bg-accent'
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ease-out ${barColor}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
