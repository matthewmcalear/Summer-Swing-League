import { describe, expect, it } from 'vitest'
import { apply, applyAll, newGame, type Action } from './actions'
import { beerNames, beerRotation, nextUp } from './beer'
import { analyzeGame } from './insights'
import { sheetSeed, type Board } from './model'
import { seedBoard } from './schedule'
import { lineupText } from './share'
import { sanitizeBoard } from './validate'

const g = (b: Board, date: string) => b.games.find((x) => x.date === date)!
const id = (date: string) => `g-${date}`
const season = (...actions: Action[]) => applyAll(seedBoard(), actions)

describe('beer actions', () => {
  it('puts a player on beer and takes him off', () => {
    const on = season({ t: 'beer', game: id('2026-10-20'), player: 'max', on: true })
    expect(g(on, '2026-10-20').beer).toEqual(['max'])
    const off = apply(on, { t: 'beer', game: id('2026-10-20'), player: 'max', on: false })
    expect(g(off, '2026-10-20').beer).toEqual([])
  })

  it('setBeer replaces, ignores unknown players and caps at four', () => {
    const b = season({ t: 'setBeer', game: id('2026-10-20'), players: ['max', 'max', 'nobody', 'hugo', 'jeff', 'x', 'tom'] })
    expect(g(b, '2026-10-20').beer).toEqual(['max', 'hugo', 'jeff', 'x'])
    expect(apply(b, { t: 'beer', game: id('2026-10-20'), player: 'tom', on: true })).toBe(b)
  })

  it('is a no-op when nothing changes', () => {
    const b = seedBoard()
    expect(apply(b, { t: 'beer', game: id('2026-10-20'), player: 'max', on: false })).toBe(b)
    expect(apply(b, { t: 'setBeer', game: id('2026-10-20'), players: [] })).toBe(b)
  })

  it('removing a player takes him off beer everywhere', () => {
    const b = season(
      { t: 'beer', game: id('2026-10-20'), player: 'max', on: true },
      { t: 'beer', game: id('2026-11-03'), player: 'max', on: true },
      { t: 'removePlayer', player: 'max' },
    )
    expect(b.games.every((x) => !x.beer.includes('max'))).toBe(true)
  })

  it('never copies to another game', () => {
    const b = season({ t: 'beer', game: id('2026-10-20'), player: 'max', on: true }, { t: 'copyLines', game: id('2026-10-22'), from: id('2026-10-20') })
    expect(g(b, '2026-10-22').beer).toEqual([])
    expect(newGame({ id: 'p1', date: '2027-03-18' }, g(b, '2026-10-20'), { copyLines: true, copyAttendance: true }).beer).toEqual([])
  })

  it('validation keeps beer and drops unknown players', () => {
    const b = season({ t: 'beer', game: id('2026-10-20'), player: 'max', on: true })
    expect(sanitizeBoard(b)).toEqual(b)
    const raw = JSON.parse(JSON.stringify(b))
    raw.games[0].beer = ['max', 'ghost', 42, 'max']
    expect(sanitizeBoard(raw)!.games[0].beer).toEqual(['max'])
    delete raw.games[0].beer
    expect(sanitizeBoard(raw)!.games[0].beer).toEqual([])
  })
})

describe('beer rotation', () => {
  it('starts in roster order, confirmed players first, out players last', () => {
    const b = sheetSeed() // Oct 20: everyone in except Dan
    const order = beerRotation(b, b.games[0]).map((s) => s.player.id)
    expect(order[0]).toBe('euan')
    expect(order[order.length - 1]).toBe('dan')
    expect(nextUp(b, b.games[0])!.player.id).toBe('euan')
  })

  it('moves players with more turns down, then whoever went longest ago', () => {
    const b = season(
      { t: 'setBeer', game: id('2026-10-20'), players: ['euan'] },
      { t: 'setBeer', game: id('2026-10-22'), players: ['matt'] },
      { t: 'attendAll', game: id('2026-10-29'), from: 'maybe', to: 'in' },
    )
    const next = nextUp(b, g(b, '2026-10-29'))!
    expect(next.player.id).toBe('steph') // first in roster order with no turns yet
    const stats = beerRotation(b, g(b, '2026-10-29'))
    const euan = stats.find((s) => s.player.id === 'euan')!
    expect([euan.turns, euan.last, euan.booked]).toEqual([1, '2026-10-20', null])
    // Euan (Oct 20) has gone longer than Matt (Oct 22), so he's ahead of Matt.
    const idx = (pid: string) => stats.findIndex((s) => s.player.id === pid)
    expect(idx('euan')).toBeLessThan(idx('matt'))
    expect(idx('matt')).toBe(stats.length - 1)
  })

  it('counts turns already booked for later games', () => {
    const b = season({ t: 'setBeer', game: id('2026-11-03'), players: ['euan'] })
    const euan = beerRotation(b, g(b, '2026-10-20')).find((s) => s.player.id === 'euan')!
    expect([euan.turns, euan.last, euan.booked]).toEqual([1, null, '2026-11-03'])
    expect(nextUp(b, g(b, '2026-10-20'))!.player.id).toBe('matt')
  })

  it('prefers a confirmed player over an unconfirmed one with the same turns', () => {
    const b = season({ t: 'attend', game: id('2026-10-22'), player: 'steph', value: 'in' })
    expect(nextUp(b, g(b, '2026-10-22'))!.player.id).toBe('steph')
  })

  it('skips whoever is already on beer for this game', () => {
    const b = season({ t: 'setBeer', game: id('2026-10-20'), players: ['euan'] })
    expect(nextUp(b, g(b, '2026-10-20'))!.player.id).toBe('matt')
  })

  it('names one, two or three players', () => {
    const p = sheetSeed().players
    expect(beerNames([p[0]])).toBe('Euan')
    expect(beerNames([p[0], p[1]])).toBe('Euan & Matt')
    expect(beerNames([p[0], p[1], p[2]])).toBe('Euan, Matt & Steph')
  })
})

describe('beer in insights and share text', () => {
  it('lists who is on beer and flags one marked out', () => {
    const b = season({ t: 'setBeer', game: id('2026-10-20'), players: ['max'] }, { t: 'attend', game: id('2026-10-20'), player: 'max', value: 'out' })
    const info = analyzeGame(b, g(b, '2026-10-20'))
    expect(info.beer.map((p) => p.id)).toEqual(['max'])
    expect(info.warnings.find((w) => w.id === 'beer-out-max')?.text).toBe('Max is on beer but marked out')
  })

  it('puts 🍺 by the name and a beer line at the end', () => {
    const b = season({ t: 'setBeer', game: id('2026-10-20'), players: ['max'] })
    const text = lineupText(b, g(b, '2026-10-20'))
    expect(text).toContain('D2  Max 🍺 – X')
    expect(text.split('\n').pop()).toBe('🍺 Beer: Max')
  })

  it('has no beer line when nobody is on beer', () => {
    expect(lineupText(seedBoard(), g(seedBoard(), '2026-10-20'))).not.toContain('🍺')
  })
})
