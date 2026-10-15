import Link from 'next/link'
import type { MarketView } from '@/lib/polydan/queries'
import { formatMoney, formatMultiple, formatPct } from '@/lib/polydan/money'

const KIND_LABEL: Record<MarketView['kind'], string> = {
  WINNER: 'Winner',
  TOP_N: 'Top finish',
  H2H: 'Head to head',
  CUSTOM: 'Special',
  COPPER: 'Copper Cup',
}

export function StatusTag({ market }: { market: MarketView }) {
  if (market.status === 'SETTLED') return <Tag tone="muted">Settled</Tag>
  if (market.status === 'VOID') return <Tag tone="muted">Void</Tag>
  if (market.resolved) return <Tag tone="gold">Result in</Tag>
  if (market.status === 'CLOSED') return <Tag tone="muted">Paused</Tag>
  return <Tag tone="yes">Live</Tag>
}

function Tag({ tone, children }: { tone: 'yes' | 'gold' | 'muted'; children: React.ReactNode }) {
  const cls = {
    yes: 'bg-pd-yes-soft text-pd-yes',
    gold: 'bg-pd-surface-2 text-pd-gold',
    muted: 'bg-pd-surface-2 text-pd-muted',
  }[tone]
  return (
    <span className={`rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  )
}

function ProbBar({ p, dead }: { p: number; dead?: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-pd-surface-2">
      <div
        className={`h-full rounded-full ${dead ? 'bg-pd-muted/40' : 'bg-pd-gold'}`}
        style={{ width: `${Math.max(p * 100, p > 0 ? 1.5 : 0)}%` }}
      />
    </div>
  )
}

function CardShell({ market, children }: { market: MarketView; children: React.ReactNode }) {
  return (
    <Link
      href={`/polydan/market?id=${market.id}`}
      className="pd-card flex flex-col gap-3 p-4 transition hover:border-pd-line-strong hover:shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className="pd-eyebrow">{KIND_LABEL[market.kind]}</span>
        <span className="ml-auto">
          <StatusTag market={market} />
        </span>
      </div>
      <h3 className="font-semibold leading-snug">{market.question}</h3>
      {children}
      <p className="mt-auto text-xs text-pd-muted pd-num">{formatMoney(market.volumeCents)} traded</p>
    </Link>
  )
}

export function MarketCard({ market }: { market: MarketView }) {
  const [a, b] = market.outcomes

  if (market.kind === 'TOP_N') {
    const yes = market.outcomes.find((o) => o.isYes)!
    return (
      <CardShell market={market}>
        <div className="flex items-end justify-between">
          <span className="font-pd-display text-3xl font-semibold pd-num">{formatPct(yes.price)}</span>
          <span className="pb-1 text-xs text-pd-muted">chance</span>
        </div>
        <ProbBar p={yes.price} />
        <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
          <span className="rounded-md bg-pd-yes-soft py-1.5 text-center text-pd-yes pd-num">Yes · pays {formatMultiple(yes.price)}</span>
          <span className="rounded-md bg-pd-no-soft py-1.5 text-center text-pd-no pd-num">No · pays {formatMultiple(1 - yes.price)}</span>
        </div>
      </CardShell>
    )
  }

  if (market.outcomes.length === 2) {
    return (
      <CardShell market={market}>
        <div className="space-y-2">
          {[a, b].map((o) => (
            <div key={o.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className={o.dead ? 'text-pd-muted line-through' : 'font-medium'}>{o.label}</span>
                <span className="pd-num">
                  {!o.dead && !market.resolved && <span className="mr-1.5 text-xs text-pd-muted">{formatMultiple(o.price)}</span>}
                  <span className="font-semibold">{formatPct(o.price)}</span>
                </span>
              </div>
              <ProbBar p={o.price} dead={o.dead} />
            </div>
          ))}
        </div>
      </CardShell>
    )
  }

  const top = [...market.outcomes].sort((x, y) => y.price - x.price).slice(0, 4)
  const live = market.outcomes.filter((o) => !o.dead).length
  return (
    <CardShell market={market}>
      <div className="space-y-2">
        {top.map((o) => (
          <div key={o.id}>
            <div className="mb-1 flex justify-between text-sm">
              <span className={o.dead ? 'text-pd-muted line-through' : 'font-medium'}>{o.label}</span>
              <span className="font-semibold pd-num">{formatPct(o.price)}</span>
            </div>
            <ProbBar p={o.price} dead={o.dead} />
          </div>
        ))}
      </div>
      {market.outcomes.length > 4 && (
        <p className="text-xs text-pd-muted">
          +{market.outcomes.length - 4} more · {live} still alive
        </p>
      )}
    </CardShell>
  )
}

/** The headline winner market: every competitor, ranked, in a dense grid. */
export function WinnerBoard({ market }: { market: MarketView }) {
  const ranked = [...market.outcomes].sort((x, y) => Number(x.dead) - Number(y.dead) || y.price - x.price)
  return (
    <Link href={`/polydan/market?id=${market.id}`} className="pd-card block p-4 transition hover:border-pd-line-strong sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="pd-eyebrow">Main event</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-pd-muted pd-num">{formatMoney(market.volumeCents)} traded</span>
          <StatusTag market={market} />
        </span>
      </div>
      <h2 className="mb-4 font-pd-display text-2xl font-semibold uppercase tracking-wide">{market.question}</h2>
      <ol className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map((o, i) => (
          <li key={o.id} className="flex items-center gap-3">
            <span className="w-5 text-right text-xs text-pd-muted pd-num">{o.dead ? '' : i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className={`truncate ${o.dead ? 'text-pd-muted line-through' : 'font-medium'}`}>{o.label}</span>
                <span className={`pd-num ${o.dead ? 'text-pd-muted' : ''}`}>
                  {!o.dead && !market.resolved && <span className="mr-1.5 text-xs text-pd-muted">{formatMultiple(o.price)}</span>}
                  <span className="font-semibold">{formatPct(o.price)}</span>
                </span>
              </div>
              <ProbBar p={o.price} dead={o.dead} />
            </div>
          </li>
        ))}
      </ol>
    </Link>
  )
}
