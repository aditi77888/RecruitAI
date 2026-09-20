import type { ReactNode } from 'react'

export function Stat({
  label,
  value,
  icon,
  tone = 'brand',
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: 'brand' | 'accent' | 'emerald'
}) {
  const toneStyles = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-purple-50 text-accent-500',
    emerald: 'bg-emerald-50 text-emerald-600',
  }[tone]

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-card">
      {icon && <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneStyles}`}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}
