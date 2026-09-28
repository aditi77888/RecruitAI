import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 'md',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  width?: 'sm' | 'md' | 'lg'
}) {
  const widthClass = width === 'sm' ? 'max-w-md' : width === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#111214]/30 animate-fade-in" />
        <DialogPrimitive.Content
          className={`fixed inset-y-0 right-0 z-50 flex w-full ${widthClass} flex-col border-l border-border bg-surface shadow-lg animate-slide-in-right focus:outline-none`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
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
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
