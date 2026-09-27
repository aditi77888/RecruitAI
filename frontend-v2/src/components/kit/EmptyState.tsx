import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center">
      {icon && (
        <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-text-tertiary">
          {icon}
        </div>
      )}
      <p className="text-[13.5px] font-semibold text-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-text-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger/30 bg-danger-soft/40 px-6 py-14 text-center">
      <p className="text-[13.5px] font-semibold text-danger">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-text-secondary">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-text hover:bg-surface-hover"
        >
          Try again
        </button>
      )}
    </div>
  )
}
