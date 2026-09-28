// Ported from the old frontend's ReportsPage.tsx verbatim. The transcript is
// whatever raw text Dograh's transcript_url returned (see
// phase4_postcall/webhook_server.py's _fetch_transcript), so its exact
// format isn't guaranteed. If most lines carry a recognizable speaker
// label, render it as a structured back-and-forth; otherwise fall back to
// plain text rather than mis-attributing lines.

export type TranscriptTurn = { speaker: 'agent' | 'candidate' | 'other'; text: string }

const AGENT_PREFIX_RE = /^(agent|ai|assistant|interviewer|bot|recruiter)\s*[:\-]\s*/i
const CANDIDATE_PREFIX_RE = /^(candidate|user|applicant|you|caller)\s*[:\-]\s*/i

export function parseTranscriptTurns(raw: string): TranscriptTurn[] | null {
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

// Ported from ReportsPage.tsx: the evaluator prompt asks the LLM for 2-3
// sentence prose, not bullet points -- split it into sentences so it reads
// as a scannable checklist instead of a wall of text.
export function splitSentences(text: string | null): string[] {
  if (!text) return []
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean)
}
