import { describe, expect, it } from 'vitest'
import { OpenError, applyOpenUpdate, isScoringCode, parseOpenSetup, parseOpenUpdate } from './open-validation'
import type { MutableOpenPlayer } from './open-validation'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const code = 'A'.repeat(43)

function setup(overrides: Record<string, unknown> = {}) {
  return {
    courseId: uuid(1),
    holePars: Array(18).fill(4),
    difficulty: 'average',
    groups: [
      { name: 'Group 1', teeTime: '13:00', memberIds: [uuid(10), uuid(11), uuid(12), uuid(13)] },
      { name: 'Group 2', teeTime: '13:10', memberIds: [uuid(20), uuid(21), uuid(22)] },
      { name: 'Group 3', teeTime: '13:20', memberIds: [uuid(30), uuid(31), uuid(32)] },
    ],
    ...overrides,
  }
}

function card(overrides: Partial<MutableOpenPlayer> = {}): MutableOpenPlayer {
  return { scores: Array(18).fill(0), mode: 'normal', double_down: false, version: 3, started_at: null, back_started_at: null, ...overrides }
}

const front = [5, 4, 4, 5, 3, 4, 6, 4, 4]

describe('parseOpenSetup', () => {
  it('accepts three groups of 1–4 distinct members and normalizes ids', () => {
    const parsed = parseOpenSetup(setup({ courseId: uuid(1).toUpperCase() }))
    expect(parsed.courseId).toBe(uuid(1))
    expect(parsed.groups.map((group) => group.memberIds.length)).toEqual([4, 3, 3])
  })

  it.each([
    ['a missing course', { courseId: 'nope' }, 'valid course'],
    ['a short par card', { holePars: Array(17).fill(4) }, '18 hole pars'],
    ['a par 7', { holePars: [...Array(17).fill(4), 7] }, '18 hole pars'],
    ['an unknown difficulty', { difficulty: 'brutal' }, 'difficulty'],
    ['two groups', { groups: setup().groups.slice(0, 2) }, 'exactly three'],
    ['unexpected fields', { extra: true }, 'Unexpected fields'],
  ])('rejects %s', (_, overrides, message) => {
    expect(() => parseOpenSetup(setup(overrides))).toThrow(message)
  })

  it('rejects a player in two groups, an oversized group and duplicate names', () => {
    const groups = setup().groups
    expect(() => parseOpenSetup(setup({ groups: [groups[0], { ...groups[1], memberIds: [uuid(10)] }, groups[2]] }))).toThrow('only one group')
    expect(() => parseOpenSetup(setup({ groups: [{ ...groups[0], memberIds: [...groups[0].memberIds, uuid(14)] }, groups[1], groups[2]] }))).toThrow('1–4')
    expect(() => parseOpenSetup(setup({ groups: [groups[0], { ...groups[1], name: 'group 1' }, groups[2]] }))).toThrow('different name')
  })

  it('accepts a blank tee time but not a malformed one', () => {
    const groups = setup().groups
    expect(parseOpenSetup(setup({ groups: [{ ...groups[0], teeTime: '' }, groups[1], groups[2]] })).groups[0].teeTime).toBe('')
    expect(() => parseOpenSetup(setup({ groups: [{ ...groups[0], teeTime: '1pm' }, groups[1], groups[2]] }))).toThrow('HH:MM')
  })
})

describe('parseOpenUpdate', () => {
  it('parses a hole, a mode and a Double Down update, each with its version', () => {
    expect(parseOpenUpdate({ version: 2, scoringCode: code, hole: 7, strokes: 5 })).toEqual({ version: 2, scoringCode: code, kind: 'hole', hole: 7, strokes: 5 })
    expect(parseOpenUpdate({ version: 0, hole: 18, strokes: null })).toEqual({ version: 0, kind: 'hole', hole: 18, strokes: null })
    expect(parseOpenUpdate({ version: 1, mode: 'god' })).toEqual({ version: 1, kind: 'mode', mode: 'god' })
    expect(parseOpenUpdate({ version: 1, doubleDown: true })).toEqual({ version: 1, kind: 'doubleDown', doubleDown: true })
  })

  it.each([
    ['no version', { hole: 1, strokes: 4 }, 400],
    ['a negative version', { version: -1, hole: 1, strokes: 4 }, 400],
    ['a bad scoring code', { version: 1, scoringCode: 'short', hole: 1, strokes: 4 }, 403],
    ['two actions at once', { version: 1, hole: 1, strokes: 4, mode: 'hard' }, 400],
    ['hole 19', { version: 1, hole: 19, strokes: 4 }, 400],
    ['21 strokes', { version: 1, hole: 1, strokes: 21 }, 400],
    ['fractional strokes', { version: 1, hole: 1, strokes: 4.5 }, 400],
    ['a mode outside the rules', { version: 1, mode: 'legend' }, 400],
    ['a prototype key as a mode', { version: 1, mode: 'constructor' }, 400],
    ['a non-boolean Double Down', { version: 1, doubleDown: 'yes' }, 400],
    ['a non-object body', null, 400],
  ])('rejects %s', (_, body, status) => {
    let caught: unknown
    try { parseOpenUpdate(body) } catch (e) { caught = e }
    expect(caught).toBeInstanceOf(OpenError)
    expect((caught as OpenError).status).toBe(status)
  })

  it('recognizes the 43-character base64url scoring codes the server issues', () => {
    expect(isScoringCode('Ab0-_'.repeat(8) + 'xyz')).toBe(true)
    expect(isScoringCode('Ab0-_'.repeat(8) + 'xy')).toBe(false)
    expect(isScoringCode('Ab0-_'.repeat(8) + 'xy=')).toBe(false)
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
