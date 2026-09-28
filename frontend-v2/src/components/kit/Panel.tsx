import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../../core/cn'

// Deliberately named "Panel" rather than "Card" -- used for structural
// grouping (settings sections, candidate-detail blocks), not as the
// dashboard's primary layout unit. Flatter than a card: a hairline border,
// no shadow by default, square-ish radius. Keeps the app from turning into
// a wall of floating rounded cards.
interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Panel({ children, className, ...rest }: PanelProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface', className)} {...rest}>
      {children}
    </div>
  )
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
      <div>
        <h3 className="text-[13px] font-semibold text-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-4 py-4', className)}>{children}</div>
}
