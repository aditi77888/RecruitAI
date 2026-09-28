import type { ReactNode } from 'react'

import { cn } from '../../core/cn'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">{children}</table>
      </div>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-surface-sunken/60">
      <tr className="text-[11.5px] font-semibold uppercase tracking-wide text-text-tertiary">{children}</tr>
    </thead>
  )
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 font-semibold', className)}>{children}</th>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      // A plain <tr onClick> is invisible to the keyboard -- Tab skips it
      // and there's no Enter/Space equivalent. role="row" + tabIndex/onKeyDown
      // gives keyboard users the same navigation mouse users get, without
      // changing the semantic row/cell structure screen readers rely on.
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        'align-middle transition-colors',
        onClick && 'cursor-pointer hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children: ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td colSpan={colSpan} className={cn('px-4 py-2.5 text-text', className)}>
      {children}
    </td>
  )
}
