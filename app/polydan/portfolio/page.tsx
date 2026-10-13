import { Suspense } from 'react'
import Loading from '@/app/polydan/loading'
import Link from 'next/link'
import { requireUser } from '@/lib/polydan/auth'
import { getPortfolio } from '@/lib/polydan/queries'
import { formatMoney, formatPct } from '@/lib/polydan/money'
import { logout } from '../actions'

const KIND_TEXT = {
  DEPOSIT: 'Credited',
  WITHDRAWAL: 'Cashed out',
  BUY: 'Bet',
  SELL: 'Sold',
  PAYOUT: 'Payout',
  REFUND: 'Refund',
} as const

// Sync shell + boundary (the SSL pattern for Cache Components): the page itself
// touches no request data, so navigation can show the placeholder instantly.
export default function PortfolioPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PortfolioPageContent />
    </Suspense>
  )
}

async function PortfolioPageContent() {
  const user = await requireUser()
  const { balance, positions, ledger } = await getPortfolio(user.id)
  const openValue = positions.reduce((s, p) => s + p.valueCents, 0)

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="pd-eyebrow">Portfolio</p>
          <h1 className="font-pd-display text-3xl font-bold uppercase tracking-wide">{user.name}</h1>
        </div>
        <form action={logout}>
          <button className="text-sm text-pd-muted hover:text-pd-ink">Log out</button>
        </form>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Cash', balance],
          ['In play', openValue],
          ['Total', balance + openValue],
        ].map(([k, v]) => (
          <div key={k} className="pd-card p-3 sm:p-4">
            <p className="pd-eyebrow">{k}</p>
            <p className="mt-1 font-pd-display text-xl font-semibold sm:text-2xl pd-num">{formatMoney(v as number)}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="pd-eyebrow mb-2">Open positions</h2>
        {positions.length ? (
          <ul className="pd-card divide-y divide-pd-line">
            {positions.map((p) => {
              const pnl = p.valueCents - p.costCents
              return (
                <li key={p.outcomeId}>
                  <Link href={`/polydan/market?id=${p.market.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-pd-surface-2/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-pd-muted">{p.market.question}</p>
                      <p className="font-medium">
                        {p.label}{' '}
                        <span className="text-sm font-normal text-pd-muted pd-num">
                          · {p.shares.toFixed(2)} sh @ {formatPct(p.price)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold pd-num">{formatMoney(p.valueCents)}</p>
                      <p className={`text-xs pd-num ${pnl >= 0 ? 'text-pd-yes' : 'text-pd-no'}`}>{formatMoney(pnl, { sign: true })}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="pd-card p-4 text-sm text-pd-muted">
            No open bets. <Link href="/polydan" className="text-pd-gold underline">Browse markets</Link>.
          </p>
        )}
      </section>

      <section>
        <h2 className="pd-eyebrow mb-2">History</h2>
        {ledger.length ? (
          <ul className="pd-card divide-y divide-pd-line text-sm">
            {ledger.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-20 shrink-0 text-xs text-pd-muted">
                  {l.createdAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{KIND_TEXT[l.kind]}</span>
                  {l.note && <span className="text-pd-muted"> · {l.note}</span>}
                </span>
                <span className={`font-semibold pd-num ${l.amountCents >= 0 ? 'text-pd-yes' : ''}`}>
                  {formatMoney(l.amountCents, { sign: true })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pd-card p-4 text-sm text-pd-muted">Nothing yet. Pay Matt and he&apos;ll credit your account.</p>
        )}
      </section>
    </div>
  )
}
