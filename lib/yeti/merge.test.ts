import { describe, expect, it } from 'vitest'
import { applyAll } from './actions'
import { carryOverForOldPage, keepSkills } from './merge'
import { APP_VERSION, type Board } from './model'
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

describe('keepSkills', () => {
  const stored = seedBoard()
  const skillOf = (b: Board, id: string) => b.players.find((p) => p.id === id)?.skill

  it('puts back the stored skill for players the board already has', () => {
    const edited = applyAll(stored, [
      { t: 'editPlayer', player: 'hugo', patch: { skill: 'Elite' } },
      { t: 'editPlayer', player: 'owen', patch: { skill: 'Low' } },
    ])
    const { board, kept } = keepSkills(edited, stored)
    expect(kept).toBe(2)
    expect(skillOf(board, 'hugo')).toBe('Low')
    expect(skillOf(board, 'owen')).toBe('Elite')
  })

  it('leaves everything else the save changed alone', () => {
    const edited = applyAll(stored, [
      { t: 'editPlayer', player: 'hugo', patch: { skill: 'Elite', number: '55', pos: 'F' } },
      { t: 'attend', game: 'g-2026-10-20', player: 'tom', value: 'out' },
    ])
    const { board } = keepSkills(edited, stored)
    const hugo = board.players.find((p) => p.id === 'hugo')!
    expect(hugo).toMatchObject({ skill: 'Low', number: '55', pos: 'F' })
    expect(g(board, '2026-10-20').attendance.tom).toBe('out')
  })

  it('returns the same board when no skill changed', () => {
    const edited = applyAll(stored, [{ t: 'editPlayer', player: 'hugo', patch: { name: 'Hugo B' } }])
    const result = keepSkills(edited, stored)
    expect(result.kept).toBe(0)
    expect(result.board).toBe(edited)
  })

  it('keeps the sent skill for a player the stored board does not have (new sub, or undo after a removal)', () => {
    const removed = applyAll(stored, [{ t: 'removePlayer', player: 'owen' }])
    const { board, kept } = keepSkills(stored, removed) // undo brings Owen back
    expect(kept).toBe(0)
    expect(skillOf(board, 'owen')).toBe('Elite')

    const added = applyAll(stored, [{ t: 'addPlayer', player: { id: 'sub1', name: 'Sub', number: '', skill: 'Mid', pos: 'F' } }])
    expect(skillOf(keepSkills(added, stored).board, 'sub1')).toBe('Mid')
  })
})
