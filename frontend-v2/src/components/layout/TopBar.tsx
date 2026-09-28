import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Menu, Search } from 'lucide-react'

import { useAuth } from '../../core/auth-context'
import { DropdownMenu, DropdownMenuItem } from '../kit/DropdownMenu'
import { Avatar } from '../kit/Avatar'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  const [query, setQuery] = useState('')

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/app/candidates?search=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      <form onSubmit={onSearchSubmit} className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidates..."
          aria-label="Search candidates"
          className="h-8 w-full rounded-md border border-border bg-bg py-1.5 pl-8 pr-3 text-[12.5px] text-text placeholder:text-text-tertiary outline-none transition-colors focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu
          trigger={
            <button className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-surface-hover">
              <Avatar name={session?.displayName} size={24} />
              <span className="hidden text-[12.5px] font-medium text-text sm:inline">
                {session?.displayName?.split(' ')[0]}
              </span>
            </button>
          }
        >
          <DropdownMenuItem
            icon={<LogOut className="h-3.5 w-3.5" />}
            danger
            onSelect={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </header>
  )
}
