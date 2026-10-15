// Copper Cup scoring: points by finishing place in each Copper Cup event.
// The scale is the edition's list "10,8,6,…" — 1st place gets the first
// number, 2nd the second, and anyone placed beyond the list gets 0. People
// tied on a place each get that place's points.

export const DEFAULT_COPPER_SCALE = '10,8,6,5,4,3,2,1'

export function parseScale(raw: string): number[] | null {
  const parts = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (!parts.length || parts.length > 50) return null
  const nums = parts.map(Number)
  return nums.every((n) => Number.isFinite(n) && n >= 0) ? nums : null
}

export function pointsForPlace(scale: number[], place: number): number {
  if (!Number.isInteger(place) || place < 1) return 0
  return scale[place - 1] ?? 0
}

export function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
