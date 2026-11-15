import { describe, expect, it } from 'vitest'
import { computeStandings, type ResultEventLike } from './standings'
import { resolveMarket, type MarketLike } from './resolve'
import { modelProbabilities, requoteShift } from './model'
import { prices, seedQuantities } from './lmsr'
import { stakeAfterCut } from './stake'

// Twelve players. Rounds 1–3 send five to the island; the island finale
// (round 4) sends one back and knocks four out together, as at Iron Man 10.
const FIELD = Array.from({ length: 12 }, (_, i) => i + 1)
const ev = (round: number, competitorId: number, kind: ResultEventLike['kind']): ResultEventLike => ({ round, competitorId, kind })
const toIsland = [ev(1, 1, 'TO_ISLAND'), ev(1, 2, 'TO_ISLAND'), ev(2, 3, 'TO_ISLAND'), ev(2, 4, 'TO_ISLAND'), ev(3, 5, 'TO_ISLAND')]
const finale = [ev(4, 1, 'RETURN'), ev(4, 2, 'OUT'), ev(4, 3, 'OUT'), ev(4, 4, 'OUT'), ev(4, 5, 'OUT')]

const topN = (competitorId: number, n: number): MarketLike => ({
  kind: 'TOP_N',
  topN: n,
  manualResult: null,
  outcomes: [
    { id: 1, competitorId, isYes: true },
    { id: 2, competitorId, isYes: false },
  ],
})
const even = () => 1

describe('dead heat on a tie across the top-N cut-off', () => {
  // After the finale 8 are left, so the four who went out together share 9th.
  const st = computeStandings(FIELD, [...toIsland, ...finale])

  it('splits the places that are left between the people who tied', () => {
    expect(st.byId.get(2)!.position).toBe(9)
    // Top 10: places 9 and 10 are left for four people → each pays half.
    const r = resolveMarket(topN(2, 10), st)
    expect(r.payouts!.get(1)).toBeCloseTo(0.5)
    expect(r.payouts!.get(2)).toBeCloseTo(0.5)
    expect(r.dead.size).toBe(0)
    // Top 9: one place for four people.
    expect(resolveMarket(topN(2, 9), st).payouts!.get(1)).toBeCloseTo(0.25)
  })

  it('pays in full when the whole tie is inside, and nothing when it is outside', () => {
    expect(resolveMarket(topN(2, 12), st).payouts!.get(1)).toBe(1)
    expect(resolveMarket(topN(2, 8), st).payouts!.get(1)).toBe(0)
  })

  it('keeps the old everyone-counts rule for editions already paid', () => {
    const old = { ...st, deadHeat: false }
    expect(resolveMarket(topN(2, 10), old).payouts!.get(1)).toBe(1)
  })
})

describe('the odds follow the results', () => {
  const start = computeStandings(FIELD, [])
  const mid = computeStandings(FIELD, toIsland)
  const after = computeStandings(FIELD, [...toIsland, ...finale])

  it('lifts top-N chances as the field shrinks, and cuts them on the island', () => {
    const p0 = modelProbabilities(topN(6, 8), start, even)![0]
    const pMain = modelProbabilities(topN(6, 8), mid, even)![0]
    const pIsland = modelProbabilities(topN(1, 8), mid, even)![0]
    expect(p0).toBeCloseTo(8 / 12, 2)
    expect(pMain).toBeGreaterThan(p0)
    expect(pIsland).toBeLessThan(p0)
    // 8 left and 8 places: certain, so the market is decided rather than quoted.
    expect(modelProbabilities(topN(6, 8), after, even)).toBeNull()
  })

  it('moves a market by the model’s change, on top of what the crowd did', () => {
    const b = 12
    // The crowd has this at 30% although it opened at the model's 67%.
    const q = seedQuantities([0.3, 0.7], b)
    const shift = requoteShift(modelProbabilities(topN(6, 8), start, even), modelProbabilities(topN(6, 8), mid, even), b)!
    const p = prices(q.map((x, i) => x + shift[i]), b)
    expect(p[0]).toBeGreaterThan(0.3)
    expect(p[0]).toBeLessThan(modelProbabilities(topN(6, 8), mid, even)![0])
    // Undoing the round moves it straight back.
    const back = requoteShift(modelProbabilities(topN(6, 8), mid, even), modelProbabilities(topN(6, 8), start, even), b)!
    expect(prices(q.map((x, i) => x + shift[i] + back[i]), b)[0]).toBeCloseTo(0.3, 9)
  })

  it('says nothing when a round changes nothing for the market', () => {
    const m = modelProbabilities(topN(6, 8), mid, even)
    expect(requoteShift(m, m, 12)).toBeNull()
    expect(modelProbabilities({ kind: 'COPPER', topN: null, manualResult: null, outcomes: [] }, mid, even)).toBeNull()
  })

  it('marks islanders down in the winner market and drops people who are out', () => {
    const winner: MarketLike = {
      kind: 'WINNER',
      topN: null,
      manualResult: null,
      outcomes: FIELD.map((id) => ({ id, competitorId: id, isYes: null })),
    }
    const p = modelProbabilities(winner, mid, even)!
    expect(p[0]).toBeCloseTo(p[5] * 0.4, 6) // 1 is on the island, 6 is in the main game
    const end = modelProbabilities(winner, after, even)!
    expect(end[1]).toBeLessThan(0.01) // 2 is out
  })
})

describe('past form fades as the field shrinks', () => {
  const winner: MarketLike = {
    kind: 'WINNER',
    topN: null,
    manualResult: null,
    outcomes: FIELD.map((id) => ({ id, competitorId: id, isYes: null })),
  }
  // Player 12 is four times the favourite that player 11 is.
  const form = (id: number) => (id === 12 ? 4 : 1)

  it('closes the gap between a favourite and an outsider who are both still in', () => {
    const start = modelProbabilities(winner, computeStandings(FIELD, []), form)!
    expect(start[11] / start[10]).toBeCloseTo(4, 6)
    const late = computeStandings(
      FIELD,
      FIELD.slice(0, 9).map((id, i) => ev(i + 1, id, 'OUT')),
    )
    const end = modelProbabilities(winner, late, form)!
    expect(end[11] / end[10]).toBeLessThan(1.5) // 3 of 12 left
    expect(end[11] / end[10]).toBeGreaterThan(1)
  })
})

describe('house cut', () => {
  it('takes its share off the stake before shares are bought', () => {
    expect(stakeAfterCut(1000, 5)).toBe(9.5)
    expect(stakeAfterCut(1000, 0)).toBe(10)
    expect(stakeAfterCut(333, 5)).toBe(3.16) // the cut rounds to a whole cent
  })
})
