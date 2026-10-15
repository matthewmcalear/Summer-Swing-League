import { Suspense } from 'react'
import Loading from '@/app/polydan/loading'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/polydan/auth'
import { getMarketDetail } from '@/lib/polydan/queries'
import { balanceCents } from '@/lib/polydan/markets'
import { prisma } from '@/lib/prisma'
import { formatMoney } from '@/lib/polydan/money'
import { PriceChart } from '@/components/polydan/PriceChart'
import { Trading } from '@/components/polydan/Trading'
import { StatusTag } from '@/components/polydan/MarketCard'

function ago(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

// Sync shell + boundary (the SSL pattern for Cache Components): the page itself
// touches no request data, so navigation can show the placeholder instantly.
export default function MarketPage(props: PageProps<'/polydan/market'>) {
  return (
    <Suspense fallback={<Loading />}>
      <MarketPageContent {...props} />
    </Suspense>
  )
}

async function MarketPageContent({ searchParams }: PageProps<'/polydan/market'>) {
  const user = await requireUser()
  const id = Number((await searchParams).id)
  const detail = Number.isInteger(id) ? await getMarketDetail(id, user.id) : null
  if (!detail) notFound()
  const { market, edition, series, myPositions, activity } = detail
  const balance = await balanceCents(prisma, user.id)
  const binary = market.outcomes.length === 2

  return (
    <div className="space-y-5">
      <div>
        <Link href="/polydan" className="text-sm text-pd-muted hover:text-pd-ink">
          ← Iron Man {edition.number}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-pd-display text-2xl font-semibold uppercase tracking-wide sm:text-3xl">{market.question}</h1>
          <StatusTag market={market} />
        </div>
        <p className="mt-1 text-sm text-pd-muted pd-num">{formatMoney(market.volumeCents)} traded</p>
      </div>

      <section className="pd-card p-4">
        <PriceChart series={series} binaryLabel={binary ? series[0]?.label : undefined} />
      </section>

      <Trading
        outcomes={market.outcomes}
        b={market.b}
        tradable={market.tradable}
        lockedReason={market.lockedReason}
        balanceCents={balance}
        holdings={myPositions}
        binary={binary}
      />

      <section>
        <h2 className="pd-eyebrow mb-2">Activity</h2>
        {activity.length ? (
          <ul className="pd-card divide-y divide-pd-line text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-2 px-4 py-2.5">
                <span className="font-medium">{a.user}</span>
                <span className={a.shares > 0 ? 'text-pd-yes' : 'text-pd-no'}>{a.shares > 0 ? 'bought' : 'sold'}</span>
                <span className="truncate">{a.outcome}</span>
                <span className="ml-auto text-pd-muted pd-num">{formatMoney(Math.abs(a.costCents))}</span>
                <span className="w-16 text-right text-xs text-pd-muted">{ago(a.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-pd-muted">No bets yet — be the first.</p>
        )}
      </section>

      <details className="text-sm text-pd-muted">
        <summary className="cursor-pointer">How this works</summary>
        <p className="mt-2 max-w-prose">
          Each share pays <strong>$1</strong> if its outcome happens and nothing if it doesn&apos;t, so the price is the
          family&apos;s current odds. Buying pushes the price up, selling pushes it down, and you can sell any time before
          the result is known. When someone is knocked out for good, their outcomes stop trading and the rest
          re-price. Winnings land in your balance when Matt settles at the end of the day.
        </p>
      </details>
    </div>
  )
}
