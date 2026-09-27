import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '../../core/cn'

export function Pagination({
  page,
  pageCount,
  onPageChange,
  totalLabel,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  totalLabel?: string
}) {
  if (pageCount <= 1) return totalLabel ? <p className="text-[12.5px] text-text-secondary">{totalLabel}</p> : null

  return (
    <div className="flex items-center justify-between gap-4">
      {totalLabel && <p className="text-[12.5px] text-text-secondary">{totalLabel}</p>}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface-hover disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="px-2 text-[12.5px] font-medium tabular-nums text-text">
          {page} <span className="text-text-tertiary">/ {pageCount}</span>
        </span>
        <button
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          aria-label="Next page"
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface-hover disabled:opacity-40',
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
