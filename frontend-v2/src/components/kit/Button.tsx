import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '../../core/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover disabled:bg-border-strong disabled:text-text-tertiary shadow-xs',
  secondary:
    'bg-surface text-text border border-border hover:border-border-strong hover:bg-surface-hover disabled:text-text-tertiary',
  outline: 'bg-transparent text-text border border-border hover:bg-surface-hover disabled:text-text-tertiary',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-sunken hover:text-text disabled:text-text-tertiary',
  danger: 'bg-danger text-white hover:bg-[#a83636] disabled:bg-border-strong',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[12.5px] rounded-md gap-1.5',
  md: 'h-8.5 px-3.5 text-[13px] rounded-md gap-2',
  lg: 'h-10 px-4 text-[14px] rounded-md gap-2',
  icon: 'h-8 w-8 rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, disabled, className = '', children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex shrink-0 items-center justify-center font-medium transition-colors duration-100 outline-none',
          'focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
          'disabled:cursor-not-allowed active:translate-y-px',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          className,
        )}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
