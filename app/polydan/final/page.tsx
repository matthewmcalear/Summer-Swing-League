import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Loading from '@/app/polydan/loading'
import { requireUser } from '@/lib/polydan/auth'
import { getCurrentEdition, getFinalResults } from '@/lib/polydan/queries'
import { formatMoney, formatOrdinal, formatPct } from '@/lib/polydan/money'

export const metadata = { title: 'PolyDan · Final results' }

// Sync shell + boundary (the SSL pattern for Cache Components): the page itself
// touches no request data, so navigation can show the placeholder instantly.
export default function FinalPage(props: PageProps<'/polydan/final'>) {
  return (
    <Suspense fallback={<Loading />}>
      <FinalContent {...props} />
    </Suspense>
  )
}

const TABS = [
  ['results', 'Results'],
  ['money', 'The money'],
  ['bets', 'Every bet'],
] as const
type Tab = (typeof TABS)[number][0]

const tone = (cents: number) => (cents > 0 ? 'text-pd-yes' : cents < 0 ? 'text-pd-no' : 'text-pd-muted')

async function FinalContent({ searchParams }: PageProps<'/polydan/final'>) {
  const me = await requireUser()
  const sp = await searchParams
  const editionId = Number(sp.edition) || (await getCurrentEdition())?.id
  if (!editionId) notFound()
  const r = await getFinalResults(editionId)
  const tab: Tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as Tab) : 'results'
  const href = (t: Tab) => `/polydan/final?edition=${editionId}${t === 'results' ? '' : `&tab=${t}`}`
  const podium = r.placings.filter((p) => p.position != null && p.position <= 3)
  const owed = r.players.filter((p) => p.balanceCents !== 0)

  return (
    <div className="space-y-5">
      <header>
        <p className="pd-eyebrow">{r.finished ? 'Final results' : 'Results so far'}</p>
        <h1 className="font-pd-display text-4xl font-bold uppercase tracking-wide">Iron Man {r.edition.number}</h1>
        {!r.finished && (
          <p className="mt-1 text-sm text-pd-muted">The event isn’t over yet, so this is where things stand right now.</p>
        )}
      </header>

      {r.champion && (
        <section className="rounded-xl border border-pd-gold bg-pd-gold/10 p-5 text-center">
          <p className="pd-eyebrow text-pd-gold">Champion</p>
          <p className="font-pd-display text-5xl font-bold uppercase tracking-wide text-pd-gold">⚜ {r.champion} ⚜</p>
          <p className="mt-2 text-sm text-pd-ink-2">
            {podium
              .filter((p) => p.position !== 1)
              .map((p) => `${formatOrdinal(p.position!)} ${p.name}`)
              .join(' · ')}
            {r.copper.rows[0] && ` · 🥉 Copper Cup: ${r.copper.rows[0].name}`}
          </p>
        </section>
      )}

      {me.isAdmin && r.unsettled > 0 && (
        <p className="rounded-xl border border-pd-no bg-pd-no-soft p-3 text-sm">
          <span className="font-semibold text-pd-no">
            {r.unsettled} market{r.unsettled === 1 ? ' is' : 's are'} not paid out yet.
          </span>{' '}
          <Link href={`/polydan/admin?tab=markets&edition=${editionId}`} className="text-pd-gold underline">
            Settle or void {r.unsettled === 1 ? 'it' : 'them'} in Admin → Markets
          </Link>
          .
        </p>
      )}

      <nav aria-label="Sections" className="flex flex-wrap gap-1.5 text-sm">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={href(k)}
            scroll={false}
            aria-current={tab === k ? 'page' : undefined}
            className={`rounded-md border px-3 py-2 font-semibold ${
              tab === k
                ? 'border-pd-gold bg-pd-gold text-pd-on-gold'
                : 'border-pd-line-strong bg-pd-surface text-pd-ink-2 hover:border-pd-arc hover:text-pd-ink'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === 'results' && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="pd-card p-4">
            <h2 className="pd-eyebrow mb-3">Finishing order</h2>
            <ol className="grid gap-x-6 sm:grid-cols-2">
              {r.placings.map((p) => (
                <li key={p.id} className="flex items-baseline gap-2 border-b border-pd-line py-1.5 text-sm">
                  <span className={`pd-num w-10 ${p.position === 1 ? 'font-bold text-pd-gold' : 'text-pd-muted'}`}>
                    {p.position ? formatOrdinal(p.position) : '—'}
                  </span>
                  <Link href={`/polydan/person?id=${p.id}`} className={`flex-1 hover:underline ${p.position === 1 ? 'font-bold' : 'font-medium'}`}>
                    {p.name}
                  </Link>
                  <span className="text-xs text-pd-muted">
                    {p.position === 1 ? 'champion' : p.outRound ? `out in round ${p.outRound}` : 'still in'}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-pd-muted">People who went out in the same round share a place.</p>
          </section>
          <section className="pd-card h-fit p-4">
            <h2 className="pd-eyebrow mb-3">🥉 Copper Cup{r.copper.final ? ' · final' : ''}</h2>
            {r.copper.rows.length ? (
              <ol>
                {r.copper.rows.slice(0, 12).map((c, i) => (
                  <li key={c.id} className="flex items-baseline gap-2 border-b border-pd-line py-1.5 text-sm">
                    <span className="pd-num w-6 text-pd-muted">{i + 1}</span>
                    <span className={`flex-1 ${i === 0 ? 'font-bold' : 'font-medium'}`}>{c.name}</span>
                    <span className="pd-num font-semibold">{c.points}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-pd-muted">No Copper Cup points were entered.</p>
            )}
          </section>
        </div>
      )}

      {tab === 'money' && (
        <>
          <section className="pd-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pd-line-strong text-left text-xs text-pd-muted">
                  <th className="px-4 py-2.5 font-normal">Player</th>
                  <th className="px-2 py-2.5 text-right font-normal">Bets</th>
                  <th className="px-2 py-2.5 text-right font-normal">Staked</th>
                  <th className="px-2 py-2.5 text-right font-normal">Got back</th>
                  <th className="px-2 py-2.5 text-right font-normal">Won / lost</th>
                  <th className="px-4 py-2.5 text-right font-normal">Still owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pd-line">
                {r.players.map((p) => (
                  <tr key={p.id} className={p.id === me.id ? 'bg-pd-surface-2' : ''}>
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="pd-num px-2 py-2.5 text-right text-pd-muted">{p.bets}</td>
                    <td className="pd-num px-2 py-2.5 text-right">{formatMoney(p.stakedCents)}</td>
                    <td className="pd-num px-2 py-2.5 text-right">{formatMoney(p.wonCents)}</td>
                    <td className={`pd-num px-2 py-2.5 text-right font-semibold ${tone(p.profitCents)}`}>
                      {formatMoney(p.profitCents, { sign: true })}
                    </td>
                    <td className={`pd-num px-4 py-2.5 text-right ${p.balanceCents ? 'font-semibold text-pd-gold' : 'text-pd-muted'}`}>
                      {p.balanceCents ? formatMoney(p.balanceCents) : 'paid'}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-pd-line-strong">
                  <td className="px-4 py-2.5 font-semibold">The house (Matt)</td>
                  <td />
                  <td />
                  <td />
                  <td className={`pd-num px-2 py-2.5 text-right font-semibold ${tone(r.houseCents)}`}>
                    {formatMoney(r.houseCents, { sign: true })}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </section>
          <p className="text-xs text-pd-muted">
            “Got back” is winnings plus anything sold or refunded. Every bet is against the house, so what the players
            won between them is what the house lost.{' '}
            {owed.length
              ? `Still to be paid: ${owed.map((p) => `${p.name} ${formatMoney(p.balanceCents)}`).join(', ')}.`
              : 'Everyone has been paid.'}
          </p>
        </>
      )}

      {tab === 'bets' && (
        <>
          <p className="text-sm text-pd-muted">
            Every market that had a bet on it: what happened, who bet what, and what it paid. {r.markets.length} markets.
          </p>
          <div className="space-y-3">
            {r.markets.map((m) => (
              <section key={m.id} className="pd-card overflow-hidden">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-pd-line-strong bg-pd-surface-2 px-4 py-2.5">
                  <Link href={`/polydan/market?id=${m.id}`} className="font-semibold hover:underline">
                    {m.question}
                  </Link>
                  <span className="text-sm">
                    {m.status === 'VOID' ? (
                      <span className="text-pd-muted">Voided: everyone refunded</span>
                    ) : m.result.length ? (
                      <span className="text-pd-yes">
                        Result: {m.result.map((x) => (x.pays < 1 ? `${x.label} (${formatPct(x.pays)} each)` : x.label)).join(', ')}
                      </span>
                    ) : (
                      <span className="text-pd-gold">No result yet</span>
                    )}
                  </span>
                  <span className="pd-num ml-auto text-xs text-pd-muted">
                    in {formatMoney(m.takenCents)} · out {formatMoney(m.paidCents)} · house{' '}
                    <span className={tone(m.takenCents - m.paidCents)}>{formatMoney(m.takenCents - m.paidCents, { sign: true })}</span>
                  </span>
                </div>
                <ul className="divide-y divide-pd-line text-sm">
                  {m.bettors.map((b) => (
                    <li key={b.userId} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2">
                      <span className="w-28 shrink-0 font-medium">{b.name}</span>
                      <span className="min-w-0 flex-1 text-pd-ink-2">
                        {b.picks.length
                          ? b.picks.map((p) => `${p.label} × ${p.shares.toFixed(1)}`).join(', ')
                          : 'sold everything before the result'}
                      </span>
                      <span className="pd-num text-pd-muted">staked {formatMoney(b.stakedCents)}</span>
                      <span className="pd-num w-24 text-right">paid {formatMoney(b.paidCents)}</span>
                      <span className={`pd-num w-20 text-right font-semibold ${tone(b.profitCents)}`}>
                        {m.done ? formatMoney(b.profitCents, { sign: true }) : 'open'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="text-xs text-pd-muted">
            “× 25.0” means 25 shares, each paying $1 if that answer is right. Markets nobody bet on aren’t listed.
          </p>
        </>
      )}
    </div>
  )
}
