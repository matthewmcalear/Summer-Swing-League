import { describe, expect, it } from 'vitest'
import { apply, applyAll, newGame, type Action } from './actions'
import { attendanceOf, defaultGameId, formatGameDate, seedBoard, slotOf, type Board } from './model'
import { sanitizeBoard } from './validate'

const GAME = 'g-2026-10-20'
const game = (b: Board) => b.games.find((g) => g.id === GAME)!
const run = (...actions: Action[]) => applyAll(seedBoard(), actions)

describe('seed board (from the lineup spreadsheet)', () => {
  it('has the 14-player roster and the Oct 20 lines', () => {
    const b = seedBoard()
    expect(b.players).toHaveLength(14)
    const g = game(b)
    expect(g.slots['F1-LW']).toBe('owen')
    expect(g.slots['F3-LW']).toBeUndefined()
    expect(g.slots.G).toBe('euan')
    expect(attendanceOf(g, 'dan')).toBe('out')
    expect(Object.keys(g.slots)).toHaveLength(13)
  })

  it('survives sanitizing unchanged', () => {
    expect(sanitizeBoard(seedBoard())).toEqual(seedBoard())
  })
})

describe('place', () => {
  it('swaps two placed players', () => {
    const g = game(run({ t: 'place', game: GAME, player: 'owen', slot: 'F2-LW' }))
    expect(g.slots['F2-LW']).toBe('owen')
    expect(g.slots['F1-LW']).toBe('liam')
  })

  it('moves into an empty slot and frees the old one', () => {
    const g = game(run({ t: 'place', game: GAME, player: 'tom', slot: 'F3-LW' }))
    expect(g.slots['F3-LW']).toBe('tom')
    expect(g.slots['F3-RW']).toBeUndefined()
  })

  it('sends the occupant to the bench when a bench player takes the spot', () => {
    const b = run({ t: 'bench', game: GAME, player: 'liam' }, { t: 'place', game: GAME, player: 'liam', slot: 'F1-C' })
    const g = game(b)
    expect(g.slots['F1-C']).toBe('liam')
    expect(slotOf(g, 'steven')).toBeNull()
  })

  it('marks an out player in when dropped into the lineup', () => {
    const g = game(run({ t: 'place', game: GAME, player: 'dan', slot: 'F3-LW' }))
    expect(g.slots['F3-LW']).toBe('dan')
    expect(attendanceOf(g, 'dan')).toBe('in')
  })

  it('ignores slots outside the layout and unknown players', () => {
    const b = seedBoard()
    expect(apply(b, { t: 'place', game: GAME, player: 'tom', slot: 'F4-C' })).toBe(b)
    expect(apply(b, { t: 'place', game: GAME, player: 'nobody', slot: 'F3-LW' })).toBe(b)
    expect(apply(b, { t: 'place', game: 'nope', player: 'tom', slot: 'F3-LW' })).toBe(b)
  })
})

describe('attendance', () => {
  it('marking a placed player out removes him from the lineup', () => {
    const g = game(run({ t: 'attend', game: GAME, player: 'owen', value: 'out' }))
    expect(attendanceOf(g, 'owen')).toBe('out')
    expect(slotOf(g, 'owen')).toBeNull()
  })

  it('bulk-confirms unconfirmed players', () => {
    const b = run(
      { t: 'attend', game: GAME, player: 'tom', value: 'maybe' },
      { t: 'attend', game: GAME, player: 'max', value: 'maybe' },
      { t: 'attendAll', game: GAME, from: 'maybe', to: 'in' },
    )
    expect(attendanceOf(game(b), 'tom')).toBe('in')
    expect(attendanceOf(game(b), 'max')).toBe('in')
    expect(attendanceOf(game(b), 'dan')).toBe('out')
  })
})

describe('lines and layout', () => {
  it('swaps whole forward lines', () => {
    const g = game(run({ t: 'swapLines', game: GAME, kind: 'F', a: 1, b: 3 }))
    expect([g.slots['F1-LW'], g.slots['F1-C'], g.slots['F1-RW']]).toEqual([undefined, 'peter', 'tom'])
    expect([g.slots['F3-LW'], g.slots['F3-C'], g.slots['F3-RW']]).toEqual(['owen', 'steven', 'dt'])
  })

  it('dropping to two lines benches the third line', () => {
    const g = game(run({ t: 'layout', game: GAME, fLines: 2, dPairs: 2 }))
    expect(g.fLines).toBe(2)
    expect(slotOf(g, 'peter')).toBeNull()
    expect(slotOf(g, 'tom')).toBeNull()
  })

  it('clamps layout to the allowed range', () => {
    const g = game(run({ t: 'layout', game: GAME, fLines: 9, dPairs: 0 }))
    expect([g.fLines, g.dPairs]).toEqual([4, 2])
  })

  it('setSlots drops out players and duplicates', () => {
    const g = game(run({ t: 'setSlots', game: GAME, slots: { 'F1-LW': 'dan', 'F1-C': 'tom', 'F1-RW': 'tom', G: 'euan' } }))
    expect(g.slots).toEqual({ 'F1-C': 'tom', G: 'euan' })
  })
})

describe('roster', () => {
  it('edits player fields with cleaning', () => {
    const b = run({ t: 'editPlayer', player: 'max', patch: { name: '  Maxime  ', number: '#77', skill: 'Elite', pos: 'F/D' } })
    expect(b.players.find((p) => p.id === 'max')).toEqual({ id: 'max', name: 'Maxime', number: '77', skill: 'Elite', pos: 'F/D' })
  })

  it('ignores invalid skill or position and blank names', () => {
    const b = seedBoard()
    expect(apply(b, { t: 'editPlayer', player: 'max', patch: { skill: 'Legend' as never, name: '   ' } })).toBe(b)
  })

  it('adds a sub as in for the current game', () => {
    const b = run({ t: 'addPlayer', player: { id: 'sub1', name: 'Sub', number: '', skill: 'Mid', pos: 'F' }, game: GAME, attendance: 'in' })
    expect(b.players).toHaveLength(15)
    expect(attendanceOf(game(b), 'sub1')).toBe('in')
  })

  it('removing a player clears him from every game', () => {
    const b = run({ t: 'removePlayer', player: 'owen' })
    expect(b.players.some((p) => p.id === 'owen')).toBe(false)
    expect(slotOf(game(b), 'owen')).toBeNull()
    expect(game(b).attendance.owen).toBeUndefined()
  })
})

describe('games', () => {
  it('creates a game from the last lines, attendance unconfirmed', () => {
    const b = seedBoard()
    const g = newGame('g2', '2026-10-27', 'Kings', game(b), { copyLines: true, copyAttendance: false })
    const next = apply(b, { t: 'addGame', game: g })
    const added = next.games.find((x) => x.id === 'g2')!
    expect(added.slots['F1-LW']).toBe('owen')
    expect(attendanceOf(added, 'owen')).toBe('maybe')
    expect(next.games.map((x) => x.id)).toEqual([GAME, 'g2'])
  })

  it('keeps out players out of copied lines when attendance is copied', () => {
    const b = run({ t: 'attend', game: GAME, player: 'tom', value: 'out' })
    const g = newGame('g2', '2026-10-27', '', game(b), { copyLines: true, copyAttendance: true })
    expect(slotOf(g, 'tom')).toBeNull()
    expect(attendanceOf(g, 'dan')).toBe('out')
  })

  it('re-sorts games when a date changes and rejects bad dates', () => {
    const b = applyAll(seedBoard(), [
      { t: 'addGame', game: newGame('g2', '2026-10-27', '', undefined, { copyLines: false, copyAttendance: false }) },
      { t: 'editGame', game: 'g2', patch: { date: '2026-10-13' } },
    ])
    expect(b.games.map((g) => g.id)).toEqual(['g2', GAME])
    expect(apply(b, { t: 'editGame', game: 'g2', patch: { date: '2026-02-30' } })).toBe(b)
  })

  it('picks the next game on or after today by default', () => {
    const b = apply(seedBoard(), { t: 'addGame', game: newGame('g2', '2026-10-27', '', undefined, { copyLines: false, copyAttendance: false }) })
    expect(defaultGameId(b, '2026-10-20')).toBe(GAME)
    expect(defaultGameId(b, '2026-10-21')).toBe('g2')
    expect(defaultGameId(b, '2026-12-01')).toBe('g2')
  })

  it('formats dates without time-zone drift', () => {
    expect(formatGameDate('2026-10-20')).toBe('Tue, Oct 20')
  })
})

describe('restore', () => {
  it('puts the board back exactly', () => {
    const before = seedBoard()
    const after = apply(before, { t: 'attend', game: GAME, player: 'owen', value: 'out' })
    expect(apply(after, { t: 'restore', board: before })).toEqual(before)
  })
})
