// Copper Cup scoring: each Copper Cup event has its own rule (a point per
// right answer, 5 for landing in the hoop, …), so the admin types each
// person's points for the event and the cup is the running total.

const MAX_POINTS = 1000

/** One person's points for an event: blank = didn't score, else a number ≥ 0. Throws a readable error. */
export function parseCopperPoints(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) throw new Error(`“${s}” isn’t a number of points`)
  if (n > MAX_POINTS) throw new Error(`${s} points is more than ${MAX_POINTS}: typo?`)
  return Math.round(n * 100) / 100
}

export function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
