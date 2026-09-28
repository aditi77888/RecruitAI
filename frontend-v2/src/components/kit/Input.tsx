import { forwardRef } from 'react'
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cn } from '../../core/cn'

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
    <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-medium text-text">
      {label}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  )
}

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] text-text placeholder:text-text-tertiary transition-colors duration-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:bg-surface-sunken disabled:text-text-tertiary'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrapperProps>(
  ({ label, hint, error, required, id, className = '', ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div>
        {label && <FieldLabel label={label} required={required} htmlFor={inputId} />}
        <input
          id={inputId}
          ref={ref}
          className={cn(fieldClasses, error && 'border-danger focus:border-danger focus:ring-danger/15', className)}
          {...rest}
        />
        {hint && !error && <p className="mt-1.5 text-[12px] text-text-secondary">{hint}</p>}
        {error && <p className="mt-1.5 text-[12px] font-medium text-danger">{error}</p>}
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
        className={cn(fieldClasses, 'resize-y', error && 'border-danger', className)}
        {...rest}
      />
      {hint && !error && <p className="mt-1.5 text-[12px] text-text-secondary">{hint}</p>}
      {error && <p className="mt-1.5 text-[12px] font-medium text-danger">{error}</p>}
    </div>
  )
})
Textarea.displayName = 'Textarea'
