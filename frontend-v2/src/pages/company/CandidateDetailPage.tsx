import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, CheckCircle2, Mail, Phone, XCircle } from 'lucide-react'

import { Avatar } from '../../components/kit/Avatar'
import { Button } from '../../components/kit/Button'
import { EmptyState, ErrorState } from '../../components/kit/EmptyState'
import { Panel, PanelBody, PanelHeader } from '../../components/kit/Panel'
import { ScoreRing } from '../../components/kit/ScoreIndicator'
import { PageSpinner } from '../../components/kit/Spinner'
import { CallStatusBadge, StatusBadge } from '../../components/kit/StatusBadge'
import { TimelineVertical } from '../../components/kit/Timeline'
import { TranscriptViewer } from '../../components/company/TranscriptViewer'
import { useAllCandidates, useReports } from '../../hooks/useCandidates'
import { candidateTimelineSteps } from '../../core/candidate-timeline'
import { splitSentences } from '../../core/transcript-parser'

export default function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>()
  const {
    data: candidates,
    isLoading: candidatesLoading,
    isError: candidatesError,
    refetch: refetchCandidates,
  } = useAllCandidates()
  const {
    data: reportGroups,
    isLoading: reportsLoading,
    isError: reportsError,
    refetch: refetchReports,
  } = useReports()

  const candidate = candidates?.find((c) => c.candidate_id === candidateId)
  const report = reportGroups?.flatMap((g) => g.rows).find((r) => r.candidate_id === candidateId)

  if (candidatesLoading || reportsLoading) return <PageSpinner />

  if (candidatesError || reportsError) {
    return (
      <ErrorState
        title="Couldn't load this candidate"
        description="Something went wrong reaching the server. Check your connection and try again."
        onRetry={() => {
          refetchCandidates()
          refetchReports()
        }}
      />
    )
  }

  if (!candidate) {
    return (
      <EmptyState
        title="Candidate not found"
        description="This candidate may have been removed, or their job opening was deleted."
        action={
          <Link to="/app/candidates">
            <Button variant="secondary">Back to candidates</Button>
          </Link>
        }
      />
    )
  }

  const strengths = splitSentences(report?.strengths ?? null)
  const weaknesses = splitSentences(report?.weaknesses ?? null)
  const steps = candidateTimelineSteps(candidate.status)

  return (
    <div className="animate-fade-in">
      <Link
        to="/app/candidates"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All candidates
      </Link>

      {/* Identity + application context */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar name={candidate.name} size={44} />
          <div>
            <h1 className="font-display text-[19px] font-semibold text-text">
              {candidate.name || 'Unnamed candidate'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-3 w-3" />
                {candidate.jd_title}
              </span>
              {candidate.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  {candidate.email}
                </span>
              )}
              {candidate.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3 w-3" />
                  {candidate.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={candidate.status} />
          <CallStatusBadge callStatus={candidate.call_status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {/* AI screening summary -- score supports the read, doesn't dominate it */}
          <Panel>
            <PanelHeader
              title="Screening summary"
              subtitle={candidate.verdict ? `AI verdict: ${candidate.verdict}` : 'Resume screening result'}
            />
            <PanelBody>
              <div className="flex items-start gap-4">
                {candidate.match_score != null && <ScoreRing score={candidate.match_score} size={52} />}
                <p className="flex-1 text-[13px] leading-relaxed text-text">
                  {candidate.resume_summary || 'No resume summary is available for this candidate.'}
                </p>
              </div>
            </PanelBody>
          </Panel>

          {report ? (
            <Panel>
              <PanelHeader
                title="Interview evaluation"
                subtitle={
                  <span className="inline-flex items-center gap-1.5">
                    {report.selected === 'Yes' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-danger" />
                    )}
                    {report.selected === 'Yes' ? 'Selected' : 'Not selected'}
                    {report.score != null ? ` · score ${Math.round(report.score)}` : ''}
                  </span>
                }
              />
              <PanelBody className="space-y-4">
                <div
                  className={`rounded-md px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    report.selected === 'Yes' ? 'bg-success-soft text-text' : 'bg-danger-soft text-text'
                  }`}
                >
                  {report.evaluation_summary || 'No summary was generated for this interview.'}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SentenceList label="Strengths" tone="success" items={strengths} />
                  <SentenceList label="Concerns / gaps" tone="danger" items={weaknesses} />
                </div>

                <TranscriptViewer transcript={report.transcript} />
              </PanelBody>
            </Panel>
          ) : (
            <Panel>
              <PanelHeader title="Interview evaluation" />
              <PanelBody>
                <EmptyState
                  title="Not yet interviewed"
                  description="Strengths, gaps, and the transcript will appear here once this candidate completes their AI interview."
                />
              </PanelBody>
            </Panel>
          )}

          {candidate.error_log && (
            <Panel className="border-danger/25 bg-danger-soft/30">
              <PanelBody>
                <p className="text-[12.5px] font-semibold text-danger">Last error</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-text">{candidate.error_log}</p>
              </PanelBody>
            </Panel>
          )}
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Panel>
            <PanelHeader title="Timeline" />
            <PanelBody>
              <TimelineVertical steps={steps} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Application" />
            <PanelBody>
              <dl className="space-y-2.5 text-[12.5px]">
                <Row label="Job opening" value={candidate.jd_title || '—'} />
                <Row label="Company" value={candidate.company_name || '—'} />
                <Row label="Match ready" value={candidate.match_ready ? 'Yes' : 'No'} />
                <Row label="Interview ready" value={candidate.ready_to_call ? 'Yes' : 'No'} />
                {candidate.resume_link && (
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
                    <dt className="text-text-tertiary">Resume</dt>
                    <dd>
                      <a
                        href={candidate.resume_link}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-accent hover:text-accent-hover"
                      >
                        View file
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="font-medium text-text">{value}</dd>
    </div>
  )
}

function SentenceList({
  label,
  tone,
  items,
}: {
  label: string
  tone: 'success' | 'danger'
  items: string[]
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
      {items.length === 0 ? (
        <p className="mt-1.5 text-[12.5px] text-text-tertiary">—</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] text-text">
              <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${tone === 'success' ? 'bg-success' : 'bg-danger'}`} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
