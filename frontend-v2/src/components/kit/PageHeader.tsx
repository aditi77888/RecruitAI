import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-text-tertiary">{eyebrow}</p>
        )}
        <h1 className="font-display text-[20px] font-semibold text-text">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
