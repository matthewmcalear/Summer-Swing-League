'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashPin, requireAdmin } from '@/lib/polydan/auth'
import { deleteMarket, loadStandings, priceMarket, settleMarket, voidMarket, TradeError } from '@/lib/polydan/markets'
import { computeStandings, type ResultKind } from '@/lib/polydan/standings'
import { resolveMarket } from '@/lib/polydan/resolve'
import { createMarket, type MarketSpec } from '@/lib/polydan/createMarket'
import { formatMoney, parseDollarsToCents } from '@/lib/polydan/money'
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
      .map(([k, v]) => ({ round, competitorId: Number(k.slice(2)), kind: v as ResultKind }))
    if (!events.length) throw new Error('Nothing selected')

    const [entries, existing, event] = await Promise.all([
      prisma.pdEditionEntry.findMany({ where: { editionId } }),
      prisma.pdResultEvent.findMany({ where: { editionId }, orderBy: { id: 'asc' } }),
      prisma.pdEvent.findUnique({ where: { editionId_seq: { editionId, seq: round } } }),
    ])
    if (event && !event.islandOpen && events.some((e) => e.kind === 'TO_ISLAND'))
      throw new Error(`Redemption Island is closed for “${event.name}” — losers go straight out`)
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
    return `Round ${round} recorded (${events.length} result${events.length > 1 ? 's' : ''})${
      next.finished ? ' — we have a champion!' : upcoming ? ` · revealed event ${upcoming.seq}: ${upcoming.name}` : ''
    }`
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
    if (m.kind !== 'CUSTOM') throw new Error('Only custom markets are resolved by hand')
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

/** Saves one event's Copper Cup points: one "p_<competitorId>" field each; blank = none. */
export async function saveCopperScores(_: ActionState, f: FormData) {
  return run(async () => {
    const event = await prisma.pdEvent.findUniqueOrThrow({ where: { id: int(f, 'eventId') } })
    if (!event.copperCup) throw new Error(`“${event.name}” isn't a Copper Cup event`)
    const edition = await prisma.pdEdition.findUniqueOrThrow({ where: { id: event.editionId } })
    if (edition.copperFinal) throw new Error('The Copper Cup is finalised — reopen it to change points')
    const rows = [...f.entries()]
      .filter(([k]) => k.startsWith('p_'))
      .map(([k, v]) => ({ competitorId: Number(k.slice(2)), raw: String(v).trim() }))
    for (const r of rows) if (r.raw && !Number.isFinite(Number(r.raw))) throw new Error(`“${r.raw}” isn't a number`)
    await prisma.$transaction([
      prisma.pdCopperScore.deleteMany({ where: { eventId: event.id } }),
      prisma.pdCopperScore.createMany({
        data: rows
          .filter((r) => r.raw)
          .map((r) => ({ eventId: event.id, competitorId: r.competitorId, points: Number(r.raw) })),
      }),
    ])
    return `Saved Copper Cup points for “${event.name}”`
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
    await prisma.pdIdol.create({
      data: { editionId, competitorId, kind, round: Number.isFinite(round) && round > 0 ? round : null },
    })
    return kind === 'FOUND'
      ? `${entry.competitor.name} has the immunity idol`
      : `${entry.competitor.name} played the idol${round > 0 ? ` in round ${round}` : ''}`
  })
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
