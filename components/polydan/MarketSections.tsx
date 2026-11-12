import Link from 'next/link'
import type { MarketView } from '@/lib/polydan/queries'
import { formatMultiple, formatPct } from '@/lib/polydan/money'
import { MarketCard } from './MarketCard'

/** A titled group of market cards on the Markets page. */
export function MarketSection({
  title,
  hint,
  markets,
}: {
  title: string
  hint?: string
  markets: MarketView[]
}) {
  if (!markets.length) return null
  return (
    <section>
      <h2 className="pd-eyebrow">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-pd-muted">{hint}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {markets.map((m) => (
          <MarketCard key={m.id} market={m} />
        ))}
      </div>
    </section>
  )
}

/**
 * "How far they go": every top-N market in one table, a row per person and a
 * column per N, instead of dozens of separate cards. Each cell is the chance
 * of Yes and links to that market.
 */
export function FinishGrid({
  markets,
  people,
}: {
  markets: MarketView[]
  people: { id: number; name: string; out: boolean }[]
}) {
  const ns = [...new Set(markets.map((m) => m.topN ?? 1))].sort((a, b) => a - b)
  if (!ns.length) return null
  const cell = (personId: number, n: number) =>
    markets.find((m) => (m.topN ?? 1) === n && m.outcomes.some((o) => o.isYes && o.competitorId === personId))
  const rows = people
    .map((p) => ({ ...p, cells: ns.map((n) => cell(p.id, n)) }))
    .filter((r) => r.cells.some(Boolean))
    .sort((a, b) => {
      const best = (r: typeof a) => r.cells.find(Boolean)!.outcomes.find((o) => o.isYes)!.price
      return best(b) - best(a)
    })
  const label = (n: number) => (n === 1 ? 'Win' : n === 2 ? 'Final 2' : `Top ${n}`)
  return (
    <section>
      <h2 className="pd-eyebrow">How far they go</h2>
      <p className="mt-0.5 text-sm text-pd-muted">The chance each person makes it. Tap a number to bet yes or no.</p>
      <div className="pd-card mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-pd-line text-left text-xs text-pd-muted">
              <th className="px-4 py-2 font-normal">Player</th>
              {ns.map((n) => (
                <th key={n} className="px-3 py-2 text-right font-normal">
                  {label(n)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pd-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-1.5">
                  <Link href={`/polydan/person?id=${r.id}`} className={`font-medium hover:underline ${r.out ? 'text-pd-muted' : ''}`}>
                    {r.name}
                  </Link>
                </td>
                {r.cells.map((m, i) => {
                  if (!m) return <td key={ns[i]} className="px-3 py-1.5 text-right text-pd-muted">·</td>
                  const yes = m.outcomes.find((o) => o.isYes)!
                  return (
                    <td key={ns[i]} className="px-3 py-1.5 text-right">
                      <Link
                        href={`/polydan/market?id=${m.id}`}
                        className={`inline-flex min-w-[5.5rem] items-baseline justify-end gap-1.5 rounded px-2 py-1 pd-num hover:bg-pd-surface-2 ${
                          m.resolved ? (yes.price === 1 ? 'text-pd-yes' : 'text-pd-muted') : ''
                        }`}
                      >
                        {m.resolved ? (
                          <span className="font-semibold">{yes.price === 1 ? '✓ made it' : '✗ missed'}</span>
                        ) : (
                          <>
                            <span className="text-xs text-pd-muted">{formatMultiple(yes.price)}</span>
                            <span className="font-semibold">{formatPct(yes.price)}</span>
                          </>
                        )}
                      </Link>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
