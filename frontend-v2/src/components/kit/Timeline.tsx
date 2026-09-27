import { Check } from 'lucide-react'

import { cn } from '../../core/cn'

export interface TimelineStep {
  label: string
  state: 'done' | 'current' | 'upcoming' | 'error'
}

// A horizontal step tracker (used on the candidate portal) and a compact
// vertical variant (used in the recruiter candidate-detail workspace).

export function TimelineHorizontal({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <StepDot state={step.state} />
            <span
              className={cn(
                'whitespace-nowrap text-[11px] font-medium',
                step.state === 'upcoming' ? 'text-text-tertiary' : 'text-text-secondary',
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'mx-1.5 mb-4 h-0.5 flex-1 rounded-full',
                step.state === 'done' ? 'bg-accent' : 'bg-border',
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function StepDot({ state }: { state: TimelineStep['state'] }) {
  if (state === 'done') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-white">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    )
  }
  if (state === 'current') {
    return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent ring-4 ring-accent-soft" />
  }
  if (state === 'error') {
    return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger ring-4 ring-danger-soft" />
  }
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-border" />
}

export function TimelineVertical({ steps }: { steps: TimelineStep[] }) {
  return (
    <div>
      {steps.map((step, i) => (
        <div key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={cn(
                'absolute left-[7px] top-4 h-full w-px',
                step.state === 'done' ? 'bg-accent/40' : 'bg-border',
              )}
            />
          )}
          <div className="mt-0.5">
            <StepDot state={step.state} />
          </div>
          <span
            className={cn(
              'text-[13px] font-medium',
              step.state === 'upcoming' ? 'text-text-tertiary' : 'text-text',
            )}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
