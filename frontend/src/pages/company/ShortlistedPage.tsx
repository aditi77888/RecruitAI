import { useEffect, useMemo, useState } from 'react'

import { CallStatusBadge, StatusBadge } from '../../components/kit/Badge'
import { EmptyState } from '../../components/kit/EmptyState'
import { Input } from '../../components/kit/Input'
import { PageSpinner } from '../../components/kit/Spinner'
import { candidateApi, extractErrorMessage, jdApi } from '../../core/api'
import { useToast } from '../../core/toast'
import type { Candidate, JD } from '../../core/types'

export default function ShortlistedPage() {
  const toast = useToast()
  const [jds, setJds] = useState<JD[]>([])
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [jdFilter, setJdFilter] = useState('All JDs')
  const [search, setSearch] = useState('')

  useEffect(() => {
    jdApi.list().then(setJds).catch(() => undefined)
  }, [])

  useEffect(() => {
    setCandidates(null)
    candidateApi
      .list({ jd_title: jdFilter === 'All JDs' ? undefined : jdFilter, search: search || undefined })
      .then(setCandidates)
      .catch((err) => toast.show(extractErrorMessage(err), 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jdFilter, search])

  const jdOptions = useMemo(() => ['All JDs', ...jds.map((jd) => jd.title)], [jds])

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-bold text-slate-900">Shortlisted Candidates</h1>
      <p className="mt-1 text-sm text-slate-500">
        Master candidate list. Status updates automatically as candidates move through the pipeline.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Search by name or candidate ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={jdFilter}
          onChange={(e) => setJdFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:w-56"
        >
          {jdOptions.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {candidates === null ? (
          <PageSpinner />
        ) : candidates.length === 0 ? (
          <EmptyState title="No candidates match this filter yet" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">JD</th>
                    <th className="px-4 py-3">Match score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Call status</th>
                    <th className="px-4 py-3">Resume summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((c) => (
                    <tr key={c.candidate_id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{c.name || '—'}</p>
                        <p className="text-xs text-slate-400">{c.candidate_id}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{c.email || '—'}</p>
                        <p className="text-xs text-slate-400">{c.phone || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.jd_title || '—'}</td>
                      <td className="px-4 py-3">
                        {c.match_score != null ? (
                          <span className="font-semibold text-slate-900">{Math.round(c.match_score)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        <CallStatusBadge callStatus={c.call_status} />
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-500">
                        <p className="line-clamp-2">{c.resume_summary || '—'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
