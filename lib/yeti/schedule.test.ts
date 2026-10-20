import { describe, expect, it } from 'vitest'
import { apply, applyAll } from './actions'
import { gameWhere, opponentLabel, sheetSeed, slotOf, type Board } from './model'
import { SCHEDULE_ID, SCHEDULE_IMPORT_FROM, YETI_SCHEDULE, applySchedule, seedBoard } from './schedule'
import { lineupText } from './share'
import { sanitizeBoard } from './validate'

const byDate = (b: Board, date: string) => b.games.find((g) => g.date === date)!

describe('the 2026-27 schedule data', () => {
  it('has 38 Yeti games, 19 home and 19 away', () => {
    expect(YETI_SCHEDULE).toHaveLength(38)
    expect(YETI_SCHEDULE.filter((g) => g.home)).toHaveLength(19)
    expect(new Set(YETI_SCHEDULE.map((g) => g.date)).size).toBe(38)
    expect(YETI_SCHEDULE.every((g) => ['21:00', '22:20'].includes(g.time) && ['Molson', 'Desmarais'].includes(g.rink))).toBe(true)
  })

  it('has every date on the weekday the league printed', () => {
    for (const g of YETI_SCHEDULE) {
      const [y, m, d] = g.date.split('-').map(Number)
      expect(['Tue', 'Wed', 'Thu']).toContain(new Date(Date.UTC(y, m - 1, d)).toUTCString().slice(0, 3))
    }
  })
})

describe('applySchedule', () => {
  const board = applySchedule(sheetSeed())

  it('adds the remaining games, from Oct 20 on', () => {
    const remaining = YETI_SCHEDULE.filter((g) => g.date >= SCHEDULE_IMPORT_FROM)
    expect(remaining).toHaveLength(32)
    expect(board.games).toHaveLength(32)
    expect(board.games[0].date).toBe('2026-10-20')
    expect(board.games[31].date).toBe('2027-03-11')
    expect(board.schedule).toBe(SCHEDULE_ID)
  })

  it('fills in tonight’s game without touching its lines or attendance', () => {
    const g = byDate(board, '2026-10-20')
    expect(g.id).toBe('g-2026-10-20')
    expect([g.opponent, g.time, g.rink, g.home]).toEqual(['Kings', '22:20', 'Molson', true])
    expect(g.slots).toEqual(sheetSeed().games[0].slots)
    expect(g.attendance.dan).toBe('out')
  })

  it('creates new games empty and unconfirmed', () => {
    const g = byDate(board, '2026-11-04')
    expect(g).toMatchObject({ id: 'g-2026-11-04', opponent: 'Lightning', time: '22:20', rink: 'Desmarais', home: false, slots: {}, attendance: {} })
  })

  it('never overwrites what was already set', () => {
    const edited = applyAll(sheetSeed(), [{ t: 'editGame', game: 'g-2026-10-20', patch: { opponent: 'Kings (exhibition)', time: '21:30' } }])
    const g = byDate(applySchedule(edited), '2026-10-20')
    expect([g.opponent, g.time, g.rink]).toEqual(['Kings (exhibition)', '21:30', 'Molson'])
  })

  it('is safe to run twice', () => {
    expect(applySchedule(board)).toEqual(board)
  })

  it('round-trips through validation', () => {
    expect(sanitizeBoard(board)).toEqual(board)
    expect(seedBoard()).toEqual(board)
  })

  it('a phone on the old page strips the new fields; running it again restores them', () => {
    const stripped = JSON.parse(JSON.stringify(board), (k, v) => (['time', 'rink', 'home', 'schedule'].includes(k) ? undefined : v))
    const restored = applySchedule(sanitizeBoard(stripped)!)
    expect(restored).toEqual(board)
  })
})

describe('game details', () => {
  const board = seedBoard()

  it('labels home and away', () => {
    expect(opponentLabel(byDate(board, '2026-10-20'))).toBe('vs Kings')
    expect(opponentLabel(byDate(board, '2026-11-03'))).toBe('@ Kings')
    expect(gameWhere(byDate(board, '2026-11-03'))).toBe('21:00 · Molson')
  })

  it('puts time, rink and opponent in the shared lines', () => {
    expect(lineupText(board, byDate(board, '2026-10-20')).split('\n')[0]).toBe('Yeti lines · Tue, Oct 20 · 22:20 Molson · vs Kings')
    expect(lineupText(board, byDate(board, '2026-11-04')).split('\n')[0]).toBe('Yeti lines · Wed, Nov 4 · 22:20 Desmarais · @ Lightning')
  })

  it('edits time, rink and home/away, rejecting a bad time', () => {
    const b = apply(board, { t: 'editGame', game: 'g-2026-10-22', patch: { time: '20:45', rink: 'Molson', home: false } })
    expect(byDate(b, '2026-10-22')).toMatchObject({ time: '20:45', rink: 'Molson', home: false })
    const bad = apply(b, { t: 'editGame', game: 'g-2026-10-22', patch: { time: '25:99' } })
    expect(byDate(bad, '2026-10-22').time).toBe('')
  })

  it('copies the last game’s lines into a new game, leaving out anyone marked out', () => {
    const b = applyAll(board, [
      { t: 'attend', game: 'g-2026-10-22', player: 'owen', value: 'out' },
      { t: 'copyLines', game: 'g-2026-10-22', from: 'g-2026-10-20' },
    ])
    const g = byDate(b, '2026-10-22')
    expect(g.slots['F1-C']).toBe('steven')
    expect(slotOf(g, 'owen')).toBeNull()
    expect(Object.keys(g.slots)).toHaveLength(12)
  })
})
