import type { ReactNode } from 'react'

import { cn } from '../../core/cn'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-text-secondary',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-normal',
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Dot({ tone = 'neutral' }: { tone?: Tone }) {
  const dotColor: Record<Tone, string> = {
    neutral: 'bg-text-tertiary',
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }
  return <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColor[tone])} />
}
