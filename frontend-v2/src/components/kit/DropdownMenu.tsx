import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'

import { cn } from '../../core/cn'

export function DropdownMenu({
  trigger,
  children,
  align = 'end',
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end' | 'center'
}) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-[180px] overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-md animate-scale-in"
        >
          {children}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  )
}

export function DropdownMenuItem({
  children,
  onSelect,
  danger,
  icon,
}: {
  children: ReactNode
  onSelect?: () => void
  danger?: boolean
  icon?: ReactNode
}) {
  return (
    <DropdownPrimitive.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium outline-none',
        danger ? 'text-danger data-[highlighted]:bg-danger-soft' : 'text-text data-[highlighted]:bg-surface-sunken',
      )}
    >
      {icon}
      {children}
    </DropdownPrimitive.Item>
  )
}

export function DropdownMenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-border" />
}
