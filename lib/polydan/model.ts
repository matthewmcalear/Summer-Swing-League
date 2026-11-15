// The house's own read of each market given who is still in, on the island or
// out. It is only ever used as a *change*: when a round is recorded, each
// market's odds are moved by how much this model moved (lib/polydan/requote.ts),
// so the crowd's bets still count but stale odds can't be picked off.
//
// Iron Man 10 showed why: with 9 left in the main game, "top 10" markets were
// still quoting the odds from before the event, because only bets moved them.

import type { Standings } from './standings'
import type { MarketLike } from './resolve'
import { autoRule } from './resolve'
import { coherentTopN } from './marketDefaults'

/** Someone on Redemption Island still has to get back in: their chances count for this much. */
export const ISLAND_FACTOR = 0.4
const FLOOR = 0.002

/**
 * The model's probability for each outcome of a market, in outcome order, or
 * null when standings say nothing about it (Copper Cup, admin-settled props,
 * markets already decided). `strength` is each competitor's pre-event form
 * (any positive scale).
 */
export function modelProbabilities(market: MarketLike, st: Standings, strength: (competitorId: number) => number): number[] | null {
  const status = (id: number | null) => (id == null ? undefined : st.byId.get(id)?.status)
  // Past form matters less the further in we are: whoever is still standing
  // late on has earned it, whatever history said. So form is flattened by the
  // share of the field left (20 of 20: full weight; 5 of 20: nearly level).
  const flatten = st.byId.size ? Math.max(0.15, st.alive.length / st.byId.size) : 1
  // Form, discounted on the island, zero once out.
  const w = (id: number | null) => {
    const s = status(id)
    if (id == null || !s || s === 'OUT') return 0
    return Math.pow(strength(id), flatten) * (s === 'ISLAND' ? ISLAND_FACTOR : 1)
  }
  const normal = (xs: number[]) => {
    const floored = xs.map((x) => Math.max(x, 0))
    const total = floored.reduce((s, x) => s + x, 0)
    return total > 0 ? floored.map((x) => Math.max(FLOOR, x / total)) : null
  }
  const { outcomes } = market

  switch (market.kind) {
    case 'WINNER':
      return normal(outcomes.map((o) => w(o.competitorId)))

    case 'TOP_N': {
      const yes = outcomes.find((o) => o.isYes)
      const n = market.topN ?? 1
      if (!yes || status(yes.competitorId) === 'OUT' || st.alive.length <= n) return null
      // Everyone still alive shares the N places; scale their odds so the chances add up to N.
      const weights = st.alive.map((id) => w(id))
      const total = weights.reduce((s, x) => s + x, 0)
      const chances = coherentTopN(
        weights.map((x) => x / total / (1 + x / total)),
        n,
        [0.02, 0.98],
      )
      const p = chances[st.alive.indexOf(yes.competitorId!)]
      if (p == null) return null
      return outcomes.map((o) => (o.isYes ? p : 1 - p))
    }

    case 'H2H': {
      const [a, b] = outcomes.map((o) => w(o.competitorId))
      if (!(a > 0) || !(b > 0)) return null
      return [a / (a + b), b / (a + b)]
    }

    case 'CUSTOM': {
      const rule = autoRule(market.manualResult)
      if (!rule) return null
      // Weaker form = likelier to lose, as when the market opened.
      const weak = (id: number | null) => (id == null ? 0 : 1 / Math.sqrt(strength(id)))
      if (rule.auto === 'ROUND_LOSER')
        // Only people in the main game can lose the round.
        return normal(outcomes.map((o) => (status(o.competitorId) === 'IN' ? weak(o.competitorId) : 0)))
      if (rule.auto === 'FIRST_OUT')
        // People already on the island are one loss from being out.
        return normal(
          outcomes.map((o) => {
            const s = status(o.competitorId)
            return s === 'OUT' || !s ? 0 : weak(o.competitorId) * (s === 'ISLAND' ? 6 : 1)
          }),
        )
      return null
    }

    default:
      return null
  }
}

/**
 * How far to move each outcome's LMSR quantity so the market's odds change by
 * the same factor the model's did. LMSR prices are ∝ exp(q / b), so adding
 * b·ln(after / before) multiplies each price by that ratio (then they
 * re-normalise). Null when the model has nothing to say or didn't move.
 */
export function requoteShift(before: number[] | null, after: number[] | null, b: number): number[] | null {
  if (!before || !after || before.length !== after.length) return null
  const shift = after.map((p, i) => b * (Math.log(Math.max(p, FLOOR)) - Math.log(Math.max(before[i], FLOOR))))
  // Only differences between outcomes matter; centre so quantities don't drift.
  const mean = shift.reduce((s, x) => s + x, 0) / shift.length
  const centred = shift.map((x) => x - mean)
  return centred.some((x) => Math.abs(x) > 1e-9) ? centred : null
}
