import { useEffect, useMemo, useState } from 'react'

import { Badge, CallStatusBadge, StatusBadge } from '../../components/kit/Badge'
import { Button } from '../../components/kit/Button'
import { EmptyState } from '../../components/kit/EmptyState'
import { PageHeader } from '../../components/kit/PageHeader'
import { PageSpinner } from '../../components/kit/Spinner'
import { candidateApi, extractErrorMessage, jdApi } from '../../core/api'
import { useToast } from '../../core/toast'
import type { Candidate, JD } from '../../core/types'

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

function scoreTone(score: number): string {
  if (score >= 70) return 'text-emerald-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-rose-600'
}

export default function ShortlistedPage() {
  const toast = useToast()
  const [jds, setJds] = useState<JD[]>([])
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [jdFilter, setJdFilter] = useState('All JDs')
  const [search, setSearch] = useState('')
  const [sendingLinks, setSendingLinks] = useState(false)

  useEffect(() => {
    jdApi.list().then(setJds).catch(() => undefined)
  }, [])

  function refreshCandidates() {
    setCandidates(null)
    candidateApi
      .list({ jd_title: jdFilter === 'All JDs' ? undefined : jdFilter, search: search || undefined })
      .then(setCandidates)
      .catch((err) => toast.show(extractErrorMessage(err), 'error'))
  }

  useEffect(() => {
    refreshCandidates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jdFilter, search])

  const jdOptions = useMemo(() => ['All JDs', ...jds.map((jd) => jd.title)], [jds])
  const selectedJd = useMemo(() => jds.find((jd) => jd.title === jdFilter) ?? null, [jds, jdFilter])

  async function sendLinks() {
    if (!selectedJd) return
    setSendingLinks(true)
    try {
      const result = await jdApi.sendInterviewLinks(selectedJd.jd_id)
      toast.show(
        `Interview links sent: ${result.sent} | skipped: ${result.skipped_no_email} | failed: ${result.failed}`,
        'info',
      )
      refreshCandidates()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setSendingLinks(false)
    }
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Shortlisted Candidates"
        description="Master candidate list. Status updates automatically as candidates move through the pipeline."
        actions={candidates && <Badge tone="indigo">{candidates.length} candidate(s)</Badge>}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by name or candidate ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        <div className="relative sm:w-56">
          <select
            value={jdFilter}
            onChange={(e) => setJdFilter(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          >
            {jdOptions.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
          <ChevronIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {selectedJd && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" loading={sendingLinks} onClick={sendLinks}>
            Send interview links for {selectedJd.title}
          </Button>
        </div>
      )}

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
                    <tr key={c.candidate_id} className="align-top transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">
                            {initials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{c.name || '—'}</p>
                            <p className="truncate text-xs text-slate-400">{c.candidate_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{c.email || '—'}</p>
                        <p className="text-xs text-slate-400">{c.phone || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.jd_title || '—'}</td>
                      <td className="px-4 py-3">
                        {c.match_score != null ? (
                          <span className={`font-semibold ${scoreTone(c.match_score)}`}>{Math.round(c.match_score)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
