import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export function Card({ children, padded = true, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-card transition-shadow duration-200 hover:shadow-soft ${padded ? 'p-6' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

const ICON_TONE_STYLES = {
  brand: 'bg-brand-50 text-brand-600',
  rose: 'bg-rose-100 text-rose-600',
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  iconTone = 'brand',
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  iconTone?: keyof typeof ICON_TONE_STYLES
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ICON_TONE_STYLES[iconTone]}`}>
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
