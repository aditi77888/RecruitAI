import { useMemo, useState } from 'react'
import { ChevronDown, MessagesSquare } from 'lucide-react'

import { cn } from '../../core/cn'
import { parseTranscriptTurns } from '../../core/transcript-parser'

export function TranscriptViewer({ transcript }: { transcript: string | null }) {
  const [open, setOpen] = useState(false)
  const turns = useMemo(() => (transcript ? parseTranscriptTurns(transcript) : null), [transcript])

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 bg-surface-sunken px-3.5 py-2.5 text-left transition-colors hover:bg-surface-hover"
      >
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-text">
          <MessagesSquare className="h-3.5 w-3.5 text-text-tertiary" />
          Interview transcript
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="max-h-96 overflow-y-auto border-t border-border bg-surface p-3.5">
          {!transcript ? (
            <p className="text-[12.5px] text-text-tertiary">No transcript was captured for this interview.</p>
          ) : turns ? (
            <div className="space-y-2">
              {turns.map((turn, i) => (
                <div key={i} className={`flex ${turn.speaker === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-1.5 text-[12px] leading-relaxed',
                      turn.speaker === 'candidate'
                        ? 'bg-accent text-white'
                        : turn.speaker === 'agent'
                          ? 'bg-surface-sunken text-text'
                          : 'bg-surface-sunken text-text-secondary',
                    )}
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
            <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-text-secondary">{transcript}</pre>
          )}
        </div>
      )}
    </div>
  )
}
