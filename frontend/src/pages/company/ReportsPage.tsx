import { useEffect, useMemo, useState } from 'react'

import { Badge } from '../../components/kit/Badge'
import { Card, CardHeader } from '../../components/kit/Card'
import { EmptyState } from '../../components/kit/EmptyState'
import { PageHeader } from '../../components/kit/PageHeader'
import { ScoreRing } from '../../components/kit/ScoreRing'
import { PageSpinner } from '../../components/kit/Spinner'
import { extractErrorMessage, reportsApi } from '../../core/api'
import { useToast } from '../../core/toast'
import type { ReportGroup, ReportRow } from '../../core/types'

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

// The evaluator prompt asks the LLM for 2-3 sentence prose, not bullet
// points -- split it into sentences so it reads as a scannable checklist
// instead of a wall of text.
function splitSentences(text: string | null): string[] {
  if (!text) return []
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------- Transcript

type TranscriptTurn = { speaker: 'agent' | 'candidate' | 'other'; text: string }

const AGENT_PREFIX_RE = /^(agent|ai|assistant|interviewer|bot|recruiter)\s*[:\-]\s*/i
const CANDIDATE_PREFIX_RE = /^(candidate|user|applicant|you|caller)\s*[:\-]\s*/i

// Best-effort: the transcript is whatever raw text Dograh's transcript_url
// returned (see phase4_postcall/webhook_server.py's _fetch_transcript), so
// its exact format isn't guaranteed. If most lines carry a recognizable
// speaker label, render it as a structured back-and-forth; otherwise fall
// back to plain text rather than mis-attributing lines.
function parseTranscriptTurns(raw: string): TranscriptTurn[] | null {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return null

  const turns: TranscriptTurn[] = []
  let matched = 0
  for (const line of lines) {
    const agentMatch = line.match(AGENT_PREFIX_RE)
    const candidateMatch = line.match(CANDIDATE_PREFIX_RE)
    if (agentMatch) {
      matched++
      turns.push({ speaker: 'agent', text: line.slice(agentMatch[0].length).trim() })
    } else if (candidateMatch) {
      matched++
      turns.push({ speaker: 'candidate', text: line.slice(candidateMatch[0].length).trim() })
    } else if (turns.length > 0) {
      turns[turns.length - 1].text += ' ' + line
    } else {
      turns.push({ speaker: 'other', text: line })
    }
  }
  return matched >= Math.max(2, lines.length * 0.4) ? turns : null
}

function TranscriptView({ transcript }: { transcript: string | null }) {
  const [open, setOpen] = useState(false)
  const turns = useMemo(() => (transcript ? parseTranscriptTurns(transcript) : null), [transcript])

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 bg-slate-50 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-100"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <TranscriptIcon className="h-4 w-4 text-slate-400" />
          Full interview transcript
        </span>
        <ChevronIcon className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="max-h-96 overflow-y-auto border-t border-slate-200 bg-white p-3.5">
          {!transcript ? (
            <p className="text-sm text-slate-400">No transcript was captured for this interview.</p>
          ) : turns ? (
            <div className="space-y-2.5">
              {turns.map((turn, i) => (
                <div key={i} className={`flex ${turn.speaker === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      turn.speaker === 'candidate'
                        ? 'bg-brand-500 text-white'
                        : turn.speaker === 'agent'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-slate-50 text-slate-500'
                    }`}
                  >
                    {turn.speaker !== 'other' && (
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {turn.speaker === 'candidate' ? 'Candidate' : 'Interviewer'}
                      </span>
                    )}
                    {turn.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{transcript}</pre>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Page

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
        description="Post-call evaluation outcomes, one section per job opening. Expand a candidate to see the full breakdown and transcript."
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
  const selectedCount = group.rows.filter((r) => r.selected === 'Yes').length
  const scored = group.rows.filter((r) => r.score != null)
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length) : null

  return (
    <Card>
      <CardHeader
        icon={<ClipboardIcon className="h-4.5 w-4.5" />}
        title={`${group.jd_title} candidates`}
        subtitle={`${group.rows.length} evaluated · ${selectedCount} selected${avgScore != null ? ` · avg score ${avgScore}` : ''}`}
      />
      <div className="space-y-3">
        {group.rows.map((row) => (
          <CandidateReportCard key={row.candidate_id} row={row} />
        ))}
      </div>
    </Card>
  )
}

function CandidateReportCard({ row }: { row: ReportRow }) {
  const [open, setOpen] = useState(false)
  const selected = row.selected === 'Yes'
  const strengths = splitSentences(row.strengths)
  const weaknesses = splitSentences(row.weaknesses)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 transition-shadow duration-150 hover:shadow-soft">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
            {initials(row.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{row.name || 'Unnamed candidate'}</p>
            <p className="truncate text-xs text-slate-400">{row.candidate_id}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge tone={selected ? 'emerald' : 'rose'}>
            <span className="flex items-center gap-1">
              {selected ? <CheckIcon className="h-3 w-3" /> : <CrossIcon className="h-3 w-3" />}
              {row.selected}
            </span>
          </Badge>
          {row.score != null && <ScoreRing score={row.score} size={40} />}
          <ChevronIcon className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4">
          <div className={`rounded-xl px-3.5 py-2.5 text-sm ${selected ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
            <span className="font-semibold">AI verdict.</span> {row.evaluation_summary || '—'}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SentenceList label="Strengths" tone="emerald" items={strengths} />
            <SentenceList label="Weaknesses" tone="rose" items={weaknesses} />
          </div>

          <TranscriptView transcript={row.transcript} />
        </div>
      )}
    </div>
  )
}

function SentenceList({ label, tone, items }: { label: string; tone: 'emerald' | 'rose'; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {items.length === 0 ? (
        <p className="mt-1.5 text-sm text-slate-400">—</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
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

function TranscriptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 10h8M8 14h5" strokeLinecap="round" />
      <path
        d="M21 12c0 4.4-4 8-9 8-1.1 0-2.2-.2-3.2-.5L4 21l1.3-3.9C4.5 15.7 3 13.9 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
