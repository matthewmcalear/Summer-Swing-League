import { describe, expect, it } from 'vitest'
import { buyCost, cashOutCents, maxHouseLoss, prices, seedQuantities, sellProceeds, sharesForSpend } from './lmsr'
import { computeStandings, type ResultEventLike } from './standings'
import { resolveMarket, type MarketLike } from './resolve'
import { headToHeadProbability, topNProbability, winnerProbabilities } from './history'

describe('lmsr', () => {
  it('prices sum to 1 and an even market opens at 1/n', () => {
    const p = prices([0, 0, 0, 0], 50)
    p.forEach((x) => expect(x).toBeCloseTo(0.25))
  })

  it('sharesForSpend inverts buyCost', () => {
    const q = [10, 0, -5]
    const shares = sharesForSpend(q, 40, 2, 25)
    expect(buyCost(q, 40, 2, shares)).toBeCloseTo(25, 9)
  })

  it('buying raises the price and selling back refunds exactly', () => {
    const q = [0, 0]
    const before = prices(q, 100)[0]
    const shares = sharesForSpend(q, 100, 0, 30)
    const after = [q[0] + shares, q[1]]
    expect(prices(after, 100)[0]).toBeGreaterThan(before)
    expect(sellProceeds(after, 100, 0, shares)).toBeCloseTo(30, 9)
  })

  it('seeds opening prices and bounds the house loss', () => {
    const q = seedQuantities([0.5, 0.3, 0.2], 100)
    const p = prices(q, 100)
    expect(p[0]).toBeCloseTo(0.5)
    expect(p[2]).toBeCloseTo(0.2)
    expect(maxHouseLoss(q, 100)).toBeCloseTo(100 * Math.log(5))
    expect(maxHouseLoss([0, 0, 0, 0], 100)).toBeCloseTo(100 * Math.log(4))
  })

  it('stays finite for extreme quantities', () => {
    const q = [5000, 0]
    expect(prices(q, 10).every(Number.isFinite)).toBe(true)
    expect(Number.isFinite(sharesForSpend(q, 10, 1, 5))).toBe(true)
  })
})

const ev = (
  round: number,
  competitorId: number,
  kind: ResultEventLike['kind'],
  rank?: number,
): ResultEventLike => ({
  round,
  competitorId,
  kind,
  rank,
})

describe('standings', () => {
  const field = [1, 2, 3, 4, 5]

  it('assigns positions as people go out, with Redemption Island returns', () => {
    const st = computeStandings(field, [
      ev(1, 5, 'TO_ISLAND'),
      ev(2, 4, 'OUT'), // 4 left → 5th
      ev(3, 3, 'TO_ISLAND'),
      ev(3, 5, 'OUT'), // island loser out → 4 left (1,2,3 + none) … 3 alive → 4th
      ev(4, 3, 'RETURN'),
      ev(5, 3, 'OUT'), // 2 left → 3rd
      ev(6, 2, 'OUT'), // 1 left → 2nd, 1 is champion
    ])
    expect(st.byId.get(4)!.position).toBe(5)
    expect(st.byId.get(5)!.position).toBe(4)
    expect(st.byId.get(3)!.position).toBe(3)
    expect(st.byId.get(2)!.position).toBe(2)
    expect(st.champion).toBe(1)
    expect(st.byId.get(1)!.position).toBe(1)
    expect(st.finished).toBe(true)
  })

  it('ties two people knocked out in the same round', () => {
    const st = computeStandings(field, [ev(1, 4, 'OUT'), ev(1, 5, 'OUT')])
    expect(st.byId.get(4)!.position).toBe(4)
    expect(st.byId.get(5)!.position).toBe(4)
    expect(st.alive).toEqual([1, 2, 3])
  })

  it('orders people out in the same round when Steven ranks them by score', () => {
    const st = computeStandings(field, [ev(1, 4, 'OUT', 2), ev(1, 5, 'OUT', 1)])
    expect(st.byId.get(5)!.position).toBe(4)
    expect(st.byId.get(4)!.position).toBe(5)
    expect(st.byId.get(4)!.outRound).toBe(1) // still out in the same round
    // Three out: two share the better place, the worst scorer is below both.
    const three = computeStandings(field, [ev(1, 3, 'OUT', 1), ev(1, 4, 'OUT', 1), ev(1, 5, 'OUT', 2)])
    expect([3, 4, 5].map((id) => three.byId.get(id)!.position)).toEqual([3, 3, 5])
  })

  it('settles a head-to-head on that order instead of a dead heat', () => {
    const h2h = {
      kind: 'H2H' as const,
      topN: null,
      manualResult: null,
      outcomes: [
        { id: 1, competitorId: 4, isYes: null },
        { id: 2, competitorId: 5, isYes: null },
      ],
    }
    expect(resolveMarket(h2h, computeStandings(field, [ev(1, 4, 'OUT'), ev(1, 5, 'OUT')])).payouts!.get(1)).toBe(0.5)
    const ranked = resolveMarket(h2h, computeStandings(field, [ev(1, 4, 'OUT', 1), ev(1, 5, 'OUT', 2)]))
    expect(ranked.payouts!.get(1)).toBe(1)
    expect(ranked.payouts!.get(2)).toBe(0)
  })

  it('island competitors are still alive', () => {
    const st = computeStandings([1, 2], [ev(1, 2, 'TO_ISLAND')])
    expect(st.finished).toBe(false)
    expect(st.alive).toEqual([1, 2])
  })

  it('rejects impossible transitions', () => {
    expect(() => computeStandings(field, [ev(1, 1, 'RETURN')])).toThrow(/still in/)
    expect(() => computeStandings(field, [ev(1, 1, 'OUT'), ev(2, 1, 'OUT')])).toThrow(/out/)
    expect(() => computeStandings(field, [ev(1, 9, 'OUT')])).toThrow(/Not in this edition/)
  })
})

describe('resolveMarket', () => {
  const field = [1, 2, 3, 4]
  const winner: MarketLike = {
    kind: 'WINNER',
    topN: null,
    manualResult: null,
    outcomes: field.map((c) => ({ id: 100 + c, competitorId: c, isYes: null })),
  }
  const top2: MarketLike = {
    kind: 'TOP_N',
    topN: 2,
    manualResult: null,
    outcomes: [
      { id: 1, competitorId: 3, isYes: true },
      { id: 2, competitorId: 3, isYes: false },
    ],
  }
  const h2h: MarketLike = {
    kind: 'H2H',
    topN: null,
    manualResult: null,
    outcomes: [
      { id: 1, competitorId: 1, isYes: null },
      { id: 2, competitorId: 2, isYes: null },
    ],
  }

  it('winner: knocked-out competitors die, island ones do not', () => {
    const st = computeStandings(field, [ev(1, 4, 'OUT'), ev(2, 3, 'TO_ISLAND')])
    const r = resolveMarket(winner, st)
    expect([...r.dead]).toEqual([104])
    expect(r.payouts).toBeNull()
  })

  it('winner: pays the champion', () => {
    const st = computeStandings(field, [ev(1, 4, 'OUT'), ev(2, 3, 'OUT'), ev(3, 1, 'OUT')])
    const r = resolveMarket(winner, st)
    expect(r.payouts!.get(102)).toBe(1)
    expect(r.payouts!.get(101)).toBe(0)
  })

  it('top N: decided as soon as it is certain', () => {
    expect(resolveMarket(top2, computeStandings(field, [ev(1, 4, 'OUT')])).payouts).toBeNull()
    const made = resolveMarket(top2, computeStandings(field, [ev(1, 4, 'OUT'), ev(2, 1, 'OUT')]))
    expect(made.payouts!.get(1)).toBe(1) // 3 still alive with only 2 left
    const missed = resolveMarket(top2, computeStandings(field, [ev(1, 3, 'OUT')]))
    expect(missed.payouts!.get(2)).toBe(1)
    expect([...missed.dead]).toEqual([1])
  })

  it('head to head: first one out loses; same round is a dead heat', () => {
    expect(resolveMarket(h2h, computeStandings(field, [ev(1, 4, 'OUT')])).payouts).toBeNull()
    const r = resolveMarket(h2h, computeStandings(field, [ev(1, 2, 'OUT')]))
    expect(r.payouts!.get(1)).toBe(1)
    const tie = resolveMarket(h2h, computeStandings(field, [ev(1, 1, 'OUT'), ev(1, 2, 'OUT')]))
    expect(tie.payouts!.get(1)).toBe(0.5)
    expect(tie.payouts!.get(2)).toBe(0.5)
  })

  it('custom: waits for the admin', () => {
    const m: MarketLike = { ...h2h, kind: 'CUSTOM', manualResult: null }
    expect(resolveMarket(m, computeStandings(field, [])).payouts).toBeNull()
    const done = resolveMarket({ ...m, manualResult: { 2: 1 } }, computeStandings(field, []))
    expect(done.payouts!.get(2)).toBe(1)
    expect([...done.dead]).toEqual([1])
  })
})

describe('history priors', () => {
  it('favours past champions over first-timers', () => {
    const [jack, newbie] = winnerProbabilities(['Jack', 'Nobody New'])
    expect(jack).toBeGreaterThan(newbie)
    const field = ['Megan', 'Jack', 'Jody', 'Tyler', 'Laura', 'Nobody New']
    const p = winnerProbabilities(field)
    expect(p.reduce((s, x) => s + x, 0)).toBeCloseTo(1)
    expect(Math.min(...p)).toBeGreaterThan(0.15 / field.length)
  })

  it('top N and head-to-head stay within sane bounds', () => {
    expect(topNProbability('Megan', 5, 24)).toBeGreaterThan(topNProbability('Nobody New', 5, 24))
    expect(topNProbability('Nobody New', 5, 25)).toBeCloseTo(0.2)
    const h = headToHeadProbability('Megan', 'Kiera')
    expect(h).toBeGreaterThan(0.5)
    expect(headToHeadProbability('Kiera', 'Megan')).toBeCloseTo(1 - h)
  })
})

describe('copper cup market', () => {
  const m: MarketLike = {
    kind: 'COPPER',
    topN: null,
    manualResult: null,
    outcomes: [1, 2, 3].map((c) => ({ id: 10 + c, competitorId: c, isYes: null })),
  }
  const withCopper = (final: boolean, totals: [number, number][]) => {
    const st = computeStandings([1, 2, 3], [])
    st.copper = { final, totals: new Map(totals) }
    return st
  }

  it('waits until the admin finalises the table', () => {
    expect(resolveMarket(m, withCopper(false, [[1, 30]])).payouts).toBeNull()
  })

  it('pays the top scorer, and splits a tie', () => {
    const r = resolveMarket(m, withCopper(true, [[1, 30], [2, 12]]))
    expect(r.payouts!.get(11)).toBe(1)
    expect([...r.dead].sort()).toEqual([12, 13])
    const tie = resolveMarket(m, withCopper(true, [[1, 20], [3, 20]]))
    expect(tie.payouts!.get(11)).toBe(0.5)
    expect(tie.payouts!.get(13)).toBe(0.5)
  })
})

import { ordinalSuffix, parseCopperPoints } from './copper'

describe('copper cup points', () => {
  it('reads typed points: blank is no score, 0 counts', () => {
    expect(parseCopperPoints('  ')).toBeNull()
    expect(parseCopperPoints('0')).toBe(0)
    expect(parseCopperPoints(' 12 ')).toBe(12)
    expect(parseCopperPoints('2.5')).toBe(2.5)
  })
  it('rejects nonsense and likely typos', () => {
    expect(() => parseCopperPoints('five')).toThrow('isn’t a number')
    expect(() => parseCopperPoints('-2')).toThrow('isn’t a number')
    expect(() => parseCopperPoints('35000')).toThrow('typo')
  })
  it('writes places', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 17, 21, 22].map((n) => n + ordinalSuffix(n))).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '17th', '21st', '22nd',
    ])
  })
})

describe('cashOutCents', () => {
  // A thin yes/no market like the Top 10s: liquidity 50, opening at 40% yes.
  const b = 50
  const open = seedQuantities([0.4, 0.6], b)
  const view = (q: number[], dead: boolean[] = [false, false]) => {
    const p = prices(q, b)
    return [
      { id: 1, q: q[0], price: p[0], dead: dead[0] },
      { id: 2, q: q[1], price: p[1], dead: dead[1] },
    ]
  }

  it('values a fresh $10 bet at about $10, not at shares × the new price', () => {
    const shares = sharesForSpend(open, b, 0, 10)
    const after = [open[0] + shares, open[1]]
    const markToLast = Math.floor(shares * prices(after, b)[0] * 100)
    expect(markToLast).toBeGreaterThan(1100) // the old way showed a $1+ paper profit
    expect(cashOutCents(view(after), b, false, 1, shares)).toBeGreaterThanOrEqual(999)
    expect(cashOutCents(view(after), b, false, 1, shares)).toBeLessThanOrEqual(1000)
  })

  it('shows a real gain once someone else bets the price up', () => {
    const mine = sharesForSpend(open, b, 0, 10)
    const q1 = [open[0] + mine, open[1]]
    const theirs = sharesForSpend(q1, b, 0, 20)
    const q2 = [q1[0] + theirs, q1[1]]
    expect(cashOutCents(view(q2), b, false, 1, mine)).toBeGreaterThan(1100)
  })

  it('uses the payout once the result is in, and zero for a dead outcome', () => {
    const settled = [
      { id: 1, q: 0, price: 1, dead: false },
      { id: 2, q: 0, price: 0, dead: true },
    ]
    expect(cashOutCents(settled, b, true, 1, 12.5)).toBe(1250)
    expect(cashOutCents(settled, b, true, 2, 12.5)).toBe(0)
    expect(cashOutCents(view(open), b, false, 3, 5)).toBe(0) // not an outcome of this market
  })
})

describe('self-settling specials', () => {
  const field = [1, 2, 3, 4, 5]
  const market = (manualResult: unknown, ids = field): MarketLike => ({
    kind: 'CUSTOM',
    topN: null,
    manualResult,
    outcomes: ids.map((id) => ({ id: id * 10, competitorId: id, isYes: null })),
  })
  const log = [ev(1, 5, 'TO_ISLAND'), ev(2, 4, 'TO_ISLAND'), ev(2, 3, 'TO_ISLAND'), ev(3, 5, 'OUT')]

  it('stay open until the thing happens', () => {
    const st = computeStandings(field, [])
    expect(resolveMarket(market({ auto: 'FIRST_ISLAND' }), st).payouts).toBeNull()
    expect(resolveMarket(market({ auto: 'ROUND_LOSER', round: 1 }), st).payouts).toBeNull()
  })

  it('pay the first person sent to the island, and the first one out for good', () => {
    const st = computeStandings(field, log)
    const island = resolveMarket(market({ auto: 'FIRST_ISLAND' }), st)
    expect(island.payouts!.get(50)).toBe(1)
    expect(island.payouts!.get(40)).toBe(0)
    expect(resolveMarket(market({ auto: 'FIRST_OUT' }), st).payouts!.get(50)).toBe(1)
  })

  it('split a round between two losers, and ignore island knockouts', () => {
    const st = computeStandings(field, log)
    const r2 = resolveMarket(market({ auto: 'ROUND_LOSER', round: 2 }, [1, 2, 3, 4]), st)
    expect(r2.payouts!.get(30)).toBe(0.5)
    expect(r2.payouts!.get(40)).toBe(0.5)
    expect(r2.payouts!.get(10)).toBe(0)
    // Round 3: only an islander went out, so nobody in the main game lost yet.
    expect(resolveMarket(market({ auto: 'ROUND_LOSER', round: 3 }, [1, 2]), st).payouts).toBeNull()
  })

  it('leave hand-settled custom markets alone', () => {
    const st = computeStandings(field, log)
    expect(resolveMarket(market(null), st).payouts).toBeNull()
    expect(resolveMarket(market({ 10: 1 }), st).payouts!.get(10)).toBe(1)
  })
})
