import { prisma } from '../prisma'
import { seedQuantities } from './lmsr'
import { AUTO_LIQUIDITY, coherentTopN, DEFAULT_LIQUIDITY, normaliseOdds, OPENING_BAND } from './marketDefaults'
import { prices, maxHouseLoss } from './lmsr'
import { autoRule } from './resolve'
import { headToHeadProbability, topNProbability, winnerProbabilities } from './history'
import { computeStandings } from './standings'
import type { AutoRule } from './resolve'

export { AUTO_LIQUIDITY }

export function autoQuestion(rule: AutoRule): string {
  if (rule.auto === 'FIRST_ISLAND') return 'Who goes to Redemption Island first?'
  if (rule.auto === 'FIRST_OUT') return 'Who is knocked out for good first?'
  return `Who loses round ${rule.round}?`
}

export type MarketSpec =
  | { kind: 'WINNER' }
  | { kind: 'COPPER' }
  | { kind: 'TOP_N'; competitorId: number; n: number }
  | { kind: 'H2H'; a: number; b: number }
  | { kind: 'CUSTOM'; question: string; options: string[] }
  | { kind: 'AUTO'; rule: AutoRule }

export { DEFAULT_LIQUIDITY }

interface Draft {
  question: string
  topN?: number
  manualResult?: AutoRule
  outcomes: { label: string; competitorId?: number; isYes?: boolean; p: number }[]
}

async function draft(editionId: number, spec: MarketSpec): Promise<Draft> {
  const edition = await prisma.pdEdition.findUniqueOrThrow({
    where: { id: editionId },
    include: { entries: { include: { competitor: true } } },
  })
  const field = edition.entries.map((e) => e.competitor).sort((a, b) => a.name.localeCompare(b.name))
  const byId = new Map(field.map((c) => [c.id, c]))
  const need = (id: number) => {
    const c = byId.get(id)
    if (!c) throw new Error('Competitor is not in this edition')
    return c
  }

  switch (spec.kind) {
    case 'WINNER': {
      if (field.length < 2) throw new Error('Set the field first')
      const p = winnerProbabilities(field.map((c) => c.name))
      return {
        question: `Who wins Iron Man ${edition.number}?`,
        outcomes: field.map((c, i) => ({ label: c.name, competitorId: c.id, p: p[i] })),
      }
    }
    case 'COPPER': {
      if (field.length < 2) throw new Error('Set the field first')
      // All-round form is the best guide we have to Copper Cup points.
      const p = winnerProbabilities(field.map((c) => c.name))
      return {
        question: `Who wins the Iron Man ${edition.number} Copper Cup?`,
        outcomes: field.map((c, i) => ({ label: c.name, competitorId: c.id, p: p[i] })),
      }
    }
    case 'TOP_N': {
      const c = need(spec.competitorId)
      if (!(spec.n >= 1 && spec.n < field.length)) throw new Error(`Top N must be between 1 and ${field.length - 1}`)
      const p = topNProbability(c.name, spec.n, field.length)
      return {
        question: spec.n === 1 ? `Will ${c.name} win?` : `Will ${c.name} finish top ${spec.n}?`,
        topN: spec.n,
        outcomes: [
          { label: 'Yes', competitorId: c.id, isYes: true, p },
          { label: 'No', competitorId: c.id, isYes: false, p: 1 - p },
        ],
      }
    }
    case 'H2H': {
      const a = need(spec.a)
      const b = need(spec.b)
      if (a.id === b.id) throw new Error('Pick two different people')
      const p = headToHeadProbability(a.name, b.name)
      return {
        question: `${a.name} vs ${b.name}: who lasts longer?`,
        outcomes: [
          { label: a.name, competitorId: a.id, p },
          { label: b.name, competitorId: b.id, p: 1 - p },
        ],
      }
    }
    case 'AUTO': {
      // One outcome per person still in the main game; weaker form = likelier to lose.
      const results = await prisma.pdResultEvent.findMany({ where: { editionId }, orderBy: { id: 'asc' } })
      const st = computeStandings(
        field.map((c) => c.id),
        results,
      )
      const pool =
        spec.rule.auto === 'FIRST_OUT'
          ? field.filter((c) => st.byId.get(c.id)!.status !== 'OUT')
          : field.filter((c) => st.byId.get(c.id)!.status === 'IN')
      if (pool.length < 3) throw new Error('Not enough people left for that market')
      const strength = winnerProbabilities(pool.map((c) => c.name))
      const weak = strength.map((p) => 1 / Math.sqrt(p))
      const total = weak.reduce((s, w) => s + w, 0)
      return {
        question: autoQuestion(spec.rule),
        manualResult: spec.rule,
        outcomes: pool.map((c, i) => ({ label: c.name, competitorId: c.id, p: weak[i] / total })),
      }
    }
    case 'CUSTOM': {
      const options = spec.options.map((o) => o.trim()).filter(Boolean)
      if (!spec.question.trim()) throw new Error('Write the question')
      if (options.length < 2) throw new Error('Give at least two options')
      if (new Set(options).size !== options.length) throw new Error('Options must all be different')
      return {
        question: spec.question.trim(),
        outcomes: options.map((label) => ({ label, p: 1 / options.length })),
      }
    }
  }
}

export async function createMarket(
  editionId: number,
  spec: MarketSpec,
  b: number = spec.kind === 'AUTO' ? AUTO_LIQUIDITY : DEFAULT_LIQUIDITY[spec.kind],
  /** Admin-set opening odds as {outcome label: weight}, scaled to 100%. */
  openingOdds?: Record<string, number>,
) {
  const d = await draft(editionId, spec)
  if (openingOdds) {
    const p = normaliseOdds(d.outcomes.map((o) => Number(openingOdds[o.label])))
    if (!p) throw new Error('Opening odds must be set for every outcome, each at least 0.5%')
    d.outcomes.forEach((o, i) => (o.p = p[i]))
  }
  const q = seedQuantities(
    d.outcomes.map((o) => o.p),
    b,
  )
  return prisma.pdMarket.create({
    data: {
      editionId,
      kind: spec.kind === 'AUTO' ? 'CUSTOM' : spec.kind,
      manualResult: d.manualResult,
      question: d.question,
      topN: d.topN,
      b,
      outcomes: {
        create: d.outcomes.map((o, i) => ({
          label: o.label,
          competitorId: o.competitorId,
          isYes: o.isYes,
          sort: i,
          q: q[i],
        })),
      },
    },
  })
}

/**
 * Sets new odds ({outcome id: weight}, scaled to 100%) on a market nobody has
 * bet on yet. Once there's a bet the price belongs to the market, so this
 * refuses; the check runs under a lock so a bet placed meanwhile wins.
 */
export async function setUnbetOdds(marketId: number, odds: Record<string, number>) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "polydan_markets" WHERE id = ${marketId} FOR UPDATE`
    const m = await tx.pdMarket.findUniqueOrThrow({
      where: { id: marketId },
      include: { outcomes: { orderBy: [{ sort: 'asc' }, { id: 'asc' }] } },
    })
    if (m.status !== 'OPEN' && m.status !== 'CLOSED') throw new Error('That market is finished')
    if (await tx.pdTrade.count({ where: { marketId } })) throw new Error('Someone has bet on it, so the odds are locked')
    const p = normaliseOdds(m.outcomes.map((o) => Number(odds[o.id])))
    if (!p) throw new Error('Odds must be set for every outcome, each at least 0.5%')
    const q = seedQuantities(p, m.b)
    for (const [i, o] of m.outcomes.entries()) await tx.pdOutcome.update({ where: { id: o.id }, data: { q: q[i] } })
    return m
  })
}

/**
 * House-risk tune-up for markets nobody has bet on yet (bets lock a market's
 * terms, so those are left alone). Each one keeps its opening odds but:
 *  - drops to the current default liquidity for its kind, which is what caps
 *    the house's loss;
 *  - top-N chances are made coherent across the field (they sum to N) and
 *    every two-way market is kept inside the opening band;
 *  - long lists (winner-style) get a floor on the smallest chance.
 * Returns the worst-case totals before and after.
 */
export async function retuneUnbetMarkets(editionId: number) {
  const markets = await prisma.pdMarket.findMany({
    where: { editionId, status: { in: ['OPEN', 'CLOSED'] }, trades: { none: {} } },
    include: { outcomes: { orderBy: [{ sort: 'asc' }, { id: 'asc' }] } },
  })
  const bet = await prisma.pdMarket.findMany({
    where: { editionId, kind: 'TOP_N', status: { in: ['OPEN', 'CLOSED'] }, trades: { some: {} } },
    include: { outcomes: { orderBy: [{ sort: 'asc' }, { id: 'asc' }] } },
  })
  const open = markets.map((m) => ({ m, p: prices(m.outcomes.map((o) => o.q), m.b) }))
  const risk = (q: number[], b: number) => maxHouseLoss(q, b)
  const before = open.reduce((s, x) => s + risk(x.m.outcomes.map((o) => o.q), x.m.b), 0)

  // Top-N: fix each N as a group so the Yes chances add up to N.
  const target = new Map<number, number[]>()
  const ns = [...new Set(open.filter((x) => x.m.kind === 'TOP_N').map((x) => x.m.topN ?? 1))]
  for (const n of ns) {
    const group = open.filter((x) => x.m.kind === 'TOP_N' && (x.m.topN ?? 1) === n)
    const yesAt = (x: (typeof group)[number]) => x.m.outcomes.findIndex((o) => o.isYes)
    // Markets that already have bets keep their price, so the rest share what's left of N.
    const taken = bet
      .filter((m) => (m.topN ?? 1) === n)
      .reduce((sum, m) => sum + prices(m.outcomes.map((o) => o.q), m.b)[m.outcomes.findIndex((o) => o.isYes)], 0)
    const fixed = coherentTopN(group.map((x) => x.p[yesAt(x)]), Math.max(n - taken, 0.5))
    group.forEach((x, i) => target.set(x.m.id, x.m.outcomes.map((o) => (o.isYes ? fixed[i] : 1 - fixed[i]))))
  }
  let after = 0
  let changed = 0
  for (const { m, p } of open) {
    const auto = m.kind === 'CUSTOM' && autoRule(m.manualResult)
    const b = Math.min(m.b, auto ? AUTO_LIQUIDITY : DEFAULT_LIQUIDITY[m.kind])
    let probs = target.get(m.id) ?? p
    if (m.outcomes.length === 2) {
      const a = Math.min(OPENING_BAND[1], Math.max(OPENING_BAND[0], probs[0]))
      probs = [a, 1 - a]
    } else {
      // Many outcomes: nobody opens below 2.5%, then rescale to 100%.
      const floored = probs.map((x) => Math.max(x, 0.025))
      const total = floored.reduce((s, x) => s + x, 0)
      probs = floored.map((x) => x / total)
    }
    const q = seedQuantities(probs, b)
    after += risk(q, b)
    if (b === m.b && probs.every((x, i) => Math.abs(x - p[i]) < 1e-6)) continue
    changed++
    await prisma.$transaction(async (tx) => {
      // Re-check under a lock: a bet placed in the meantime wins, and the market is left as it is.
      await tx.$queryRaw`SELECT id FROM "polydan_markets" WHERE id = ${m.id} FOR UPDATE`
      if (await tx.pdTrade.count({ where: { marketId: m.id } })) return
      await tx.pdMarket.update({ where: { id: m.id }, data: { b } })
      for (const [i, o] of m.outcomes.entries()) await tx.pdOutcome.update({ where: { id: o.id }, data: { q: q[i] } })
    })
  }
  return { markets: open.length, changed, beforeCents: Math.round(before * 100), afterCents: Math.round(after * 100) }
}
