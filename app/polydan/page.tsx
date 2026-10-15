import { Suspense } from 'react'
import Loading from '@/app/polydan/loading'
import Link from 'next/link'
import { requireUser } from '@/lib/polydan/auth'
import { getCurrentEdition, getEditionBoard } from '@/lib/polydan/queries'
import { FieldBoard } from '@/components/polydan/FieldBoard'
import { MarketCard, WinnerBoard } from '@/components/polydan/MarketCard'
import { AutoRefresh } from '@/components/polydan/ui'

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
  const winner = markets.find((m) => m.kind === 'WINNER' && m.status !== 'VOID')
  const active = markets.filter((m) => m !== winner && (m.status === 'OPEN' || m.status === 'CLOSED'))
  const done = markets.filter((m) => m !== winner && (m.status === 'SETTLED' || m.status === 'VOID'))

  return (
    <div className="space-y-6">
      {edition.status === 'LIVE' && <AutoRefresh seconds={10} />}
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
            {standings.currentRound > 0 && `Round ${standings.currentRound} · `}
            {standings.alive.length} of {field.length} left
          </p>
        )}
      </header>

      {field.length > 0 && <FieldBoard field={field} />}

      {winner && <WinnerBoard market={winner} />}

      {active.length > 0 && (
        <section>
          <h2 className="pd-eyebrow mb-3">More markets</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        </section>
      )}

      {!markets.length && (
        <p className="pd-card p-6 text-center text-sm text-pd-muted">No markets open yet — check back soon.</p>
      )}

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
