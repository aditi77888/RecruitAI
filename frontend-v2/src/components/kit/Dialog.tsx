import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const widthClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-xl' : 'max-w-md'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#111214]/35 animate-fade-in" />
        <DialogPrimitive.Content
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] ${widthClass} -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-lg animate-scale-in focus:outline-none`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="font-display text-[15px] font-semibold text-text">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-[13px] text-text-secondary">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-sunken hover:text-text">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="text-[13.5px] text-text">{children}</div>
          {footer && <div className="mt-5 flex justify-end gap-2.5">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
