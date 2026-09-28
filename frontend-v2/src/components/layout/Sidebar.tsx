import { NavLink } from 'react-router-dom'
import { Briefcase, LayoutDashboard, ListChecks, Settings, Users } from 'lucide-react'

import { useAuth } from '../../core/auth-context'
import { cn } from '../../core/cn'
import { Avatar } from '../kit/Avatar'
import { Logo, Wordmark } from '../kit/Logo'

const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/app/candidates', label: 'Candidates', icon: Users },
  { to: '/app/reports', label: 'Reports', icon: ListChecks },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { session } = useAuth()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <Logo className="h-6 w-6" />
        <Wordmark />
      </div>

      <div className="mx-3 mb-1 rounded-md border border-border bg-surface-hover px-2.5 py-2">
        <p className="truncate text-[12.5px] font-semibold text-text">{session?.displayName}</p>
        <p className="text-[11px] text-text-tertiary">Company workspace</p>
      </div>

      <nav className="mt-3 flex-1 space-y-0.5 px-2.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text',
              )
            }
          >
            <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mx-2.5 mb-2.5 flex items-center gap-2.5 rounded-md px-2 py-2">
        <Avatar name={session?.displayName} size={26} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-text">{session?.displayName}</p>
          <p className="truncate text-[11px] text-text-tertiary">Signed in</p>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-[228px] shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
      <SidebarContent />
    </aside>
  )
}
