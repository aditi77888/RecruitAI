import { Badge, Dot } from './Badge'

// Maps every status string the backend actually produces (db/models.py's
// informal status enum) to a tone + human label. Kept in one place so every
// screen (candidates table, candidate detail, reports, portal) renders the
// same status the same way.
type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  uploaded: { label: 'Uploaded', tone: 'neutral' },
  shortlisted: { label: 'Shortlisted', tone: 'accent' },
  borderline: { label: 'Borderline', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'danger' },
  declined: { label: 'Declined', tone: 'neutral' },
  interview_context_processing: { label: 'Preparing interview', tone: 'warning' },
  interview_context_error: { label: 'Setup error', tone: 'danger' },
  ready_to_call: { label: 'Interview scheduled', tone: 'accent' },
  reschedule_requested: { label: 'Reschedule requested', tone: 'warning' },
  called: { label: 'Interview completed', tone: 'accent' },
  call_disconnected: { label: 'Call disconnected', tone: 'warning' },
  evaluated: { label: 'Evaluated', tone: 'success' },
}

export function statusMeta(status: string): { label: string; tone: Tone } {
  return STATUS_META[status] ?? { label: status.replace(/_/g, ' '), tone: 'neutral' }
}

export function StatusBadge({ status }: { status: string }) {
  const { label, tone } = statusMeta(status)
  return (
    <Badge tone={tone}>
      <Dot tone={tone} />
      <span className="capitalize">{label}</span>
    </Badge>
  )
}

const CALL_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Not started', tone: 'neutral' },
  dialing: { label: 'Link sent', tone: 'accent' },
  completed: { label: 'Completed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
}

export function CallStatusBadge({ callStatus }: { callStatus: string | null | undefined }) {
  const meta = callStatus ? (CALL_STATUS_META[callStatus] ?? { label: callStatus, tone: 'neutral' as Tone }) : CALL_STATUS_META.pending
  return (
    <Badge tone={meta.tone}>
      <Dot tone={meta.tone} />
      {meta.label}
    </Badge>
  )
}
