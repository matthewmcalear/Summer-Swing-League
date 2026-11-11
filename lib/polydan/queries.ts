import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { balanceCents, loadStandings, priceMarket } from './markets'
import { cashOutCents, prices } from './lmsr'
import type { Standings } from './standings'
import { describeDraft, sameMarket, type ProposalDraft, type ProposalKind } from './proposals'

// Read models for the pages. Everything is computed per request from the
// ledger, the result log and the LMSR quantities — nothing derived is stored.

export async function getCurrentEdition() {
  return (
    (await prisma.pdEdition.findFirst({ where: { status: 'LIVE' }, orderBy: { number: 'desc' } })) ??
    (await prisma.pdEdition.findFirst({ orderBy: { number: 'desc' } }))
  )
}

const marketInclude = {
  outcomes: { orderBy: [{ sort: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.PdMarketInclude

type MarketRow = NonNullable<Awaited<ReturnType<typeof loadMarketRow>>>
function loadMarketRow(id: number) {
  return prisma.pdMarket.findUnique({ where: { id }, include: marketInclude })
}

export interface OutcomeView {
  id: number
  label: string
  competitorId: number | null
  isYes: boolean | null
  q: number
  price: number
  dead: boolean
}

export interface MarketView {
  id: number
  editionId: number
  kind: MarketRow['kind']
  question: string
  /** TOP_N only: the N. */
  topN: number | null
  status: MarketRow['status']
  b: number
  tradable: boolean
  lockedReason: string | null
  resolved: boolean
  outcomes: OutcomeView[]
  volumeCents: number
  /** Number of trades (buys and sells) placed in this market. */
  bets: number
}

function toView(m: MarketRow, st: Standings, volumeCents: number, bets = 0): MarketView {
  const priced = priceMarket(m, st)
  return {
    id: m.id,
    editionId: m.editionId,
    kind: m.kind,
    question: m.question,
    topN: m.topN,
    status: m.status,
    b: m.b,
    tradable: priced.tradable,
    lockedReason: priced.lockedReason,
    resolved: priced.resolution.payouts != null,
    volumeCents,
    bets,
    outcomes: m.outcomes.map((o) => ({
      id: o.id,
      label: o.label,
      competitorId: o.competitorId,
      isYes: o.isYes,
      q: o.q,
      price: priced.price.get(o.id) ?? 0,
      dead: priced.resolution.dead.has(o.id),
    })),
  }
}

async function volumes(marketIds: number[]): Promise<Map<number, { cents: number; bets: number }>> {
  const rows = await prisma.pdTrade.findMany({
    where: { marketId: { in: marketIds } },
    select: { marketId: true, costCents: true },
  })
  const v = new Map<number, { cents: number; bets: number }>()
  for (const r of rows) {
    const cur = v.get(r.marketId) ?? { cents: 0, bets: 0 }
    v.set(r.marketId, { cents: cur.cents + Math.abs(r.costCents), bets: cur.bets + 1 })
  }
  return v
}

export async function getEditionBoard(editionId: number) {
  const [edition, standings, markets] = await Promise.all([
    prisma.pdEdition.findUniqueOrThrow({
      where: { id: editionId },
      include: { entries: { include: { competitor: true } } },
    }),
    loadStandings(prisma, editionId),
    prisma.pdMarket.findMany({ where: { editionId }, include: marketInclude, orderBy: { id: 'asc' } }),
  ])
  const vol = await volumes(markets.map((m) => m.id))
  const field = edition.entries
    .map((e) => ({ ...e.competitor, standing: standings.byId.get(e.competitorId)! }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    edition,
    standings,
    field,
    markets: markets.map((m) => toView(m, standings, vol.get(m.id)?.cents ?? 0, vol.get(m.id)?.bets ?? 0)),
  }
}

export interface ChartSeries {
  outcomeId: number
  label: string
  points: { t: number; p: number }[]
}

type TradeTick = { outcomeId: number; shares: number; createdAt: Date; pricesAfter: Prisma.JsonValue }

/**
 * Price history for a chart: the opening prices, the prices after every trade,
 * and now. Binary markets chart the first side; multi-outcome markets the
 * current top 4. With `since`, everything earlier collapses into one starting
 * point at that time (the TV charts event day, not the whole week).
 */
function priceHistory(m: MarketRow, view: MarketView, trades: TradeTick[], since?: number): ChartSeries[] {
  // Opening quantities = today's minus every share traded since.
  const openQ = new Map(m.outcomes.map((o) => [o.id, o.q]))
  for (const t of trades) openQ.set(t.outcomeId, openQ.get(t.outcomeId)! - t.shares)
  const opening = prices(
    m.outcomes.map((o) => openQ.get(o.id)!),
    m.b,
  )
  let snapshots: { t: number; prices: Record<string, number> }[] = [
    { t: m.createdAt.getTime(), prices: Object.fromEntries(m.outcomes.map((o, i) => [o.id, opening[i]])) },
    ...trades.map((t) => ({ t: t.createdAt.getTime(), prices: t.pricesAfter as Record<string, number> })),
    { t: Date.now(), prices: Object.fromEntries(view.outcomes.map((o) => [o.id, o.price])) },
  ]
  if (since != null && since > snapshots[0].t) {
    const before = snapshots.filter((s) => s.t <= since)
    snapshots = [{ t: since, prices: before.at(-1)!.prices }, ...snapshots.filter((s) => s.t > since)]
  }
  const charted =
    view.outcomes.length === 2
      ? [view.outcomes[0]]
      : [...view.outcomes]
          .sort((a, b) => b.price - a.price)
          .slice(0, 4)
          // Colour follows the outcome, not its rank: keep a stable order so a
          // lead change doesn't repaint the lines.
          .sort((a, b) => view.outcomes.indexOf(a) - view.outcomes.indexOf(b))
  return charted.map((o) => ({
    outcomeId: o.id,
    label: o.label,
    points: snapshots.map((s) => ({ t: s.t, p: s.prices[o.id] ?? 0 })),
  }))
}

export async function getMarketDetail(marketId: number, userId: number) {
  const m = await loadMarketRow(marketId)
  if (!m) return null
  const [standings, trades, positions, edition] = await Promise.all([
    loadStandings(prisma, m.editionId),
    prisma.pdTrade.findMany({
      where: { marketId },
      orderBy: { id: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.pdPosition.findMany({ where: { userId, outcome: { marketId } } }),
    prisma.pdEdition.findUniqueOrThrow({ where: { id: m.editionId } }),
  ])
  const view = toView(
    m,
    standings,
    trades.reduce((s, t) => s + Math.abs(t.costCents), 0),
    trades.length,
  )
  const series = priceHistory(m, view, trades)

  const costBasis = new Map<number, number>()
  for (const t of trades)
    if (t.userId === userId) costBasis.set(t.outcomeId, (costBasis.get(t.outcomeId) ?? 0) + t.costCents)

  const labelOf = new Map(m.outcomes.map((o) => [o.id, o.label]))
  return {
    market: view,
    edition,
    series,
    myPositions: positions
      .filter((p) => p.shares > 1e-9)
      .map((p) => ({ outcomeId: p.outcomeId, shares: p.shares, costCents: costBasis.get(p.outcomeId) ?? 0 })),
    activity: trades
      .slice(-30)
      .reverse()
      .map((t) => ({
        id: t.id,
        user: t.user.name,
        outcome: labelOf.get(t.outcomeId) ?? '',
        shares: t.shares,
        costCents: t.costCents,
        at: t.createdAt,
      })),
  }
}

/** Open positions valued at what they'd sell for right now (or the known payout). */
async function openPositions(userId?: number) {
  const rows = await prisma.pdPosition.findMany({
    where: { ...(userId ? { userId } : {}), shares: { gt: 1e-9 }, outcome: { market: { status: { in: ['OPEN', 'CLOSED'] } } } },
    include: { outcome: { include: { market: { include: marketInclude } } } },
  })
  const standingsByEdition = new Map<number, Standings>()
  const viewByMarket = new Map<number, MarketView>()
  for (const r of rows) {
    const m = r.outcome.market
    if (!standingsByEdition.has(m.editionId))
      standingsByEdition.set(m.editionId, await loadStandings(prisma, m.editionId))
    if (!viewByMarket.has(m.id)) viewByMarket.set(m.id, toView(m, standingsByEdition.get(m.editionId)!, 0))
  }
  return rows.map((r) => {
    const view = viewByMarket.get(r.outcome.marketId)!
    const outcome = view.outcomes.find((o) => o.id === r.outcomeId)!
    const price = outcome.price
    return {
      dead: outcome.dead,
      userId: r.userId,
      market: view,
      outcomeId: r.outcomeId,
      label: r.outcome.label,
      shares: r.shares,
      price,
      valueCents: cashOutCents(view.outcomes, view.b, view.resolved, r.outcomeId, r.shares),
    }
  })
}

export async function getPortfolio(userId: number) {
  const [balance, positions, ledger, trades] = await Promise.all([
    balanceCents(prisma, userId),
    openPositions(userId),
    prisma.pdLedgerEntry.findMany({ where: { userId }, orderBy: { id: 'desc' }, take: 100 }),
    prisma.pdTrade.groupBy({ by: ['outcomeId'], where: { userId }, _sum: { costCents: true } }),
  ])
  const basis = new Map(trades.map((t) => [t.outcomeId, t._sum.costCents ?? 0]))
  return {
    balance,
    positions: positions.map((p) => ({ ...p, costCents: basis.get(p.outcomeId) ?? 0 })),
    ledger,
  }
}

/** Every player's account: cash, money put in, and open bets at today's prices. */
export async function getPlayerAccounts() {
  const [users, sums, positions, basis] = await Promise.all([
    prisma.pdUser.findMany({ select: { id: true, name: true, isAdmin: true }, orderBy: { name: 'asc' } }),
    prisma.pdLedgerEntry.groupBy({ by: ['userId', 'kind'], _sum: { amountCents: true } }),
    openPositions(),
    prisma.pdTrade.groupBy({ by: ['userId', 'outcomeId'], _sum: { costCents: true } }),
  ])
  const costOf = new Map(basis.map((b) => [`${b.userId}:${b.outcomeId}`, b._sum.costCents ?? 0]))
  return users.map((u) => {
    const mine = sums.filter((s) => s.userId === u.id)
    const sum = (kinds: string[]) =>
      mine.filter((s) => kinds.includes(s.kind)).reduce((t, s) => t + (s._sum.amountCents ?? 0), 0)
    const balance = sum(['DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 'PAYOUT', 'REFUND'])
    const invested = sum(['DEPOSIT', 'WITHDRAWAL'])
    const bets = positions
      .filter((p) => p.userId === u.id)
      .map((p) => ({ ...p, costCents: costOf.get(`${u.id}:${p.outcomeId}`) ?? 0 }))
    const open = bets.reduce((t, p) => t + p.valueCents, 0)
    const netWorth = balance + open
    // Has ever traded (open, sold or settled): such accounts can't be removed.
    const traded = basis.some((b) => b.userId === u.id)
    return { ...u, balance, invested, open, netWorth, pnl: netWorth - invested, bets, traded }
  })
}

export async function getLeaderboard() {
  return (await getPlayerAccounts())
    .filter((u) => u.invested !== 0 || u.netWorth !== 0)
    .sort((a, b) => b.pnl - a.pnl)
}

/** Everything the basement TV dashboard shows, in one round trip. */
export async function getTvBoard(editionId: number) {
  const [board, results, trades, leaders, copper, idols] = await Promise.all([
    getEditionBoard(editionId),
    prisma.pdResultEvent.findMany({
      where: { editionId },
      orderBy: { id: 'desc' },
      take: 6,
      include: { competitor: { select: { name: true } } },
    }),
    prisma.pdTrade.findMany({
      where: { market: { editionId } },
      orderBy: { id: 'desc' },
      take: 12,
      include: {
        user: { select: { name: true } },
        outcome: { select: { label: true } },
        market: { select: { question: true, kind: true } },
      },
    }),
    getLeaderboard(),
    getCopperTable(editionId),
    getIdols(editionId),
  ])
  const winnerView = board.markets.find((m) => m.kind === 'WINNER' && m.status !== 'VOID')
  const [events, winnerRow, winnerTrades, firstResult] = await Promise.all([
    getPublicEvents(editionId, board.standings.currentRound),
    winnerView ? loadMarketRow(winnerView.id) : null,
    winnerView
      ? prisma.pdTrade.findMany({
          where: { marketId: winnerView.id },
          orderBy: { id: 'asc' },
          select: { outcomeId: true, shares: true, createdAt: true, pricesAfter: true },
        })
      : [],
    prisma.pdResultEvent.findFirst({ where: { editionId }, orderBy: { id: 'asc' }, select: { createdAt: true } }),
  ])
  // Once the event is under way, chart from just before the first knockout.
  const chartSince = firstResult ? firstResult.createdAt.getTime() - 30 * 60_000 : undefined
  const lastPlayed = idols.log.filter((i) => i.kind === 'PLAYED').at(-1)
  return {
    ...board,
    events,
    /** Winner odds over time (top 4), once anyone has bet on it. */
    winnerSeries:
      winnerView && winnerRow && winnerTrades.length ? priceHistory(winnerRow, winnerView, winnerTrades, chartSince) : [],
    copper,
    idols,
    /** An idol was played more recently than the latest knockout: lead with it. */
    idolNews:
      lastPlayed && (!results[0] || lastPlayed.at > results[0].createdAt)
        ? { name: lastPlayed.name, round: lastPlayed.round, fresh: Date.now() - lastPlayed.at.getTime() < 5 * 60_000 }
        : null,
    results: results.map((r) => ({
      id: r.id,
      round: r.round,
      kind: r.kind,
      name: r.competitor.name,
      position: board.standings.byId.get(r.competitorId)?.position ?? null,
      at: r.createdAt,
    })),
    trades: trades.map((t) => ({
      id: t.id,
      user: t.user.name,
      outcome: t.outcome.label,
      question: t.market.question,
      kind: t.market.kind,
      shares: t.shares,
      costCents: t.costCents,
      at: t.createdAt,
    })),
    leaders: leaders.slice(0, 5),
    /** The latest result came in within the last 5 minutes (highlight it). */
    latestIsFresh: results.length > 0 && Date.now() - results[0].createdAt.getTime() < 5 * 60_000,
    tradedCents: board.markets.reduce((s, m) => s + m.volumeCents, 0),
  }
}

// --------------------------------------------------------------------------
// Event schedule, Copper Cup and immunity idol
// --------------------------------------------------------------------------

export async function getAllEvents(editionId: number) {
  return prisma.pdEvent.findMany({ where: { editionId }, orderBy: { seq: 'asc' } })
}

/**
 * What the family may see of Steven's schedule: revealed events only. Hidden
 * events' names never leave the server — just how many there are.
 */
export async function getPublicEvents(editionId: number, currentRound: number) {
  const all = await getAllEvents(editionId)
  const visible = all.filter((e) => e.revealed)
  // The event being played now: the first one after the rounds already recorded.
  const current = visible.find((e) => e.seq === currentRound + 1) ?? null
  return {
    visible,
    current,
    hidden: all.length - visible.length,
    total: all.length,
  }
}

export async function getCopperTable(editionId: number) {
  const [edition, entries, events] = await Promise.all([
    prisma.pdEdition.findUniqueOrThrow({ where: { id: editionId }, select: { copperFinal: true, copperScale: true } }),
    prisma.pdEditionEntry.findMany({ where: { editionId }, include: { competitor: true } }),
    prisma.pdEvent.findMany({
      where: { editionId, copperCup: true },
      orderBy: { seq: 'asc' },
      include: { copper: true },
    }),
  ])
  const totals = new Map<number, number>()
  for (const e of events) for (const s of e.copper) totals.set(s.competitorId, (totals.get(s.competitorId) ?? 0) + s.points)
  const rows = entries
    .map((e) => ({ id: e.competitorId, name: e.competitor.name, points: totals.get(e.competitorId) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
  return {
    final: edition.copperFinal,
    scale: edition.copperScale,
    events: events.map((e) => ({
      id: e.id,
      seq: e.seq,
      name: e.name,
      revealed: e.revealed,
      scored: e.copper.length > 0,
      scores: Object.fromEntries(e.copper.map((s) => [s.competitorId, s.points])) as Record<number, number>,
      places: Object.fromEntries(e.copper.filter((s) => s.place != null).map((s) => [s.competitorId, s.place!])) as Record<
        number,
        number
      >,
    })),
    rows,
    anyPoints: totals.size > 0,
  }
}

export async function getIdols(editionId: number) {
  const log = await prisma.pdIdol.findMany({
    where: { editionId },
    orderBy: { id: 'asc' },
    include: { competitor: { select: { name: true } } },
  })
  const entries = log.map((i) => ({
    id: i.id,
    kind: i.kind,
    round: i.round,
    name: i.competitor.name,
    competitorId: i.competitorId,
    at: i.createdAt,
  }))
  // Holders: found it and haven't played it since.
  const holders = new Map<number, string>()
  for (const i of entries) {
    if (i.kind === 'FOUND') holders.set(i.competitorId, i.name)
    else holders.delete(i.competitorId)
  }
  return { log: entries, holders: [...holders.entries()].map(([id, name]) => ({ id, name })) }
}

// --------------------------------------------------------------------------
// Player-suggested markets
// --------------------------------------------------------------------------

/**
 * The proposals table is new: deploys don't create tables (that's a manual
 * `prisma db push`), so until it exists these reads fall back to "nothing
 * waiting" instead of breaking every page for admins.
 */
export function isMissingTable(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2021'
}

async function orIfMissing<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p
  } catch (e) {
    if (isMissingTable(e)) return fallback
    throw e
  }
}

type DraftLike = Pick<ProposalDraft, 'kind' | 'question' | 'a' | 'b' | 'topN'>

/**
 * Is this market already open (not void) or already waiting for approval?
 * Returns which, so the message can say so.
 */
export async function duplicateOf(
  editionId: number,
  d: DraftLike,
  ignoreProposal?: number,
): Promise<'market' | 'proposal' | null> {
  const [markets, pending] = await Promise.all([
    prisma.pdMarket.findMany({
      where: { editionId, kind: d.kind, status: { not: 'VOID' } },
      include: { outcomes: { orderBy: [{ sort: 'asc' }, { id: 'asc' }] } },
    }),
    prisma.pdProposal.findMany({ where: { editionId, kind: d.kind, status: 'PENDING', id: { not: ignoreProposal ?? -1 } } }),
  ])
  const asDraft = (m: (typeof markets)[number]): DraftLike => {
    if (m.kind === 'H2H') return { kind: 'H2H', question: null, a: m.outcomes[0]?.competitorId ?? null, b: m.outcomes[1]?.competitorId ?? null, topN: null }
    if (m.kind === 'TOP_N') return { kind: 'TOP_N', question: null, a: m.outcomes.find((o) => o.isYes)?.competitorId ?? null, b: null, topN: m.topN }
    return { kind: 'CUSTOM', question: m.question, a: null, b: null, topN: null }
  }
  if (markets.some((m) => sameMarket(asDraft(m), d))) return 'market'
  if (pending.some((p) => sameMarket({ ...p, kind: p.kind as ProposalKind }, d))) return 'proposal'
  return null
}

async function competitorNames(ids: number[]) {
  const rows = await prisma.pdCompetitor.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
  const map = new Map(rows.map((r) => [r.id, r.name]))
  return (id: number) => map.get(id) ?? '?'
}

/** Admin queue: everything waiting (oldest first) plus the last few decided. */
export async function getProposalsForAdmin(editionId: number) {
  return orIfMissing(loadProposalsForAdmin(editionId), { pending: [], decided: [] })
}

async function loadProposalsForAdmin(editionId: number) {
  const [pending, decided] = await Promise.all([
    prisma.pdProposal.findMany({
      where: { editionId, status: 'PENDING' },
      orderBy: { id: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.pdProposal.findMany({
      where: { editionId, status: { not: 'PENDING' } },
      orderBy: { decidedAt: 'desc' },
      take: 8,
      include: { user: { select: { name: true } }, market: { select: { id: true, question: true } } },
    }),
  ])
  const nameOf = await competitorNames([...pending, ...decided].flatMap((p) => [p.a, p.b]).filter((x): x is number => x != null))
  const view = (p: (typeof pending)[number]) => ({
    id: p.id,
    kind: p.kind as ProposalKind,
    question: p.question,
    options: p.options,
    note: p.note,
    by: p.user.name,
    at: p.createdAt,
    title: describeDraft({ ...p, kind: p.kind as ProposalKind }, nameOf),
  })
  return {
    pending: pending.map(view),
    decided: decided.map((p) => ({ ...view(p), status: p.status, reply: p.reply, market: p.market })),
  }
}

/** A player's own suggestions, newest first, with what became of them. Null until the table exists. */
export async function getMyProposals(userId: number) {
  return orIfMissing(loadMyProposals(userId), null)
}

async function loadMyProposals(userId: number) {
  const rows = await prisma.pdProposal.findMany({
    where: { userId },
    orderBy: { id: 'desc' },
    take: 20,
    include: { market: { select: { id: true, question: true } } },
  })
  const nameOf = await competitorNames(rows.flatMap((p) => [p.a, p.b]).filter((x): x is number => x != null))
  return rows.map((p) => ({
    id: p.id,
    // Once approved, show the market's final wording (the admin may have edited it).
    title: p.market?.question ?? describeDraft({ ...p, kind: p.kind as ProposalKind }, nameOf),
    status: p.status,
    reply: p.reply,
    market: p.market,
    at: p.createdAt,
  }))
}

export async function pendingProposalCount() {
  return orIfMissing(prisma.pdProposal.count({ where: { status: 'PENDING' } }), 0)
}

/** Everything the player's Suggest page needs. */
export async function getSuggestPage(userId: number) {
  const edition = await getCurrentEdition()
  const [entries, mine, admin] = await Promise.all([
    edition
      ? prisma.pdEditionEntry.findMany({ where: { editionId: edition.id }, include: { competitor: true } })
      : Promise.resolve([]),
    getMyProposals(userId),
    prisma.pdUser.findFirst({ where: { isAdmin: true }, orderBy: { id: 'asc' }, select: { name: true } }),
  ])
  return {
    edition,
    open: edition != null && edition.status !== 'FINISHED',
    /** False until the proposals table has been created on this database. */
    ready: mine != null,
    competitors: entries.map((e) => ({ id: e.competitorId, name: e.competitor.name })).sort((a, b) => a.name.localeCompare(b.name)),
    mine: mine ?? [],
    adminName: admin?.name ?? 'An admin',
  }
}
