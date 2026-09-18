import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { Badge } from '../../components/kit/Badge'
import { Button } from '../../components/kit/Button'
import { Card } from '../../components/kit/Card'
import { EmptyState } from '../../components/kit/EmptyState'
import { Input, Textarea } from '../../components/kit/Input'
import { Modal } from '../../components/kit/Modal'
import { PageSpinner, Spinner } from '../../components/kit/Spinner'
import { ProgressBar } from '../../components/kit/ProgressBar'
import { extractErrorMessage, jdApi } from '../../core/api'
import { useToast } from '../../core/toast'
import type { JD } from '../../core/types'

export default function DashboardPage() {
  const toast = useToast()
  const [jds, setJds] = useState<JD[] | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<JD | null>(null)

  async function refresh() {
    try {
      setJds(await jdApi.list())
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDelete() {
    if (!pendingDelete) return
    try {
      await jdApi.remove(pendingDelete.jd_id)
      toast.show(`'${pendingDelete.title}' deleted.`, 'success')
      setPendingDelete(null)
      refresh()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload resumes against a job opening. Shortlisting runs automatically from here.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<PlusIcon className="h-4 w-4" />}>
          New job opening
        </Button>
      </div>

      {jds === null ? (
        <PageSpinner />
      ) : jds.length === 0 ? (
        <EmptyState
          icon={<BriefcaseIcon className="h-5 w-5" />}
          title="No job openings yet"
          description="Create your first job opening to start collecting and shortlisting resumes."
          action={<Button onClick={() => setShowCreate(true)}>Create a job opening</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {jds.map((jd) => (
            <JDCard key={jd.jd_id} jd={jd} onChanged={refresh} onDelete={() => setPendingDelete(jd)} />
          ))}
        </div>
      )}

      <CreateJDModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={refresh} />

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete job opening">
        <p>
          Delete <span className="font-semibold text-slate-900">{pendingDelete?.title}</span>? This also deletes
          every shortlisted candidate and evaluation under it. This cannot be undone.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Yes, delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function JDCard({ jd, onChanged, onDelete }: { jd: JD; onChanged: () => void; onDelete: () => void }) {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addMoreRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [sendingLinks, setSendingLinks] = useState(false)

  function addFiles(files: File[]) {
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}:${f.size}`))
      const merged = [...prev]
      for (const f of files) {
        const key = `${f.name}:${f.size}`
        if (!existing.has(key)) {
          existing.add(key)
          merged.push(f)
        }
      }
      return merged
    })
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function submitResumes() {
    if (selectedFiles.length === 0) {
      toast.show('Upload at least one resume first.', 'error')
      return
    }
    setBusy(true)
    try {
      const result = await jdApi.uploadResumes(jd.jd_id, selectedFiles)
      toast.show(
        `Evaluated ${result.evaluated} resume(s): ${result.shortlisted} shortlisted, ${result.ready_to_call} call-ready.`,
        'success',
      )
      if (result.errors.length > 0) {
        toast.show(`${result.errors.length} resume(s) failed to evaluate.`, 'error')
      }
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      onChanged()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function sendLinks() {
    setSendingLinks(true)
    try {
      const result = await jdApi.sendInterviewLinks(jd.jd_id)
      toast.show(
        `Interview links sent: ${result.sent} | skipped: ${result.skipped_no_email} | failed: ${result.failed}`,
        'info',
      )
      onChanged()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setSendingLinks(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{jd.title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{jd.total_candidates} total candidate(s)</p>
        </div>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          title="Delete this job opening"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {jd.must_have_skills && (
        <div className="mb-4 mt-2 flex flex-wrap gap-1.5">
          {jd.must_have_skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 6)
            .map((skill) => (
              <Badge key={skill} tone="indigo">
                {skill}
              </Badge>
            ))}
        </div>
      )}

      <div className="mt-auto space-y-4 pt-3">
        <ProgressBar value={jd.shortlisting_progress} label="Shortlisting status" />

        {selectedFiles.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {selectedFiles.map((file, i) => (
              <div
                key={`${file.name}:${file.size}:${i}`}
                className="flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5"
              >
                <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-700" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-400">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                  title="Remove file"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addMoreRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-600"
              title="Add more resumes"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
            <input
              ref={addMoreRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50">
            <UploadIcon className="mb-1.5 h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Upload resumes (PDF, DOCX)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
            />
          </label>
        )}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Spinner className="h-3.5 w-3.5" />
            <span>
              Extracting + evaluating {selectedFiles.length} resume(s) against {jd.title}...
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" loading={sendingLinks} onClick={sendLinks}>
            Send interview links
          </Button>
          <Button size="sm" loading={busy} onClick={submitResumes}>
            Send to shortlisting
          </Button>
        </div>
      </div>
    </Card>
  )
}

function CreateJDModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast()
  const [mode, setMode] = useState<'manual' | 'file'>('manual')
  const [title, setTitle] = useState('')
  const [jdText, setJdText] = useState('')
  const [mustHave, setMustHave] = useState('')
  const [minExp, setMinExp] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    try {
      await jdApi.create({ title, jd_text: jdText, must_have_skills: mustHave, min_experience: minExp })
      toast.show(`Job opening '${title}' created.`, 'success')
      reset()
      onClose()
      onCreated()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function submitFile() {
    if (!file) {
      toast.show('Upload a file first.', 'error')
      return
    }
    setLoading(true)
    try {
      const parsed = await jdApi.createFromFile(file)
      toast.show(
        `Job opening '${parsed.title}' created. Auto-detected skills: ${parsed.must_have_skills || '(none detected)'}`,
        'success',
      )
      reset()
      onClose()
      onCreated()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New job opening">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {(
          [
            ['manual', 'Type manually'],
            ['file', 'Upload PDF/DOCX'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`rounded-lg py-1.5 text-sm font-semibold transition-colors ${
              mode === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'manual' ? (
        <form onSubmit={submitManual} className="space-y-4">
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
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50">
            <UploadIcon className="mb-1.5 h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              {file ? file.name : 'Upload the job description file'}
            </span>
            <input
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
    </Modal>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a2 2 0 0 1-2 1.9H9.7a2 2 0 0 1-2-1.9L7 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
