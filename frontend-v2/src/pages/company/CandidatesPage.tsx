import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, Users } from 'lucide-react'

import { Avatar } from '../../components/kit/Avatar'
import { Badge } from '../../components/kit/Badge'
import { EmptyState, ErrorState } from '../../components/kit/EmptyState'
import { PageHeader } from '../../components/kit/PageHeader'
import { Pagination } from '../../components/kit/Pagination'
import { ScoreValue } from '../../components/kit/ScoreIndicator'
import { SearchInput } from '../../components/kit/SearchInput'
import { Select } from '../../components/kit/Select'
import { SkeletonTableRows } from '../../components/kit/Skeleton'
import { CallStatusBadge, StatusBadge } from '../../components/kit/StatusBadge'
import { Table, TBody, Td, THead, Th, Tr } from '../../components/kit/Table'
import { useCandidates } from '../../hooks/useCandidates'
import { useJds } from '../../hooks/useJds'

type SortKey = 'name' | 'score' | 'status'

const PAGE_SIZE = 20

export default function CandidatesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const jdFilter = searchParams.get('jd') ?? 'All jobs'

  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [page, setPage] = useState(1)

  const { data: jds } = useJds()
  const {
    data: candidates,
    isLoading,
    isError,
    refetch,
  } = useCandidates({
    jd_title: jdFilter === 'All jobs' ? undefined : jdFilter,
    search: search || undefined,
  })

  // search/jdFilter can change out from under this page without a remount --
  // e.g. the top bar's global search navigates here with a new ?search=
  // while already on this route. Without this, a stale `page` from a
  // previous, longer result set can slice past the end of the new
  // (shorter) one and show a false "no results" empty state.
  useEffect(() => {
    setPage(1)
  }, [search, jdFilter])

  const jdOptions = useMemo(
    () => ['All jobs', ...(jds ?? []).map((jd) => jd.title)],
    [jds],
  )

  const sorted = useMemo(() => {
    const list = [...(candidates ?? [])]
    list.sort((a, b) => {
      if (sortKey === 'score') return (b.match_score ?? -1) - (a.match_score ?? -1)
      if (sortKey === 'status') return a.status.localeCompare(b.status)
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
    return list
  }, [candidates, sortKey])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'All jobs') next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Candidates"
        description="Every candidate across every job, filterable by status and screening result."
        actions={candidates && <Badge tone="accent">{candidates.length} total</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchInput
          placeholder="Search by name or candidate ID..."
          value={search}
          onChange={(e) => updateParam('search', e.target.value)}
          className="w-full max-w-xs"
        />
        <Select
          value={jdFilter}
          onValueChange={(v) => updateParam('jd', v)}
          ariaLabel="Filter by job"
          options={jdOptions.map((title) => ({ value: title, label: title }))}
        />
        <Select
          value={sortKey}
          onValueChange={(v) => setSortKey(v as SortKey)}
          ariaLabel="Sort candidates"
          options={[
            { value: 'score', label: 'Sort: Match score' },
            { value: 'name', label: 'Sort: Name (A–Z)' },
            { value: 'status', label: 'Sort: Status' },
          ]}
        />
      </div>

      {isError ? (
        <ErrorState
          title="Couldn't load candidates"
          description="Something went wrong reaching the server. Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : (
      <Table>
        <THead>
          <Th>Candidate</Th>
          <Th>Job</Th>
          <Th>
            <span className="inline-flex items-center gap-1">
              Score <ArrowUpDown className="h-3 w-3" />
            </span>
          </Th>
          <Th>Status</Th>
          <Th>Interview</Th>
        </THead>
        <TBody>
          {isLoading ? (
            <SkeletonTableRows rows={8} cols={5} />
          ) : paged.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-0">
                <EmptyState
                  icon={<Users className="h-4.5 w-4.5" />}
                  title="No candidates match these filters"
                  description="Try clearing the search or job filter."
                />
              </td>
            </tr>
          ) : (
            paged.map((c) => (
              <Tr key={c.candidate_id} onClick={() => navigate(`/app/candidates/${c.candidate_id}`)}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} size={28} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text">{c.name || 'Unnamed candidate'}</p>
                      <p className="truncate text-[11.5px] text-text-tertiary">{c.email || c.candidate_id}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-text-secondary">{c.jd_title || '—'}</Td>
                <Td>
                  <ScoreValue score={c.match_score} />
                </Td>
                <Td>
                  <StatusBadge status={c.status} />
                </Td>
                <Td>
                  <CallStatusBadge callStatus={c.call_status} />
                </Td>
              </Tr>
            ))
          )}
        </TBody>
      </Table>
      )}

      {!isError && !isLoading && sorted.length > 0 && (
        <div className="mt-4">
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalLabel={`${sorted.length} candidate(s)`}
          />
        </div>
      )}
    </div>
  )
}
