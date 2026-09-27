import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ClipboardList, XCircle } from 'lucide-react'

import { Avatar } from '../../components/kit/Avatar'
import { Badge } from '../../components/kit/Badge'
import { EmptyState, ErrorState } from '../../components/kit/EmptyState'
import { PageHeader } from '../../components/kit/PageHeader'
import { Panel, PanelBody, PanelHeader } from '../../components/kit/Panel'
import { ScoreRing } from '../../components/kit/ScoreIndicator'
import { PageSpinner } from '../../components/kit/Spinner'
import { TranscriptViewer } from '../../components/company/TranscriptViewer'
import { useReports } from '../../hooks/useCandidates'
import { cn } from '../../core/cn'
import { splitSentences } from '../../core/transcript-parser'
import type { ReportGroup, ReportRow } from '../../core/types'

export default function ReportsPage() {
  const { data: groups, isLoading, isError, refetch } = useReports()

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports"
        description="Post-interview evaluation outcomes, grouped by job opening."
      />

      {isError ? (
        <ErrorState
          title="Couldn't load reports"
          description="Something went wrong reaching the server. Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <PageSpinner />
      ) : !groups || groups.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-4.5 w-4.5" />}
          title="No evaluations yet"
          description="Reports appear here once candidates complete their AI interviews."
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <ReportSection key={group.jd_title} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReportSection({ group }: { group: ReportGroup }) {
  const selectedCount = group.rows.filter((r) => r.selected === 'Yes').length
  const scored = group.rows.filter((r) => r.score != null)
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length) : null

  return (
    <Panel>
      <PanelHeader
        title={group.jd_title}
        subtitle={`${group.rows.length} evaluated · ${selectedCount} selected${avgScore != null ? ` · avg score ${avgScore}` : ''}`}
      />
      <PanelBody className="space-y-2.5">
        {group.rows.map((row) => (
          <CandidateReportRow key={row.candidate_id} row={row} />
        ))}
      </PanelBody>
    </Panel>
  )
}

function CandidateReportRow({ row }: { row: ReportRow }) {
  const [open, setOpen] = useState(false)
  const selected = row.selected === 'Yes'
  const strengths = splitSentences(row.strengths)
  const weaknesses = splitSentences(row.weaknesses)

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-3.5 py-2.5 text-left hover:bg-surface-hover"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={row.name} size={30} />
          <div className="min-w-0">
            <Link
              to={`/app/candidates/${row.candidate_id}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate text-[13px] font-medium text-text hover:text-accent"
            >
              {row.name || 'Unnamed candidate'}
            </Link>
            <p className="truncate text-[11.5px] text-text-tertiary">{row.candidate_id}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge tone={selected ? 'success' : 'danger'}>
            {selected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {row.selected}
          </Badge>
          {row.score != null && <ScoreRing score={row.score} size={36} />}
          <ChevronDown className={cn('h-3.5 w-3.5 text-text-tertiary transition-transform', open && 'rotate-180')} />
        </div>
      </button>
      {open && (
        <div className="space-y-4 border-t border-border bg-surface-hover px-3.5 py-3.5">
          <div className={cn('rounded-md px-3 py-2.5 text-[12.5px] leading-relaxed', selected ? 'bg-success-soft text-text' : 'bg-danger-soft text-text')}>
            <span className="font-semibold">AI verdict.</span> {row.evaluation_summary || '—'}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SentenceList label="Strengths" tone="success" items={strengths} />
            <SentenceList label="Weaknesses" tone="danger" items={weaknesses} />
          </div>

          <TranscriptViewer transcript={row.transcript} />
        </div>
      )}
    </div>
  )
}

function SentenceList({ label, tone, items }: { label: string; tone: 'success' | 'danger'; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
      {items.length === 0 ? (
        <p className="mt-1.5 text-[12.5px] text-text-tertiary">—</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] text-text">
              <span className={cn('mt-1.5 h-1 w-1 shrink-0 rounded-full', tone === 'success' ? 'bg-success' : 'bg-danger')} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
