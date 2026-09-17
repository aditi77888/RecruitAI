import { useEffect, useState } from 'react'

import { Badge } from '../../components/kit/Badge'
import { Card, CardHeader } from '../../components/kit/Card'
import { EmptyState } from '../../components/kit/EmptyState'
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
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <p className="mt-1 text-sm text-slate-500">
        Post-call evaluation outcomes, one section per job opening. Expand a candidate to see the full transcript
        and how the AI reached its evaluation.
      </p>

      <div className="mt-6 space-y-6">
        {groups === null ? (
          <PageSpinner />
        ) : groups.length === 0 ? (
          <EmptyState
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
      <CardHeader title={`${group.jd_title} candidates`} subtitle={`${group.rows.length} evaluated`} />
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

  return (
    <>
      <tr className="cursor-pointer hover:bg-slate-50/70" onClick={() => setOpen(!open)}>
        <td className="px-4 py-3 font-medium text-slate-900">{row.name || '—'}</td>
        <td className="max-w-sm px-4 py-3 text-slate-500">
          <p className="line-clamp-2">{row.evaluation_summary || '—'}</p>
        </td>
        <td className="px-4 py-3 font-semibold text-slate-900">{row.score != null ? Math.round(row.score) : '—'}</td>
        <td className="px-4 py-3">
          <Badge tone={row.selected === 'Yes' ? 'emerald' : 'rose'}>{row.selected}</Badge>
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
