import { useState } from 'react'
import type { ReactNode } from 'react'

import { Drawer } from '../kit/Drawer'
import { Sidebar, SidebarContent } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1180px] px-5 py-6 sm:px-8 sm:py-7">{children}</div>
        </main>
      </div>

      <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} title="Navigation">
        <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
      </Drawer>
    </div>
  )
}
