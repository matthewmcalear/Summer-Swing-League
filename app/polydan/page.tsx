import { FinishGrid, MarketSection } from '@/components/polydan/MarketSections'
import { Suspense } from 'react'
import Loading from '@/app/polydan/loading'
import Link from 'next/link'
import { requireUser } from '@/lib/polydan/auth'
import { getCopperTable, getCurrentEdition, getEditionBoard, getIdols, getPublicEvents } from '@/lib/polydan/queries'
import { CopperCard, EventsCard, EventTags } from '@/components/polydan/EventsCard'
import { formatMoney, formatMultiple, formatPct } from '@/lib/polydan/money'
import { FieldBoard } from '@/components/polydan/FieldBoard'
import { MarketCard, WinnerBoard } from '@/components/polydan/MarketCard'

// The Markets page is split into tabs so nothing needs a long scroll: "Now"
// is the one-screen summary, the rest are one kind of market each.
const TABS = [
  ['now', 'Now'],
  ['winner', 'Winner'],
  ['finish', 'How far they go'],
  ['h2h', 'Head to head'],
  ['props', 'Props & specials'],
  ['copper', 'Copper Cup'],
  ['schedule', 'Schedule'],
  ['settled', 'Settled'],
] as const
type Tab = (typeof TABS)[number][0]

const STATUS_TEXT = { SETUP: 'Coming up', LIVE: 'Live now', FINISHED: 'Finished' } as const

// Sync shell + boundary (the SSL pattern for Cache Components): the page itself
// touches no request data, so navigation can show the placeholder instantly.
export default function Home(props: PageProps<'/polydan'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Welcome {...props} />
      <HomeContent {...props} />
    </Suspense>
  )
}

/** Shown once, right after someone creates their own account. */
async function Welcome({ searchParams }: PageProps<'/polydan'>) {
  if ((await searchParams).welcome == null) return null
  const user = await requireUser()
  return (
    <div className="mb-5 rounded-xl border border-pd-gold bg-pd-surface p-4 text-sm">
      <p className="font-semibold">Welcome to PolyDan, {user.name}! 🎉</p>
      <p className="mt-1 text-pd-muted">
        Your account starts at $0. Send Matt money (e.g. an e-Transfer) and he&apos;ll add it to your balance — then
        pick a market below and place your bets.
      </p>
    </div>
  )
}

const SORTS = [
  ['volume', 'Most bet'],
  ['close', 'Closest odds'],
  ['new', 'Newest'],
  ['az', 'A–Z'],
] as const
type Sort = (typeof SORTS)[number][0]

/** How lopsided a market is: 0 = a coin flip between its top two, 1 = a sure thing. */
const lopsided = (m: { outcomes: { price: number; dead: boolean }[] }) => {
  const p = m.outcomes.filter((o) => !o.dead).map((o) => o.price).sort((a, b) => b - a)
  return p.length > 1 ? p[0] - p[1] : 1
}

async function HomeContent({ searchParams }: PageProps<'/polydan'>) {
  const user = await requireUser()
  const sp = await searchParams
  const sort: Sort = SORTS.some(([k]) => k === sp.sort) ? (sp.sort as Sort) : 'volume'
  const current = await getCurrentEdition()

  if (!current) {
    return (
      <div className="pd-card mx-auto mt-10 max-w-md p-6 text-center">
        <h1 className="font-pd-display text-2xl uppercase">No edition yet</h1>
        <p className="mt-2 text-sm text-pd-muted">
          {user.isAdmin ? (
            <>
              Create one in <Link href="/polydan/admin?tab=setup" className="text-pd-gold underline">Admin → Setup</Link>.
            </>
          ) : (
            'Markets open once Matt sets up the next Iron Man.'
          )}
        </p>
      </div>
    )
  }

  const { edition, field, standings, markets } = await getEditionBoard(current.id)
  const [events, copper, idols] = await Promise.all([
    getPublicEvents(current.id, standings.currentRound),
    getCopperTable(current.id),
    getIdols(current.id),
  ])
  const winner = markets.find((m) => m.kind === 'WINNER' && m.status !== 'VOID')
  const by: Record<Sort, (a: (typeof markets)[number], b: (typeof markets)[number]) => number> = {
    volume: (a, b) => b.volumeCents - a.volumeCents || b.bets - a.bets || a.id - b.id,
    close: (a, b) => lopsided(a) - lopsided(b) || a.id - b.id,
    new: (a, b) => b.id - a.id,
    az: (a, b) => a.question.localeCompare(b.question),
  }
  const active = markets
    .filter((m) => m !== winner && (m.status === 'OPEN' || m.status === 'CLOSED'))
    .sort(by[sort])
  const specials = active.filter((m) => m.auto)
  const copperMarket = active.filter((m) => m.kind === 'COPPER')
  const finish = active.filter((m) => m.kind === 'TOP_N')
  const h2h = active.filter((m) => m.kind === 'H2H')
  const props = active.filter((m) => m.kind === 'CUSTOM' && !m.auto)
  const done = markets.filter((m) => m !== winner && (m.status === 'SETTLED' || m.status === 'VOID'))
  // What can be bet on right now, for the Now tab.
  const open = active.filter((m) => m.tradable)
  const thisRound = specials.filter((m) => m.tradable)
  const hot = [...open].filter((m) => !m.auto && m.volumeCents > 0).sort(by.volume).slice(0, 3)

  const count: Record<Tab, number> = {
    now: 0,
    winner: winner ? 1 : 0,
    finish: finish.length,
    h2h: h2h.length,
    props: props.length + specials.length,
    copper: copperMarket.length + (copper.rows.some((r) => r.points !== 0) ? 1 : 0),
    schedule: events.total,
    settled: done.length,
  }
  const tabs = TABS.filter(([k]) => k === 'now' || count[k] > 0)
  const tab: Tab = tabs.some(([k]) => k === sp.tab) ? (sp.tab as Tab) : 'now'
  const href = (t: Tab, s: Sort = sort) => {
    const q = [t !== 'now' && `tab=${t}`, s !== 'volume' && `sort=${s}`].filter(Boolean).join('&')
    return q ? `/polydan?${q}` : '/polydan'
  }
  const sortable = (tab === 'finish' && finish.length > 1) || (tab === 'h2h' && h2h.length > 1) || (tab === 'props' && props.length + specials.length > 1)
  const finished = edition.status === 'FINISHED' || standings.finished

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <div>
          <p className="pd-eyebrow">
            {STATUS_TEXT[edition.status]}
            {edition.date && ` · ${edition.date.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`}
          </p>
          <h1 className="font-pd-display text-4xl font-bold uppercase tracking-wide">Iron Man {edition.number}</h1>
        </div>
        {field.length > 0 && (
          <p className="pb-1 text-sm text-pd-muted pd-num">
            {edition.status === 'LIVE' && !standings.finished
              ? `Round ${standings.currentRound + 1} · `
              : standings.currentRound > 0 && `${standings.currentRound} rounds · `}
            {standings.alive.length} of {field.length} left
          </p>
        )}
        <Link href="/polydan/about#rules" className="ml-auto pb-1 text-sm text-pd-gold hover:underline">
          ⚖️ Rules & fair play →
        </Link>
      </header>

      {finished && (
        <Link
          href={`/polydan/final?edition=${edition.id}`}
          className="flex items-center gap-3 rounded-xl border border-pd-gold bg-pd-gold/10 p-4 hover:bg-pd-gold/15"
        >
          <span className="text-2xl" aria-hidden>
            🏁
          </span>
          <span className="flex-1">
            <span className="font-pd-display text-xl font-semibold uppercase tracking-wide">
              {field.find((c) => c.id === standings.champion)?.name ?? 'It'}
              {standings.champion ? ` won Iron Man ${edition.number}` : ' is over'}
            </span>
            <span className="block text-sm text-pd-muted">Final placings, the Copper Cup and who won what on the bets.</span>
          </span>
          <span className="font-semibold text-pd-gold">Final results →</span>
        </Link>
      )}

      {edition.bettingPaused && !finished && (
        <p className="rounded-xl border border-pd-no bg-pd-no-soft p-3 text-sm">
          <span className="font-semibold text-pd-no">⏸ Betting is paused</span> while the event is being played. It
          reopens as soon as the result is in.
        </p>
      )}

      {/* Section menu: one tap to each kind of market, instead of one long page. */}
      <nav
        aria-label="Sections"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {tabs.map(([k, label]) => (
          <Link
            key={k}
            href={href(k)}
            scroll={false}
            aria-current={tab === k ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 font-semibold whitespace-nowrap ${
              tab === k
                ? 'border-pd-gold bg-pd-gold text-pd-on-gold'
                : 'border-pd-line-strong bg-pd-surface text-pd-ink-2 hover:border-pd-arc hover:text-pd-ink'
            }`}
          >
            {label}
            {k !== 'now' && k !== 'winner' && k !== 'schedule' && (
              <span className={`pd-num text-xs font-normal ${tab === k ? 'opacity-70' : 'text-pd-muted'}`}>{count[k]}</span>
            )}
          </Link>
        ))}
      </nav>

      {sortable && (
        <nav aria-label="Sort markets" className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="pd-eyebrow mr-1">Sort</span>
          {SORTS.map(([k, label]) => (
            <Link
              key={k}
              href={href(tab, k)}
              scroll={false}
              aria-current={sort === k ? 'true' : undefined}
              className={`rounded border px-2.5 py-1 font-medium ${
                sort === k ? 'border-pd-arc bg-pd-island-soft text-pd-ink' : 'border-pd-line text-pd-muted hover:text-pd-ink'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      {tab === 'now' && (
        <>
          {events.current && !finished && (
            <Link href={href('schedule')} scroll={false} className="pd-card flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
              <span>
                <span className="pd-eyebrow block text-pd-gold">
                  {edition.status === 'LIVE' ? `Round ${events.current.seq}` : 'First event'}
                </span>
                <span className="font-pd-display text-2xl font-semibold uppercase tracking-wide">{events.current.name}</span>
              </span>
              <EventTags event={events.current} className="text-sm" />
              <span className="ml-auto text-sm text-pd-gold">Schedule →</span>
            </Link>
          )}

          {field.length > 0 && <FieldBoard field={field} idolHolders={idols.holders.map((h) => h.id)} />}

          <div className="grid gap-4 lg:grid-cols-2">
            {winner && <WinnerSummary market={winner} href={href('winner')} />}
            <section className="pd-card flex flex-col p-4">
              <h2 className="pd-eyebrow mb-3">{thisRound.length ? 'Bet on this round' : 'Most bet right now'}</h2>
              <ul className="flex-1 divide-y divide-pd-line">
                {(thisRound.length ? [...thisRound, ...hot].slice(0, 4) : hot).map((m) => (
                  <MarketRow key={m.id} market={m} />
                ))}
                {!thisRound.length && !hot.length && (
                  <li className="py-2 text-sm text-pd-muted">
                    {open.length ? 'No bets on the side markets yet. Be the first!' : 'Nothing is open to bet on right now.'}
                  </li>
                )}
              </ul>
              <p className="mt-3 text-sm text-pd-muted">
                {open.length} market{open.length === 1 ? '' : 's'} open. Pick a section above to see them.
              </p>
            </section>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/polydan/suggest" className="pd-card flex items-center gap-3 p-4 text-sm hover:border-pd-arc">
              <span className="text-xl" aria-hidden>
                💡
              </span>
              <span className="flex-1">
                <span className="font-semibold">Got an idea for a market?</span>{' '}
                <span className="text-pd-muted">It opens once it’s approved.</span>
              </span>
              <span className="font-semibold text-pd-gold">Suggest →</span>
            </Link>
            <Link href="/polydan/about" className="pd-card flex items-center gap-3 p-4 text-sm hover:border-pd-arc">
              <span className="text-xl" aria-hidden>
                ❓
              </span>
              <span className="flex-1">
                <span className="font-semibold">New here?</span>{' '}
                <span className="text-pd-muted">How betting, odds and payouts work.</span>
              </span>
              <span className="font-semibold text-pd-gold">How it works →</span>
            </Link>
          </div>
        </>
      )}

      {tab === 'winner' && winner && <WinnerBoard market={winner} />}

      {tab === 'finish' && (
        <FinishGrid
          sort={sort}
          markets={finish}
          people={field.map((c) => ({ id: c.id, name: c.name, out: c.standing.status === 'OUT' }))}
        />
      )}

      {tab === 'h2h' && <MarketSection title="Head to head" hint="Who lasts longer." markets={h2h} />}

      {tab === 'props' && (
        <>
          <MarketSection
            title="This round"
            hint="Quick ones that settle as soon as the round is recorded. If two people lose together, each pays half."
            markets={specials}
          />
          <MarketSection title="Props" hint="Side bets, including ones the family suggested." markets={props} />
        </>
      )}

      {tab === 'copper' && (
        <>
          <CopperCard rows={copper.rows} final={copper.final} />
          <MarketSection title="Copper Cup market" markets={copperMarket} />
        </>
      )}

      {tab === 'schedule' && <EventsCard {...events} />}

      {tab === 'settled' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {done.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      )}

      {!markets.length && (
        <p className="pd-card p-6 text-center text-sm text-pd-muted">No markets open yet — check back soon.</p>
      )}
    </div>
  )
}

type Market = Awaited<ReturnType<typeof getEditionBoard>>['markets'][number]

/** The winner market in brief: the top six and a way in. */
function WinnerSummary({ market, href }: { market: Market; href: string }) {
  const live = market.outcomes.filter((o) => !o.dead).sort((a, b) => b.price - a.price)
  const max = Math.max(...live.map((o) => o.price), 0.01)
  return (
    <section className="pd-card flex flex-col p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="pd-eyebrow">Who wins?</h2>
        <span className="pd-num ml-auto text-xs text-pd-muted">{formatMoney(market.volumeCents)} bet</span>
      </div>
      <ol className="flex-1 space-y-1.5">
        {live.slice(0, 6).map((o, i) => (
          <li key={o.id} className="grid grid-cols-[1.25rem_5.5rem_1fr_2.75rem_2.75rem] items-center gap-2 text-sm">
            <span className="pd-num text-xs text-pd-muted">{i + 1}</span>
            <span className="truncate font-medium">{o.label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-pd-surface-2">
              <span className="block h-full rounded-full bg-pd-gold" style={{ width: `${(o.price / max) * 100}%` }} />
            </span>
            <span className="pd-num text-right font-semibold">{formatPct(o.price)}</span>
            <span className="pd-num text-right text-xs text-pd-muted">{market.resolved ? '' : formatMultiple(o.price)}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={`/polydan/market?id=${market.id}`} className="pd-btn pd-btn-gold pd-btn-sm">
          {market.tradable ? 'Bet on the winner →' : 'See the market →'}
        </Link>
        {live.length > 6 && (
          <Link href={href} scroll={false} className="text-sm text-pd-gold hover:underline">
            All {live.length} still in →
          </Link>
        )}
      </div>
    </section>
  )
}

/** One market as a single line: the question, its favourite, and a way in. */
function MarketRow({ market }: { market: Market }) {
  const lead = [...market.outcomes].filter((o) => !o.dead).sort((a, b) => b.price - a.price)[0]
  return (
    <li>
      <Link href={`/polydan/market?id=${market.id}`} className="flex items-center gap-3 py-2 text-sm hover:text-pd-gold">
        <span className="min-w-0 flex-1 truncate font-medium">{market.question}</span>
        {lead && (
          <span className="shrink-0 text-pd-muted">
            {lead.label} <span className="pd-num font-semibold text-pd-ink">{formatPct(lead.price)}</span>
          </span>
        )}
        <span className="shrink-0 font-semibold text-pd-gold">Bet →</span>
      </Link>
    </li>
  )
}
