import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Loading from '@/app/polydan/loading'
import { requireUser } from '@/lib/polydan/auth'
import { getCopperTable, getCurrentEdition, getEditionBoard, type MarketView } from '@/lib/polydan/queries'
import { formatMultiple, formatOrdinal, formatPct } from '@/lib/polydan/money'

export const metadata = { title: 'PolyDan · Player' }

// Sync shell + boundary (the SSL pattern for Cache Components).
export default function PersonPage(props: PageProps<'/polydan/person'>) {
  return (
    <Suspense fallback={<Loading />}>
      <PersonPageContent {...props} />
    </Suspense>
  )
}

/** One bet you can make on this person: the market, which side is "them", and its odds. */
function Line({ market, outcomeId, label }: { market: MarketView; outcomeId: number; label: string }) {
  const o = market.outcomes.find((x) => x.id === outcomeId)!
  const settled = market.resolved || market.status === 'SETTLED'
  return (
    <li>
      <Link
        href={`/polydan/market?id=${market.id}`}
        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-pd-surface-2/60"
      >
        <span className="min-w-0 flex-1">
          <span className="font-medium">{label}</span>
          <span className="block truncate text-xs text-pd-muted">{market.question}</span>
        </span>
        {market.status === 'VOID' ? (
          <span className="text-xs text-pd-muted">void</span>
        ) : settled ? (
          <span className={`text-xs font-semibold ${o.price > 0 ? 'text-pd-yes' : 'text-pd-muted'}`}>
            {o.price === 1 ? '✓ yes' : o.price > 0 ? 'split' : '✗ no'}
          </span>
        ) : (
          <span className="pd-num text-right">
            <span className="mr-2 text-xs text-pd-muted">pays {formatMultiple(o.price)}</span>
            <span className="font-semibold">{formatPct(o.price)}</span>
          </span>
        )}
      </Link>
    </li>
  )
}

async function PersonPageContent({ searchParams }: PageProps<'/polydan/person'>) {
  await requireUser()
  const id = Number((await searchParams).id)
  const current = await getCurrentEdition()
  if (!current || !Number.isInteger(id)) notFound()
  const [{ edition, field, markets }, copper] = await Promise.all([getEditionBoard(current.id), getCopperTable(current.id)])
  const person = field.find((c) => c.id === id)
  if (!person) notFound()

  const live = markets.filter((m) => m.status !== 'VOID')
  const mine = (m: MarketView) => m.outcomes.find((o) => o.competitorId === id && o.isYes !== false)
  const lines = (list: MarketView[], label: (m: MarketView) => string) =>
    list.flatMap((m) => {
      const o = mine(m)
      return o ? [{ market: m, outcomeId: o.id, label: label(m) }] : []
    })
  const main = [
    ...lines(live.filter((m) => m.kind === 'WINNER'), () => `${person.name} to win it all`),
    ...lines(live.filter((m) => m.kind === 'COPPER'), () => `${person.name} to win the Copper Cup`),
  ]
  const finish = lines(
    live.filter((m) => m.kind === 'TOP_N').sort((a, b) => (a.topN ?? 1) - (b.topN ?? 1)),
    (m) => ((m.topN ?? 1) === 1 ? 'To win' : (m.topN ?? 1) === 2 ? 'To reach the final 2' : `To finish top ${m.topN}`),
  )
  const h2h = lines(
    live.filter((m) => m.kind === 'H2H'),
    (m) => `To outlast ${m.outcomes.find((o) => o.competitorId !== id)?.label ?? 'them'}`,
  )
  const round = lines(
    live.filter((m) => m.auto),
    (m) =>
      m.auto!.auto === 'FIRST_ISLAND'
        ? 'First to Redemption Island'
        : m.auto!.auto === 'FIRST_OUT'
          ? 'First knocked out for good'
          : `To lose round ${(m.auto as { round: number }).round}`,
  )
  const s = person.standing
  const copperRow = copper.rows.find((r) => r.id === id)
  const copperRank = copperRow ? 1 + copper.rows.filter((r) => r.points > copperRow.points).length : null
  const groups = [
    ['Main event', main],
    ['How far they go', finish],
    ['Head to head', h2h],
    ['Round by round', round],
  ] as const

  return (
    <div className="space-y-5">
      <div>
        <Link href="/polydan" className="text-sm text-pd-muted hover:text-pd-ink">
          ← Iron Man {edition.number}
        </Link>
        <h1 className="mt-1 font-pd-display text-4xl font-bold uppercase tracking-wide">{person.name}</h1>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span
            className={
              s.status === 'IN' ? 'font-semibold text-pd-yes' : s.status === 'ISLAND' ? 'font-semibold text-pd-island' : 'text-pd-muted'
            }
          >
            {s.position === 1
              ? '⚜ Champion'
              : s.status === 'IN'
                ? 'Still standing'
                : s.status === 'ISLAND'
                  ? '🏝 On Redemption Island'
                  : `Out in round ${s.outRound} · finished ${formatOrdinal(s.position!)}`}
          </span>
          {copper.anyPoints && copperRow && (
            <span className="text-pd-muted pd-num">
              🥉 Copper Cup: {copperRow.points} pts ({formatOrdinal(copperRank!)})
            </span>
          )}
        </p>
      </div>

      {groups.every(([, g]) => !g.length) && (
        <p className="pd-card p-6 text-center text-sm text-pd-muted">No markets on {person.name} yet.</p>
      )}
      {groups.map(
        ([title, g]) =>
          g.length > 0 && (
            <section key={title}>
              <h2 className="pd-eyebrow mb-2">{title}</h2>
              <ul className="pd-card divide-y divide-pd-line">
                {g.map((l) => (
                  <Line key={l.market.id} {...l} />
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  )
}
