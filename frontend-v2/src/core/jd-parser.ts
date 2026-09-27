// Ported from the old frontend's PortalPage.tsx verbatim: the recruiter's
// raw JD text has no guaranteed structure (typed free-form or extracted
// from a PDF/DOCX by the LLM parser), so this heuristically splits it into
// headings/bullets/paragraphs for a readable view instead of dumping it as
// one pre-wrapped blob.

export type JdBlock = { kind: 'heading'; text: string } | { kind: 'list'; items: string[] } | { kind: 'paragraph'; text: string }

const BULLET_LINE_RE = /^\s*(?:[-*•▪●]|\d+[.)])\s+(.+)/
const HEADING_LINE_RE = /^[A-Za-z][A-Za-z0-9 /&'-]{2,60}:$/

export function parseJdBlocks(raw: string): JdBlock[] {
  const blocks: JdBlock[] = []
  let paragraphBuf: string[] = []
  let listBuf: string[] = []

  const flushParagraph = () => {
    if (paragraphBuf.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraphBuf.join(' ').trim() })
      paragraphBuf = []
    }
  }
  const flushList = () => {
    if (listBuf.length > 0) {
      blocks.push({ kind: 'list', items: listBuf })
      listBuf = []
    }
  }

  for (const rawLine of raw.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      continue
    }
    const bulletMatch = line.match(BULLET_LINE_RE)
    if (bulletMatch) {
      flushParagraph()
      listBuf.push(bulletMatch[1].trim())
      continue
    }
    flushList()
    if (HEADING_LINE_RE.test(line)) {
      flushParagraph()
      blocks.push({ kind: 'heading', text: line.replace(/:$/, '') })
      continue
    }
    paragraphBuf.push(line)
  }
  flushParagraph()
  flushList()
  return blocks
}

export function splitSkills(csv: string | null): string[] {
  return csv?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
}
