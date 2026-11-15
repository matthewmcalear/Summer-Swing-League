'use client'

import { useActionState, useMemo, useState } from 'react'
import { trade } from '@/app/polydan/actions'
import type { OutcomeView } from '@/lib/polydan/queries'
import { cashOutCents, prices, sellProceeds, sharesForSpend } from '@/lib/polydan/lmsr'
import { formatMoney, formatMultiple, formatPct } from '@/lib/polydan/money'
import { stakeAfterCut } from '@/lib/polydan/stake'
import { Notice, SubmitButton } from './ui'

interface Holding {
  outcomeId: number
  shares: number
  costCents: number
}

// Outcome list + trade ticket share the selected outcome, so they live in one
// client component. Quotes are computed locally with the same LMSR maths the
// server uses; the server re-prices at execution.
export function Trading({
  outcomes,
  b,
  tradable,
  resolved,
  lockedReason,
  balanceCents,
  holdings,
  binary,
  houseCutPct = 0,
  maxStakeCents = 0,
  stakedCents = 0,
}: {
  outcomes: OutcomeView[]
  b: number
  tradable: boolean
  /** The result is in: holdings are worth their payout. */
  resolved: boolean
  lockedReason: string | null
  balanceCents: number
  holdings: Holding[]
  binary: boolean
  /** % of each bet the house keeps before it buys shares. */
  houseCutPct?: number
  /** Most one person can have on this market, in cents (0 = no limit), and what this player has on it. */
  maxStakeCents?: number
  stakedCents?: number
}) {
  const ranked = useMemo(
    () => (binary ? outcomes : [...outcomes].sort((x, y) => Number(x.dead) - Number(y.dead) || y.price - x.price)),
    [outcomes, binary],
  )
  const firstLive = ranked.find((o) => !o.dead)
  const [picked, setSelected] = useState<number | undefined>(firstLive?.id)
  // If the picked outcome just died (a knockout came in), fall back to the favourite.
  const selected = outcomes.some((o) => o.id === picked && !o.dead) ? picked : firstLive?.id
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [amount, setAmount] = useState('')
  const [state, action] = useActionState(trade, {})

  // Clear the amount once per successful trade (adjusting state during render,
  // not in an effect: https://react.dev/learn/you-might-not-need-an-effect).
  const [seen, setSeen] = useState(state)
  if (state !== seen) {
    setSeen(state)
    if (state.ok) setAmount('')
  }

  const held = new Map(holdings.map((h) => [h.outcomeId, h]))
  const live = outcomes.filter((o) => !o.dead)
  const sel = outcomes.find((o) => o.id === selected)
  const i = live.findIndex((o) => o.id === selected)
  const n = Number(amount)

  const quote = useMemo(() => {
    if (!sel || i < 0 || !(n > 0)) return null
    const q = live.map((o) => o.q)
    if (side === 'BUY') {
      // Same sum the server does: the house's cut comes off before shares are bought.
      const shares = sharesForSpend(q, b, i, stakeAfterCut(Math.round(n * 100), houseCutPct))
      q[i] += shares
      return { shares, avg: n / shares, payout: shares, after: prices(q, b)[i] }
    }
    const shares = Math.min(n, held.get(sel.id)?.shares ?? 0)
    const proceeds = Math.floor(sellProceeds(q, b, i, shares) * 100) / 100
    q[i] -= shares
    return { shares, avg: shares ? proceeds / shares : 0, proceeds, after: prices(q, b)[i] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, i, n, side, b, outcomes, houseCutPct])
  const roomCents = maxStakeCents > 0 ? Math.max(0, maxStakeCents - stakedCents) : Infinity
  const overLimit = side === 'BUY' && Math.round(n * 100) > roomCents

  const myShares = sel ? (held.get(sel.id)?.shares ?? 0) : 0

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="pd-card divide-y divide-pd-line">
        {ranked.map((o) => {
          const h = held.get(o.id)
          const isSel = o.id === selected
          return (
            <button
              key={o.id}
              type="button"
              disabled={o.dead || !tradable}
              onClick={() => setSelected(o.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition first:rounded-t-xl last:rounded-b-xl ${
                isSel && tradable ? 'bg-pd-surface-2' : 'hover:bg-pd-surface-2/60'
              } disabled:cursor-default`}
            >
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${o.dead ? 'text-pd-muted line-through' : ''}`}>{o.label}</p>
                {h && (
                  <p className="text-xs text-pd-gold pd-num">
                    Your bet: {formatMoney(h.costCents)} in ·{' '}
                    {resolved || o.dead ? (
                      <>paid {formatMoney(cashOutCents(outcomes, b, resolved, o.id, h.shares))}</>
                    ) : (
                      <>
                        <span className="font-semibold">wins {formatMoney(Math.floor(h.shares * 100))}</span> if right · sells
                        for {formatMoney(cashOutCents(outcomes, b, resolved, o.id, h.shares))} now
                      </>
                    )}
                  </p>
                )}
              </div>
              <span className={`font-pd-display text-xl font-semibold pd-num ${o.dead ? 'text-pd-muted' : ''}`}>
                {formatPct(o.price)}
              </span>
              {tradable && !o.dead && (
                <span
                  className={`w-20 rounded-md py-1.5 text-center text-sm font-semibold pd-num ${
                    isSel ? 'bg-pd-gold text-pd-on-gold' : 'bg-pd-yes-soft text-pd-yes'
                  }`}
                >
                  pays {formatMultiple(o.price)}
                </span>
              )}
            </button>
          )
        })}
      </section>

      <aside className="pd-card h-fit p-4 lg:sticky lg:top-20">
        {!tradable ? (
          <p className="text-sm text-pd-muted">{lockedReason}</p>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="outcomeId" value={selected ?? ''} />
            <input type="hidden" name="side" value={side} />
            <div className="grid grid-cols-2 rounded-lg bg-pd-surface-2 p-1 text-sm font-semibold">
              {(['BUY', 'SELL'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSide(s)
                    setAmount('')
                  }}
                  className={`rounded-md py-1.5 ${side === s ? 'bg-pd-surface text-pd-ink shadow-sm' : 'text-pd-muted'}`}
                >
                  {s === 'BUY' ? 'Buy' : 'Sell'}
                </button>
              ))}
            </div>
            <p className="text-sm">
              <span className="text-pd-muted">{side === 'BUY' ? 'Backing' : 'Selling'} </span>
              <span className="font-semibold">{sel?.label ?? '—'}</span>
              {sel && <span className="text-pd-muted pd-num"> · pays {formatMultiple(sel.price)}</span>}
            </p>
            <label className="block">
              <span className="text-xs font-medium text-pd-muted">{side === 'BUY' ? 'Amount ($)' : 'Shares to sell'}</span>
              <input
                name="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={side === 'BUY' ? '10' : myShares.toFixed(2)}
                className="pd-field mt-1 text-lg font-semibold pd-num"
              />
            </label>
            <div className="flex gap-1.5">
              {side === 'BUY'
                ? [5, 10, 25].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="pd-btn pd-btn-ghost flex-1 px-2 py-1 text-xs"
                      onClick={() => setAmount(String((Number(amount) || 0) + v))}
                    >
                      +{v}
                    </button>
                  ))
                : [0.25, 0.5, 1].map((f) => (
                    <button
                      key={f}
                      type="button"
                      disabled={!myShares}
                      className="pd-btn pd-btn-ghost flex-1 px-2 py-1 text-xs"
                      onClick={() => setAmount((Math.floor(myShares * f * 100) / 100).toString())}
                    >
                      {f === 1 ? 'All' : `${f * 100}%`}
                    </button>
                  ))}
              {side === 'BUY' && (
                <button
                  type="button"
                  className="pd-btn pd-btn-ghost flex-1 px-2 py-1 text-xs"
                  onClick={() => setAmount((Math.floor(Math.min(balanceCents, roomCents)) / 100).toString())}
                >
                  Max
                </button>
              )}
            </div>

            {quote && (
              <dl className="space-y-1 rounded-lg bg-pd-surface-2 p-3 text-sm">
                {side === 'BUY' ? (
                  <>
                    <p className="text-base">
                      <span className="pd-num">{formatMoney(Math.round(n * 100))}</span> →{' '}
                      <span className="font-semibold text-pd-yes pd-num">
                        {formatMoney(Math.floor((quote.payout ?? 0) * 100))}
                      </span>{' '}
                      {sel?.competitorId && sel.isYes == null ? `if ${sel.label} wins` : "if you're right"}
                    </p>
                    <Row k="Your payout (locked in)" v={formatMultiple(quote.avg)} />
                    {houseCutPct > 0 && <Row k={`Includes house cut (${houseCutPct}%)`} v={formatMoney(Math.round(n * houseCutPct))} />}
                    <Row k="Next bet pays" v={formatMultiple(quote.after)} />
                  </>
                ) : (
                  <>
                    <Row k="Selling at" v={`${formatPct(quote.avg)} a share`} />
                    <Row k="Odds after" v={formatPct(quote.after)} />
                    <div className="flex justify-between border-t border-pd-line pt-1.5 font-semibold">
                      <dt>You receive</dt>
                      <dd className="pd-num">{formatMoney(Math.round((quote.proceeds ?? 0) * 100))}</dd>
                    </div>
                  </>
                )}
              </dl>
            )}

            <SubmitButton
              className={`pd-btn w-full ${side === 'BUY' ? 'pd-btn-gold' : 'pd-btn-danger'}`}
              pendingText="Placing…"
              disabled={!sel || !(n > 0) || (side === 'SELL' && !myShares) || overLimit}
            >
              {side === 'BUY' ? `Buy ${sel?.label ?? ''}` : `Sell ${sel?.label ?? ''}`}
            </SubmitButton>
            {overLimit && (
              <p className="text-center text-xs font-medium text-pd-no">
                {roomCents >= 100
                  ? `The limit is ${formatMoney(maxStakeCents)} a person on one market: you can add up to ${formatMoney(roomCents)} here.`
                  : `You’re at the ${formatMoney(maxStakeCents)} limit on this market.`}
              </p>
            )}
            <p className="text-center text-xs text-pd-muted pd-num">
              Balance {formatMoney(balanceCents)}
              {maxStakeCents > 0 && ` · limit ${formatMoney(maxStakeCents)} a market`}
            </p>
            <Notice state={state} />
          </form>
        )}
      </aside>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-pd-muted">{k}</dt>
      <dd className="pd-num">{v}</dd>
    </div>
  )
}
