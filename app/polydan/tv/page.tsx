import { Suspense } from 'react'
import Link from 'next/link'
import { requireUser } from '@/lib/polydan/auth'
import { getCurrentEdition, getTvBoard, type MarketView } from '@/lib/polydan/queries'
import { formatMoney, formatMultiple, formatOrdinal, formatPct } from '@/lib/polydan/money'
import { LiveRefresh } from '@/components/polydan/ui'
import { TvClock, TvControls } from '@/components/polydan/TvControls'
import { AutoScroll } from '@/components/polydan/AutoScroll'
import { PriceChart } from '@/components/polydan/PriceChart'
import { Rotator } from '@/components/polydan/Rotator'
import { Ticker } from '@/components/polydan/Ticker'

// Basement TV dashboard: a full-screen, read-only view of the event for a
// laptop plugged into the TV. Three things, readable from the couch:
//   1. the field: every player in a fixed spot, crossed off as they go out;
//   2. who's going to win: live odds, and how they've moved;
//   3. the markets people are betting on, taking turns one at a time.
// Sized in em off a viewport-based font size, so it fills a 1080p TV or a
// laptop screen alike.

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

async function Tv() {
  await requireUser()
  const current = await getCurrentEdition()
  if (!current)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[0.6em]">
        <p className="font-pd-display text-[4em] font-bold uppercase text-pd-gold">PolyDan</p>
        <p className="text-[1.4em] text-pd-muted">No Iron Man edition set up yet.</p>
      </div>
    )

  const tv = await getTvBoard(current.id)
  const { edition, field, standings, markets } = tv
  const winner = markets.find((m) => m.kind === 'WINNER' && m.status !== 'VOID')
  // The markets with the most money on them take turns (the winner has its own panel).
  const popular = markets
    .filter((m) => m !== winner && m.volumeCents > 0 && (m.status === 'OPEN' || m.status === 'CLOSED'))
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.volumeCents - a.volumeCents || b.bets - a.bets)
    .slice(0, 6)
  const champion = field.find((c) => c.id === standings.champion)
  const inGame = field.filter((c) => c.standing.status === 'IN').length
  const island = field.filter((c) => c.standing.status === 'ISLAND').length
  // The round being played now: one past the last recorded, until it's over.
  const playingRound =
    standings.finished || edition.status !== 'LIVE' ? standings.currentRound : standings.currentRound + 1
  const idolHolders = new Set(tv.idols.holders.map((h) => h.id))
  const latest = tv.results[0]
  const lastRound = latest ? tv.results.filter((r) => r.round === latest.round) : []
  const event = tv.events.current

  return (
    <div className="flex h-full flex-col gap-[1.1em] p-[1.5em]">
      {/* ── Header: what's happening right now ─────────────────── */}
      <header className="flex items-center gap-[1.6em]">
        <div>
          <p className="pd-eyebrow text-[0.9em]">⚜ PolyDan</p>
          <h1 className="font-pd-display text-[3.2em] font-bold uppercase leading-none tracking-wide">
            Iron Man {edition.number}
          </h1>
        </div>
        {edition.status === 'LIVE' && !champion && (
          <span className="flex items-center gap-[0.4em] rounded-full bg-pd-no px-[0.8em] py-[0.2em] text-[1em] font-bold uppercase tracking-wider text-pd-on-solid">
            <span className="inline-block size-[0.55em] animate-pulse rounded-full bg-pd-on-solid" /> Live
          </span>
        )}
        <div className="min-w-0 flex-1">
          {champion ? (
            <p className="rounded-xl bg-pd-gold px-[0.9em] py-[0.3em] text-center font-pd-display text-[2em] font-bold uppercase tracking-wide text-pd-on-gold">
              ⚜ {champion.name} is the champion ⚜
            </p>
          ) : (
            <div className="flex items-baseline gap-[1.4em]">
              {event && (
                <p className="min-w-0 truncate">
                  <span className="pd-eyebrow mr-[0.6em] text-[0.9em] text-pd-gold">
                    {edition.status === 'LIVE' ? `Round ${playingRound}` : 'Up first'}
                  </span>
                  <span className="font-pd-display text-[2em] font-semibold uppercase tracking-wide">{event.name}</span>
                </p>
              )}
              {edition.bettingPaused ? (
                <span className="shrink-0 rounded-full border border-pd-no px-[0.8em] py-[0.15em] text-[1.05em] font-semibold text-pd-no">
                  ⏸ Betting paused during the event
                </span>
              ) : (
                edition.status === 'LIVE' && (
                  <span className="shrink-0 rounded-full border border-pd-yes px-[0.8em] py-[0.15em] text-[1.05em] font-semibold text-pd-yes">
                    Betting open
                  </span>
                )
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-[1.2em] text-[1.6em] font-semibold">
          <TvControls />
          <TvClock />
        </div>
      </header>

      {/* ── Three columns ──────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.35fr_1fr] gap-[1.1em]">
        {/* 1 · The field: everyone keeps their spot, so you can find a name at a glance */}
        <Panel
          title="The field"
          aside={
            <>
              <b className="text-pd-ink">{inGame}</b> in
              {island > 0 && (
                <>
                  {' · '}
                  <b className="text-pd-island">{island}</b> on the island
                </>
              )}
              {' · '}
              <b className="text-pd-ink">{field.length - inGame - island}</b> out
            </>
          }
        >
          <ul
            className="grid h-full grid-flow-col gap-x-[1em]"
            style={{ gridTemplateRows: `repeat(${Math.ceil(field.length / 2)}, minmax(0, 1fr))` }}
          >
            {field.map((c) => {
              const s = c.standing
              const champ = s.position === 1 && standings.finished
              return (
                <li
                  key={c.id}
                  className={`flex min-h-0 items-center gap-[0.5em] rounded-md px-[0.6em] text-[1.25em] font-semibold ${
                    champ
                      ? 'bg-pd-gold text-pd-on-gold'
                      : s.status === 'OUT'
                        ? 'text-pd-muted'
                        : s.status === 'ISLAND'
                          ? 'bg-pd-island-soft text-pd-island'
                          : 'bg-pd-surface-2'
                  }`}
                >
                  <span className={`min-w-0 flex-1 truncate ${s.status === 'OUT' && !champ ? 'line-through decoration-pd-no/70' : ''}`}>
                    {champ && '⚜ '}
                    {c.name}
                    {idolHolders.has(c.id) && ' 🗿'}
                  </span>
                  <span className="pd-num shrink-0 text-[0.75em] font-normal">
                    {s.status === 'ISLAND' ? '🏝 island' : s.status === 'OUT' && !champ ? formatOrdinal(s.position!) : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>

        {/* 2 · Who wins: the odds now, and how they got there */}
        <div className="flex min-h-0 flex-col gap-[1.1em]">
          <Panel title="Odds of winning" className="flex-[1.25]">
            {winner ? (
              <AutoScroll>
                <WinnerOdds market={winner} />
              </AutoScroll>
            ) : (
              <p className="text-[1.2em] text-pd-muted">The winner market isn’t open yet.</p>
            )}
          </Panel>
          {tv.winnerSeries.length > 0 && (
            <Panel title="Odds over time · top 4" className="flex-1">
              <PriceChart series={tv.winnerSeries} fill />
            </Panel>
          )}
        </div>

        {/* 3 · The last round, and the markets people are betting on */}
        <div className="flex min-h-0 flex-col gap-[1.1em]">
          {lastRound.length > 0 && (
            <Panel title={`Round ${latest.round} result`} hot={tv.latestIsFresh}>
              <ul className="space-y-[0.15em] text-[1.3em] font-semibold">
                {lastRound.map((r) => (
                  <li key={r.id} className="flex items-baseline gap-[0.5em]">
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                    <span
                      className={`shrink-0 text-[0.85em] ${
                        r.kind === 'OUT' ? 'text-pd-no' : r.kind === 'RETURN' ? 'text-pd-yes' : 'text-pd-island'
                      }`}
                    >
                      {r.kind === 'OUT'
                        ? `out${r.position ? ` · ${formatOrdinal(r.position)}` : ''}`
                        : r.kind === 'RETURN'
                          ? 'back in the game'
                          : '🏝 to the island'}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title="🔥 Popular markets" className="flex-1">
            {popular.length ? (
              <Rotator seconds={9}>
                {popular.map((m) => (
                  <FeaturedMarket key={m.id} market={m} />
                ))}
              </Rotator>
            ) : (
              <p className="text-[1.15em] text-pd-muted">
                {standings.finished ? 'Every market has been paid out.' : 'No bets on the side markets yet. Be the first!'}
              </p>
            )}
          </Panel>
        </div>
      </div>

      {/* ── Latest bets, and how to join ───────────────────────── */}
      <footer className="flex items-center gap-[1.2em] text-[1.05em]">
        <span className="pd-eyebrow shrink-0 text-[0.85em]">Latest bets</span>
        <div className="min-w-0 flex-1">
          {tv.trades.length ? (
            <Ticker>
              {tv.trades.map((t) => (
                <span key={t.id} className="mr-[2.2em] whitespace-nowrap">
                  <b>{t.user}</b>{' '}
                  <span className={t.shares > 0 ? 'text-pd-yes' : 'text-pd-no'}>{t.shares > 0 ? 'backed' : 'sold'}</span>{' '}
                  <b>{t.outcome}</b>
                  {t.kind !== 'WINNER' && <span className="text-pd-muted"> · {t.question}</span>}{' '}
                  <span className="pd-num text-pd-muted">{formatMoney(Math.abs(t.costCents))}</span>
                </span>
              ))}
            </Ticker>
          ) : (
            <span className="text-pd-muted">No bets yet.</span>
          )}
        </div>
        <span className="shrink-0 text-pd-muted">
          Bet from your phone: <b className="text-pd-gold">sslgolf.com/polydan</b>
        </span>
        <Link href="/polydan" className="shrink-0 text-[0.85em] text-pd-muted hover:text-pd-ink">
          ← Exit
        </Link>
      </footer>
    </div>
  )
}

/** Everyone still able to win, favourite first, with the chance and what a bet pays. */
function WinnerOdds({ market }: { market: MarketView }) {
  const live = market.outcomes.filter((o) => !o.dead).sort((a, b) => b.price - a.price)
  const max = Math.max(...live.map((o) => o.price), 0.01)
  return (
    <ol className="space-y-[0.3em]">
      {live.map((o, i) => (
        <li key={o.id} className="grid grid-cols-[1.6em_6.5em_1fr_3.2em_3.4em] items-center gap-[0.6em] text-[1.3em]">
          <span className="pd-num text-pd-muted">{i + 1}</span>
          <span className="truncate font-semibold">{o.label}</span>
          <span className="h-[0.6em] overflow-hidden rounded-full bg-pd-surface-2">
            <span className="block h-full rounded-full bg-pd-gold" style={{ width: `${(o.price / max) * 100}%` }} />
          </span>
          <span className="pd-num text-right font-bold">{formatPct(o.price)}</span>
          <span className="pd-num text-right text-[0.8em] text-pd-muted">
            {market.resolved ? '' : formatMultiple(o.price)}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** One market, big: the question and its leading answers. Shown one at a time. */
function FeaturedMarket({ market }: { market: MarketView }) {
  const shown = [...market.outcomes]
    .filter((o) => !o.dead || market.resolved)
    .sort((a, b) => (market.outcomes.length === 2 ? 0 : b.price - a.price))
    .slice(0, 5)
  return (
    <div className="flex h-full flex-col">
      <p className="font-pd-display text-[1.75em] font-semibold uppercase leading-tight tracking-wide">
        {market.question}
      </p>
      <p className="pd-num mt-[0.2em] text-[0.95em] text-pd-muted">
        {formatMoney(market.volumeCents)} bet · {market.bets} bet{market.bets === 1 ? '' : 's'}
        {market.resolved && <span className="text-pd-gold"> · result in</span>}
      </p>
      <ul className="mt-[0.8em] space-y-[0.55em]">
        {shown.map((o) => (
          <li key={o.id} className="text-[1.3em]">
            <div className="flex items-baseline gap-[0.6em]">
              <span className="min-w-0 flex-1 truncate font-semibold">{o.label}</span>
              <span className="pd-num font-bold">{formatPct(o.price)}</span>
              {!market.resolved && (
                <span className="pd-num w-[3.2em] text-right text-[0.75em] text-pd-muted">{formatMultiple(o.price)}</span>
              )}
            </div>
            <div className="mt-[0.15em] h-[0.4em] overflow-hidden rounded-full bg-pd-surface-2">
              <span
                className={`block h-full rounded-full ${o.isYes === false ? 'bg-pd-no' : 'bg-pd-arc'}`}
                style={{ width: `${o.price * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Panel({
  title,
  aside,
  children,
  hot,
  className = '',
}: {
  title: string
  /** Small text on the right of the title bar. */
  aside?: React.ReactNode
  children: React.ReactNode
  /** Just happened: ring it in gold. */
  hot?: boolean
  className?: string
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-pd-surface ${
        hot ? 'border-pd-gold ring-[0.12em] ring-pd-gold' : 'border-pd-line-strong'
      } ${className}`}
    >
      <div className="flex shrink-0 items-baseline gap-[1em] border-b border-pd-line-strong bg-pd-surface-2 px-[1em] py-[0.45em]">
        <h2 className="font-pd-display text-[1.25em] font-semibold uppercase tracking-[0.12em] text-pd-arc">{title}</h2>
        {aside && <p className="ml-auto text-[0.95em] text-pd-muted">{aside}</p>}
      </div>
      <div className="min-h-0 flex-1 p-[1em]">{children}</div>
    </section>
  )
}
