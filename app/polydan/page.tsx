import { FinishGrid, MarketSection } from '@/components/polydan/MarketSections'
import { Suspense } from 'react'
import Loading from '@/app/polydan/loading'
import Link from 'next/link'
import { requireUser } from '@/lib/polydan/auth'
import { getCopperTable, getCurrentEdition, getEditionBoard, getIdols, getPublicEvents } from '@/lib/polydan/queries'
import { CopperCard, EventsCard } from '@/components/polydan/EventsCard'
import { FieldBoard } from '@/components/polydan/FieldBoard'
import { MarketCard, WinnerBoard } from '@/components/polydan/MarketCard'

const STATUS_TEXT = { SETUP: 'Coming up', LIVE: 'Live now', FINISHED: 'Finished' } as const

// Sync shell + boundary (the SSL pattern for Cache Components): the page itself
// touches no request data, so navigation can show the placeholder instantly.
export default function Home(props: PageProps<'/polydan'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Welcome {...props} />
      <HomeContent />
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

async function HomeContent() {
  const user = await requireUser()
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
  const active = markets.filter((m) => m !== winner && (m.status === 'OPEN' || m.status === 'CLOSED'))
  // Sections: what's being decided right now first, then how far people go, rivalries, props.
  const thisRound = active.filter((m) => m.auto)
  const copperMarket = active.filter((m) => m.kind === 'COPPER')
  const finish = active.filter((m) => m.kind === 'TOP_N')
  const h2h = active.filter((m) => m.kind === 'H2H')
  const props = active.filter((m) => m.kind === 'CUSTOM' && !m.auto)
  const done = markets.filter((m) => m !== winner && (m.status === 'SETTLED' || m.status === 'VOID'))

  return (
    <div className="space-y-6">
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
      </header>

      {field.length > 0 && <FieldBoard field={field} idolHolders={idols.holders.map((h) => h.id)} />}

      <EventsCard {...events} />

      {winner && <WinnerBoard market={winner} />}

      <CopperCard rows={copper.rows} final={copper.final} />

      <MarketSection
        title="This round"
        hint="Quick ones that settle as soon as the round is recorded. If two people lose together, each pays half."
        markets={thisRound}
      />

      <MarketSection title="Copper Cup" markets={copperMarket} />

      <FinishGrid
        markets={finish}
        people={field.map((c) => ({ id: c.id, name: c.name, out: c.standing.status === 'OUT' }))}
      />

      <MarketSection title="Head to head" hint="Who lasts longer." markets={h2h} />

      <MarketSection title="Props" hint="Side bets, including ones the family suggested." markets={props} />

      {!markets.length && (
        <p className="pd-card p-6 text-center text-sm text-pd-muted">No markets open yet — check back soon.</p>
      )}

      <Link
        href="/polydan/suggest"
        className="pd-card flex items-center gap-3 p-4 text-sm hover:bg-pd-surface-2/60"
      >
        <span className="text-xl" aria-hidden>
          💡
        </span>
        <span className="flex-1">
          <span className="font-semibold">Got an idea for a market?</span>{' '}
          <span className="text-pd-muted">Suggest one and it opens once it’s approved.</span>
        </span>
        <span className="font-semibold text-pd-gold">Suggest →</span>
      </Link>

      <Link href="/polydan/about" className="pd-card flex items-center gap-3 p-4 text-sm hover:bg-pd-surface-2/60">
        <span className="text-xl" aria-hidden>
          ❓
        </span>
        <span className="flex-1">
          <span className="font-semibold">New here?</span>{' '}
          <span className="text-pd-muted">How betting, odds and payouts work.</span>
        </span>
        <span className="font-semibold text-pd-gold">How it works →</span>
      </Link>

      {done.length > 0 && (
        <details className="group">
          <summary className="pd-eyebrow cursor-pointer list-none">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span> Settled ({done.length})
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {done.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
