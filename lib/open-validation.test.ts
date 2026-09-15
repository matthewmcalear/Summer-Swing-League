import { describe, expect, it } from 'vitest'
import { OpenError, applyOpenUpdate, parseOpenJoin, parseOpenUpdate } from './open-validation'
import type { MutableOpenPlayer } from './open-validation'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function card(overrides: Partial<MutableOpenPlayer> = {}): MutableOpenPlayer {
  return { scores: Array(18).fill(0), mode: 'normal', double_down: false, version: 3, started_at: null, back_started_at: null, ...overrides }
}

const front = [5, 4, 4, 5, 3, 4, 6, 4, 4]

describe('parseOpenUpdate', () => {
  it('parses a hole, a mode, a Double Down and a group update, each with its version', () => {
    expect(parseOpenUpdate({ version: 2, hole: 7, strokes: 5 })).toEqual({ version: 2, kind: 'hole', hole: 7, strokes: 5 })
    expect(parseOpenUpdate({ version: 0, hole: 18, strokes: null })).toEqual({ version: 0, kind: 'hole', hole: 18, strokes: null })
    expect(parseOpenUpdate({ version: 1, mode: 'god' })).toEqual({ version: 1, kind: 'mode', mode: 'god' })
    expect(parseOpenUpdate({ version: 1, doubleDown: true })).toEqual({ version: 1, kind: 'doubleDown', doubleDown: true })
    expect(parseOpenUpdate({ version: 4, groupId: uuid(7).toUpperCase() })).toEqual({ version: 4, kind: 'group', groupId: uuid(7) })
  })

  it.each([
    ['no version', { hole: 1, strokes: 4 }],
    ['a negative version', { version: -1, hole: 1, strokes: 4 }],
    ['a scoring code, which no longer exists', { version: 1, scoringCode: 'x', hole: 1, strokes: 4 }],
    ['two actions at once', { version: 1, hole: 1, strokes: 4, mode: 'hard' }],
    ['a group move mixed with a score', { version: 1, groupId: uuid(1), hole: 1, strokes: 4 }],
    ['hole 19', { version: 1, hole: 19, strokes: 4 }],
    ['21 strokes', { version: 1, hole: 1, strokes: 21 }],
    ['fractional strokes', { version: 1, hole: 1, strokes: 4.5 }],
    ['a mode outside the rules', { version: 1, mode: 'legend' }],
    ['a prototype key as a mode', { version: 1, mode: 'constructor' }],
    ['a non-boolean Double Down', { version: 1, doubleDown: 'yes' }],
    ['a malformed group id', { version: 1, groupId: 'group-1' }],
    ['a non-object body', null],
  ])('rejects %s', (_, body) => {
    let caught: unknown
    try { parseOpenUpdate(body) } catch (e) { caught = e }
    expect(caught).toBeInstanceOf(OpenError)
    expect((caught as OpenError).status).toBe(400)
  })
})

describe('parseOpenJoin', () => {
  it('accepts a member and group id and normalizes their case', () => {
    expect(parseOpenJoin({ memberId: uuid(5).toUpperCase(), groupId: uuid(6) })).toEqual({ memberId: uuid(5), groupId: uuid(6) })
  })

  it.each([
    ['a missing member', { groupId: uuid(6) }],
    ['a missing group', { memberId: uuid(5) }],
    ['extra fields', { memberId: uuid(5), groupId: uuid(6), handicap: 0 }],
  ])('rejects %s', (_, body) => {
    expect(() => parseOpenJoin(body)).toThrow(OpenError)
  })
})

describe('applyOpenUpdate', () => {
  it('rejects a stale version before checking anything else', () => {
    expect(() => applyOpenUpdate(card(), { version: 2, kind: 'hole', hole: 1, strokes: 4 })).toThrow(/another device/)
  })

  it('saves a hole into its slot and records when play and the back nine began', () => {
    const now = new Date('2026-09-19T17:05:00Z')
    expect(applyOpenUpdate(card(), { version: 3, kind: 'hole', hole: 1, strokes: 5 }, now)).toEqual({
      scores: [5, ...Array(17).fill(0)], started_at: now,
    })
    const later = new Date('2026-09-19T19:00:00Z')
    const back = applyOpenUpdate(card({ scores: [...front, ...Array(9).fill(0)], started_at: now }), { version: 3, kind: 'hole', hole: 10, strokes: 4 }, later)
    expect(back).toEqual({ scores: [...front, 4, ...Array(8).fill(0)], back_started_at: later })
  })

  it('clears a hole without touching the locks, and refuses scores before a mode is declared', () => {
    const started = new Date('2026-09-19T17:05:00Z')
    expect(applyOpenUpdate(card({ scores: [5, ...Array(17).fill(0)], started_at: started }), { version: 3, kind: 'hole', hole: 1, strokes: null }))
      .toEqual({ scores: Array(18).fill(0) })
    expect(() => applyOpenUpdate(card({ mode: null }), { version: 3, kind: 'hole', hole: 1, strokes: 4 })).toThrow(/Declare a mode/)
  })

  it('locks the mode once a score has been saved, even one later cleared', () => {
    expect(applyOpenUpdate(card(), { version: 3, kind: 'mode', mode: 'hard' })).toEqual({ mode: 'hard' })
    expect(() => applyOpenUpdate(card({ scores: [5, ...Array(17).fill(0)] }), { version: 3, kind: 'mode', mode: 'hard' })).toThrow(/locked/)
    expect(() => applyOpenUpdate(card({ started_at: new Date() }), { version: 3, kind: 'mode', mode: 'hard' })).toThrow(/locked/)
    // Re-declaring the same mode is harmless.
    expect(applyOpenUpdate(card({ started_at: new Date() }), { version: 3, kind: 'mode', mode: 'normal' })).toEqual({ mode: 'normal' })
  })

  it('allows Double Down only at the turn and locks it once the back nine starts', () => {
    expect(() => applyOpenUpdate(card({ scores: [...front.slice(0, 8), 0, ...Array(9).fill(0)] }), { version: 3, kind: 'doubleDown', doubleDown: true })).toThrow(/at the turn/)
    expect(applyOpenUpdate(card({ scores: [...front, ...Array(9).fill(0)] }), { version: 3, kind: 'doubleDown', doubleDown: true })).toEqual({ double_down: true })
    expect(applyOpenUpdate(card({ scores: [...front, ...Array(9).fill(0)], double_down: true }), { version: 3, kind: 'doubleDown', doubleDown: false })).toEqual({ double_down: false })
    const backStarted = card({ scores: [...front, 4, ...Array(8).fill(0)] })
    expect(() => applyOpenUpdate(backStarted, { version: 3, kind: 'doubleDown', doubleDown: true })).toThrow(/locked after the back nine/)
    expect(() => applyOpenUpdate(card({ scores: [...front, ...Array(9).fill(0)], back_started_at: new Date() }), { version: 3, kind: 'doubleDown', doubleDown: true })).toThrow(/locked after the back nine/)
  })

  it('keeps a declared Double Down honest by refusing to blank a front-nine hole', () => {
    const declared = card({ scores: [...front, ...Array(9).fill(0)], double_down: true })
    expect(() => applyOpenUpdate(declared, { version: 3, kind: 'hole', hole: 3, strokes: null })).toThrow(/with a number/)
    expect(applyOpenUpdate(declared, { version: 3, kind: 'hole', hole: 3, strokes: 5 })).toMatchObject({ scores: [5, 4, 5, 5, 3, 4, 6, 4, 4, ...Array(9).fill(0)] })
  })
})
