type Tone = 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky'

const TONE_STYLES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-600',
  indigo: 'bg-indigo-50 text-indigo-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
}

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_STYLES[tone]}`}>
      {children}
    </span>
  )
}

const STATUS_TONE: Record<string, Tone> = {
  uploaded: 'slate',
  shortlisted: 'indigo',
  rejected: 'rose',
  ready_to_call: 'sky',
  called: 'sky',
  evaluated: 'emerald',
  interview_context_processing: 'amber',
  interview_context_error: 'rose',
  reschedule_requested: 'amber',
  call_disconnected: 'rose',
  declined: 'rose',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'slate'
  const label = status.replace(/_/g, ' ')
  return (
    <Badge tone={tone}>
      <span className="capitalize">{label}</span>
    </Badge>
  )
}

const CALL_STATUS_TONE: Record<string, Tone> = {
  pending: 'slate',
  dialing: 'sky',
  completed: 'emerald',
  failed: 'rose',
}

export function CallStatusBadge({ callStatus }: { callStatus: string | null | undefined }) {
  if (!callStatus) return <Badge tone="slate">Not started</Badge>
  const tone = CALL_STATUS_TONE[callStatus] ?? 'slate'
  return (
    <Badge tone={tone}>
      <span className="capitalize">{callStatus.replace(/_/g, ' ')}</span>
    </Badge>
  )
}
