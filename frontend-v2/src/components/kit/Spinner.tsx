import { Loader2 } from 'lucide-react'

import { cn } from '../../core/cn'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-text-tertiary', className ?? 'h-4 w-4')} />
}

export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-64 w-full flex-col items-center justify-center gap-2.5 text-text-tertiary">
      <Spinner className="h-6 w-6" />
      {label && <p className="text-[13px]">{label}</p>}
    </div>
  )
}
