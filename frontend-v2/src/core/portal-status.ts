// Ported from the old frontend's PortalPage.tsx verbatim. This is real
// product behavior (not just presentation): candidates never see the real
// shortlist/reject/borderline outcome immediately -- it's held behind a
// generic "under process" message for DECISION_REVEAL_DELAY_MS after they
// applied. Do not change these thresholds or the gated status set without
// the same product decision being revisited on the old frontend too.

export type Tone = 'pending' | 'success' | 'error' | 'neutral'

export interface StatusInfo {
  step: 1 | 2 | 3 | 4
  tone: Tone
  title: string
  description: string
}

export const STEP_LABELS = ['Applied', 'Reviewed', 'Interview', 'Decision']

export const DECISION_REVEAL_DELAY_MS = 5 * 60 * 1000
export const GATED_DECISION_STATUSES = new Set(['shortlisted', 'borderline', 'rejected'])

export const STATUS_INFO: Record<string, StatusInfo> = {
  uploaded: {
    step: 1,
    tone: 'pending',
    title: 'Application submitted',
    description: 'Your resume has been received and is queued for review.',
  },
  awaiting_decision: {
    step: 1,
    tone: 'pending',
    title: 'Resume under process',
    description: "Your resume is under process — check 'My applications' after some time.",
  },
  shortlisted: {
    step: 2,
    tone: 'success',
    title: 'Keep an eye on your mail',
    description: "Keep an eye on your mail — you'll be notified there.",
  },
  borderline: {
    step: 2,
    tone: 'success',
    title: 'Keep an eye on your mail',
    description: "Keep an eye on your mail — you'll be notified there.",
  },
  rejected: {
    step: 2,
    tone: 'error',
    title: 'Not shortlisted',
    description: 'You have not been shortlisted for this specific role.',
  },
  declined: {
    step: 2,
    tone: 'neutral',
    title: 'Declined',
    description: 'You opted out of the interview process for this role.',
  },
  interview_context_processing: {
    step: 3,
    tone: 'pending',
    title: 'Preparing your interview',
    description: 'The hiring team is setting up your interview context.',
  },
  interview_context_error: {
    step: 3,
    tone: 'error',
    title: 'Setup issue',
    description: 'We hit an issue preparing your interview. The hiring team has been notified.',
  },
  ready_to_call: {
    step: 3,
    tone: 'success',
    title: 'Interview scheduled',
    description: 'You are shortlisted for a virtual interview — check your email for the link.',
  },
  reschedule_requested: {
    step: 3,
    tone: 'pending',
    title: 'Reschedule requested',
    description: 'A new interview time is being arranged for you.',
  },
  called: {
    step: 4,
    tone: 'pending',
    title: 'Interview completed',
    description: 'Your interview call is complete and is being processed.',
  },
  call_disconnected: {
    step: 3,
    tone: 'pending',
    title: 'Call disconnected',
    description: 'Your call was disconnected — a new attempt will be scheduled.',
  },
  evaluated: {
    step: 4,
    tone: 'success',
    title: 'Review complete',
    description: 'Your interview has been evaluated and is under review by the hiring team.',
  },
  __eval_failed__: {
    step: 1,
    tone: 'neutral',
    title: "Couldn't process your resume",
    description: 'Please try uploading it again in a moment.',
  },
}
const DEFAULT_STATUS_INFO: StatusInfo = {
  step: 1,
  tone: 'pending',
  title: 'Under review',
  description: 'Your application is being processed.',
}

export function statusInfo(status: string): StatusInfo {
  return STATUS_INFO[status] ?? DEFAULT_STATUS_INFO
}

// The screening pipeline actually runs (and sets the real status) synchronously
// during upload, but we don't want to reveal shortlisted/rejected to the
// candidate right away -- hold it behind a generic "under process" message
// until DECISION_REVEAL_DELAY_MS has passed since they applied.
export function displayStatusInfo(status: string, createdAt: string | null | undefined): StatusInfo {
  if (GATED_DECISION_STATUSES.has(status) && createdAt) {
    const appliedAt = new Date(createdAt).getTime()
    if (!Number.isNaN(appliedAt) && Date.now() - appliedAt < DECISION_REVEAL_DELAY_MS) {
      return STATUS_INFO.awaiting_decision
    }
  }
  return statusInfo(status)
}
