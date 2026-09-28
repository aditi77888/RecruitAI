import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Briefcase, ClipboardCheck, Users2 } from 'lucide-react'

import { Avatar } from '../../components/kit/Avatar'
import { Badge } from '../../components/kit/Badge'
import { EmptyState, ErrorState } from '../../components/kit/EmptyState'
import { PageHeader } from '../../components/kit/PageHeader'
import { Panel, PanelBody, PanelHeader } from '../../components/kit/Panel'
import { Skeleton } from '../../components/kit/Skeleton'
import { statusMeta } from '../../components/kit/StatusBadge'
import { useAllCandidates } from '../../hooks/useCandidates'
import { useJds } from '../../hooks/useJds'
import { cn } from '../../core/cn'

const PIPELINE_ORDER = [
  'uploaded',
  'shortlisted',
  'borderline',
  'ready_to_call',
  'reschedule_requested',
  'called',
  'evaluated',
  'rejected',
  'declined',
  'interview_context_processing',
  'interview_context_error',
  'call_disconnected',
]

const ATTENTION_STATUSES = new Set(['interview_context_error', 'call_disconnected', 'reschedule_requested'])

export default function DashboardPage() {
  const { data: jds, isLoading: jdsLoading, isError: jdsError, refetch: refetchJds } = useJds()
  const {
    data: candidates,
    isLoading: candidatesLoading,
    isError: candidatesError,
    refetch: refetchCandidates,
  } = useAllCandidates()

  const totalCandidates = jds?.reduce((sum, jd) => sum + jd.total_candidates, 0) ?? 0
  const shortlistedCount = candidates?.filter((c) => c.status === 'shortlisted' || c.status === 'borderline').length ?? 0
  const evaluatedCount = candidates?.filter((c) => c.status === 'evaluated').length ?? 0

  const statusCounts = new Map<string, number>()
  for (const c of candidates ?? []) {
    statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1)
  }
  const maxCount = Math.max(1, ...Array.from(statusCounts.values()))

  const needsAttention = (candidates ?? []).filter((c) => c.error_log || ATTENTION_STATUSES.has(c.status)).slice(0, 6)

  const loading = jdsLoading || candidatesLoading
  const hasError = jdsError || candidatesError

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="An operational overview of your hiring pipeline."
        actions={
          <Link
            to="/app/jobs"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-text hover:bg-surface-hover"
          >
            View all jobs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {hasError ? (
        <ErrorState
          title="Couldn't load your dashboard"
          description="Something went wrong reaching the server. Check your connection and try again."
          onRetry={() => {
            refetchJds()
            refetchCandidates()
          }}
        />
      ) : (
        <>
      <Panel className="mb-6">
        <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
          <MetricCell icon={Briefcase} label="Active jobs" value={jds?.length} loading={loading} />
          <MetricCell icon={Users2} label="Total candidates" value={totalCandidates} loading={loading} />
          <MetricCell icon={ClipboardCheck} label="Shortlisted" value={shortlistedCount} loading={loading} />
          <MetricCell icon={ClipboardCheck} label="Evaluated" value={evaluatedCount} loading={loading} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelHeader title="Pipeline distribution" subtitle="Every candidate across all jobs, by current status" />
          <PanelBody>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : statusCounts.size === 0 ? (
              <EmptyState
                icon={<Users2 className="h-4 w-4" />}
                title="No candidates yet"
                description="Upload resumes against a job to see your pipeline here."
              />
            ) : (
              <div className="space-y-2.5">
                {PIPELINE_ORDER.filter((s) => statusCounts.has(s)).map((status) => {
                  const count = statusCounts.get(status) ?? 0
                  const { label, tone } = statusMeta(status)
                  const toneColor: Record<string, string> = {
                    neutral: 'bg-text-tertiary',
                    accent: 'bg-accent',
                    success: 'bg-success',
                    warning: 'bg-warning',
                    danger: 'bg-danger',
                  }
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-[12.5px] font-medium capitalize text-text-secondary">
                        {label}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                        <div
                          className={cn('h-full rounded-full', toneColor[tone])}
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-text">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="Needs attention" subtitle="Errors and stalled interview attempts" />
          <PanelBody className="p-0">
            {loading ? (
              <div className="space-y-1 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : needsAttention.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<AlertTriangle className="h-4 w-4" />}
                  title="Nothing needs attention"
                  description="Errors and stalled interviews will show up here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {needsAttention.map((c) => (
                  <li key={c.candidate_id}>
                    <Link
                      to={`/app/candidates/${c.candidate_id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover"
                    >
                      <Avatar name={c.name} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-text">{c.name || 'Unnamed candidate'}</p>
                        <p className="truncate text-[11.5px] text-text-tertiary">{c.jd_title}</p>
                      </div>
                      <Badge tone="warning">{statusMeta(c.status).label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelHeader
          title="Jobs"
          subtitle="Screening progress per open role"
          action={
            <Link to="/app/jobs" className="text-[12.5px] font-semibold text-accent hover:text-accent-hover">
              Manage jobs
            </Link>
          }
        />
        <PanelBody className="p-0">
          {loading ? (
            <div className="space-y-1 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !jds || jds.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Briefcase className="h-4 w-4" />}
                title="No job openings yet"
                description="Create your first job opening from the Jobs page."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {jds.slice(0, 6).map((jd) => (
                <li key={jd.jd_id}>
                  <Link
                    to={`/app/jobs/${jd.jd_id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-text">{jd.title}</p>
                      <p className="text-[11.5px] text-text-tertiary">{jd.total_candidates} candidate(s)</p>
                    </div>
                    <div className="hidden w-32 shrink-0 items-center gap-2 sm:flex">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${jd.shortlisting_progress}%` }} />
                      </div>
                      <span className="w-8 text-right text-[11.5px] font-medium tabular-nums text-text-tertiary">
                        {jd.shortlisting_progress}%
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
      </>
      )}
    </div>
  )
}

function MetricCell({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Briefcase
  label: string
  value: number | undefined
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11.5px] font-medium text-text-secondary">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-5 w-8" />
        ) : (
          <p className="font-display text-[19px] font-semibold tabular-nums text-text">{value ?? 0}</p>
        )}
      </div>
    </div>
  )
}
