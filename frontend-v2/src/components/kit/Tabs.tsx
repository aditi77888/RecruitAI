import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

import { cn } from '../../core/cn'

export function Tabs({
  value,
  onValueChange,
  tabs,
  children,
}: {
  value: string
  onValueChange: (v: string) => void
  tabs: { value: string; label: ReactNode; count?: number }[]
  children: ReactNode
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium text-text-secondary outline-none transition-colors',
              'hover:text-text data-[state=active]:text-text',
              'after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-transparent data-[state=active]:after:bg-accent',
            )}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="rounded-full bg-surface-sunken px-1.5 py-px text-[11px] font-semibold text-text-secondary tabular-nums">
                {tab.count}
              </span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  )
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Content value={value} className="pt-5 focus:outline-none">
      {children}
    </TabsPrimitive.Content>
  )
}
