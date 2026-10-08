/**
 * Calendar-date helpers. Play dates are calendar days ("YYYY-MM-DD"), not instants,
 * so they must never round-trip through UTC: `new Date().toISOString()` is already
 * tomorrow after 8pm in Quebec, and `new Date('2026-10-08')` is Oct 7 there.
 */

/** Today as YYYY-MM-DD in the given clock's local timezone. Call it in the browser. */
export function localToday(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

/** Format a YYYY-MM-DD (or ISO timestamp) calendar date without a timezone shift. */
export function formatCalendarDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', opts)
}
