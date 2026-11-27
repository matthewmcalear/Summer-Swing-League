import { describe, expect, it } from 'vitest'
import { applyAll } from './actions'
import { carryOverForOldPage, keepRoster } from './merge'
import { APP_VERSION, slotOf, type Board } from './model'
import { seedBoard } from './schedule'
import { sanitizeBoard } from './validate'

const g = (b: Board, date: string) => b.games.find((x) => x.date === date)!

/** What a page without these fields sends back: its own copy with them stripped. */
function strip(board: Board, fields: string[]): Board {
  return sanitizeBoard(JSON.parse(JSON.stringify(board), (k, v) => (fields.includes(k) ? undefined : v)))!
}

describe('carryOverForOldPage', () => {
  const stored = applyAll(seedBoard(), [
    { t: 'setBeer', game: 'g-2026-10-20', players: ['max'] },
    { t: 'setBeer', game: 'g-2026-11-03', players: ['hugo'] },
    { t: 'editGame', game: 'g-2026-10-22', patch: { time: '21:30' } },
  ])

  it('keeps beer when a page from before beer (no version) saves', () => {
    // The old page changes attendance; it knows nothing about beer.
    const edited = applyAll(strip(stored, ['beer']), [{ t: 'attend', game: 'g-2026-10-20', player: 'tom', value: 'out' }])
    const saved = carryOverForOldPage(edited, stored, undefined)
    expect(g(saved, '2026-10-20').beer).toEqual(['max'])
    expect(g(saved, '2026-11-03').beer).toEqual(['hugo'])
    expect(g(saved, '2026-10-20').attendance.tom).toBe('out')
    expect(g(saved, '2026-10-22').time).toBe('21:30')
  })

  it('lets a current page change beer freely', () => {
    const cleared = applyAll(stored, [{ t: 'setBeer', game: 'g-2026-10-20', players: [] }])
    expect(carryOverForOldPage(cleared, stored, APP_VERSION)).toBe(cleared)
  })

  it('restores time, rink and home/away (and the schedule marker) for a page from before the schedule', () => {
    const old = strip(stored, ['beer', 'time', 'rink', 'home', 'schedule'])
    const saved = carryOverForOldPage(old, stored, undefined)
    expect(saved.schedule).toBe(stored.schedule)
    expect(g(saved, '2026-10-22')).toMatchObject({ time: '21:30', rink: 'Desmarais', home: true })
    expect(saved).toEqual(stored)
  })

  it('leaves games the old page added alone, and drops beer for players it removed', () => {
    const old = applyAll(strip(stored, ['beer']), [
      { t: 'removePlayer', player: 'hugo' },
      {
        t: 'addGame',
        game: { id: 'p1', date: '2027-03-18', time: '', rink: '', opponent: 'Kings', home: null, fLines: 3, dPairs: 2, attendance: {}, slots: {}, beer: [] },
      },
    ])
    const saved = carryOverForOldPage(old, stored, undefined)
    expect(g(saved, '2026-11-03').beer).toEqual([])
    expect(g(saved, '2027-03-18').beer).toEqual([])
    expect(g(saved, '2026-10-20').beer).toEqual(['max'])
  })
})

describe('keepRoster', () => {
  const stored = applyAll(seedBoard(), [
    { t: 'setBeer', game: 'g-2026-10-20', players: ['hugo'] },
    { t: 'attend', game: 'g-2026-11-03', player: 'hugo', value: 'out' },
  ])
  const player = (b: Board, id: string) => b.players.find((p) => p.id === id)

  it('puts back the stored name, number, skill and position', () => {
    const edited = applyAll(stored, [
      { t: 'editPlayer', player: 'hugo', patch: { name: 'Hugo B', number: '55', skill: 'Elite', pos: 'F' } },
      { t: 'editPlayer', player: 'owen', patch: { skill: 'Low' } },
    ])
    const { board, kept } = keepRoster(edited, stored)
    expect(kept).toBe(2)
    expect(board.players).toEqual(stored.players)
  })

  it('lets the rest of the save through: attendance, lines, beer and games', () => {
    const edited = applyAll(stored, [
      { t: 'editPlayer', player: 'hugo', patch: { name: 'Hugo B' } },
      { t: 'attend', game: 'g-2026-10-20', player: 'tom', value: 'out' },
      { t: 'place', game: 'g-2026-10-20', player: 'dan', slot: 'F3-LW' },
      { t: 'setBeer', game: 'g-2026-11-03', players: ['max'] },
      { t: 'editGame', game: 'g-2026-10-22', patch: { time: '21:30' } },
    ])
    const { board } = keepRoster(edited, stored)
    expect(board).toEqual({ ...edited, players: stored.players })
  })

  it('returns the same board when the roster is untouched', () => {
    const edited = applyAll(stored, [{ t: 'attend', game: 'g-2026-10-20', player: 'tom', value: 'out' }])
    const result = keepRoster(edited, stored)
    expect(result.kept).toBe(0)
    expect(result.board).toBe(edited)
  })

  it('drops a player the save added, from the games too', () => {
    const edited = applyAll(stored, [
      { t: 'addPlayer', player: { id: 'sub1', name: 'Sub', number: '99', skill: 'Elite', pos: 'F' }, game: 'g-2026-10-20', attendance: 'in' },
      { t: 'place', game: 'g-2026-10-20', player: 'sub1', slot: 'F3-LW' },
      { t: 'beer', game: 'g-2026-10-20', player: 'sub1', on: true },
    ])
    const { board, kept } = keepRoster(edited, stored)
    expect(kept).toBe(1)
    expect(player(board, 'sub1')).toBeUndefined()
    const game = g(board, '2026-10-20')
    expect(game.attendance.sub1).toBeUndefined()
    expect(game.slots['F3-LW']).toBeUndefined()
    expect(game.beer).toEqual(['hugo'])
    expect(board).toEqual(stored)
  })

  it('brings back a player the save removed, with his attendance, spot and beer', () => {
    const edited = applyAll(stored, [{ t: 'removePlayer', player: 'hugo' }])
    const { board, kept } = keepRoster(edited, stored)
    expect(kept).toBe(1)
    expect(board).toEqual(stored)
    expect(g(board, '2026-10-20')).toMatchObject({ beer: ['hugo'], slots: { 'D1-RD': 'hugo' }, attendance: { hugo: 'in' } })
    expect(g(board, '2026-11-03').attendance.hugo).toBe('out')
  })

  it('sends a removed player to the bench when the save filled his spot', () => {
    const edited = applyAll(stored, [
      { t: 'removePlayer', player: 'hugo' },
      { t: 'place', game: 'g-2026-10-20', player: 'dan', slot: 'D1-RD' },
    ])
    const { board } = keepRoster(edited, stored)
    const game = g(board, '2026-10-20')
    expect(player(board, 'hugo')).toEqual(player(stored, 'hugo'))
    expect(game.slots['D1-RD']).toBe('dan')
    expect(slotOf(game, 'hugo')).toBeNull()
    expect(game.attendance.hugo).toBe('in')
    expect(game.beer).toEqual(['hugo'])
  })
})

describe('the Trash skill level and pages from before it', () => {
  const stored = applyAll(seedBoard(), [{ t: 'editPlayer', player: 'tom', patch: { skill: 'Trash' } }])
  const skillOf = (b: Board, id: string) => b.players.find((p) => p.id === id)?.skill
  /** What a version-4 page holds: it doesn't know Trash, so it reads Tom as Mid. */
  const asOldPage = (b: Board) => ({ ...b, players: b.players.map((p) => (p.skill === 'Trash' ? { ...p, skill: 'Mid' as const } : p)) })

  it('survives cleaning as a level of its own', () => {
    expect(sanitizeBoard(stored)!.players.find((p) => p.id === 'tom')!.skill).toBe('Trash')
  })

  it('keeps Trash when an older page saves something unrelated', () => {
    const edited = applyAll(asOldPage(stored), [{ t: 'attend', game: 'g-2026-10-20', player: 'max', value: 'out' }])
    const saved = carryOverForOldPage(edited, stored, 4)
    expect(skillOf(saved, 'tom')).toBe('Trash')
    expect(g(saved, '2026-10-20').attendance.max).toBe('out')
    // …so the roster lock has nothing to refuse
    expect(keepRoster(saved, stored).kept).toBe(0)
  })

  it('still lets an older page (admin) move him off Trash on purpose', () => {
    const edited = applyAll(asOldPage(stored), [{ t: 'editPlayer', player: 'tom', patch: { skill: 'Good' } }])
    expect(skillOf(carryOverForOldPage(edited, stored, 4), 'tom')).toBe('Good')
  })

  it('takes a current page at its word', () => {
    const edited = applyAll(stored, [{ t: 'editPlayer', player: 'tom', patch: { skill: 'Mid' } }])
    expect(skillOf(carryOverForOldPage(edited, stored, APP_VERSION), 'tom')).toBe('Mid')
  })
})
