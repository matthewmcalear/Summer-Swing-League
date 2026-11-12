'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashPin, requireAdmin } from '@/lib/polydan/auth'
import { deleteMarket, loadStandings, priceMarket, settleMarket, voidMarket, TradeError } from '@/lib/polydan/markets'
import { computeStandings, type ResultKind } from '@/lib/polydan/standings'
import { autoRule, resolveMarket, type AutoRule } from '@/lib/polydan/resolve'
import { createMarket, type MarketSpec } from '@/lib/polydan/createMarket'
import { cleanCustom, specFor, type ProposalKind } from '@/lib/polydan/proposals'
import { duplicateOf } from '@/lib/polydan/queries'
import { formatMoney, parseDollarsToCents } from '@/lib/polydan/money'
import { parseCopperPoints } from '@/lib/polydan/copper'
import type { ActionState } from '../actions'

// Every admin action re-checks the session, runs, and reports back as an
// ActionState so the form can show the outcome inline.
async function run(fn: () => Promise<string>): Promise<ActionState> {
  await requireAdmin()
  try {
    const ok = await fn()
    revalidatePath('/polydan', 'layout')
    return { ok }
  } catch (e) {
    if (e instanceof TradeError || e instanceof Error) return { error: e.message }
    throw e
  }
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const int = (f: FormData, k: string) => Number.parseInt(str(f, k), 10)

// ---------------------------------------------------------------- players

export async function createUser(_: ActionState, f: FormData) {
  return run(async () => {
    const name = str(f, 'name')
    const pin = str(f, 'pin')
    if (!name) throw new Error('Name is required')
    if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4–8 digits')
    if (await prisma.pdUser.findUnique({ where: { name } })) throw new Error(`${name} already has an account`)
    await prisma.pdUser.create({ data: { name, pinHash: hashPin(pin), isAdmin: f.get('isAdmin') === 'on' } })
    return `Added ${name}. Their PIN is ${pin}.`
  })
}

// Removes a player who never bet (e.g. a test account), with their money
// entries. Anyone who has traded stays: their trades are part of each
// market's price history. Admins can't be removed here.
export async function removePlayer(_: ActionState, f: FormData) {
  return run(async () => {
    const u = await prisma.pdUser.findUniqueOrThrow({
      where: { id: int(f, 'userId') },
      include: { _count: { select: { trades: true } } },
    })
    if (u.isAdmin) throw new Error(`${u.name} is an admin and can't be removed`)
    if (u._count.trades > 0) throw new Error(`${u.name} has placed bets, so the account has to stay. Cash them out instead.`)
    await prisma.$transaction([
      prisma.pdPosition.deleteMany({ where: { userId: u.id } }),
      prisma.pdLedgerEntry.deleteMany({ where: { userId: u.id } }),
      prisma.pdUser.delete({ where: { id: u.id } }),
    ])
    return `Removed ${u.name}`
  })
}

export async function resetPin(_: ActionState, f: FormData) {
  return run(async () => {
    const pin = str(f, 'pin')
    if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4–8 digits')
    const u = await prisma.pdUser.update({ where: { id: int(f, 'userId') }, data: { pinHash: hashPin(pin) } })
    return `${u.name}'s PIN is now ${pin}`
  })
}

export async function adjustBalance(_: ActionState, f: FormData) {
  return run(async () => {
    const cents = parseDollarsToCents(str(f, 'amount'))
    if (!cents) throw new Error('Enter an amount')
    const kind = f.get('kind') === 'WITHDRAWAL' ? 'WITHDRAWAL' : 'DEPOSIT'
    const userId = int(f, 'userId')
    const user = await prisma.pdUser.findUniqueOrThrow({ where: { id: userId } })
    await prisma.pdLedgerEntry.create({
      data: {
        userId,
        kind,
        amountCents: kind === 'DEPOSIT' ? cents : -cents,
        note: str(f, 'note') || (kind === 'DEPOSIT' ? 'Credited by admin' : 'Cashed out'),
      },
    })
    return `${kind === 'DEPOSIT' ? 'Credited' : 'Cashed out'} ${formatMoney(cents)} ${kind === 'DEPOSIT' ? 'to' : 'from'} ${user.name}`
  })
}

/**
 * End of the event: records that every player has been paid their cash
 * balance in real money, zeroing the books. Refused while any market is
 * still unsettled, since those bets haven't paid out yet.
 */
export async function cashOutEveryone(_: ActionState, f: FormData) {
  return run(async () => {
    void f
    const unsettled = await prisma.pdMarket.count({ where: { status: { in: ['OPEN', 'CLOSED'] } } })
    if (unsettled)
      throw new Error(`${unsettled} market${unsettled === 1 ? ' is' : 's are'} not settled yet: settle or void them first`)
    const sums = await prisma.pdLedgerEntry.groupBy({ by: ['userId'], _sum: { amountCents: true } })
    const owed = sums.map((s) => ({ userId: s.userId, cents: s._sum.amountCents ?? 0 })).filter((s) => s.cents > 0)
    if (!owed.length) throw new Error('Nobody has any cash left to pay out')
    await prisma.pdLedgerEntry.createMany({
      data: owed.map((o) => ({ userId: o.userId, kind: 'WITHDRAWAL' as const, amountCents: -o.cents, note: 'Paid out at the end of the event' })),
    })
    const total = owed.reduce((t, o) => t + o.cents, 0)
    return `Marked ${owed.length} ${owed.length === 1 ? 'person' : 'people'} as paid: ${formatMoney(total)} in all`
  })
}

// --------------------------------------------------------------- editions

export async function createEdition(_: ActionState, f: FormData) {
  return run(async () => {
    const number = int(f, 'number')
    if (!(number > 0)) throw new Error('Edition number is required')
    const date = str(f, 'date')
    await prisma.pdEdition.create({ data: { number, date: date ? new Date(`${date}T12:00:00`) : null } })
    return `Created Iron Man ${number}`
  })
}

export async function setField(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const hasResults = await prisma.pdResultEvent.count({ where: { editionId } })
    const hasMarkets = await prisma.pdMarket.count({ where: { editionId } })
    if (hasResults || hasMarkets) throw new Error('The field is locked once markets or results exist')
    const chosen = f.getAll('competitorId').map(Number)
    const newNames = str(f, 'newNames')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (const name of newNames) {
      const c = await prisma.pdCompetitor.upsert({ where: { name }, create: { name }, update: {} })
      chosen.push(c.id)
    }
    const ids = [...new Set(chosen)]
    await prisma.$transaction([
      prisma.pdEditionEntry.deleteMany({ where: { editionId } }),
      prisma.pdEditionEntry.createMany({ data: ids.map((competitorId) => ({ editionId, competitorId })) }),
    ])
    return `Field set: ${ids.length} competitors`
  })
}

export async function setEditionStatus(_: ActionState, f: FormData) {
  return run(async () => {
    const status = str(f, 'status') as 'SETUP' | 'LIVE' | 'FINISHED'
    const e = await prisma.pdEdition.update({ where: { id: int(f, 'editionId') }, data: { status } })
    return `Iron Man ${e.number} is now ${status.toLowerCase()}`
  })
}

// ---------------------------------------------------------------- results

async function checkSettledUnchanged(editionId: number, nextStandings: ReturnType<typeof computeStandings>) {
  const settled = await prisma.pdMarket.findMany({
    where: { editionId, status: 'SETTLED', kind: { notIn: ['CUSTOM', 'COPPER'] } },
    include: { outcomes: true },
  })
  const current = await loadStandings(prisma, editionId)
  for (const m of settled) {
    const before = resolveMarket(m, current).payouts
    const after = resolveMarket(m, nextStandings).payouts
    const same = before && after && [...before].every(([id, p]) => after.get(id) === p)
    if (!same) throw new Error(`That would change "${m.question}", which is already settled`)
  }
}

export async function recordResults(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const round = int(f, 'round')
    if (!(round > 0)) throw new Error('Round number is required')
    // One field per competitor: "" (no change), TO_ISLAND, OUT, RETURN
    const events = [...f.entries()]
      .filter(([k, v]) => k.startsWith('r_') && v)
      .map(([k, v]) => ({ round, competitorId: Number(k.slice(2)), kind: v as ResultKind, rank: null as number | null }))
    if (!events.length) throw new Error('Nothing selected')
    // Several out together share a place unless Steven orders them by score
    // ("rank_<id>": 1 = did best). All equal = shared.
    const outs = events.filter((e) => e.kind === 'OUT')
    if (outs.length > 1) {
      for (const e of outs) {
        const r = int(f, `rank_${e.competitorId}`)
        e.rank = Number.isInteger(r) && r >= 1 && r <= outs.length ? r : null
      }
      if (new Set(outs.map((e) => e.rank ?? 1)).size === 1) for (const e of outs) e.rank = null
    }

    const [entries, existing, event, idols] = await Promise.all([
      prisma.pdEditionEntry.findMany({ where: { editionId } }),
      prisma.pdResultEvent.findMany({ where: { editionId }, orderBy: { id: 'asc' } }),
      prisma.pdEvent.findUnique({ where: { editionId_seq: { editionId, seq: round } } }),
      prisma.pdIdol.findMany({ where: { editionId, kind: 'PLAYED', round }, include: { competitor: true } }),
    ])
    if (event && !event.islandOpen && events.some((e) => e.kind === 'TO_ISLAND'))
      throw new Error(`Redemption Island is closed for “${event.name}” — losers go straight out`)
    const safe = idols.find((i) => events.some((e) => e.competitorId === i.competitorId && e.kind !== 'RETURN'))
    if (safe) throw new Error(`${safe.competitor.name} played the idol this round, so they’re safe`)
    const next = computeStandings(
      entries.map((e) => e.competitorId),
      [...existing, ...events],
    ) // throws on an impossible move
    await checkSettledUnchanged(editionId, next)
    await prisma.pdResultEvent.createMany({ data: events.map((e) => ({ ...e, editionId })) })
    await prisma.pdEdition.update({
      where: { id: editionId },
      data: { status: next.finished ? 'FINISHED' : 'LIVE' },
    })
    // A knockout reveals the next event on the schedule (and keeps this one visible).
    const revealed = next.finished
      ? null
      : await prisma.pdEvent.updateMany({
          where: { editionId, seq: { in: [round, round + 1] }, revealed: false },
          data: { revealed: true },
        })
    const upcoming = revealed?.count
      ? await prisma.pdEvent.findUnique({ where: { editionId_seq: { editionId, seq: round + 1 } } })
      : null
    const opened = next.finished ? null : await openNextRoundMarket(editionId, next)
    return `Round ${round} recorded (${events.length} result${events.length > 1 ? 's' : ''})${
      next.finished ? ' — we have a champion!' : upcoming ? ` · revealed event ${upcoming.seq}: ${upcoming.name}` : ''
    }${opened ? ` · opened “${opened}”` : ''}`
  })
}

/**
 * Opens "Who loses round N?" for the round about to be played, unless it's
 * already there or nobody in the main game plays it (the island finale).
 * Never fails the round: a problem here just means no market.
 */
async function openNextRoundMarket(editionId: number, st: ReturnType<typeof computeStandings>): Promise<string | null> {
  try {
    const round = st.currentRound + 1
    const [event, markets] = await Promise.all([
      prisma.pdEvent.findUnique({ where: { editionId_seq: { editionId, seq: round } } }),
      prisma.pdMarket.findMany({ where: { editionId, kind: 'CUSTOM' }, select: { manualResult: true } }),
    ])
    const onIsland = [...st.byId.values()].some((s) => s.status === 'ISLAND')
    if (event && !event.islandOpen && onIsland) return null // island finale: the main game sits out
    if ([...st.byId.values()].filter((s) => s.status === 'IN').length < 3) return null
    if (markets.some((m) => { const r = autoRule(m.manualResult); return r?.auto === 'ROUND_LOSER' && r.round === round })) return null
    return (await createMarket(editionId, { kind: 'AUTO', rule: { auto: 'ROUND_LOSER', round } })).question
  } catch {
    return null
  }
}

/** Admin opens one of the self-settling specials by hand. */
export async function openAutoMarket(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const which = str(f, 'auto')
    const [results, entries, existing] = await Promise.all([
      prisma.pdResultEvent.findMany({ where: { editionId }, orderBy: { id: 'asc' } }),
      prisma.pdEditionEntry.findMany({ where: { editionId } }),
      prisma.pdMarket.findMany({ where: { editionId, kind: 'CUSTOM', status: { not: 'VOID' } }, select: { manualResult: true } }),
    ])
    const st = computeStandings(entries.map((e) => e.competitorId), results)
    const rule: AutoRule =
      which === 'FIRST_ISLAND' || which === 'FIRST_OUT' ? { auto: which } : { auto: 'ROUND_LOSER', round: st.currentRound + 1 }
    const log = [...st.rounds.values()]
    if (rule.auto === 'FIRST_ISLAND' && log.some((r) => r.toIsland.length)) throw new Error('Someone has already gone to the island')
    if (rule.auto === 'FIRST_OUT' && log.some((r) => r.out.length)) throw new Error('Someone is already out')
    const same = existing.some((m) => {
      const r = autoRule(m.manualResult)
      return r?.auto === rule.auto && (rule.auto !== 'ROUND_LOSER' || (r as { round: number }).round === rule.round)
    })
    if (same) throw new Error('That market is already open')
    const m = await createMarket(editionId, { kind: 'AUTO', rule })
    return `Opened “${m.question}”`
  })
}

export async function undoLastResult(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const all = await prisma.pdResultEvent.findMany({ where: { editionId }, orderBy: { id: 'asc' } })
    const last = all.at(-1)
    if (!last) throw new Error('Nothing to undo')
    const entries = await prisma.pdEditionEntry.findMany({ where: { editionId } })
    const next = computeStandings(
      entries.map((e) => e.competitorId),
      all.slice(0, -1),
    )
    await checkSettledUnchanged(editionId, next)
    await prisma.pdResultEvent.delete({ where: { id: last.id } })
    if (!next.finished) await prisma.pdEdition.update({ where: { id: editionId }, data: { status: 'LIVE' } })
    return 'Undid the last result'
  })
}

// ---------------------------------------------------------------- markets

export async function addMarket(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const kind = str(f, 'kind') as MarketSpec['kind']
    const spec: MarketSpec =
      kind === 'WINNER' || kind === 'COPPER'
        ? { kind }
        : kind === 'TOP_N'
          ? { kind, competitorId: int(f, 'competitorId'), n: int(f, 'n') }
          : kind === 'H2H'
            ? { kind, a: int(f, 'a'), b: int(f, 'b') }
            : { kind: 'CUSTOM', question: str(f, 'question'), options: str(f, 'options').split('\n') }
    const b = Number(str(f, 'liquidity')) || undefined
    if (b != null && !(b >= 5 && b <= 1000)) throw new Error('Liquidity must be between 5 and 1000')
    // Edited opening odds arrive as JSON {outcome label: percentage}; blank = history.
    const oddsRaw = str(f, 'odds')
    const odds = oddsRaw ? (JSON.parse(oddsRaw) as Record<string, number>) : undefined
    const m = await createMarket(editionId, spec, b, odds)
    return `Opened “${m.question}”`
  })
}

// ------------------------------------------------- player-suggested markets

/**
 * Opens a player's suggested market. Custom questions can be reworded first
 * (the suggestion keeps the player's original wording). The proposal is
 * claimed before the market is created, so a double click can't open two.
 */
export async function approveProposal(_: ActionState, f: FormData) {
  return run(async () => {
    const p = await prisma.pdProposal.findUniqueOrThrow({ where: { id: int(f, 'proposalId') } })
    if (p.status !== 'PENDING') throw new Error('Already decided')
    let draft = { kind: p.kind as ProposalKind, question: p.question, options: p.options, a: p.a, b: p.b, topN: p.topN }
    if (p.kind === 'CUSTOM') draft = { ...draft, ...cleanCustom(str(f, 'question'), String(f.get('options') ?? '')) }
    if ((await duplicateOf(p.editionId, draft, p.id)) === 'market') throw new Error('That market is already open')
    const claimed = await prisma.pdProposal.updateMany({
      where: { id: p.id, status: 'PENDING' },
      data: { status: 'APPROVED', decidedAt: new Date() },
    })
    if (!claimed.count) throw new Error('Already decided')
    try {
      const m = await createMarket(p.editionId, specFor(draft))
      await prisma.pdProposal.update({ where: { id: p.id }, data: { marketId: m.id } })
      return `Opened “${m.question}”`
    } catch (e) {
      await prisma.pdProposal.update({ where: { id: p.id }, data: { status: 'PENDING', decidedAt: null } })
      throw e
    }
  })
}

export async function rejectProposal(_: ActionState, f: FormData) {
  return run(async () => {
    const reply = str(f, 'reply').slice(0, 200) || null
    const done = await prisma.pdProposal.updateMany({
      where: { id: int(f, 'proposalId'), status: 'PENDING' },
      data: { status: 'REJECTED', reply, decidedAt: new Date() },
    })
    if (!done.count) throw new Error('Already decided')
    return 'Suggestion rejected'
  })
}

export async function setMarketStatus(_: ActionState, f: FormData) {
  return run(async () => {
    const status = str(f, 'status') === 'CLOSED' ? 'CLOSED' : 'OPEN'
    const m = await prisma.pdMarket.findUniqueOrThrow({ where: { id: int(f, 'marketId') } })
    if (m.status === 'SETTLED' || m.status === 'VOID') throw new Error('Already settled')
    await prisma.pdMarket.update({ where: { id: m.id }, data: { status } })
    return status === 'CLOSED' ? `Paused “${m.question}”` : `Reopened “${m.question}”`
  })
}

export async function resolveCustom(_: ActionState, f: FormData) {
  return run(async () => {
    const m = await prisma.pdMarket.findUniqueOrThrow({ where: { id: int(f, 'marketId') }, include: { outcomes: true } })
    if (m.kind !== 'CUSTOM' || autoRule(m.manualResult)) throw new Error('Only custom markets are resolved by hand')
    if (m.status === 'SETTLED' || m.status === 'VOID') throw new Error('Already settled')
    const winner = str(f, 'outcomeId')
    if (!winner) {
      await prisma.pdMarket.update({ where: { id: m.id }, data: { manualResult: Prisma.DbNull } })
      return 'Cleared the result'
    }
    const o = m.outcomes.find((x) => x.id === Number(winner))
    if (!o) throw new Error('Pick an outcome')
    await prisma.pdMarket.update({ where: { id: m.id }, data: { manualResult: { [o.id]: 1 } } })
    return `“${m.question}” → ${o.label}. Settle to pay out.`
  })
}

export async function settleOne(_: ActionState, f: FormData) {
  return run(async () => {
    const r = await settleMarket(int(f, 'marketId'))
    return `Settled: paid ${formatMoney(r.paidCents)} to ${r.winners} player${r.winners === 1 ? '' : 's'}`
  })
}

export async function settleAll(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const markets = await prisma.pdMarket.findMany({
      where: { editionId, status: { in: ['OPEN', 'CLOSED'] } },
      include: { outcomes: true },
    })
    const st = await loadStandings(prisma, editionId)
    let count = 0
    let paid = 0
    for (const m of markets) {
      if (!priceMarket(m, st).resolution.payouts) continue
      paid += (await settleMarket(m.id)).paidCents
      count++
    }
    if (!count) throw new Error('No market has a result yet')
    return `Settled ${count} market${count === 1 ? '' : 's'}, paid out ${formatMoney(paid)}`
  })
}

export async function voidOne(_: ActionState, f: FormData) {
  return run(async () => {
    await voidMarket(int(f, 'marketId'))
    return 'Voided — everyone got their stake back'
  })
}

// The deleted market's card (where an inline message would show) disappears,
// so report back through a banner at the top of the Markets tab instead.
export async function deleteOne(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin()
  let message: string
  try {
    const r = await deleteMarket(int(f, 'marketId'))
    message = r.refundedCents
      ? `Deleted “${r.question}” and refunded ${formatMoney(r.refundedCents)} to the people who bet`
      : `Deleted “${r.question}”`
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    throw e
  }
  revalidatePath('/polydan', 'layout')
  redirect(`/polydan/admin?tab=markets&edition=${int(f, 'editionId')}&done=${encodeURIComponent(message)}`)
}

// ----------------------------------------------------------------- events

/** Appends events from a pasted list: one per line, optional "Name — description". */
export async function addEvents(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const lines = str(f, 'events')
      .split('\n')
      .map((l) => l.trim().replace(/^\d+[.)]\s*/, '')) // tolerate "1. Trivia"
      .filter(Boolean)
    if (!lines.length) throw new Error('Paste at least one event')
    const last = await prisma.pdEvent.findFirst({ where: { editionId }, orderBy: { seq: 'desc' } })
    let seq = last?.seq ?? 0
    for (const line of lines) {
      const [name, ...rest] = line.split(/\s+[—–-]\s+/)
      seq++
      await prisma.pdEvent.create({
        data: {
          editionId,
          seq,
          name: name.slice(0, 80),
          description: rest.join(' — ').slice(0, 300) || null,
          revealed: seq === 1, // the first event is known up front
        },
      })
    }
    return `Added ${lines.length} event${lines.length > 1 ? 's' : ''} (now ${seq} total)`
  })
}

export async function updateEvent(_: ActionState, f: FormData) {
  return run(async () => {
    const name = str(f, 'name')
    if (!name) throw new Error('Event needs a name')
    const e = await prisma.pdEvent.update({
      where: { id: int(f, 'eventId') },
      data: {
        name: name.slice(0, 80),
        description: str(f, 'description').slice(0, 300) || null,
        islandOpen: f.get('islandOpen') === 'on',
        copperCup: f.get('copperCup') === 'on',
        revealed: f.get('revealed') === 'on',
      },
    })
    return `Saved event ${e.seq}: ${e.name}`
  })
}

export async function moveEvent(_: ActionState, f: FormData) {
  return run(async () => {
    const e = await prisma.pdEvent.findUniqueOrThrow({ where: { id: int(f, 'eventId') } })
    const dir = str(f, 'dir') === 'up' ? -1 : 1
    const other = await prisma.pdEvent.findUnique({
      where: { editionId_seq: { editionId: e.editionId, seq: e.seq + dir } },
    })
    if (!other) throw new Error('Already at the end')
    // Swap via a temporary slot to respect the (edition, seq) unique key.
    await prisma.$transaction([
      prisma.pdEvent.update({ where: { id: e.id }, data: { seq: -1 } }),
      prisma.pdEvent.update({ where: { id: other.id }, data: { seq: e.seq } }),
      prisma.pdEvent.update({ where: { id: e.id }, data: { seq: other.seq } }),
    ])
    return `Moved “${e.name}” ${dir < 0 ? 'up' : 'down'}`
  })
}

export async function deleteEvent(_: ActionState, f: FormData) {
  return run(async () => {
    const e = await prisma.pdEvent.findUniqueOrThrow({ where: { id: int(f, 'eventId') } })
    const later = await prisma.pdEvent.findMany({
      where: { editionId: e.editionId, seq: { gt: e.seq } },
      orderBy: { seq: 'asc' },
    })
    await prisma.$transaction([
      prisma.pdEvent.delete({ where: { id: e.id } }),
      ...later.map((x) => prisma.pdEvent.update({ where: { id: x.id }, data: { seq: x.seq - 1 } })),
    ])
    return `Deleted “${e.name}”`
  })
}

// ------------------------------------------------------------ copper cup

/**
 * Saves one event's Copper Cup points: one "pts_<competitorId>" field per
 * person in the field (blank = no score). Everyone plays, including people
 * already out, so the whole field is accepted.
 */
export async function saveCopperScores(_: ActionState, f: FormData) {
  return run(async () => {
    const event = await prisma.pdEvent.findUniqueOrThrow({ where: { id: int(f, 'eventId') } })
    if (!event.copperCup) throw new Error(`“${event.name}” isn't a Copper Cup event`)
    const [edition, entries] = await Promise.all([
      prisma.pdEdition.findUniqueOrThrow({ where: { id: event.editionId } }),
      prisma.pdEditionEntry.findMany({ where: { editionId: event.editionId }, include: { competitor: true } }),
    ])
    if (edition.copperFinal) throw new Error('The Copper Cup is finalised — reopen it to change points')
    const rows: { eventId: number; competitorId: number; points: number }[] = []
    for (const e of entries) {
      let points: number | null
      try {
        points = parseCopperPoints(str(f, `pts_${e.competitorId}`))
      } catch (err) {
        throw new Error(`${e.competitor.name}: ${(err as Error).message}`)
      }
      if (points != null) rows.push({ eventId: event.id, competitorId: e.competitorId, points })
    }
    await prisma.$transaction([
      prisma.pdCopperScore.deleteMany({ where: { eventId: event.id } }),
      prisma.pdCopperScore.createMany({ data: rows }),
    ])
    return rows.length
      ? `Saved Copper Cup points for “${event.name}” (${rows.length} ${rows.length === 1 ? 'person' : 'people'})`
      : `Cleared Copper Cup points for “${event.name}”`
  })
}

export async function setCopperFinal(_: ActionState, f: FormData) {
  return run(async () => {
    const final = str(f, 'final') === 'true'
    const editionId = int(f, 'editionId')
    if (!final) {
      const paid = await prisma.pdMarket.count({ where: { editionId, kind: 'COPPER', status: 'SETTLED' } })
      if (paid) throw new Error('The Copper Cup market has already paid out')
    }
    await prisma.pdEdition.update({ where: { id: editionId }, data: { copperFinal: final } })
    return final ? 'Copper Cup finalised — settle its market to pay out' : 'Copper Cup reopened for changes'
  })
}

// ---------------------------------------------------------- immunity idol

export async function recordIdol(_: ActionState, f: FormData) {
  return run(async () => {
    const editionId = int(f, 'editionId')
    const competitorId = int(f, 'competitorId')
    const kind = str(f, 'kind') === 'PLAYED' ? 'PLAYED' : 'FOUND'
    const round = int(f, 'round')
    if (!competitorId) throw new Error('Pick who')
    const entry = await prisma.pdEditionEntry.findUnique({
      where: { editionId_competitorId: { editionId, competitorId } },
      include: { competitor: true },
    })
    if (!entry) throw new Error('Not in this edition')
    if (kind === 'PLAYED') await checkIdolPlay(editionId, competitorId, entry.competitor.name, round)
    await prisma.pdIdol.create({
      data: { editionId, competitorId, kind, round: Number.isFinite(round) && round > 0 ? round : null },
    })
    return kind === 'FOUND'
      ? `${entry.competitor.name} has the immunity idol`
      : `${entry.competitor.name} played the idol${round > 0 ? ` in round ${round}` : ''}`
  })
}

/**
 * Steven's idol rules: only the person who won it can play it (no passing it
 * on), before an event with Redemption Island open (events 2–7 in IM10), and
 * never while on the island.
 */
async function checkIdolPlay(editionId: number, competitorId: number, name: string, round: number) {
  if (!(round > 0)) throw new Error('Which round is it played in?')
  const [mine, event, entries, results] = await Promise.all([
    prisma.pdIdol.findMany({ where: { editionId, competitorId }, orderBy: { id: 'asc' } }),
    prisma.pdEvent.findUnique({ where: { editionId_seq: { editionId, seq: round } } }),
    prisma.pdEditionEntry.findMany({ where: { editionId } }),
    prisma.pdResultEvent.findMany({ where: { editionId, round: { lt: round } }, orderBy: { id: 'asc' } }),
  ])
  const held = mine.reduce((n, i) => n + (i.kind === 'FOUND' ? 1 : -1), 0)
  if (held < 1) throw new Error(`${name} hasn’t got an idol to play (log that they won it first)`)
  if (event && !event.islandOpen)
    throw new Error(`Idols can only be played in events with Redemption Island open, not “${event.name}”`)
  const status = computeStandings(
    entries.map((e) => e.competitorId),
    results,
  ).byId.get(competitorId)?.status
  if (status === 'ISLAND') throw new Error(`${name} is on Redemption Island, where idols can’t be played`)
  if (status === 'OUT') throw new Error(`${name} is already out`)
}

export async function removeIdol(_: ActionState, f: FormData) {
  return run(async () => {
    await prisma.pdIdol.delete({ where: { id: int(f, 'idolId') } })
    return 'Removed'
  })
}

// ------------------------------------------------------------- hard reset

/**
 * Wipes PolyDan back to a clean start after testing: keeps admin accounts
 * (same PINs) and the competitor list, deletes everything else. Requires the
 * admin to type RESET.
 */
export async function resetEverything(_: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin()
  if (str(f, 'confirm') !== 'RESET') return { error: 'Type RESET (in capitals) to confirm' }
  const removed = await prisma.$transaction(async (tx) => {
    const players = await tx.pdUser.count({ where: { isAdmin: false } })
    await tx.pdProposal.deleteMany()
    await tx.pdTrade.deleteMany()
    await tx.pdPosition.deleteMany()
    await tx.pdOutcome.deleteMany()
    await tx.pdLedgerEntry.deleteMany()
    await tx.pdMarket.deleteMany()
    await tx.pdCopperScore.deleteMany()
    await tx.pdIdol.deleteMany()
    await tx.pdEvent.deleteMany()
    await tx.pdResultEvent.deleteMany()
    await tx.pdEditionEntry.deleteMany()
    await tx.pdEdition.deleteMany()
    await tx.pdUser.deleteMany({ where: { isAdmin: false } })
    return players
  })
  revalidatePath('/polydan', 'layout')
  redirect(
    `/polydan/admin?tab=setup&done=${encodeURIComponent(
      `Reset complete — removed all editions, markets, bets, money and ${removed} player account${removed === 1 ? '' : 's'}`,
    )}`,
  )
}
