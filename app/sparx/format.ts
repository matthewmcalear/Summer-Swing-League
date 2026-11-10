export function usd(n: number) {
  const v = Math.round(n * 100) / 100
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`
}

/** "Nov 2029", from a UTC-midnight timestamp. */
export const monthLabel = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "Nov 10, 2026", from a UTC-midnight timestamp. */
export const dayLabel = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
