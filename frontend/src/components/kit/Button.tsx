import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-lifted hover:bg-brand-700 focus-visible:outline-brand-500 disabled:bg-slate-300 disabled:shadow-none',
  secondary:
    'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-brand-500 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:outline-brand-500 disabled:text-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-500 disabled:bg-slate-300',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed active:scale-[0.98] ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
