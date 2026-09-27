import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../core/cn'

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: ReactNode }[]
  placeholder?: string
  className?: string
  ariaLabel?: string
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-8.5 items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-text outline-none',
          'hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/15 data-[placeholder]:text-text-tertiary',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 min-w-[--radix-select-trigger-width] overflow-hidden rounded-lg border border-border bg-surface shadow-md animate-scale-in"
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-text outline-none data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent"
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="h-3.5 w-3.5" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
