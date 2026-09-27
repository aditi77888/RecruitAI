import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

import { cn } from './cn'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let nextId = 1

const KIND_ICON: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const KIND_ICON_STYLES: Record<ToastKind, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, kind, message }])
      window.setTimeout(() => dismiss(id), 5000)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-5 sm:left-auto">
        {toasts.map((t) => {
          const Icon = KIND_ICON[t.kind]
          return (
            <div
              key={t.id}
              role="status"
              className="animate-rise-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3 text-[13px] font-medium text-text shadow-md"
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', KIND_ICON_STYLES[t.kind])} />
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-0.5 text-text-tertiary transition-colors hover:bg-surface-sunken hover:text-text"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
