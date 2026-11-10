// Sparx tracker (/sparx): is the sharpening machine paid off yet?
//
// Spent = the machine + every replacement ring.
// Back  = cash from other people + what your own sharpenings saved you.
//
// Your own use is stored as a count, not dollars, so changing what one is worth
// (savingPerOwnUse) re-values all of history. It's the full shop price: ring
// wear is already in "spent", so taking it off here would count it twice.
//
// Everything here is pure, so the server and the phone run the same code.

interface EntryBase {
  id: string
  /** YYYY-MM-DD. Null for entries carried over from the notes, which had no dates. */
  date: string | null
}
export interface PaidEntry extends EntryBase {
  who: 'others'
  amount: number
}
export interface OwnEntry extends EntryBase {
  who: 'me'
  uses: number
}
/** Given away: wears the ring, brings in nothing. */
export interface FreeEntry extends EntryBase {
  who: 'free'
  uses: number
}
export type Entry = PaidEntry | OwnEntry | FreeEntry

export interface Ring {
  id: string
  /** Zero for the ring that came with the machine. */
  cost: number
  date: string | null
  entries: Entry[]
}

export interface Ledger {
  unitCost: number
  pricePerUse: number
  usesPerRing: number
  savingPerOwnUse: number
  /** Oldest first; the last one is the ring on the machine now. */
  rings: Ring[]
  /** Set once the free sharpenings from the notes are in, so they're only ever added once. */
  freeFromNotes?: boolean
}

/** Starting data, from the notes. The own-use dollars there were $5 each: $55, $40, $35 → 11, 8, 7. */
export function seedLedger(): Ledger {
  const paid = (id: string, amount: number): Entry => ({ id, who: 'others', amount, date: null })
  const own = (id: string, uses: number): Entry => ({ id, who: 'me', uses, date: null })
  return withFreeFromNotes({
    unitCost: 1432,
    pricePerUse: 5,
    usesPerRing: 60,
    savingPerOwnUse: 10,
    rings: [
      { id: 'ring-1', cost: 0, date: null, entries: [paid('note-1', 67), own('note-2', 11), paid('note-3', 110)] },
      { id: 'ring-2', cost: 121, date: null, entries: [paid('note-4', 160), own('note-5', 8)] },
      { id: 'ring-3', cost: 127, date: null, entries: [own('note-6', 7), paid('note-7', 60)] },
    ],
  })
}

/** Adds the free sharpenings from the notes to a ledger that doesn't have them yet. */
export function withFreeFromNotes(ledger: Ledger): Ledger {
  const fromNotes: [ringId: string, uses: number][] = [
    ['ring-1', 8],
    ['ring-2', 5],
    ['ring-3', 2],
  ]
  const next = fromNotes.reduce<Ledger>(
    (l, [ringId, uses], i) => applyAction(l, { type: 'add', ringId, entry: { id: `note-free-${i + 1}`, who: 'free', uses, date: null } }),
    ledger,
  )
  return { ...next, freeFromNotes: true }
}

// ── Numbers ──────────────────────────────────────────────────────────────────

export function entryValue(entry: Entry, ledger: Ledger) {
  if (entry.who === 'others') return entry.amount
  return entry.who === 'me' ? entry.uses * ledger.savingPerOwnUse : 0
}

export interface RingSummary {
  fromOthers: number
  ownUses: number
  freeUses: number
  saved: number
  value: number
  /** Paid sharpenings are estimated from the money ($67 at $5 ≈ 13.4), so this can be fractional. */
  uses: number
  cost: number
  net: number
}

export function summarizeRing(ring: Ring, ledger: Ledger): RingSummary {
  let fromOthers = 0
  let ownUses = 0
  let freeUses = 0
  for (const e of ring.entries) {
    if (e.who === 'others') fromOthers += e.amount
    else if (e.who === 'me') ownUses += e.uses
    else freeUses += e.uses
  }
  const saved = ownUses * ledger.savingPerOwnUse
  const value = fromOthers + saved
  const uses = fromOthers / ledger.pricePerUse + ownUses + freeUses
  return { fromOthers, ownUses, freeUses, saved, value, uses, cost: ring.cost, net: value - ring.cost }
}

export interface Totals {
  spent: number
  fromOthers: number
  ownUses: number
  freeUses: number
  saved: number
  value: number
  uses: number
  toGo: number
  /** Dollars past break-even; zero until then. */
  ahead: number
  /** 0–1 */
  paidOff: number
  /** Widths of the two parts of the progress bar, 0–1. */
  othersShare: number
  ownShare: number
}

export function summarize(ledger: Ledger): Totals {
  let spent = ledger.unitCost
  let fromOthers = 0
  let ownUses = 0
  let freeUses = 0
  let uses = 0
  for (const ring of ledger.rings) {
    const s = summarizeRing(ring, ledger)
    spent += s.cost
    fromOthers += s.fromOthers
    ownUses += s.ownUses
    freeUses += s.freeUses
    uses += s.uses
  }
  const saved = ownUses * ledger.savingPerOwnUse
  const value = fromOthers + saved
  const whole = Math.max(spent, value, 1)
  return {
    spent,
    fromOthers,
    ownUses,
    freeUses,
    saved,
    value,
    uses,
    toGo: Math.max(0, spent - value),
    ahead: Math.max(0, value - spent),
    paidOff: spent > 0 ? Math.min(1, value / spent) : 1,
    othersShare: fromOthers / whole,
    ownShare: saved / whole,
  }
}

export interface Forecast {
  uses: number
  newRings: number
}

export interface PayoffPath {
  /** Sharpenings from now, and what's still owed by then. A ring purchase is a step up at the same point. */
  points: { uses: number; left: number }[]
  newRings: number
}

/**
 * The way to break-even, at the paid/own/free mix so far. New rings have to be
 * bought along the way and each one pushes the goal out, so this walks ring by
 * ring. Null when a ring costs more than it brings in (never pays off).
 */
export function payoffPath(ledger: Ledger): PayoffPath | null {
  const totals = summarize(ledger)
  const points = [{ uses: 0, left: totals.toGo }]
  if (totals.toGo <= 0) return { points, newRings: 0 }

  const perUse = totals.uses > 0 ? totals.value / totals.uses : ledger.pricePerUse
  if (perUse <= 0) return null

  const current = ledger.rings[ledger.rings.length - 1]
  const left = Math.max(0, ledger.usesPerRing - summarizeRing(current, ledger).uses)
  if (totals.toGo <= left * perUse) {
    points.push({ uses: totals.toGo / perUse, left: 0 })
    return { points, newRings: 0 }
  }

  const ringCost = [...ledger.rings].reverse().find((r) => r.cost > 0)?.cost ?? 0
  const fullRing = ledger.usesPerRing * perUse
  if (fullRing <= ringCost) return null

  let owed = totals.toGo - left * perUse
  let uses = left
  let newRings = 0
  points.push({ uses, left: owed })
  while (owed > 0) {
    newRings++
    owed += ringCost
    points.push({ uses, left: owed })
    if (owed <= fullRing) {
      uses += owed / perUse
      owed = 0
    } else {
      owed -= fullRing
      uses += ledger.usesPerRing
    }
    points.push({ uses, left: owed })
  }
  return { points, newRings }
}

/** Sharpenings left until break-even, and how many rings that takes. */
export function forecast(ledger: Ledger): Forecast | null {
  const path = payoffPath(ledger)
  if (!path) return null
  return { uses: Math.ceil(path.points[path.points.length - 1].uses), newRings: path.newRings }
}

// ── Changes ──────────────────────────────────────────────────────────────────
// Each change is safe to send twice (ids make "add" a no-op the second time),
// so a phone can retry after a dropped connection without double-counting.

export type Action =
  | { type: 'add'; ringId: string; entry: Entry; at?: number }
  | { type: 'edit'; entry: Entry }
  | { type: 'remove'; id: string }
  | { type: 'newRing'; id: string; cost: number; date: string | null }
  | { type: 'editRing'; id: string; cost: number }
  | { type: 'removeRing'; id: string }
  | { type: 'setSaving'; amount: number }

const hasEntry = (ledger: Ledger, id: string) => ledger.rings.some((r) => r.entries.some((e) => e.id === id))

/** The next ledger, or the same object when the action changes nothing. */
export function applyAction(ledger: Ledger, action: Action): Ledger {
  switch (action.type) {
    case 'add': {
      if (hasEntry(ledger, action.entry.id)) return ledger
      // A ring removed on another device shouldn't lose the sharpening.
      const target = ledger.rings.find((r) => r.id === action.ringId) ?? ledger.rings[ledger.rings.length - 1]
      return {
        ...ledger,
        rings: ledger.rings.map((ring) => {
          if (ring !== target) return ring
          const entries = [...ring.entries]
          entries.splice(action.at ?? entries.length, 0, action.entry)
          return { ...ring, entries }
        }),
      }
    }
    case 'edit':
      if (!hasEntry(ledger, action.entry.id)) return ledger
      return {
        ...ledger,
        rings: ledger.rings.map((ring) => ({
          ...ring,
          entries: ring.entries.map((e) => (e.id === action.entry.id ? action.entry : e)),
        })),
      }
    case 'remove':
      if (!hasEntry(ledger, action.id)) return ledger
      return {
        ...ledger,
        rings: ledger.rings.map((ring) => ({ ...ring, entries: ring.entries.filter((e) => e.id !== action.id) })),
      }
    case 'newRing':
      if (ledger.rings.some((r) => r.id === action.id)) return ledger
      return { ...ledger, rings: [...ledger.rings, { id: action.id, cost: action.cost, date: action.date, entries: [] }] }
    case 'editRing':
      if (!ledger.rings.some((r) => r.id === action.id)) return ledger
      return { ...ledger, rings: ledger.rings.map((r) => (r.id === action.id ? { ...r, cost: action.cost } : r)) }
    case 'removeRing': {
      const ring = ledger.rings.find((r) => r.id === action.id)
      if (!ring || ring.entries.length > 0 || ledger.rings.length === 1) return ledger
      return { ...ledger, rings: ledger.rings.filter((r) => r !== ring) }
    }
    case 'setSaving':
      return ledger.savingPerOwnUse === action.amount ? ledger : { ...ledger, savingPerOwnUse: action.amount }
  }
}

// ── Validation (anything arriving from a request or a form) ──────────────────

const MAX_MONEY = 100_000
const MAX_USES = 1_000

const isId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,64}$/.test(v)

function money(v: unknown, min: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > MAX_MONEY) return null
  return Math.round(v * 100) / 100
}

function day(v: unknown): string | null | undefined {
  if (v === null) return null
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return undefined
  return v
}

export function parseEntry(v: unknown): Entry | null {
  const e = v as Record<string, unknown> | null
  if (!e || typeof e !== 'object' || !isId(e.id)) return null
  const date = day(e.date)
  if (date === undefined) return null
  if (e.who === 'others') {
    const amount = money(e.amount, 0.01)
    return amount === null ? null : { id: e.id, who: 'others', amount, date }
  }
  if (e.who === 'me' || e.who === 'free') {
    const uses = e.uses
    if (typeof uses !== 'number' || !Number.isInteger(uses) || uses < 1 || uses > MAX_USES) return null
    return { id: e.id, who: e.who, uses, date }
  }
  return null
}

export function parseAction(v: unknown): Action | null {
  const a = v as Record<string, unknown> | null
  if (!a || typeof a !== 'object') return null
  switch (a.type) {
    case 'add': {
      const entry = parseEntry(a.entry)
      if (!entry || !isId(a.ringId)) return null
      if (a.at === undefined) return { type: 'add', ringId: a.ringId, entry }
      if (typeof a.at !== 'number' || !Number.isInteger(a.at) || a.at < 0) return null
      return { type: 'add', ringId: a.ringId, entry, at: a.at }
    }
    case 'edit': {
      const entry = parseEntry(a.entry)
      return entry ? { type: 'edit', entry } : null
    }
    case 'remove':
      return isId(a.id) ? { type: 'remove', id: a.id } : null
    case 'newRing': {
      const cost = money(a.cost, 0)
      const date = day(a.date)
      return isId(a.id) && cost !== null && date !== undefined ? { type: 'newRing', id: a.id, cost, date } : null
    }
    case 'editRing': {
      const cost = money(a.cost, 0)
      return isId(a.id) && cost !== null ? { type: 'editRing', id: a.id, cost } : null
    }
    case 'removeRing':
      return isId(a.id) ? { type: 'removeRing', id: a.id } : null
    case 'setSaving': {
      const amount = money(a.amount, 0)
      return amount !== null ? { type: 'setSaving', amount } : null
    }
    default:
      return null
  }
}
