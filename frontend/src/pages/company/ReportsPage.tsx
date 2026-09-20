import { useEffect, useState } from 'react'

import { Badge } from '../../components/kit/Badge'
import { Card, CardHeader } from '../../components/kit/Card'
import { EmptyState } from '../../components/kit/EmptyState'
import { PageHeader } from '../../components/kit/PageHeader'
import { PageSpinner } from '../../components/kit/Spinner'
import { extractErrorMessage, reportsApi } from '../../core/api'
import { useToast } from '../../core/toast'
import type { ReportGroup, ReportRow } from '../../core/types'

export default function ReportsPage() {
  const toast = useToast()
  const [groups, setGroups] = useState<ReportGroup[] | null>(null)

  useEffect(() => {
    reportsApi
      .list()
      .then(setGroups)
      .catch((err) => toast.show(extractErrorMessage(err), 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Reports"
        description="Post-call evaluation outcomes, one section per job opening. Expand a candidate to see the full transcript and how the AI reached its evaluation."
      />

      <div className="space-y-6">
        {groups === null ? (
          <PageSpinner />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<ClipboardIcon className="h-5 w-5" />}
            title="No evaluations yet"
            description="Reports appear here once candidates complete their AI interviews."
          />
        ) : (
          groups.map((group) => <ReportSection key={group.jd_title} group={group} />)
        )}
      </div>
    </div>
  )
}

function ReportSection({ group }: { group: ReportGroup }) {
  return (
    <Card>
      <CardHeader
        icon={<ClipboardIcon className="h-4.5 w-4.5" />}
        title={`${group.jd_title} candidates`}
        subtitle={`${group.rows.length} evaluated`}
      />
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Candidate</th>
              <th className="px-4 py-2.5">Summary</th>
              <th className="px-4 py-2.5">Score</th>
              <th className="px-4 py-2.5">Selected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {group.rows.map((row) => (
              <ReportRowItem key={row.candidate_id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ReportRowItem({ row }: { row: ReportRow }) {
  const [open, setOpen] = useState(false)
  const selected = row.selected === 'Yes'

  return (
    <>
      <tr className="cursor-pointer transition-colors hover:bg-slate-50/70" onClick={() => setOpen(!open)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <ChevronIcon className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
            <span className="font-medium text-slate-900">{row.name || '—'}</span>
          </div>
        </td>
        <td className="max-w-sm px-4 py-3 text-slate-500">
          <p className="line-clamp-2">{row.evaluation_summary || '—'}</p>
        </td>
        <td className="px-4 py-3 font-semibold text-slate-900">{row.score != null ? Math.round(row.score) : '—'}</td>
        <td className="px-4 py-3">
          <Badge tone={selected ? 'emerald' : 'rose'}>
            <span className="flex items-center gap-1">
              {selected ? <CheckIcon className="h-3 w-3" /> : <CrossIcon className="h-3 w-3" />}
              {row.selected}
            </span>
          </Badge>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/60">
          <td colSpan={4} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Strengths</p>
                <p className="mt-1 text-sm text-slate-700">{row.strengths || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Weaknesses</p>
                <p className="mt-1 text-sm text-slate-700">{row.weaknesses || '—'}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Overall AI evaluation summary
              </p>
              <p className="mt-1 text-sm text-slate-700">{row.evaluation_summary || '—'}</p>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Full interview transcript
              </p>
              {row.transcript ? (
                <pre className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600">
                  {row.transcript}
                </pre>
              ) : (
                <p className="mt-1 text-sm text-slate-400">No transcript was captured for this interview.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" strokeLinecap="round" />
      <path d="M9 11h6M9 15h6" strokeLinecap="round" />
    </svg>
  )
}
