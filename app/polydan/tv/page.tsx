import { Suspense } from 'react'
import Link from 'next/link'
import { requireUser } from '@/lib/polydan/auth'
import { getCurrentEdition, getTvBoard, type MarketView } from '@/lib/polydan/queries'
import { formatMoney, formatMultiple, formatOrdinal, formatPct } from '@/lib/polydan/money'
import { LiveRefresh } from '@/components/polydan/ui'
import { TvClock, TvControls } from '@/components/polydan/TvControls'
import { EventTags } from '@/components/polydan/EventsCard'
import { AutoScroll } from '@/components/polydan/AutoScroll'
import { PriceChart } from '@/components/polydan/PriceChart'
import { Ticker } from '@/components/polydan/Ticker'

// Basement TV dashboard: a full-screen, read-only view of the event for a
// laptop plugged into the TV. Sized in em off a viewport-based font size, so
// it fills a 1080p TV or a laptop screen alike. Long lists scroll themselves.

export const metadata = { title: 'PolyDan · TV' }

export default function TvPage() {
  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-pd-bg text-pd-ink"
      style={{ fontSize: 'clamp(12px, 1.02vw, 30px)' }}
    >
      <LiveRefresh seconds={5} />
      <Suspense fallback={<p className="p-[2em] text-pd-muted">Loading…</p>}>
        <Tv />
      </Suspense>
    </div>
  )
}

const STATUS = { SETUP: 'Coming up', LIVE: 'Live', FINISHED: 'Final' } as const

type TvBoard = Awaited<ReturnType<typeof getTvBoard>>

async function Tv() {
  await requireUser()
  const current = await getCurrentEdition()
  if (!current)
    return (
      <Center>
        <p className="font-pd-display text-[4em] font-bold uppercase text-pd-gold">PolyDan</p>
        <p className="text-[1.4em] text-pd-muted">No Iron Man edition set up yet.</p>
      </Center>
    )

  const tv = await getTvBoard(current.id)
  const { edition, field, standings, markets } = tv
  const nameOf = new Map(field.map((c) => [c.id, c.name]))
  const winner = markets.find((m) => m.kind === 'WINNER' && m.status !== 'VOID')
  const showable = (m: MarketView) => m.status === 'OPEN' || m.status === 'CLOSED' || m.resolved
  // Top-N markets are one yes/no market per person: show each N as one board.
  const topNs = [...new Set(markets.filter((m) => m.kind === 'TOP_N' && showable(m)).map((m) => topNOf(m)))].sort(
    (a, b) => a - b,
  )
  const others = markets.filter((m) => m !== winner && m.kind !== 'TOP_N' && showable(m))
  const popular = markets
    .filter((m) => m.volumeCents > 0 && m.status !== 'VOID')
    .sort((a, b) => b.volumeCents - a.volumeCents || b.bets - a.bets)
    .slice(0, 3)
  const inGame = field.filter((c) => c.standing.status === 'IN')
  const island = field.filter((c) => c.standing.status === 'ISLAND')
  const out = field
    .filter((c) => c.standing.status === 'OUT')
    .sort((a, b) => a.standing.position! - b.standing.position!)
  const champion = field.find((c) => c.id === standings.champion)
  // The round being played now: one past the last recorded, until it's over.
  const playingRound =
    standings.finished || edition.status !== 'LIVE' ? standings.currentRound : standings.currentRound + 1
  const idolHolders = new Set(tv.idols.holders.map((h) => h.id))
  const latest = tv.results[0]
  const fresh = tv.latestIsFresh

  return (
    <div className="flex h-full flex-col gap-[1.2em] p-[1.6em]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-end gap-[1.5em]">
        <div>
          <p className="pd-eyebrow text-[0.9em]">
            ⚜ PolyDan{edition.status !== 'LIVE' && ` · ${STATUS[edition.status]}`}
          </p>
          <h1 className="font-pd-display text-[3.6em] font-bold uppercase leading-none tracking-wide">
            Iron Man {edition.number}
          </h1>
        </div>
        {edition.status === 'LIVE' && (
          <span className="mb-[0.5em] flex items-center gap-[0.4em] rounded-full bg-pd-no px-[0.8em] py-[0.2em] text-[1em] font-bold uppercase tracking-wider text-pd-on-solid">
            <span className="inline-block size-[0.55em] animate-pulse rounded-full bg-pd-on-solid" /> Live
          </span>
        )}
        <div className="mb-[0.4em] flex gap-[2em] text-[1.3em]">
          {playingRound > 0 && <Big label="Round" value={String(playingRound)} />}
          <Big label="Left" value={`${standings.alive.length} / ${field.length}`} />
          <Big label="Traded" value={formatMoney(tv.tradedCents)} />
        </div>
        <div className="ml-auto mb-[0.4em] flex items-center gap-[1.2em] text-[1.6em] font-semibold">
          <TvControls />
          <TvClock />
        </div>
      </header>

      {/* ── Latest result banner ───────────────────────────────── */}
      <div className="flex gap-[1.2em]">
        {!champion && tv.events.current && (
          <div className="pd-card flex-[1.1] border-pd-gold px-[1.1em] py-[0.5em]">
            <p className="pd-eyebrow text-[0.85em] text-pd-gold">
              {edition.status === 'LIVE' ? 'Now playing' : 'Up first'} · event {tv.events.current.seq}
            </p>
            <p className="font-pd-display text-[1.9em] font-semibold uppercase leading-tight tracking-wide">
              {tv.events.current.name}
            </p>
            <EventTags event={tv.events.current} className="text-[1.05em]" />
          </div>
        )}
        <div className="flex flex-1 flex-col justify-center">
          {champion ? (
            <Banner tone="gold">
              ⚜ {champion.name} is the Iron Man {edition.number} champion! ⚜
            </Banner>
          ) : tv.idolNews ? (
            <Banner tone={tv.idolNews.fresh ? 'hot' : 'calm'}>
              🗿 {tv.idolNews.name} plays the immunity idol{tv.idolNews.round ? ` in round ${tv.idolNews.round}` : ''}!
            </Banner>
          ) : (
            latest && (
              <Banner tone={fresh ? 'hot' : 'calm'}>
                <span className="text-pd-muted">Round {latest.round} · </span>
                {describe(latest)}
              </Banner>
            )
          )}
        </div>
      </div>

      {/* ── Four columns ───────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-[0.95fr_1.5fr_1.1fr_1fr] gap-[1.2em]">
        {/* 1 · Field */}
        <Panel title={`Still standing · ${inGame.length}`}>
          <AutoScroll>
            <div className="flex flex-wrap gap-[0.45em]">
              {inGame.map((c) => (
                <span
                  key={c.id}
                  className={`rounded-full border-[0.1em] px-[0.75em] py-[0.25em] text-[1.2em] font-semibold ${
                    c.standing.position === 1 ? 'border-pd-gold bg-pd-gold text-pd-on-gold' : 'border-pd-line-strong'
                  }`}
                >
                  {c.name}
                  {idolHolders.has(c.id) && ' 🗿'}
                </span>
              ))}
            </div>
            {island.length > 0 && (
              <>
                <h3 className="pd-eyebrow mt-[1.4em] mb-[0.6em] text-[0.95em]">
                  🏝 Redemption Island · {island.length}
                </h3>
                <div className="flex flex-wrap gap-[0.45em]">
                  {island.map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full bg-pd-island-soft px-[0.75em] py-[0.25em] text-[1.15em] font-semibold text-pd-island"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </>
            )}
            {out.length > 0 && (
              <>
                <h3 className="pd-eyebrow mt-[1.4em] mb-[0.6em] text-[0.95em]">Out · {out.length}</h3>
                <ol className="columns-2 gap-[1.2em] text-[1.05em]">
                  {out.map((c) => (
                    <li key={c.id} className="break-inside-avoid py-[0.12em] text-pd-muted">
                      <span className="pd-num inline-block w-[2.6em] text-pd-ink-2">
                        {formatOrdinal(c.standing.position!)}
                      </span>
                      {c.name}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </AutoScroll>
        </Panel>

        {/* 2 · Winner odds, and how they've moved */}
        <div className="flex min-h-0 flex-col gap-[1.2em]">
          <Panel title={winner ? winner.question : 'Who wins?'} big className="flex-[1.3]">
            {winner ? (
              <AutoScroll>
                <WinnerOdds market={winner} />
              </AutoScroll>
            ) : (
              <p className="text-[1.2em] text-pd-muted">Winner market not open yet.</p>
            )}
          </Panel>
          {tv.winnerSeries.length > 0 && (
            <Panel title="Winner odds over time · top 4" className="flex-1">
              <PriceChart series={tv.winnerSeries} fill />
            </Panel>
          )}
        </div>

        {/* 3 · Popular markets, top-N boards, everything else */}
        <div className="flex min-h-0 flex-col gap-[1.2em]">
          <Panel title="🔥 Popular markets" className="flex-1">
            {popular.length ? (
              <AutoScroll>
                <ol className="space-y-[0.6em]">
                  {popular.map((m, i) => (
                    <PopularRow key={m.id} rank={i + 1} market={m} />
                  ))}
                </ol>
              </AutoScroll>
            ) : (
              <p className="text-[1.05em] text-pd-muted">No bets yet. The most-bet markets show up here.</p>
            )}
          </Panel>
          {topNs.map((n) => (
            <Panel key={n} title={n === 1 ? 'Will they win?' : `Will they finish top ${n}?`} className="flex-[1.6]">
              <AutoScroll>
                <TopNBoard
                  markets={markets.filter((m) => m.kind === 'TOP_N' && showable(m) && topNOf(m) === n)}
                  nameOf={nameOf}
                />
              </AutoScroll>
            </Panel>
          ))}
          {others.length > 0 && (
            <Panel title="Other markets" grow={topNs.length === 0}>
              <AutoScroll>
                <ul className="space-y-[0.55em]">
                  {others.map((m) => (
                    <MiniMarket key={m.id} market={m} />
                  ))}
                </ul>
              </AutoScroll>
            </Panel>
          )}
        </div>

        {/* 4 · Copper Cup, latest bets, leaders */}
        <div className="flex min-h-0 flex-col gap-[1.2em]">
          {tv.copper.events.length > 0 && (
            <Panel title={`🥉 Copper Cup${tv.copper.final ? ' · final' : ''}`} className="flex-[1.6]">
              <CopperBoard copper={tv.copper} />
            </Panel>
          )}
          {tv.leaders.length > 0 && (
            <Panel title="Sharpest money" className="flex-1">
              <AutoScroll>
                <ol className="space-y-[0.35em] text-[1.1em]">
                  {tv.leaders.map((l, i) => (
                    <li key={l.id} className="flex gap-[0.6em]">
                      <span className="pd-num w-[1.2em] text-pd-muted">{i + 1}</span>
                      <span className="font-semibold">{l.name}</span>
                      <span
                        className={`pd-num ml-auto font-semibold ${l.pnl > 0 ? 'text-pd-yes' : l.pnl < 0 ? 'text-pd-no' : 'text-pd-muted'}`}
                      >
                        {formatMoney(l.pnl, { sign: true })}
                      </span>
                    </li>
                  ))}
                </ol>
              </AutoScroll>
            </Panel>
          )}
        </div>
      </div>

      {/* ── Latest bets ticker ─────────────────────────────────── */}
      <div className="flex items-center gap-[1em] rounded-xl border border-pd-line bg-pd-surface px-[1.1em] py-[0.45em] text-[1.15em]">
        <span className="pd-eyebrow shrink-0 text-[0.8em] text-pd-gold">Latest bets</span>
        {tv.trades.length ? (
          <Ticker>
            {tv.trades.map((t) => (
              <span key={t.id} className="pr-[2.2em]">
                <span className="font-semibold">{t.user}</span>{' '}
                <span className={t.shares > 0 ? 'text-pd-yes' : 'text-pd-no'}>{t.shares > 0 ? 'backed' : 'sold'}</span>{' '}
                <span className="font-semibold">{betLabel(t)}</span>{' '}
                <span className="pd-num text-pd-muted">{formatMoney(Math.abs(t.costCents))}</span>
              </span>
            ))}
          </Ticker>
        ) : (
          <span className="text-pd-muted">No bets yet — be the first!</span>
        )}
      </div>

      {/* ── Footer call to action ──────────────────────────────── */}
      <footer className="flex items-center justify-between text-[1.15em]">
        <p>
          <span className="text-pd-muted">Bet from your phone: </span>
          <span className="font-semibold text-pd-gold">sslgolf.com/polydan</span>
          <span className="text-pd-muted"> — new here? tap “Join”</span>
        </p>
        <Link href="/polydan" className="text-[0.8em] text-pd-muted hover:text-pd-ink">
          ← Exit TV mode
        </Link>
      </footer>
    </div>
  )
}

function topNOf(m: MarketView): number {
  return m.topN ?? 1
}

function describe(r: { kind: string; name: string; position: number | null }) {
  if (r.kind === 'TO_ISLAND') return <>🏝 {r.name} heads to Redemption Island</>
  if (r.kind === 'RETURN') return <>🔥 {r.name} survives Redemption Island and is back in!</>
  return (
    <>
      ❌ {r.name} is out{r.position ? <> — finishes {formatOrdinal(r.position)}</> : null}
    </>
  )
}

function betLabel(t: { outcome: string; question: string; kind: string }) {
  // Yes/No outcomes need their question to make sense on their own.
  if (t.kind === 'TOP_N' || t.kind === 'CUSTOM') return `${t.outcome} · ${t.question.replace(/\?$/, '')}`
  return t.outcome
}

function WinnerOdds({ market }: { market: MarketView }) {
  const live = [...market.outcomes].filter((o) => !o.dead).sort((a, b) => b.price - a.price)
  const dead = market.outcomes.filter((o) => o.dead).length
  const max = Math.max(...live.map((o) => o.price), 0.01)
  return (
    <>
      <ol className="space-y-[0.5em]">
        {live.map((o, i) => (
          <li key={o.id} className="grid grid-cols-[1.4em_6.2em_1fr_2.9em_2.9em] items-center gap-[0.5em] text-[1.2em]">
            <span className="pd-num text-pd-muted">{i + 1}</span>
            <span className={`truncate ${i < 3 ? 'font-bold' : 'font-semibold'}`}>{o.label}</span>
            <span className="h-[0.7em] overflow-hidden rounded-full bg-pd-surface-2">
              <span
                className="block h-full rounded-full bg-pd-gold"
                style={{ width: `${Math.max((o.price / max) * 100, 2)}%` }}
              />
            </span>
            <span className="pd-num text-right font-bold">{formatPct(o.price)}</span>
            <span className="pd-num text-right text-[0.8em] text-pd-muted">{formatMultiple(o.price)}</span>
          </li>
        ))}
      </ol>
      {dead > 0 && <p className="mt-[0.6em] text-[0.95em] text-pd-muted">{dead} knocked out</p>}
    </>
  )
}

function PopularRow({ rank, market }: { rank: number; market: MarketView }) {
  const lead =
    market.kind === 'TOP_N'
      ? market.outcomes.find((o) => o.isYes)!
      : [...market.outcomes].sort((a, b) => b.price - a.price)[0]
  return (
    <li className="grid grid-cols-[1.2em_1fr] gap-x-[0.5em]">
      <span className="pd-num row-span-2 text-[1.1em] text-pd-muted">{rank}</span>
      <span className="truncate text-[1.1em] font-semibold">{market.question}</span>
      <span className="pd-num truncate text-[0.95em] text-pd-ink-2">
        <span className="font-semibold text-pd-ink">
          {lead.label} {formatPct(lead.price)}
        </span>
        <span className="text-pd-muted">
          {' '}
          · {formatMoney(market.volumeCents)} traded · {market.bets} bet{market.bets === 1 ? '' : 's'}
        </span>
      </span>
    </li>
  )
}

/** One row per person: their chance of a top-N finish, then ✓/✗ once it's settled. */
function TopNBoard({ markets, nameOf }: { markets: MarketView[]; nameOf: Map<number, string> }) {
  const rows = markets
    .map((m) => {
      const yes = m.outcomes.find((o) => o.isYes)!
      return { id: m.id, name: nameOf.get(yes.competitorId ?? -1) ?? m.question, p: yes.price, settled: m.resolved }
    })
    .sort((a, b) => b.p - a.p || a.name.localeCompare(b.name))
  return (
    <ol className="space-y-[0.45em]">
      {rows.map((r) => (
        <li key={r.id} className="grid grid-cols-[6.5em_1fr_3em] items-center gap-[0.6em] text-[1.1em]">
          <span className={`truncate font-semibold ${r.settled && r.p < 0.5 ? 'text-pd-muted line-through' : ''}`}>
            {r.name}
          </span>
          {r.settled ? (
            <span className={`text-[0.9em] font-semibold ${r.p >= 0.5 ? 'text-pd-yes' : 'text-pd-muted'}`}>
              {r.p >= 0.5 ? '✓ Made it' : '✗ Missed'}
            </span>
          ) : (
            <span className="h-[0.55em] overflow-hidden rounded-full bg-pd-surface-2">
              <span className="block h-full rounded-full bg-pd-gold" style={{ width: `${Math.max(r.p * 100, 2)}%` }} />
            </span>
          )}
          <span className="pd-num text-right font-bold">{r.settled ? '' : formatPct(r.p)}</span>
        </li>
      ))}
    </ol>
  )
}

/** Copper Cup standings: points bars for everyone, with the latest event's haul. */
function CopperBoard({ copper }: { copper: TvBoard['copper'] }) {
  const scored = copper.events.filter((e) => e.scored)
  const last = scored.at(-1)
  const next = copper.events.find((e) => !e.scored)
  const max = Math.max(...copper.rows.map((r) => r.points), 1)
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="mb-[0.6em] text-[0.95em] text-pd-muted">
        {scored.length} of {copper.events.length} events scored
        {next && !copper.final && ` · next: event ${next.seq}`}
      </p>
      {scored.length === 0 ? (
        <p className="text-[1.05em] text-pd-ink-2">
          Points by finishing place in each Copper Cup event (events {copper.events.map((e) => e.seq).join(', ')}). A
          side prize: surviving is still the goal.
        </p>
      ) : (
        <div className="min-h-0 flex-1">
          <AutoScroll>
            <ol className="space-y-[0.4em]">
              {copper.rows.map((r) => {
                const rank = 1 + copper.rows.filter((x) => x.points > r.points).length
                const gain = last?.scores[r.id] ?? 0
                return (
                  <li
                    key={r.id}
                    className="grid grid-cols-[1.4em_5.8em_1fr_2.4em] items-center gap-[0.5em] text-[1.05em]"
                  >
                    <span className="pd-num text-pd-muted">{rank}</span>
                    <span className={`truncate ${rank === 1 ? 'font-bold' : 'font-semibold'}`}>{r.name}</span>
                    <span className="flex items-center gap-[0.4em]">
                      <span className="h-[0.55em] flex-1 overflow-hidden rounded-full bg-pd-surface-2">
                        <span
                          className="block h-full rounded-full bg-pd-gold"
                          style={{ width: `${r.points > 0 ? Math.max((r.points / max) * 100, 3) : 0}%` }}
                        />
                      </span>
                      {gain > 0 && <span className="pd-num text-[0.8em] text-pd-yes">+{gain}</span>}
                    </span>
                    <span className="pd-num text-right font-bold">{r.points}</span>
                  </li>
                )
              })}
            </ol>
          </AutoScroll>
        </div>
      )}
    </div>
  )
}

function MiniMarket({ market }: { market: MarketView }) {
  const [a, b] = market.outcomes
  if (market.outcomes.length === 2) {
    return (
      <li className="text-[1.05em]">
        <div className="flex justify-between gap-[0.6em]">
          <span className={`truncate ${a.dead ? 'text-pd-muted line-through' : 'font-semibold'}`}>{a.label}</span>
          <span className={`truncate ${b.dead ? 'text-pd-muted line-through' : 'font-semibold'}`}>{b.label}</span>
        </div>
        <div className="mt-[0.2em] flex h-[0.45em] overflow-hidden rounded-full bg-pd-surface-2">
          <span className="block h-full bg-pd-gold" style={{ width: `${a.price * 100}%` }} />
        </div>
        <div className="pd-num mt-[0.15em] flex justify-between text-[0.85em] text-pd-muted">
          <span>{formatPct(a.price)}</span>
          <span>{formatPct(b.price)}</span>
        </div>
      </li>
    )
  }
  const lead = [...market.outcomes].sort((x, y) => y.price - x.price)[0]
  return (
    <li className="flex items-center gap-[0.6em] text-[1.05em]">
      <span className="min-w-0 flex-1 truncate">{market.question}</span>
      <span className="font-semibold">{lead.label}</span>
      <span className="pd-num font-bold">{formatPct(lead.price)}</span>
    </li>
  )
}

function Panel({
  title,
  children,
  big,
  grow,
  className = '',
}: {
  title: string
  children: React.ReactNode
  big?: boolean
  grow?: boolean
  className?: string
}) {
  return (
    <section className={`pd-card flex min-h-0 flex-col overflow-hidden p-[1.1em] ${grow ? 'flex-1' : ''} ${className}`}>
      <h2
        className={
          big
            ? 'mb-[0.7em] shrink-0 font-pd-display text-[1.7em] font-semibold uppercase tracking-wide'
            : 'pd-eyebrow mb-[0.7em] shrink-0 text-[0.95em]'
        }
      >
        {title}
      </h2>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function Banner({ tone, children }: { tone: 'hot' | 'calm' | 'gold'; children: React.ReactNode }) {
  const cls = {
    hot: 'border-pd-gold bg-pd-surface-2 text-pd-ink ring-[0.12em] ring-pd-gold',
    calm: 'border-pd-line bg-pd-surface text-pd-ink',
    gold: 'border-pd-gold bg-pd-gold text-pd-on-gold',
  }[tone]
  return <div className={`rounded-xl border px-[1.1em] py-[0.6em] text-[1.6em] font-semibold ${cls}`}>{children}</div>
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="pd-eyebrow block text-[0.6em]">{label}</span>
      <span className="pd-num font-pd-display text-[1.3em] font-semibold">{value}</span>
    </span>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center gap-[0.6em]">{children}</div>
}
