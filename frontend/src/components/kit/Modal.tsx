import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in-up" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-fade-in-up">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-3 text-sm text-slate-600">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
