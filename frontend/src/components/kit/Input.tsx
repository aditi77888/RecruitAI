import { forwardRef } from 'react'
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldWrapperProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
}

function FieldLabel({
  label,
  required,
  htmlFor,
}: { label: string; required?: boolean } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  )
}

const fieldClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:bg-slate-50 disabled:text-slate-400'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrapperProps>(
  ({ label, hint, error, required, id, className = '', ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div>
        {label && <FieldLabel label={label} required={required} htmlFor={inputId} />}
        <input
          id={inputId}
          ref={ref}
          className={`${fieldClasses} ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10' : ''} ${className}`}
          {...rest}
        />
        {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
        {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrapperProps
>(({ label, hint, error, required, id, className = '', ...rest }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      {label && <FieldLabel label={label} required={required} htmlFor={inputId} />}
      <textarea
        id={inputId}
        ref={ref}
        className={`${fieldClasses} resize-y ${error ? 'border-rose-300' : ''} ${className}`}
        {...rest}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  )
})
Textarea.displayName = 'Textarea'
