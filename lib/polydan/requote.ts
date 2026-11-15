// Moves the odds on open markets when a round is recorded (or undone), so the
// house's prices follow the results instead of waiting for someone to bet the
// stale ones. Bets already placed are untouched: only the price of the next
// share changes. Every move is logged (PdRequote) for the chart and the audit.

import { prisma } from '../prisma'
import { prices } from './lmsr'
import { modelProbabilities, requoteShift } from './model'
import { resolveMarket } from './resolve'
import type { Standings } from './standings'
import { winnerProbabilities } from './history'

export async function requoteMarkets(editionId: number, before: Standings, after: Standings, round: number): Promise<number> {
  const [entries, markets] = await Promise.all([
    prisma.pdEditionEntry.findMany({ where: { editionId }, include: { competitor: true } }),
    prisma.pdMarket.findMany({
      where: { editionId, status: { in: ['OPEN', 'CLOSED'] } },
      include: { outcomes: { orderBy: [{ sort: 'asc' }, { id: 'asc' }] } },
    }),
  ])
  const form = winnerProbabilities(entries.map((e) => e.competitor.name))
  const strengthOf = new Map(entries.map((e, i) => [e.competitorId, form[i]]))
  const strength = (id: number) => strengthOf.get(id) ?? 1 / Math.max(entries.length, 1)

  let moved = 0
  for (const m of markets) {
    const resolution = resolveMarket(m, after)
    if (resolution.payouts) continue // decided: it's locked, nothing to quote
    const shift = requoteShift(modelProbabilities(m, before, strength), modelProbabilities(m, after, strength), m.b)
    const live = m.outcomes.filter((o) => !resolution.dead.has(o.id))
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "polydan_markets" WHERE id = ${m.id} FOR UPDATE`
      const fresh = await tx.pdOutcome.findMany({ where: { marketId: m.id } })
      const q = new Map(fresh.map((o) => [o.id, o.q]))
      if (shift) {
        for (const [i, o] of m.outcomes.entries()) {
          if (Math.abs(shift[i]) < 1e-9) continue
          q.set(o.id, (q.get(o.id) ?? 0) + shift[i])
          await tx.pdOutcome.update({ where: { id: o.id }, data: { q: { increment: shift[i] }, adj: { increment: shift[i] } } })
        }
        moved++
      }
      // Log the odds after this round even if only the field changed (someone
      // going out re-prices a winner market by itself), so charts step per round.
      if (live.length) {
        const p = prices(live.map((o) => q.get(o.id) ?? 0), m.b)
        await tx.pdRequote.create({
          data: { marketId: m.id, round, prices: Object.fromEntries(live.map((o, i) => [o.id, p[i]])) },
        })
      }
    })
  }
  return moved
}
