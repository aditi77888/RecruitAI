import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { AlertCircle, CheckCircle2, File as FileIcon, RotateCcw, UploadCloud, X } from 'lucide-react'

import { Button } from '../kit/Button'
import { ProgressBar } from '../kit/ProgressBar'
import { useUploadResumes } from '../../hooks/useJds'
import { extractErrorMessage } from '../../core/api-client'
import { formatFileSize } from '../../core/format'
import { useToast } from '../../core/toast-context'
import type { ShortlistResult } from '../../core/types'

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

function fileSignature(f: File): string {
  return `${f.name}:${f.size}`
}

export function ResumeUploadPanel({ jdId, jdTitle }: { jdId: string; jdTitle: string }) {
  const toast = useToast()
  const upload = useUploadResumes()
  const inputRef = useRef<HTMLInputElement>(null)

  // Resumes are de-duplicated by the backend per JD (same file content is
  // never re-evaluated twice -- see phase0/checkpoint.py's load_done_hashes),
  // but that response has no per-file breakdown to reflect back to the
  // user. What we CAN detect reliably client-side is "you just tried to
  // queue or submit this exact file again in this browser tab" -- so this
  // set tracks every file (by name+size) successfully submitted for this
  // job in this session, and blocks re-queueing it with a clear message
  // instead of silently sending a request we already know is redundant.
  const submittedRef = useRef<Set<string>>(new Set())

  const [files, setFiles] = useState<File[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ShortlistResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Pure -- computes the next queue plus what got skipped and why. Kept
  // separate from setFiles so the (impure) toast calls never live inside a
  // setState updater, which React may invoke more than once per commit
  // (e.g. Strict Mode) and did visibly double-fire the toasts here before.
  function planAddFiles(current: File[], incoming: File[]) {
    const existing = new Set(current.map(fileSignature))
    const merged = [...current]
    const skippedQueued: string[] = []
    const skippedSubmitted: string[] = []

    for (const f of incoming) {
      const key = fileSignature(f)
      if (submittedRef.current.has(key)) {
        skippedSubmitted.push(f.name)
        continue
      }
      if (existing.has(key)) {
        skippedQueued.push(f.name)
        continue
      }
      existing.add(key)
      merged.push(f)
    }
    return { merged, skippedQueued, skippedSubmitted }
  }

  function addFiles(incoming: File[]) {
    const { merged, skippedQueued, skippedSubmitted } = planAddFiles(files, incoming)
    setFiles(merged)

    if (skippedSubmitted.length > 0) {
      toast.show(
        skippedSubmitted.length === 1
          ? `${skippedSubmitted[0]} was already uploaded for this job — skipping.`
          : `${skippedSubmitted.length} resumes were already uploaded for this job — skipping.`,
        'info',
      )
    }
    if (skippedQueued.length > 0) {
      toast.show(
        skippedQueued.length === 1
          ? `${skippedQueued[0]} is already in the queue — skipping.`
          : `${skippedQueued.length} resumes are already in the queue — skipping.`,
        'info',
      )
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    const dropped = Array.from(e.dataTransfer.files).filter((f) => /\.(pdf|docx)$/i.test(f.name))
    if (dropped.length === 0) {
      toast.show('Only PDF and DOCX resumes are supported.', 'error')
      return
    }
    addFiles(dropped)
  }

  async function submit() {
    if (files.length === 0) {
      toast.show('Add at least one resume first.', 'error')
      return
    }
    setPhase('uploading')
    setProgress(0)
    setErrorMessage(null)
    try {
      const res = await upload.mutateAsync({
        jdId,
        files,
        onProgress: (pct) => {
          setProgress(pct)
          if (pct >= 100) setPhase('processing')
        },
      })
      for (const f of files) submittedRef.current.add(fileSignature(f))
      setResult(res)
      setPhase('done')
      toast.show(
        `Upload complete — ${res.evaluated} evaluated, ${res.shortlisted} shortlisted for "${jdTitle}".`,
        'success',
      )
      if (res.errors.length > 0) {
        toast.show(`${res.errors.length} resume(s) failed to evaluate.`, 'error')
      }
    } catch (err) {
      const message = extractErrorMessage(err)
      setErrorMessage(message)
      setPhase('error')
      toast.show(`Upload failed: ${message}`, 'error')
    }
  }

  function reset() {
    setFiles([])
    setPhase('idle')
    setProgress(0)
    setResult(null)
    setErrorMessage(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (phase === 'done' && result) {
    return (
      <div className="animate-rise-in">
        <div className="mb-4 flex items-center gap-2.5 rounded-md border border-success/25 bg-success-soft px-3.5 py-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <p className="text-[13px] text-text">
            Screened <strong>{result.total_resumes}</strong> resume(s) — <strong>{result.passed_embedding_filter}</strong>{' '}
            passed the initial screen. This job now has <strong>{result.evaluated}</strong> evaluated in total:{' '}
            <strong>{result.shortlisted}</strong> shortlisted, <strong>{result.ready_to_call}</strong> call-ready.
          </p>
        </div>
        {result.errors.length > 0 && (
          <div className="mb-4 rounded-md border border-warning/25 bg-warning-soft px-3.5 py-3 text-[13px] text-text">
            {result.errors.length} resume(s) failed to evaluate and were skipped.
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={reset}>
          Upload more resumes
        </Button>
      </div>
    )
  }

  if (phase === 'uploading' || phase === 'processing') {
    return (
      <div className="animate-rise-in rounded-md border border-border bg-surface-hover px-4 py-4">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[13px] font-medium text-text">
            {phase === 'uploading' ? `Uploading ${files.length} resume(s)...` : 'Screening in progress...'}
          </p>
          {phase === 'uploading' && (
            <span className="text-[12px] tabular-nums text-text-tertiary">{progress}%</span>
          )}
        </div>
        <ProgressBar value={phase === 'uploading' ? progress : 100} />
        <p className="mt-2.5 text-[12px] leading-relaxed text-text-secondary">
          {phase === 'processing'
            ? `Extracting text, filtering, and running AI evaluation against "${jdTitle}". Larger batches can take a few minutes — this page will update automatically when it's done.`
            : 'Sending files to the server.'}
        </p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="animate-rise-in rounded-md border border-danger/25 bg-danger-soft px-4 py-4">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-[13px] font-medium text-text">Screening failed to complete</p>
            <p className="mt-0.5 text-[12.5px] text-text-secondary">{errorMessage}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="mt-3" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={submit}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
          dragActive ? 'border-accent bg-accent-soft/50' : 'border-border bg-surface-hover'
        }`}
      >
        <UploadCloud className="mb-2 h-5 w-5 text-text-tertiary" />
        <p className="text-[13px] font-medium text-text">Drag and drop resumes here</p>
        <p className="mt-0.5 text-[12px] text-text-tertiary">PDF or DOCX &middot; or</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-2 text-[12.5px] font-semibold text-accent hover:text-accent-hover"
        >
          browse files
        </button>
        <input
          ref={inputRef}
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

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((file, i) => (
            <div
              key={`${file.name}:${file.size}:${i}`}
              className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2"
            >
              <FileIcon className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-text" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[11px] text-text-tertiary">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="shrink-0 rounded-full p-1 text-text-tertiary hover:bg-surface-sunken hover:text-text"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button size="sm" className="mt-1 w-full" onClick={submit}>
            Screen {files.length} resume{files.length === 1 ? '' : 's'}
          </Button>
        </div>
      )}
    </div>
  )
}
