import { entryValue, payoffPath, summarize, type Ledger } from './model'

// What's still owed over time: what happened so far, and an estimate of when it
// reaches $0 at the average monthly pace. Every dated entry and ring lands on
// its day. Entries without dates came from the notes, so they're spread evenly
// over the months between buying the machine and the app going live.

/** Had the machine since September 2025 (day unknown, so the 1st). */
export const OWNED_SINCE = '2025-09-01'
/** The app went live this day; anything without a date happened before it. */
export const NOTES_UNTIL = '2026-11-10'

const DAY = 86_400_000
const MONTH_DAYS = 365.25 / 12

export const dayMs = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export interface Point {
  /** UTC midnight, ms */
  t: number
  /** Dollars still to pay off; negative once ahead. */
  left: number
}

export interface Timeline {
  start: number
  today: number
  actual: Point[]
  /** Starts at today's point; empty when paid off or it can't be estimated. */
  projected: Point[]
  /** When it's estimated to hit $0. */
  payoff: number | null
  paidOff: boolean
  perMonth: number
  thisMonth: number
}

export function timeline(ledger: Ledger, today: string): Timeline {
  const totals = summarize(ledger)
  const start = dayMs(OWNED_SINCE)
  const now = Math.max(dayMs(today), start + DAY)
  const notesEnd = Math.min(Math.max(dayMs(NOTES_UNTIL), start + DAY), now)
  const when = (iso: string) => Math.min(Math.max(dayMs(iso), start), now)

  let base = ledger.unitCost
  let spread = 0
  const events: { t: number; change: number }[] = []
  const month = today.slice(0, 7)
  let thisMonth = 0

  ledger.rings.forEach((ring, i) => {
    if (ring.date) events.push({ t: when(ring.date), change: ring.cost })
    else if (i === 0) base += ring.cost // came with the machine
    else spread += ring.cost
    for (const e of ring.entries) {
      const value = entryValue(e, ledger)
      if (e.date) events.push({ t: when(e.date), change: -value })
      else spread -= value
      if (e.date?.startsWith(month)) thisMonth += e.who === 'others' ? e.amount / ledger.pricePerUse : e.uses
    }
  })

  const leftAt = (t: number, includingDay: boolean) => {
    const share = Math.min(1, Math.max(0, (t - start) / (notesEnd - start)))
    return events.reduce((sum, e) => ((includingDay ? e.t <= t : e.t < t) ? sum + e.change : sum), base + spread * share)
  }

  const times = [...new Set([start, notesEnd, now, ...events.map((e) => e.t)])].sort((a, b) => a - b)
  const actual: Point[] = []
  for (const t of times) {
    // A day with entries or a ring is a step: what was owed before it, then after.
    if (events.some((e) => e.t === t)) actual.push({ t, left: leftAt(t, false) })
    actual.push({ t, left: leftAt(t, true) })
  }

  const perDay = totals.uses / ((now - start) / DAY)
  const paidOff = totals.toGo <= 0
  const path = paidOff ? null : payoffPath(ledger)
  const projected = path && perDay > 0 ? path.points.map((p) => ({ t: now + (p.uses / perDay) * DAY, left: p.left })) : []

  return {
    start,
    today: now,
    actual,
    projected,
    payoff: projected.length ? projected[projected.length - 1].t : null,
    paidOff,
    perMonth: perDay * MONTH_DAYS,
    thisMonth,
  }
}
