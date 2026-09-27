const PALETTE = ['#3158D4', '#178A5B', '#B7791F', '#8A4FC2', '#C24141', '#1B7F8E']

function colorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function Avatar({ name, size = 32 }: { name: string | null | undefined; size?: number }) {
  const bg = colorFor(name || '?')
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ height: size, width: size, background: bg, fontSize: Math.max(10, size * 0.36) }}
    >
      {initials(name)}
    </div>
  )
}
