import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

import { cn } from '../../core/cn'

export function SearchInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
      <input
        {...rest}
        className="h-8.5 w-full rounded-md border border-border bg-surface py-1.5 pl-8 pr-3 text-[13px] text-text placeholder:text-text-tertiary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
    </div>
  )
}
