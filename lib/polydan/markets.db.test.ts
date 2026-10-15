// End-to-end money flow against a real Postgres. Not part of `npm test`; run:
//   createdb polydan_test && DATABASE_URL=postgresql://$USER@localhost:5432/polydan_test npx prisma db push
//   DB_TESTS=1 DATABASE_URL=postgresql://$USER@localhost:5432/polydan_test npx vitest run lib/polydan/markets.db.test.ts
// It truncates the polydan_* tables, so it refuses any database not named polydan_test.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../prisma'
import { balanceCents, deleteMarket, executeTrade, settleMarket, TradeError, voidMarket } from './markets'
import { createMarket } from './createMarket'

if (!process.env.DATABASE_URL?.includes('polydan_test')) throw new Error('Refusing to run against a non-test database')

let editionId: number
const users: Record<string, number> = {}
const comp: Record<string, number> = {}

async function wipe() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE polydan_trades, polydan_positions, polydan_outcomes, polydan_ledger, polydan_markets, polydan_results, polydan_edition_entries, polydan_editions, polydan_competitors, polydan_users RESTART IDENTITY CASCADE',
  )
}

async function knock(round: number, name: string, kind: 'OUT' | 'TO_ISLAND' | 'RETURN' = 'OUT') {
  await prisma.pdResultEvent.create({ data: { editionId, round, competitorId: comp[name], kind } })
}

beforeAll(async () => {
  await wipe()
  for (const n of ['Ann', 'Ben', 'Cat']) {
    users[n] = (await prisma.pdUser.create({ data: { name: n, pinHash: 'x:y' } })).id
    await prisma.pdLedgerEntry.create({ data: { userId: users[n], kind: 'DEPOSIT', amountCents: 10000 } })
  }
  const e = await prisma.pdEdition.create({ data: { number: 10, status: 'LIVE' } })
  editionId = e.id
  for (const n of ['Megan', 'Jack', 'Jody', 'Newbie']) {
    comp[n] = (await prisma.pdCompetitor.create({ data: { name: n } })).id
    await prisma.pdEditionEntry.create({ data: { editionId, competitorId: comp[n] } })
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

const outcomeFor = async (marketId: number, label: string) =>
  (await prisma.pdOutcome.findFirstOrThrow({ where: { marketId, label } })).id

describe('money flow', () => {
  it('runs a winner market from first bet to payout', async () => {
    const m = await createMarket(editionId, { kind: 'WINNER' })
    const jack = await outcomeFor(m.id, 'Jack')
    const newbie = await outcomeFor(m.id, 'Newbie')

    const a = await executeTrade({ side: 'BUY', userId: users.Ann, outcomeId: jack, spendCents: 2000 })
    expect(a.shares).toBeGreaterThan(20) // bought below $1/share
    await executeTrade({ side: 'BUY', userId: users.Ben, outcomeId: newbie, spendCents: 1000 })
    expect(await balanceCents(prisma, users.Ann)).toBe(8000)

    // Selling half back returns less than half the stake (price impact + rounding).
    const sold = await executeTrade({ side: 'SELL', userId: users.Ann, outcomeId: jack, shares: a.shares / 2 })
    expect(-sold.costCents).toBeLessThanOrEqual(1000)
    await expect(
      executeTrade({ side: 'SELL', userId: users.Ann, outcomeId: jack, shares: a.shares }),
    ).rejects.toThrow(TradeError)

    // Newbie goes out: their outcome is dead and can't be bought.
    await knock(1, 'Newbie')
    await expect(
      executeTrade({ side: 'BUY', userId: users.Cat, outcomeId: newbie, spendCents: 500 }),
    ).rejects.toThrow(/can't win/)
    await expect(settleMarket(m.id)).rejects.toThrow(/not known/)

    // Megan to the island and back, Jody out, Megan out → Jack wins.
    await knock(2, 'Megan', 'TO_ISLAND')
    await knock(3, 'Jody')
    await knock(3, 'Megan', 'RETURN')
    await knock(4, 'Megan')
    await expect(
      executeTrade({ side: 'BUY', userId: users.Cat, outcomeId: jack, spendCents: 500 }),
    ).rejects.toThrow(/Result is in/)

    const held = (await prisma.pdPosition.findUniqueOrThrow({ where: { userId_outcomeId: { userId: users.Ann, outcomeId: jack } } })).shares
    const before = await balanceCents(prisma, users.Ann)
    const r = await settleMarket(m.id)
    expect(r.winners).toBe(1)
    expect(await balanceCents(prisma, users.Ann)).toBe(before + Math.floor(held * 100 + 1e-6))
    await expect(settleMarket(m.id)).rejects.toThrow(/Already/)
  })

  it('never lets concurrent bets overspend a balance', async () => {
    await prisma.pdResultEvent.deleteMany({ where: { editionId } })
    const m = await createMarket(editionId, { kind: 'H2H', a: comp.Megan, b: comp.Jody })
    const megan = await outcomeFor(m.id, 'Megan')
    const start = await balanceCents(prisma, users.Cat)
    const bets = Array.from({ length: 8 }, () =>
      executeTrade({ side: 'BUY', userId: users.Cat, outcomeId: megan, spendCents: Math.floor(start / 3) }),
    )
    const results = await Promise.allSettled(bets)
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(3)
    expect(await balanceCents(prisma, users.Cat)).toBeGreaterThanOrEqual(0)

    // Shares sold equal the sum of everyone's positions.
    const outcome = await prisma.pdOutcome.findUniqueOrThrow({ where: { id: megan } })
    const positions = await prisma.pdPosition.aggregate({ where: { outcomeId: megan }, _sum: { shares: true } })
    const trades = await prisma.pdTrade.aggregate({ where: { outcomeId: megan }, _sum: { shares: true } })
    expect(positions._sum.shares).toBeCloseTo(trades._sum.shares!, 6)
    expect(outcome.q).toBeGreaterThan(0)
  })

  it('void refunds exactly the net stake', async () => {
    const m = await createMarket(editionId, { kind: 'CUSTOM', question: 'Rain?', options: ['Yes', 'No'] })
    const yes = await outcomeFor(m.id, 'Yes')
    const before = await balanceCents(prisma, users.Ben)
    const t = await executeTrade({ side: 'BUY', userId: users.Ben, outcomeId: yes, spendCents: 700 })
    await executeTrade({ side: 'SELL', userId: users.Ben, outcomeId: yes, shares: t.shares / 3 })
    await voidMarket(m.id)
    expect(await balanceCents(prisma, users.Ben)).toBe(before)
  })

  it('custom market pays the admin-picked outcome; dead heats split', async () => {
    const m = await createMarket(editionId, { kind: 'CUSTOM', question: 'Island podium?', options: ['Yes', 'No'] })
    const no = await outcomeFor(m.id, 'No')
    const t = await executeTrade({ side: 'BUY', userId: users.Ann, outcomeId: no, spendCents: 1000 })
    await prisma.pdMarket.update({ where: { id: m.id }, data: { manualResult: { [no]: 1 } } })
    const before = await balanceCents(prisma, users.Ann)
    await settleMarket(m.id)
    expect(await balanceCents(prisma, users.Ann)).toBe(before + Math.floor(t.shares * 100 + 1e-6))

    const h = await createMarket(editionId, { kind: 'H2H', a: comp.Jack, b: comp.Newbie })
    const jack = await outcomeFor(h.id, 'Jack')
    const tj = await executeTrade({ side: 'BUY', userId: users.Ben, outcomeId: jack, spendCents: 500 })
    await knock(1, 'Jack')
    await knock(1, 'Newbie') // same round → dead heat
    const b0 = await balanceCents(prisma, users.Ben)
    await settleMarket(h.id)
    expect(await balanceCents(prisma, users.Ben)).toBe(b0 + Math.floor(tj.shares * 0.5 * 100 + 1e-6))
  })

  it('delete refunds live stakes and refuses paid-out markets', async () => {
    const m = await createMarket(editionId, { kind: 'CUSTOM', question: 'Oops?', options: ['Yes', 'No'] })
    const yes = await outcomeFor(m.id, 'Yes')
    await prisma.pdLedgerEntry.create({ data: { userId: users.Cat, kind: 'DEPOSIT', amountCents: 1000 } })
    const before = await balanceCents(prisma, users.Cat)
    await executeTrade({ side: 'BUY', userId: users.Cat, outcomeId: yes, spendCents: 400 })
    const r = await deleteMarket(m.id)
    expect(r.refundedCents).toBe(400)
    expect(await balanceCents(prisma, users.Cat)).toBe(before)
    expect(await prisma.pdMarket.findUnique({ where: { id: m.id } })).toBeNull()
    expect(await prisma.pdTrade.count({ where: { marketId: m.id } })).toBe(0)

    const paid = await prisma.pdMarket.findFirstOrThrow({ where: { status: 'SETTLED' } })
    await expect(deleteMarket(paid.id)).rejects.toThrow(/paid out/)
  })
})
