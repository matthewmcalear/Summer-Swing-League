import { Suspense } from 'react'
import Link from 'next/link'
import { requireUser } from '@/lib/polydan/auth'
import { getCurrentEdition, getTvBoard, type MarketView } from '@/lib/polydan/queries'
import { formatMoney, formatMultiple, formatOrdinal, formatPct } from '@/lib/polydan/money'
import { LiveRefresh } from '@/components/polydan/ui'
import { TvClock, TvControls } from '@/components/polydan/TvControls'
import { EventTags } from '@/components/polydan/EventsCard'

// Basement TV dashboard: a full-screen, always-dark, read-only view of the
// event for a laptop plugged into the TV. Sized in em off a viewport-based
// font size, so it fills a 1080p TV or a laptop screen alike.

export const metadata = { title: 'PolyDan · TV' }

export default function TvPage() {
  return (
    <div
      className="pd-dark fixed inset-0 z-[60] overflow-hidden bg-pd-bg text-pd-ink"
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
  const winner = markets.find((m) => m.kind === 'WINNER' && m.status !== 'VOID')
  const others = markets
    .filter((m) => m !== winner && (m.status === 'OPEN' || m.status === 'CLOSED' || m.resolved))
    .slice(0, 6)
  const inGame = field.filter((c) => c.standing.status === 'IN')
  const island = field.filter((c) => c.standing.status === 'ISLAND')
  const out = field
    .filter((c) => c.standing.status === 'OUT')
    .sort((a, b) => a.standing.position! - b.standing.position!)
  const champion = field.find((c) => c.id === standings.champion)
  // The round being played now: one past the last recorded, until it's over.
  const playingRound = standings.finished || edition.status !== 'LIVE' ? standings.currentRound : standings.currentRound + 1
  const idolHolders = new Set(tv.idols.holders.map((h) => h.id))
  const copperRows = tv.copper.rows.filter((r) => r.points !== 0).slice(0, 5)
  const latest = tv.results[0]
  const fresh = tv.latestIsFresh

  return (
    <div className="flex h-full flex-col gap-[1.2em] p-[1.6em]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-end gap-[1.5em]">
        <div>
          <p className="pd-eyebrow text-[0.9em]">⚜ PolyDan{edition.status !== 'LIVE' && ` · ${STATUS[edition.status]}`}</p>
          <h1 className="font-pd-display text-[3.6em] font-bold uppercase leading-none tracking-wide">
            Iron Man {edition.number}
          </h1>
        </div>
        {edition.status === 'LIVE' && (
          <span className="mb-[0.5em] flex items-center gap-[0.4em] rounded-full bg-pd-no px-[0.8em] py-[0.2em] text-[1em] font-bold uppercase tracking-wider text-white">
            <span className="inline-block size-[0.55em] animate-pulse rounded-full bg-white" /> Live
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
            <p className="pd-eyebrow text-[0.85em] text-pd-gold">Now playing · event {tv.events.current.seq}</p>
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

      {/* ── Three columns ──────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.45fr_1.1fr] gap-[1.2em]">
        {/* Field */}
        <Panel title={`Still standing · ${inGame.length}`}>
          <div className="flex flex-wrap gap-[0.45em]">
            {inGame.map((c) => (
              <span
                key={c.id}
                className={`rounded-full border-[0.1em] px-[0.75em] py-[0.25em] text-[1.25em] font-semibold ${
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
              <h3 className="pd-eyebrow mt-[1.4em] mb-[0.6em] text-[0.95em]">🏝 Redemption Island · {island.length}</h3>
              <div className="flex flex-wrap gap-[0.45em]">
                {island.map((c) => (
                  <span key={c.id} className="rounded-full bg-pd-island-soft px-[0.75em] py-[0.25em] text-[1.2em] font-semibold text-pd-island">
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
                    <span className="pd-num inline-block w-[2.6em] text-pd-ink-2">{formatOrdinal(c.standing.position!)}</span>
                    {c.name}
                  </li>
                ))}
              </ol>
            </>
          )}
        </Panel>

        {/* Winner odds */}
        <Panel title={winner ? winner.question : 'Who wins?'} big>
          {winner ? <WinnerOdds market={winner} /> : <p className="text-[1.2em] text-pd-muted">Winner market not open yet.</p>}
        </Panel>

        {/* Markets, bets, leaders */}
        <div className="flex min-h-0 flex-col gap-[1.2em]">
          {others.length > 0 && (
            <Panel title="Other markets">
              <ul className="space-y-[0.55em]">
                {others.map((m) => (
                  <MiniMarket key={m.id} market={m} />
                ))}
              </ul>
            </Panel>
          )}
          <Panel title="Latest bets" grow>
            {tv.trades.length ? (
              <ul className="space-y-[0.45em] text-[1.05em]">
                {tv.trades.slice(0, copperRows.length ? 5 : 7).map((t) => (
                  <li key={t.id} className="truncate">
                    <span className="font-semibold">{t.user}</span>{' '}
                    <span className={t.shares > 0 ? 'text-pd-yes' : 'text-pd-no'}>
                      {t.shares > 0 ? 'backed' : 'sold'}
                    </span>{' '}
                    <span className="font-semibold">{betLabel(t)}</span>{' '}
                    <span className="pd-num text-pd-muted">{formatMoney(Math.abs(t.costCents))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[1.05em] text-pd-muted">No bets yet — be the first!</p>
            )}
          </Panel>
          {copperRows.length > 0 && (
            <Panel title={`🥉 Copper Cup${tv.copper.final ? ' · final' : ''}`}>
              <ol className="space-y-[0.35em] text-[1.1em]">
                {copperRows.map((r, i) => (
                  <li key={r.id} className="flex gap-[0.6em]">
                    <span className="pd-num w-[1.2em] text-pd-muted">{i + 1}</span>
                    <span className="font-semibold">{r.name}</span>
                    <span className="pd-num ml-auto font-semibold">{r.points}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
          {tv.leaders.length > 0 && (
            <Panel title="Sharpest money">
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
            </Panel>
          )}
        </div>
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
  const top = live.slice(0, 12)
  const max = Math.max(...top.map((o) => o.price), 0.01)
  return (
    <div className="flex h-full flex-col">
      <ol className="flex-1 space-y-[0.5em]">
        {top.map((o, i) => (
          <li key={o.id} className="grid grid-cols-[1.6em_7.5em_1fr_3.2em_3.4em] items-center gap-[0.6em] text-[1.3em]">
            <span className="pd-num text-pd-muted">{i + 1}</span>
            <span className="truncate font-semibold">{o.label}</span>
            <span className="h-[0.7em] overflow-hidden rounded-full bg-pd-surface-2">
              <span
                className={`block h-full rounded-full ${i === 0 ? 'bg-pd-gold-hi' : 'bg-pd-gold'}`}
                style={{ width: `${Math.max((o.price / max) * 100, 2)}%` }}
              />
            </span>
            <span className="pd-num text-right font-bold">{formatPct(o.price)}</span>
            <span className="pd-num text-right text-[0.8em] text-pd-muted">{formatMultiple(o.price)}</span>
          </li>
        ))}
      </ol>
      {(live.length > top.length || dead > 0) && (
        <p className="mt-[0.6em] text-[0.95em] text-pd-muted">
          {live.length > top.length && `+${live.length - top.length} more still alive`}
          {live.length > top.length && dead > 0 && ' · '}
          {dead > 0 && `${dead} knocked out`}
        </p>
      )}
    </div>
  )
}

function MiniMarket({ market }: { market: MarketView }) {
  const [a, b] = market.outcomes
  if (market.kind === 'TOP_N') {
    const yes = market.outcomes.find((o) => o.isYes)!
    return (
      <li className="flex items-center gap-[0.6em] text-[1.05em]">
        <span className="min-w-0 flex-1 truncate">{market.question}</span>
        <span className="pd-num font-bold">{formatPct(yes.price)}</span>
      </li>
    )
  }
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
}: {
  title: string
  children: React.ReactNode
  big?: boolean
  grow?: boolean
}) {
  return (
    <section className={`pd-card flex min-h-0 flex-col p-[1.1em] ${grow ? 'flex-1' : ''} overflow-hidden`}>
      <h2
        className={
          big
            ? 'mb-[0.7em] font-pd-display text-[1.7em] font-semibold uppercase tracking-wide'
            : 'pd-eyebrow mb-[0.7em] text-[0.95em]'
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
  return (
    <div className={`rounded-xl border px-[1.1em] py-[0.6em] text-[1.6em] font-semibold ${cls}`}>{children}</div>
  )
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
