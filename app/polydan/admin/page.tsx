import { Suspense } from 'react'
import Loading from '@/app/polydan/loading'
import Link from 'next/link'
import { requireAdmin } from '@/lib/polydan/auth'
import { prisma } from '@/lib/prisma'
import { getAllEvents, getCopperTable, getEditionBoard, getIdols, getPlayerAccounts } from '@/lib/polydan/queries'
import { maxHouseLoss } from '@/lib/polydan/lmsr'
import { formatMoney, formatOrdinal, formatPct } from '@/lib/polydan/money'
import { StatusTag } from '@/components/polydan/MarketCard'
import {
  AddEventsForm,
  BalanceForm,
  CopperFinalForm,
  CopperScaleForm,
  CopperScoresForm,
  EventEditor,
  IdolForm,
  RemoveIdolForm,
  ResetForm,
  CreateEditionForm,
  CreateUserForm,
  EditionStatusForm,
  FieldForm,
  MarketActions,
  NewMarketForm,
  ResetPinForm,
  ResultsForm,
  SettleAllForm,
  UndoForm,
} from './forms'

const TABS = [
  { key: 'setup', label: 'Setup', short: 'Setup' },
  { key: 'players', label: 'Players & money', short: 'Players' },
  { key: 'markets', label: 'Markets', short: 'Markets' },
  { key: 'results', label: 'Results', short: 'Results' },
] as const
type Tab = (typeof TABS)[number]['key']

// Sync shell + boundary (the SSL pattern for Cache Components): the page itself
// touches no request data, so navigation can show the placeholder instantly.
export default function AdminPage(props: PageProps<'/polydan/admin'>) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminPageContent {...props} />
    </Suspense>
  )
}

async function AdminPageContent({ searchParams }: PageProps<'/polydan/admin'>) {
  await requireAdmin()
  const sp = await searchParams
  const editions = await prisma.pdEdition.findMany({ orderBy: { number: 'desc' } })
  const editionId = Number(sp.edition) || editions.find((e) => e.status === 'LIVE')?.id || editions[0]?.id
  // Land on Setup until an edition is live, then on Results (the day-of job).
  const live = editions.find((e) => e.id === editionId)?.status === 'LIVE'
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : live ? 'results' : 'setup') as Tab
  const href = (t: Tab) => `/polydan/admin?tab=${t}${editionId ? `&edition=${editionId}` : ''}`

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="pd-eyebrow">Admin</p>
          <h1 className="font-pd-display text-3xl font-bold uppercase tracking-wide">Control room</h1>
        </div>
        {editions.length > 1 && (
          <nav className="ml-auto flex gap-1 text-sm">
            {editions.map((e) => (
              <Link
                key={e.id}
                href={`/polydan/admin?tab=${tab}&edition=${e.id}`}
                className={`rounded-md px-2.5 py-1 ${e.id === editionId ? 'bg-pd-surface-2 font-semibold' : 'text-pd-muted'}`}
              >
                IM {e.number}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Segmented tabs: four equal buttons on phones, a tab row on wider screens. */}
      <nav className="grid grid-cols-4 gap-1 rounded-xl bg-pd-surface-2 p-1 text-sm sm:flex sm:w-fit">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key)}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`flex min-h-10 items-center justify-center rounded-lg px-2 font-semibold sm:px-4 ${
              tab === t.key ? 'bg-pd-surface text-pd-ink shadow-sm ring-1 ring-pd-line-strong' : 'text-pd-muted hover:text-pd-ink'
            }`}
          >
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </Link>
        ))}
      </nav>

      {tab === 'players' ? (
        <PlayersTab />
      ) : tab === 'setup' ? (
        <EditionTab editionId={editionId} done={typeof sp.done === 'string' ? sp.done : undefined} />
      ) : !editionId ? (
        <p className="pd-card p-4 text-sm">
          No edition yet — start in the <Link href={href('setup')} className="text-pd-gold underline">Setup</Link> tab.
        </p>
      ) : tab === 'results' ? (
        <ResultsTab editionId={editionId} />
      ) : (
        <MarketsTab editionId={editionId} done={typeof sp.done === 'string' ? sp.done : undefined} />
      )}
    </div>
  )
}

// ------------------------------------------------------------------ results

async function ResultsTab({ editionId }: { editionId: number }) {
  const [{ edition, field, standings }, log, events, copper, idols] = await Promise.all([
    getEditionBoard(editionId),
    prisma.pdResultEvent.findMany({
      where: { editionId },
      orderBy: { id: 'asc' },
      include: { competitor: true },
    }),
    getAllEvents(editionId),
    getCopperTable(editionId),
    getIdols(editionId),
  ])
  if (!field.length) return <p className="pd-card p-4 text-sm">Set the field in the Setup tab first.</p>

  const rounds = [...new Set(log.map((e) => e.round))].sort((a, b) => b - a)
  const nextEvent = events.find((e) => e.seq === standings.currentRound + 1) ?? null
  const word = { TO_ISLAND: '→ island', OUT: 'out', RETURN: 'back from island' }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
      <section className="pd-card p-4">
        <h2 className="mb-1 font-semibold">Record a round</h2>
        <p className="mb-4 text-sm text-pd-muted">
          Last place each round goes to Redemption Island or out. Markets that become certain lock straight away; nothing
          pays out until you settle.
        </p>
        {nextEvent && !standings.finished && (
          <div className="mb-4 rounded-lg border border-pd-line-strong bg-pd-surface-2 p-3 text-sm">
            <p className="pd-eyebrow">Round {nextEvent.seq} event</p>
            <p className="mt-0.5 text-base font-semibold">{nextEvent.name}</p>
            {nextEvent.description && <p className="text-pd-muted">{nextEvent.description}</p>}
            <p className="mt-1 flex flex-wrap gap-x-3 text-xs font-medium">
              <span className={nextEvent.islandOpen ? 'text-pd-island' : 'text-pd-no'}>
                {nextEvent.islandOpen ? '🏝 Redemption Island open' : '🚫 No Redemption Island — losers are out'}
              </span>
              {nextEvent.copperCup && <span className="text-pd-gold">🥉 Copper Cup event</span>}
              {!nextEvent.revealed && <span className="text-pd-muted">🔒 Not revealed to the family yet</span>}
            </p>
          </div>
        )}
        {standings.finished ? (
          <p className="text-sm font-medium text-pd-gold">
            Finished — {field.find((c) => c.id === standings.champion)?.name ?? 'dead heat'} is the champion.
          </p>
        ) : (
          <ResultsForm
            editionId={edition.id}
            nextRound={standings.currentRound + 1}
            currentRound={standings.currentRound}
            competitors={field
              .filter((c) => c.standing.status !== 'OUT')
              .map((c) => ({ id: c.id, name: c.name, status: c.standing.status }))}
            islandOpen={nextEvent?.islandOpen ?? true}
          />
        )}
      </section>

      {copper.events.length > 0 && (
        <section className="pd-card space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">🥉 Copper Cup</h2>
              <p className="text-sm text-pd-muted">
                {copper.final
                  ? 'Final — its market can now be settled.'
                  : 'After each Copper Cup event, enter everyone’s finishing place; points follow the scale.'}
              </p>
            </div>
            <CopperFinalForm editionId={edition.id} final={copper.final} />
          </div>
          <CopperScaleForm editionId={edition.id} scale={copper.scale} locked={copper.final} />
          {copper.anyPoints && (
            <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {copper.rows.slice(0, 10).map((r, i) => (
                <li key={r.id} className="flex gap-2">
                  <span className="pd-num w-5 text-pd-muted">{i + 1}</span>
                  <span className="font-medium">{r.name}</span>
                  <span className="pd-num ml-auto font-semibold">{r.points}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="space-y-2">
            {copper.events.map((e) => (
              <details key={e.id} className="rounded-lg border border-pd-line" open={!e.scored && e.seq === standings.currentRound}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span className="pd-num text-pd-gold">{e.seq}</span> {e.name}
                  <span className={`ml-auto text-xs ${e.scored ? 'text-pd-yes' : 'text-pd-muted'}`}>
                    {e.scored ? '✓ points in' : 'no points yet'}
                  </span>
                </summary>
                <div className="border-t border-pd-line p-3">
                  <CopperScoresForm
                    event={e}
                    competitors={field.map((c) => ({ id: c.id, name: c.name }))}
                    places={e.places}
                    scale={copper.scale}
                    locked={copper.final}
                  />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
      </div>
      <aside className="space-y-3">
        <div className="pd-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Log</h2>
            {log.length > 0 && <UndoForm editionId={edition.id} />}
          </div>
          {rounds.length ? (
            <ol className="space-y-2 text-sm">
              {rounds.map((r) => (
                <li key={r}>
                  <span className="pd-eyebrow">Round {r}</span>
                  <ul>
                    {log
                      .filter((e) => e.round === r)
                      .map((e) => (
                        <li key={e.id}>
                          {e.competitor.name} <span className="text-pd-muted">{word[e.kind]}</span>
                          {e.kind === 'OUT' && (
                            <span className="text-pd-muted pd-num"> ({formatOrdinal(standings.byId.get(e.competitorId)?.position ?? 0)})</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-pd-muted">No results yet.</p>
          )}
        </div>
              <div className="pd-card space-y-3 p-4">
          <h2 className="font-semibold">🗿 Immunity idol</h2>
          {idols.holders.length > 0 ? (
            <p className="text-sm">
              Held by <span className="font-semibold">{idols.holders.map((h) => h.name).join(', ')}</span> — shown to
              everyone.
            </p>
          ) : (
            <p className="text-sm text-pd-muted">Nobody holds an idol.</p>
          )}
          {idols.log.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {idols.log.map((i) => (
                <li key={i.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    {i.name} <span className="text-pd-muted">{i.kind === 'FOUND' ? 'found it' : 'played it'}</span>
                    {i.round && <span className="text-pd-muted"> · round {i.round}</span>}
                  </span>
                  <RemoveIdolForm idolId={i.id} />
                </li>
              ))}
            </ul>
          )}
          <IdolForm
            editionId={edition.id}
            competitors={field.filter((c) => c.standing.status !== 'OUT').map((c) => ({ id: c.id, name: c.name }))}
            round={Math.max(1, standings.currentRound + 1)}
          />
        </div>
      </aside>
    </div>
  )
}

// ------------------------------------------------------------------ markets

async function MarketsTab({ editionId, done }: { editionId: number; done?: string }) {
  const { field, markets } = await getEditionBoard(editionId)
  const [ledger, trades] = await Promise.all([
    prisma.pdLedgerEntry.groupBy({
      by: ['marketId', 'kind'],
      where: { market: { editionId } },
      _sum: { amountCents: true },
    }),
    prisma.pdTrade.findMany({ where: { market: { editionId } }, select: { marketId: true, outcomeId: true, shares: true } }),
  ])
  // House view per market: money taken in, paid out, and the worst case.
  const house = (marketId: number) => {
    const rows = ledger.filter((l) => l.marketId === marketId)
    const sum = (k: string[]) => rows.filter((r) => k.includes(r.kind)).reduce((s, r) => s + (r._sum.amountCents ?? 0), 0)
    return { taken: -sum(['BUY', 'SELL']), paid: sum(['PAYOUT', 'REFUND']) }
  }
  const risk = (m: (typeof markets)[number]) => {
    const openQ = m.outcomes.map(
      (o) => o.q - trades.filter((t) => t.outcomeId === o.id).reduce((s, t) => s + t.shares, 0),
    )
    return maxHouseLoss(openQ, m.b)
  }
  const decided = markets.filter((m) => m.resolved && (m.status === 'OPEN' || m.status === 'CLOSED'))
  const competitors = field.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="space-y-3">
        {done && (
          <p role="status" className="rounded-lg border border-pd-yes bg-pd-yes-soft p-3 text-sm font-medium text-pd-yes">
            ✓ {done.slice(0, 200)}
          </p>
        )}
        <div className={`pd-card flex flex-wrap items-center gap-3 p-4 ${decided.length ? 'border-pd-gold ring-1 ring-pd-gold' : ''}`}>
          <p className="min-w-48 flex-1 text-sm">
            {decided.length ? (
              <>
                <span className="font-semibold">{decided.length}</span> market{decided.length > 1 ? 's have' : ' has'} a
                result waiting to pay out.
              </>
            ) : (
              <span className="text-pd-muted">Nothing waiting to pay out.</span>
            )}
          </p>
          <SettleAllForm editionId={editionId} disabled={!decided.length} />
        </div>
        {markets.map((m) => {
          const h = house(m.id)
          return (
            <div key={m.id} className="pd-card space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/polydan/market?id=${m.id}`} className="font-semibold hover:underline">
                  {m.question}
                </Link>
                <StatusTag market={m} />
              </div>
              <p className="text-xs text-pd-muted pd-num">
                Took in {formatMoney(h.taken)} · paid {formatMoney(h.paid)} · liquidity {m.b} · house risk ≤{' '}
                {formatMoney(Math.round(risk(m) * 100))}
                {m.outcomes.length === 2 && !m.resolved && ` · ${m.outcomes[0].label} ${formatPct(m.outcomes[0].price)}`}
              </p>
              <MarketActions
                editionId={editionId}
                market={{
                  id: m.id,
                  kind: m.kind,
                  status: m.status,
                  resolved: m.resolved,
                  hasBets: trades.some((t) => t.marketId === m.id),
                  outcomes: m.outcomes.map((o) => ({ id: o.id, label: o.label })),
                }}
              />
            </div>
          )
        })}
        {!markets.length && <p className="pd-card p-4 text-sm text-pd-muted">No markets yet — open one →</p>}
      </section>
      <aside className="pd-card h-fit p-4">
        <h2 className="mb-3 font-semibold">Open a market</h2>
        <NewMarketForm
          editionId={editionId}
          competitors={competitors}
          hasWinner={markets.some((m) => m.kind === 'WINNER' && m.status !== 'VOID')}
        />
      </aside>
    </div>
  )
}

// ------------------------------------------------------------------ players

async function PlayersTab() {
  const players = await getPlayerAccounts()
  const total = (k: 'balance' | 'open' | 'invested') => players.reduce((t, p) => t + p[k], 0)

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="space-y-3">
        {/* What the family holds right now — i.e. what you'd owe if everyone cashed out. */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['Put in', total('invested')],
              ['Cash held', total('balance')],
              ['In live bets', total('open')],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="pd-card p-3">
              <p className="pd-eyebrow">{k}</p>
              <p className="mt-1 font-pd-display text-xl font-semibold pd-num">{formatMoney(v)}</p>
            </div>
          ))}
        </div>

        <div className="pd-card divide-y divide-pd-line">
          {players.map((u) => (
            <details key={u.id} className="group" open={u.bets.length > 0}>
              <summary className="cursor-pointer list-none px-4 py-3 hover:bg-pd-surface-2/60 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                  <span className="w-4 text-pd-muted transition group-open:rotate-90">▸</span>
                  <span className="font-semibold">{u.name}</span>
                  {u.isAdmin && <span className="text-xs text-pd-gold">admin</span>}
                  <span
                    className={`ml-auto text-sm font-semibold pd-num ${u.pnl > 0 ? 'text-pd-yes' : u.pnl < 0 ? 'text-pd-no' : 'text-pd-muted'}`}
                  >
                    {formatMoney(u.pnl, { sign: true })}
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 pl-6 sm:flex sm:gap-6">
                  <Stat label="Cash" value={formatMoney(u.balance)} strong />
                  <Stat label="Live bets" value={`${formatMoney(u.open)} · ${u.bets.filter((b) => !b.dead).length}`} />
                  <Stat label="Put in" value={formatMoney(u.invested)} />
                </div>
              </summary>
              <div className="space-y-4 px-4 pb-4 sm:pl-10">
                {u.bets.length > 0 && (
                  <ul className="space-y-2 sm:hidden">
                    {u.bets.map((b) => (
                      <li key={b.outcomeId} className="rounded-lg border border-pd-line p-3 text-sm">
                        <Link href={`/polydan/market?id=${b.market.id}`} className="block">
                          <span className="font-semibold">{b.label}</span>
                          {b.dead ? (
                            <span className="ml-1.5 text-xs font-semibold text-pd-no">lost</span>
                          ) : (
                            b.market.resolved && <span className="ml-1.5 text-xs font-semibold text-pd-gold">won · awaiting payout</span>
                          )}
                          <span className="block text-xs text-pd-muted">{b.market.question}</span>
                        </Link>
                        <dl className="mt-2 grid grid-cols-3 gap-2 text-xs pd-num">
                          <div>
                            <dt className="text-pd-muted">Staked</dt>
                            <dd className="font-semibold">{formatMoney(b.costCents)}</dd>
                          </div>
                          <div>
                            <dt className="text-pd-muted">Worth now</dt>
                            <dd className="font-semibold">{formatMoney(b.valueCents)}</dd>
                          </div>
                          <div>
                            <dt className="text-pd-muted">Pays if right</dt>
                            <dd className="font-semibold">{b.dead ? '—' : formatMoney(Math.floor(b.shares * 100))}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
                {u.bets.length > 0 ? (
                  <table className="hidden w-full text-sm sm:table">
                    <thead>
                      <tr className="text-left text-xs text-pd-muted">
                        <th className="py-1 font-normal">Bet</th>
                        <th className="py-1 text-right font-normal">Shares</th>
                        <th className="py-1 text-right font-normal">Staked</th>
                        <th className="py-1 text-right font-normal">Worth now</th>
                        <th className="py-1 text-right font-normal">Pays if right</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pd-line">
                      {u.bets.map((b) => (
                        <tr key={b.outcomeId}>
                          <td className="py-1.5 pr-2">
                            <Link href={`/polydan/market?id=${b.market.id}`} className="hover:underline">
                              <span className="font-medium">{b.label}</span>{' '}
                              <span className="text-pd-muted">· {b.market.question}</span>
                            </Link>
                            {b.dead ? (
                              <span className="ml-1 text-xs text-pd-no">lost</span>
                            ) : (
                              b.market.resolved && <span className="ml-1 text-xs text-pd-gold">won · awaiting payout</span>
                            )}
                          </td>
                          <td className="py-1.5 text-right pd-num">{b.shares.toFixed(2)}</td>
                          <td className="py-1.5 text-right pd-num">{formatMoney(b.costCents)}</td>
                          <td className="py-1.5 text-right pd-num">
                            {formatMoney(b.valueCents)} <span className="text-xs text-pd-muted">({formatPct(b.price)})</span>
                          </td>
                          <td className="py-1.5 text-right pd-num">{b.dead ? '—' : formatMoney(Math.floor(b.shares * 100))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-pd-muted">No live bets.</p>
                )}
                <div className="space-y-4 rounded-lg bg-pd-surface-2/60 p-3">
                  <BalanceForm userId={u.id} />
                  <ResetPinForm userId={u.id} />
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
      <aside className="pd-card order-first h-fit p-4 lg:order-none">
        <h2 className="mb-3 font-semibold">Add a player</h2>
        <CreateUserForm />
      </aside>
    </div>
  )
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className="text-sm">
      <span className="block text-xs text-pd-muted sm:inline">{label} </span>
      <span className={`pd-num ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </span>
  )
}

// ------------------------------------------------------------------ edition

async function EditionTab({ editionId, done }: { editionId?: number; done?: string }) {
  const [edition, competitors, last, events] = await Promise.all([
    editionId
      ? prisma.pdEdition.findUnique({
          where: { id: editionId },
          include: { entries: true, _count: { select: { markets: true, results: true } } },
        })
      : null,
    prisma.pdCompetitor.findMany({ orderBy: { name: 'asc' } }),
    prisma.pdEdition.findFirst({ orderBy: { number: 'desc' } }),
    editionId ? getAllEvents(editionId) : Promise.resolve([]),
  ])
  return (
    <div className="space-y-5">
    {done && (
      <p role="status" className="rounded-lg border border-pd-yes bg-pd-yes-soft p-3 text-sm font-medium text-pd-yes">
        ✓ {done.slice(0, 200)}
      </p>
    )}
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      {edition ? (
        <section className="pd-card space-y-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-pd-display text-xl font-semibold uppercase tracking-wide">Iron Man {edition.number}</h2>
            <EditionStatusForm editionId={edition.id} status={edition.status} />
          </div>
          <h3 className="font-semibold">Field</h3>
          <FieldForm
            editionId={edition.id}
            competitors={competitors}
            selected={edition.entries.map((e) => e.competitorId)}
            locked={edition._count.markets + edition._count.results > 0}
          />
          <div className="space-y-3 border-t border-pd-line pt-4">
            <div>
              <h3 className="font-semibold">Events schedule {events.length > 0 && <span className="text-pd-muted">· {events.length}</span>}</h3>
              <p className="text-sm text-pd-muted">
                Round 1 is played on event 1, round 2 on event 2, and so on. Dashed events are hidden from the family;
                recording a round reveals the next one.
              </p>
            </div>
            {events.length > 0 && (
              <ol className="space-y-2">
                {events.map((e, i) => (
                  <EventEditor key={e.id} event={e} isFirst={i === 0} isLast={i === events.length - 1} />
                ))}
              </ol>
            )}
            <AddEventsForm editionId={edition.id} count={events.length} />
          </div>
        </section>
      ) : (
        <p className="pd-card p-4 text-sm text-pd-muted">Create the first edition →</p>
      )}
      <aside className="space-y-5">
        <div className="pd-card h-fit p-4">
          <h2 className="mb-3 font-semibold">New edition</h2>
          <CreateEditionForm nextNumber={(last?.number ?? 9) + 1} />
        </div>
        <div className="pd-card h-fit space-y-2 border-pd-no p-4">
          <h2 className="font-semibold text-pd-no">Danger zone</h2>
          <p className="text-sm text-pd-muted">
            Wipe PolyDan after testing: deletes every edition, event, market, bet, result, money entry and non-admin
            player. Admin accounts (same PINs) and the competitor list stay.
          </p>
          <ResetForm />
        </div>
      </aside>
    </div>
    </div>
  )
}
