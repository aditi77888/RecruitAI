import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpDown, Briefcase, FileUp, Plus, Trash2, Users } from 'lucide-react'

import { Button } from '../../components/kit/Button'
import { Dialog } from '../../components/kit/Dialog'
import { EmptyState, ErrorState } from '../../components/kit/EmptyState'
import { Input, Textarea } from '../../components/kit/Input'
import { PageHeader } from '../../components/kit/PageHeader'
import { ProgressBar } from '../../components/kit/ProgressBar'
import { SearchInput } from '../../components/kit/SearchInput'
import { Select } from '../../components/kit/Select'
import { Skeleton } from '../../components/kit/Skeleton'
import { Table, TBody, Td, THead, Th, Tr } from '../../components/kit/Table'
import { useCreateJd, useCreateJdFromFile, useDeleteJd, useJds } from '../../hooks/useJds'
import { extractErrorMessage } from '../../core/api-client'
import { useToast } from '../../core/toast-context'
import type { JD } from '../../core/types'

type SortKey = 'title' | 'candidates' | 'progress'

function jobStage(jd: JD): { label: string; done: boolean } {
  if (jd.total_candidates === 0) return { label: 'No candidates yet', done: false }
  if (jd.shortlisting_progress >= 100) return { label: 'Screening complete', done: true }
  return { label: 'Screening in progress', done: false }
}

export default function JobsPage() {
  const { data: jds, isLoading, isError, refetch } = useJds()
  const toast = useToast()
  const deleteJd = useDeleteJd()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [showCreate, setShowCreate] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<JD | null>(null)

  const filtered = useMemo(() => {
    const list = (jds ?? []).filter((jd) => jd.title.toLowerCase().includes(search.trim().toLowerCase()))
    return [...list].sort((a, b) => {
      if (sortKey === 'candidates') return b.total_candidates - a.total_candidates
      if (sortKey === 'progress') return b.shortlisting_progress - a.shortlisting_progress
      return a.title.localeCompare(b.title)
    })
  }, [jds, search, sortKey])

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteJd.mutateAsync(pendingDelete.jd_id)
      toast.show(`'${pendingDelete.title}' deleted.`, 'success')
      setPendingDelete(null)
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Jobs"
        description="Every job opening you've created, and how far screening has progressed."
        actions={
          <Button onClick={() => setShowCreate(true)} icon={<Plus className="h-3.5 w-3.5" />}>
            New job
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchInput
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs"
        />
        <Select
          value={sortKey}
          onValueChange={(v) => setSortKey(v as SortKey)}
          ariaLabel="Sort jobs"
          options={[
            { value: 'title', label: 'Sort: Title (A–Z)' },
            { value: 'candidates', label: 'Sort: Most candidates' },
            { value: 'progress', label: 'Sort: Screening progress' },
          ]}
        />
      </div>

      {isError ? (
        <ErrorState
          title="Couldn't load your jobs"
          description="Something went wrong reaching the server. Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <Table>
          <THead>
            <Th>Job</Th>
            <Th>Status</Th>
            <Th>Candidates</Th>
            <Th>Progress</Th>
            <Th className="w-10" />
          </THead>
          <TBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <Tr key={i}>
                <Td colSpan={5}>
                  <Skeleton className="h-5 w-full" />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-4.5 w-4.5" />}
          title={search ? 'No jobs match your search' : 'No job openings yet'}
          description={search ? 'Try a different title.' : 'Create your first job opening to start screening resumes.'}
          action={!search && <Button onClick={() => setShowCreate(true)}>Create a job opening</Button>}
        />
      ) : (
        <Table>
          <THead>
            <Th>Job</Th>
            <Th>Status</Th>
            <Th>
              <span className="inline-flex items-center gap-1">
                Candidates <Users className="h-3 w-3" />
              </span>
            </Th>
            <Th className="w-40">
              <span className="inline-flex items-center gap-1">
                Progress <ArrowUpDown className="h-3 w-3" />
              </span>
            </Th>
            <Th className="w-10" />
          </THead>
          <TBody>
            {filtered.map((jd) => {
              const stage = jobStage(jd)
              return (
                <Tr key={jd.jd_id} onClick={() => navigate(`/app/jobs/${jd.jd_id}`)}>
                  <Td>
                    <Link to={`/app/jobs/${jd.jd_id}`} className="font-medium text-text hover:text-accent">
                      {jd.title}
                    </Link>
                    {jd.must_have_skills && (
                      <p className="mt-0.5 truncate text-[11.5px] text-text-tertiary">{jd.must_have_skills}</p>
                    )}
                  </Td>
                  <Td>
                    <span
                      className={
                        stage.done
                          ? 'inline-flex items-center gap-1.5 text-[12.5px] font-medium text-success'
                          : 'inline-flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary'
                      }
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${stage.done ? 'bg-success' : 'bg-text-tertiary'}`} />
                      {stage.label}
                    </span>
                  </Td>
                  <Td className="tabular-nums">{jd.total_candidates}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <ProgressBar value={jd.shortlisting_progress} />
                      </div>
                      <span className="text-[11.5px] font-medium tabular-nums text-text-tertiary">
                        {jd.shortlisting_progress}%
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPendingDelete(jd)
                      }}
                      className="rounded-md p-1.5 text-text-tertiary hover:bg-danger-soft hover:text-danger"
                      aria-label={`Delete ${jd.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Td>
                </Tr>
              )
            })}
          </TBody>
        </Table>
      )}

      <CreateJobDialog open={showCreate} onClose={() => setShowCreate(false)} />

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete job opening"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteJd.isPending} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        Delete <span className="font-semibold text-text">{pendingDelete?.title}</span>? This also deletes every
        shortlisted candidate and evaluation under it. This cannot be undone.
      </Dialog>
    </div>
  )
}

function CreateJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const createJd = useCreateJd()
  const createJdFromFile = useCreateJdFromFile()

  const [mode, setMode] = useState<'manual' | 'file'>('manual')
  const [title, setTitle] = useState('')
  const [jdText, setJdText] = useState('')
  const [mustHave, setMustHave] = useState('')
  const [minExp, setMinExp] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTitle('')
    setJdText('')
    setMustHave('')
    setMinExp(0)
    setFile(null)
    setMode('manual')
  }

  async function submitManual(e: FormEvent) {
    e.preventDefault()
    if (!title || !jdText) {
      toast.show('Title and description are required.', 'error')
      return
    }
    try {
      await createJd.mutateAsync({ title, jd_text: jdText, must_have_skills: mustHave, min_experience: minExp })
      toast.show(`Job opening '${title}' created.`, 'success')
      reset()
      onClose()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  async function submitFile() {
    if (!file) {
      toast.show('Upload a file first.', 'error')
      return
    }
    try {
      const parsed = await createJdFromFile.mutateAsync(file)
      toast.show(
        `Job opening '${parsed.title}' created. Auto-detected skills: ${parsed.must_have_skills || '(none detected)'}`,
        'success',
      )
      reset()
      onClose()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  const loading = createJd.isPending || createJdFromFile.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="New job opening" size="lg">
      <div className="mb-4 flex rounded-md border border-border bg-surface-sunken p-0.5">
        {(
          [
            ['manual', 'Type manually'],
            ['file', 'Upload PDF/DOCX'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`flex-1 rounded-[5px] py-1.5 text-[12.5px] font-semibold transition-colors ${
              mode === value ? 'bg-surface text-text shadow-xs' : 'text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'manual' ? (
        <form onSubmit={submitManual} className="space-y-3.5">
          <Input label="Job title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            label="Job description"
            required
            rows={4}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
          <Input
            label="Must-have skills"
            hint="Comma-separated"
            value={mustHave}
            onChange={(e) => setMustHave(e.target.value)}
          />
          <Input
            label="Minimum experience (years)"
            type="number"
            min={0}
            step={0.5}
            value={minExp}
            onChange={(e) => setMinExp(Number(e.target.value))}
          />
          <Button type="submit" loading={loading} className="w-full">
            Create job opening
          </Button>
        </form>
      ) : (
        <div className="space-y-3.5">
          <label
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface-sunken px-3 py-8 text-center transition-colors hover:border-accent hover:bg-accent-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <FileUp className="mb-1.5 h-5 w-5 text-text-tertiary" />
            <span className="text-[13px] font-medium text-text-secondary">
              {file ? file.name : 'Upload the job description file'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button loading={loading} onClick={submitFile} className="w-full">
            Create job opening from file
          </Button>
        </div>
      )}
    </Dialog>
  )
}
