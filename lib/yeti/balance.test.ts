import { describe, expect, it } from 'vitest'
import { apply, applyAll } from './actions'
import { suggestLineup } from './balance'
import { analyzeGame } from './insights'
import { attendanceOf, fitFor, parseSlot, sheetSeed, type Board } from './model'
import { lineupText } from './share'

const GAME = 'g-2026-10-20'
const game = (b: Board) => b.games.find((g) => g.id === GAME)!

describe('insights on the Oct 20 lines', () => {
  const info = analyzeGame(sheetSeed(), game(sheetSeed()))

  it('counts attendance and open spots', () => {
    // 3 lines × 3 + 2 pairs × 2 + goalie = 14 spots; L3 LW is open in the sheet.
    expect(info.counts).toMatchObject({ in: 13, maybe: 0, out: 1, slots: 14, filled: 13, open: 1 })
    expect(info.out.map((p) => p.name)).toEqual(['Dan'])
    expect(info.bench).toEqual([])
  })

  it('scores lines by average skill', () => {
    expect(info.forwards.map((l) => l.points)).toEqual([10, 7, 6])
    expect(info.forwards[0].avg).toBeCloseTo(10 / 3)
    expect(info.defence.map((l) => l.avg)).toEqual([1.5, 2.5])
    expect(info.spread.F).toBeCloseTo(10 / 3 - 7 / 3)
  })

  it('flags the stacked first line', () => {
    expect(info.warnings.map((w) => w.id)).toContain('spread')
  })

  it('flags an in player left out of the lineup, like the sheet’s Allocated column', () => {
    const b = apply(sheetSeed(), { t: 'bench', game: GAME, player: 'liam' })
    const w = analyzeGame(b, game(b)).warnings.find((x) => x.id === 'unplaced-liam')
    expect(w?.text).toBe('Liam is in but not in the lineup')
  })

  it('flags players out of position', () => {
    const b = apply(sheetSeed(), { t: 'place', game: GAME, player: 'hugo', slot: 'F3-LW' })
    const w = analyzeGame(b, game(b)).warnings.find((x) => x.id === 'fit-hugo')
    expect(w?.text).toBe('Hugo (D) is playing up front')
  })

  it('flags an empty net', () => {
    const b = apply(sheetSeed(), { t: 'bench', game: GAME, player: 'euan' })
    expect(analyzeGame(b, game(b)).warnings[0]).toMatchObject({ id: 'no-goalie', player: 'euan' })
  })
})

describe('suggestLineup', () => {
  const validate = (b: Board, slots: Record<string, string>) => {
    const g = game(b)
    const seen = new Set<string>()
    for (const [slot, pid] of Object.entries(slots)) {
      expect(seen.has(pid)).toBe(false)
      seen.add(pid)
      expect(attendanceOf(g, pid)).not.toBe('out')
      const p = b.players.find((x) => x.id === pid)!
      expect(fitFor(p.pos, parseSlot(slot)!.kind)).toBe('ok')
    }
  }

  it('rebuild keeps everyone in position and evens out the forward lines', () => {
    const b = sheetSeed()
    const s = suggestLineup(b, game(b), 'rebuild')
    validate(b, s.slots)
    expect(Object.keys(s.slots)).toHaveLength(13)
    const next = apply(b, { t: 'setSlots', game: GAME, slots: s.slots })
    const info = analyzeGame(next, game(next))
    expect(info.spread.F!).toBeLessThan(analyzeGame(b, game(b)).spread.F!)
    expect(info.spread.F!).toBeLessThanOrEqual(0.5)
    expect(info.spread.D!).toBeLessThanOrEqual(0.5)
    expect(s.slots.G).toBe('euan')
  })

  it('rebuild is deterministic', () => {
    const b = sheetSeed()
    expect(suggestLineup(b, game(b), 'rebuild')).toEqual(suggestLineup(b, game(b), 'rebuild'))
  })

  it('fill only drops bench players into open spots', () => {
    const b = applyAll(sheetSeed(), [
      { t: 'attend', game: GAME, player: 'dan', value: 'in' },
      { t: 'bench', game: GAME, player: 'max' },
    ])
    const before = game(b).slots
    const s = suggestLineup(b, game(b), 'fill')
    for (const [slot, pid] of Object.entries(before)) expect(s.slots[slot]).toBe(pid)
    expect(s.slots['D2-LD']).toBe('max') // the only D spot open, and the only D on the bench
    expect(s.slots['F3-LW']).toBe('dan')
    expect(s.added).toBe(2)
  })

  it('puts an available goalie in an empty net', () => {
    const b = apply(sheetSeed(), { t: 'bench', game: GAME, player: 'euan' })
    expect(suggestLineup(b, game(b), 'fill').slots.G).toBe('euan')
  })

  it('prefers confirmed players and leaves holes on the last line', () => {
    const b = applyAll(sheetSeed(), [
      { t: 'clearSlots', game: GAME },
      { t: 'attend', game: GAME, player: 'liam', value: 'maybe' },
      { t: 'attend', game: GAME, player: 'owen', value: 'out' },
      { t: 'attend', game: GAME, player: 'tom', value: 'out' },
    ])
    const s = suggestLineup(b, game(b), 'rebuild')
    validate(b, s.slots)
    // 10 skaters for 13 spots: every confirmed skater plays, plus Liam (unconfirmed) to fill a hole.
    expect(Object.keys(s.slots).filter((k) => k !== 'G')).toHaveLength(10)
    expect(Object.values(s.slots)).toContain('liam')
    expect(['D1-LD', 'D1-RD', 'D2-LD', 'D2-RD'].every((k) => s.slots[k])).toBe(true)
    const empty = ['F1-LW', 'F1-C', 'F1-RW', 'F2-LW', 'F2-C', 'F2-RW', 'F3-LW', 'F3-C', 'F3-RW'].filter((k) => !s.slots[k])
    expect(empty.every((k) => k.startsWith('F3') || k.startsWith('F2'))).toBe(true)
  })
})

describe('lineupText', () => {
  it('formats the lines for the team chat', () => {
    expect(lineupText(sheetSeed(), game(sheetSeed()))).toBe(
      [
        'Yeti lines · Tue, Oct 20',
        'L1  Owen – Steven – DT',
        'L2  Liam – Matt – Steph',
        'L3  ___ – Peter – Tom',
        'D1  Jeff – Hugo',
        'D2  Max – X',
        'G   Euan',
        'Out: Dan',
      ].join('\n'),
    )
  })

  it('marks unconfirmed players and shows the opponent', () => {
    const b = applyAll(sheetSeed(), [
      { t: 'attend', game: GAME, player: 'max', value: 'maybe' },
      { t: 'editGame', game: GAME, patch: { opponent: 'Kings' } },
    ])
    const text = lineupText(b, game(b))
    expect(text.split('\n')[0]).toBe('Yeti lines · Tue, Oct 20 · vs Kings')
    expect(text).toContain('D2  Max? – X')
  })
})
