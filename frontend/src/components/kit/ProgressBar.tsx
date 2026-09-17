export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
