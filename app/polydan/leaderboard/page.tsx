import { Suspense } from 'react'
import Loading from '@/app/polydan/loading'
import { requireUser } from '@/lib/polydan/auth'
import { getLeaderboard } from '@/lib/polydan/queries'
import { formatMoney } from '@/lib/polydan/money'

// Sync shell + boundary (the SSL pattern for Cache Components): the page itself
// touches no request data, so navigation can show the placeholder instantly.
export default function LeaderboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LeaderboardPageContent />
    </Suspense>
  )
}

async function LeaderboardPageContent() {
  const me = await requireUser()
  const rows = await getLeaderboard()

  return (
    <div className="space-y-4">
      <header>
        <p className="pd-eyebrow">Leaderboard</p>
        <h1 className="font-pd-display text-3xl font-bold uppercase tracking-wide">Sharpest money</h1>
        <p className="mt-1 text-sm text-pd-muted">
          Profit = cash + open bets at today&apos;s prices − money put in.
        </p>
      </header>
      <div className="pd-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="pd-eyebrow text-left">
              <th className="px-4 py-2.5 font-normal">#</th>
              <th className="px-2 py-2.5 font-normal">Name</th>
              <th className="px-2 py-2.5 text-right font-normal">Put in</th>
              <th className="px-2 py-2.5 text-right font-normal">Worth</th>
              <th className="px-4 py-2.5 text-right font-normal">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pd-line">
            {rows.map((r, i) => (
              <tr key={r.id} className={r.id === me.id ? 'bg-pd-surface-2' : ''}>
                <td className="px-4 py-2.5 text-pd-muted pd-num">{i + 1}</td>
                <td className="px-2 py-2.5 font-medium">{r.name}</td>
                <td className="px-2 py-2.5 text-right text-pd-muted pd-num">{formatMoney(r.invested)}</td>
                <td className="px-2 py-2.5 text-right pd-num">{formatMoney(r.netWorth)}</td>
                <td className={`px-4 py-2.5 text-right font-semibold pd-num ${r.pnl > 0 ? 'text-pd-yes' : r.pnl < 0 ? 'text-pd-no' : ''}`}>
                  {formatMoney(r.pnl, { sign: true })}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-pd-muted">
                  Nobody has put money in yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
