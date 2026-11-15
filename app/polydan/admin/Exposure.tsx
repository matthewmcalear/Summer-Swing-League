import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getEditionBoard } from '@/lib/polydan/queries'
import { marketExposure } from '@/lib/polydan/exposure'
import { maxHouseLoss } from '@/lib/polydan/lmsr'
import { formatMoney, formatPct } from '@/lib/polydan/money'

const tone = (cents: number) => (cents < 0 ? 'text-pd-no' : cents > 0 ? 'text-pd-yes' : 'text-pd-muted')

function Money({ cents, className = '' }: { cents: number; className?: string }) {
  return <span className={`pd-num font-semibold ${tone(cents)} ${className}`}>{formatMoney(cents, { sign: true })}</span>
}

function Tile({ label, cents, note, plain }: { label: string; cents: number; note: string; plain?: boolean }) {
  return (
    <div className="pd-card p-3 sm:p-4">
      <p className="pd-eyebrow">{label}</p>
      <p className={`pd-num text-2xl font-bold ${plain ? '' : tone(cents)}`}>{formatMoney(cents, { sign: !plain })}</p>
      <p className="mt-0.5 text-xs text-pd-muted">{note}</p>
    </div>
  )
}

/**
 * The house's position on every market, from the bets actually placed. It
 * re-reads with the rest of PolyDan (every 10 seconds, and on coming back to
 * the tab), so it can be left open during the day.
 */
export async function ExposureTab({ editionId }: { editionId: number }) {
  const { markets } = await getEditionBoard(editionId)
  const [ledger, trades] = await Promise.all([
    prisma.pdLedgerEntry.groupBy({
      by: ['marketId', 'kind'],
      where: { market: { editionId } },
      _sum: { amountCents: true },
    }),
    prisma.pdTrade.findMany({ where: { market: { editionId } }, select: { outcomeId: true, shares: true } }),
  ])
  const held = new Map<number, number>()
  for (const t of trades) held.set(t.outcomeId, (held.get(t.outcomeId) ?? 0) + t.shares)
  const money = (marketId: number, kinds: string[]) =>
    ledger.filter((l) => l.marketId === marketId && kinds.includes(l.kind)).reduce((s, l) => s + (l._sum.amountCents ?? 0), 0)

  const open = markets
    .filter((m) => m.status === 'OPEN' || m.status === 'CLOSED')
    .map((m) => {
      const outcomes = m.outcomes.map((o) => ({
        label: o.label,
        shares: Math.max(0, held.get(o.id) ?? 0),
        price: o.price,
        dead: o.dead,
        q: o.q,
      }))
      // Net of refunds already paid back on a market that's still open (someone dropped from the field).
      const e = marketExposure(-money(m.id, ['BUY', 'SELL', 'PAYOUT', 'REFUND']), outcomes, m.resolved)
      // The most this market could ever lose, however much more is bet on it.
      const ceilingCents = m.resolved
        ? -Math.min(e.worstCents, 0)
        : Math.round(maxHouseLoss(m.outcomes.map((o) => o.q - o.adj - (held.get(o.id) ?? 0)), m.b) * 100)
      return { m, e, ceilingCents, bet: outcomes.some((o) => o.shares > 0.0001) }
    })
  const withBets = open.filter((x) => x.bet).sort((a, b) => a.e.worstCents - b.e.worstCents || a.m.id - b.m.id)
  const noBets = open.filter((x) => !x.bet)
  const sum = (f: (x: (typeof open)[number]) => number) => open.reduce((s, x) => s + f(x), 0)
  // Settled and voided markets: the result is final, so this is money already won or lost.
  const banked = markets
    .filter((m) => m.status === 'SETTLED' || m.status === 'VOID')
    .reduce((s, m) => s - money(m.id, ['BUY', 'SELL']) - money(m.id, ['PAYOUT', 'REFUND']), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Bets taken in" cents={sum((x) => x.e.takenCents)} plain note={`On ${open.length} open markets`} />
        <Tile
          label="Worst case now"
          cents={sum((x) => x.e.worstCents)}
          note="Every market goes against the house, on today’s bets"
        />
        <Tile label="At current odds" cents={sum((x) => x.e.expectedCents)} note="If results follow the odds" />
        <Tile label="Best case now" cents={sum((x) => x.e.bestCents)} note="Every market goes the house’s way" />
        <Tile label="Already settled" cents={banked} note="Won or lost on finished markets" />
      </div>
      <p className="text-xs text-pd-muted">
        Updates by itself every 10 seconds. Green is money the house keeps, red is money it pays out of pocket. “Worst
        case now” adds up each market’s worst result, which can’t all happen together, so the real worst day is
        better than that. If a lot more is bet, the limit is the ceiling:{' '}
        <span className="pd-num font-semibold text-pd-ink-2">{formatMoney(sum((x) => x.ceilingCents))}</span> in all.
      </p>

      <section className="pd-card divide-y divide-pd-line">
        <div className="hidden grid-cols-[1fr_5.5rem_9rem_5.5rem_5.5rem_5.5rem] gap-3 px-4 py-2 text-xs text-pd-muted md:grid">
          <span>Market (biggest risk first)</span>
          <span className="text-right">Taken in</span>
          <span className="text-right">Worst case</span>
          <span className="text-right">At odds</span>
          <span className="text-right">Best case</span>
          <span className="text-right">Ceiling</span>
        </div>
        {withBets.map(({ m, e, ceilingCents }) => (
          <details key={m.id} className="group px-4 py-2.5 text-sm">
            <summary className="grid cursor-pointer list-none grid-cols-2 gap-x-3 gap-y-1 md:grid-cols-[1fr_5.5rem_9rem_5.5rem_5.5rem_5.5rem] md:items-baseline">
              <span className="col-span-2 font-semibold md:col-span-1">
                <span className="text-pd-muted group-open:hidden">▸ </span>
                <span className="hidden text-pd-muted group-open:inline">▾ </span>
                {m.question}
                {m.status === 'CLOSED' && <span className="ml-2 text-xs font-normal text-pd-gold">paused</span>}
                {m.resolved && <span className="ml-2 text-xs font-normal text-pd-gold">result in, not paid yet</span>}
              </span>
              <span className="pd-num md:text-right">
                <span className="text-xs text-pd-muted md:hidden">Taken in </span>
                {formatMoney(e.takenCents)}
              </span>
              <span className="md:text-right">
                <span className="text-xs text-pd-muted md:hidden">Worst </span>
                <Money cents={e.worstCents} />
                {e.worstLabel && <span className="block truncate text-xs text-pd-muted">if {e.worstLabel}</span>}
              </span>
              <span className="md:text-right">
                <span className="text-xs text-pd-muted md:hidden">At odds </span>
                <Money cents={e.expectedCents} />
              </span>
              <span className="md:text-right">
                <span className="text-xs text-pd-muted md:hidden">Best </span>
                <Money cents={e.bestCents} />
              </span>
              <span className="pd-num text-pd-muted md:text-right">
                <span className="text-xs md:hidden">Ceiling </span>
                {formatMoney(ceilingCents)}
              </span>
            </summary>
            <div className="mt-2 rounded-lg bg-pd-surface-2 p-2.5">
              {e.ifWins.length > 0 ? (
                <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
                  {e.ifWins.map((x) => (
                    <li key={x.label} className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate">
                        If {x.label} <span className="text-xs text-pd-muted">({formatPct(x.price)})</span>
                      </span>
                      <Money cents={x.cents} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-pd-muted">The result is in. This is what settling it does to the house.</p>
              )}
              <Link href={`/polydan/market?id=${m.id}`} className="mt-2 inline-block text-xs text-pd-gold hover:underline">
                Open the market →
              </Link>
            </div>
          </details>
        ))}
        {!withBets.length && <p className="p-4 text-sm text-pd-muted">No bets on any open market yet.</p>}
      </section>

      {noBets.length > 0 && (
        <details className="pd-card p-4 text-sm">
          <summary className="cursor-pointer text-pd-muted">
            {noBets.length} open market{noBets.length > 1 ? 's' : ''} with no bets: nothing at stake yet, ceiling{' '}
            <span className="pd-num">{formatMoney(noBets.reduce((s, x) => s + x.ceilingCents, 0))}</span>
          </summary>
          <ul className="mt-2 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
            {noBets.map(({ m, ceilingCents }) => (
              <li key={m.id} className="flex items-baseline gap-2">
                <Link href={`/polydan/market?id=${m.id}`} className="min-w-0 flex-1 truncate hover:underline">
                  {m.question}
                </Link>
                <span className="pd-num text-pd-muted">{formatMoney(ceilingCents)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
