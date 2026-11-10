import { describe, expect, it } from 'vitest'
import { applyAction, seedLedger, summarize, type Entry } from './model'
import { dayMs, timeline } from './timeline'

const TODAY = '2026-11-10'
const month = (t: number | null) => (t === null ? null : new Date(t).toISOString().slice(0, 7))
const paid = (id: string, amount: number, date: string): Entry => ({ id, who: 'others', amount, date })

describe('timeline from the notes', () => {
  const tl = timeline(seedLedger(), TODAY)

  it('starts at the machine’s cost in September 2025 and is at today’s figure now', () => {
    expect(tl.actual[0]).toEqual({ t: dayMs('2025-09-01'), left: 1432 })
    expect(tl.actual.at(-1)).toEqual({ t: dayMs(TODAY), left: 1023 })
  })

  it('spreads the undated notes evenly over the months before the app', () => {
    const halfway = (dayMs('2025-09-01') + dayMs(TODAY)) / 2
    const ledger = seedLedger()
    const tlMid = timeline(ledger, TODAY)
    // Only the two endpoints exist for the notes; the line between them is straight.
    expect(tlMid.actual.map((p) => p.t)).toEqual([dayMs('2025-09-01'), dayMs(TODAY)])
    const [a, b] = tlMid.actual
    const mid = a.left + ((halfway - a.t) / (b.t - a.t)) * (b.left - a.left)
    expect(mid).toBeCloseTo(1432 - 409 / 2, 6)
  })

  it('works out the monthly pace since September 2025', () => {
    // 120.4 sharpenings over 435 days
    expect(tl.perMonth).toBeCloseTo((120.4 / 435) * (365.25 / 12), 6)
  })

  it('estimates payoff around November 2029', () => {
    expect(month(tl.payoff)).toBe('2029-11')
    expect(tl.projected[0]).toEqual({ t: dayMs(TODAY), left: 1023 })
    expect(tl.projected.at(-1)?.left).toBe(0)
  })

  it('steps up once for each ring still to buy', () => {
    const rises = tl.projected
      .slice(1)
      .map((p, i) => ({ p, prev: tl.projected[i] }))
      .filter(({ p, prev }) => p.t === prev.t && p.left > prev.left)
    expect(rises).toHaveLength(5)
    rises.forEach(({ p, prev }) => expect(p.left - prev.left).toBeCloseTo(127, 6))
  })
})

describe('timeline with dated entries', () => {
  it('puts a dated entry on its day as a step down', () => {
    const ledger = applyAction(seedLedger(), { type: 'add', ringId: 'ring-3', entry: paid('a', 20, '2026-12-05') })
    const tl = timeline(ledger, '2026-12-10')
    const onDay = tl.actual.filter((p) => p.t === dayMs('2026-12-05'))
    expect(onDay.map((p) => p.left)).toEqual([1023, 1003])
    expect(tl.actual.at(-1)?.left).toBe(summarize(ledger).toGo)
  })

  it('puts a new ring on its day as a step up', () => {
    const ledger = applyAction(seedLedger(), { type: 'newRing', id: 'r4', cost: 127, date: '2027-01-15' })
    const tl = timeline(ledger, '2027-02-01')
    expect(tl.actual.filter((p) => p.t === dayMs('2027-01-15')).map((p) => p.left)).toEqual([1023, 1150])
  })

  it('counts this month’s dated sharpenings', () => {
    let ledger = seedLedger()
    ledger = applyAction(ledger, { type: 'add', ringId: 'ring-3', entry: paid('a', 10, '2026-11-10') })
    ledger = applyAction(ledger, { type: 'add', ringId: 'ring-3', entry: { id: 'b', who: 'me', uses: 3, date: '2026-11-12' } })
    ledger = applyAction(ledger, { type: 'add', ringId: 'ring-3', entry: { id: 'c', who: 'free', uses: 1, date: '2026-10-30' } })
    expect(timeline(ledger, '2026-11-20').thisMonth).toBe(5)
  })

  it('a faster pace brings the payoff date closer', () => {
    let busy = seedLedger()
    for (let i = 0; i < 40; i++) busy = applyAction(busy, { type: 'add', ringId: 'ring-3', entry: paid(`p${i}`, 5, '2026-11-15') })
    expect(timeline(busy, '2026-11-30').payoff!).toBeLessThan(timeline(seedLedger(), '2026-11-30').payoff!)
  })
})

describe('timeline edge cases', () => {
  it('has no estimate once paid off', () => {
    const tl = timeline({ ...seedLedger(), unitCost: 0 }, TODAY)
    expect(tl.paidOff).toBe(true)
    expect(tl.projected).toEqual([])
    expect(tl.payoff).toBeNull()
  })

  it('has no estimate when nothing has been logged yet', () => {
    const empty = { ...seedLedger(), rings: [{ id: 'ring-1', cost: 0, date: null, entries: [] }] }
    const tl = timeline(empty, TODAY)
    expect(tl.perMonth).toBe(0)
    expect(tl.payoff).toBeNull()
  })

  it('keeps an entry dated before the machine inside the chart', () => {
    const ledger = applyAction(seedLedger(), { type: 'add', ringId: 'ring-1', entry: paid('old', 5, '2024-01-01') })
    expect(timeline(ledger, TODAY).actual[0].t).toBe(dayMs('2025-09-01'))
  })
})
