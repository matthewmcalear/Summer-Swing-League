import { describe, expect, it } from 'vitest'
import { applyAction, forecast, parseAction, seedLedger, summarize, summarizeRing, type Action, type Entry } from './model'

const at = (saving: number) => ({ ...seedLedger(), savingPerOwnUse: saving })

describe('the numbers from the notes', () => {
  it('reproduces the notes when own use is worth $5', () => {
    const ledger = at(5)
    const [one, two, three] = ledger.rings.map((r) => summarizeRing(r, ledger))
    expect(one.value).toBe(232)
    expect(two.value).toBe(200)
    expect(two.net).toBe(79) // "Second ring -121$ (net $79)"
    expect(three.value).toBe(95)
    expect(summarize(ledger).value).toBe(527)
  })

  it('totals everything with own use at the $10 shop price', () => {
    const t = summarize(seedLedger())
    expect(t.spent).toBe(1680)
    expect(t.fromOthers).toBe(397)
    expect(t.ownUses).toBe(26)
    expect(t.saved).toBe(260)
    expect(t.value).toBe(657)
    expect(t.toGo).toBe(1023)
    expect(Math.floor(t.paidOff * 100)).toBe(39)
  })

  it('estimates uses per ring from the money', () => {
    const ledger = seedLedger()
    expect(ledger.rings.map((r) => Math.round(summarizeRing(r, ledger).uses))).toEqual([46, 40, 19])
  })
})

describe('forecast', () => {
  it('counts the rings that have to be bought along the way', () => {
    expect(forecast(seedLedger())).toEqual({ uses: 246, newRings: 4 })
  })

  it('needs no new ring when the current one covers it', () => {
    const ledger = { ...seedLedger(), unitCost: 1432 - 900 }
    expect(forecast(ledger)).toMatchObject({ newRings: 0 })
  })

  it('reports zero once paid off', () => {
    const ledger = { ...seedLedger(), unitCost: 0 }
    expect(forecast(ledger)).toEqual({ uses: 0, newRings: 0 })
    expect(summarize(ledger).ahead).toBeGreaterThan(0)
    expect(summarize(ledger).paidOff).toBe(1)
  })

  it('returns null when a ring costs more than it brings in', () => {
    const ledger = seedLedger()
    ledger.rings[2].cost = 100_000
    ledger.rings[2].entries = []
    expect(forecast({ ...ledger, unitCost: 1_000_000 })).toBeNull()
  })
})

describe('applyAction', () => {
  const paid: Entry = { id: 'a1', who: 'others', amount: 5, date: '2026-11-10' }
  const add: Action = { type: 'add', ringId: 'ring-3', entry: paid }

  it('adds to the given ring and does not double-count a retry', () => {
    const once = applyAction(seedLedger(), add)
    expect(once.rings[2].entries).toHaveLength(3)
    expect(applyAction(once, add)).toBe(once)
  })

  it('removes and restores an entry at its old position', () => {
    const ledger = seedLedger()
    const target = ledger.rings[0].entries[1]
    const removed = applyAction(ledger, { type: 'remove', id: target.id })
    expect(removed.rings[0].entries).toHaveLength(2)
    const back = applyAction(removed, { type: 'add', ringId: 'ring-1', entry: target, at: 1 })
    expect(back.rings[0].entries).toEqual(ledger.rings[0].entries)
  })

  it('keeps a sharpening whose ring has vanished', () => {
    const next = applyAction(seedLedger(), { ...add, ringId: 'gone' } as Action)
    expect(next.rings[2].entries).toContainEqual(paid)
  })

  it('re-values all history when the saving changes', () => {
    const next = applyAction(at(5), { type: 'setSaving', amount: 10 })
    expect(summarize(next).saved).toBe(260)
  })

  it('adds a new ring as the current one, and its cost to what was spent', () => {
    const next = applyAction(seedLedger(), { type: 'newRing', id: 'r4', cost: 127, date: '2026-11-10' })
    expect(next.rings.at(-1)?.id).toBe('r4')
    expect(summarize(next).spent).toBe(1807)
  })

  it('only removes an empty ring', () => {
    const ledger = applyAction(seedLedger(), { type: 'newRing', id: 'r4', cost: 127, date: null })
    expect(applyAction(ledger, { type: 'removeRing', id: 'ring-2' })).toBe(ledger)
    expect(applyAction(ledger, { type: 'removeRing', id: 'r4' }).rings).toHaveLength(3)
  })
})

describe('parseAction', () => {
  it('accepts a normal add and rounds to cents', () => {
    const action = parseAction({ type: 'add', ringId: 'r', entry: { id: 'x', who: 'others', amount: 5.555, date: null } })
    expect(action).toEqual({ type: 'add', ringId: 'r', entry: { id: 'x', who: 'others', amount: 5.56, date: null } })
  })

  it.each([
    [{ type: 'nope' }],
    [{ type: 'add', ringId: 'r', entry: { id: 'x', who: 'others', amount: 0, date: null } }],
    [{ type: 'add', ringId: 'r', entry: { id: 'x', who: 'others', amount: -5, date: null } }],
    [{ type: 'add', ringId: 'r', entry: { id: 'x', who: 'me', uses: 1.5, date: null } }],
    [{ type: 'add', ringId: 'r', entry: { id: 'x', who: 'me', uses: 1, date: 'yesterday' } }],
    [{ type: 'add', ringId: 'bad id!', entry: { id: 'x', who: 'me', uses: 1, date: null } }],
    [{ type: 'newRing', id: 'r', cost: Number.NaN, date: null }],
    [{ type: 'setSaving', amount: -1 }],
    [null],
    ['add'],
  ])('rejects %j', (bad) => {
    expect(parseAction(bad)).toBeNull()
  })
})
