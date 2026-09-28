import type { TimelineStep } from '../components/kit/Timeline'

// Recruiter-facing pipeline stages, derived from Candidate.status
// (db/models.py's informal enum). Unlike the candidate portal's
// displayStatusInfo, this shows the REAL current status -- recruiters are
// not subject to the decision-reveal delay.
export function candidateTimelineSteps(status: string): TimelineStep[] {
  const terminalNegative = status === 'rejected' || status === 'declined'
  const hasError = status === 'interview_context_error'

  const screenedState: TimelineStep['state'] = status === 'uploaded' ? 'current' : terminalNegative ? 'error' : 'done'
  const screenedLabel = terminalNegative ? `Screened — ${status === 'rejected' ? 'rejected' : 'declined'}` : 'Screened'

  const interviewStageStatuses = [
    'ready_to_call',
    'reschedule_requested',
    'call_disconnected',
    'interview_context_processing',
    'interview_context_error',
  ]
  let interviewState: TimelineStep['state'] = 'upcoming'
  if (hasError) interviewState = 'error'
  else if (interviewStageStatuses.includes(status)) interviewState = 'current'
  else if (['called', 'evaluated'].includes(status)) interviewState = 'done'
  else if (terminalNegative) interviewState = 'upcoming'

  let completedState: TimelineStep['state'] = 'upcoming'
  if (status === 'called') completedState = 'current'
  else if (status === 'evaluated') completedState = 'done'

  const evaluatedState: TimelineStep['state'] = status === 'evaluated' ? 'done' : 'upcoming'

  return [
    { label: screenedLabel, state: screenedState },
    { label: 'Interview scheduled', state: interviewState },
    { label: 'Interview completed', state: completedState },
    { label: 'Evaluated', state: evaluatedState },
  ]
}
