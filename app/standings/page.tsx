import Link from 'next/link'
import { ArrowUp, ArrowDown, ChevronDown, Trophy, Medal, Award, Sparkles, Target, type LucideIcon } from 'lucide-react'
import { getStandings, participationMultiplier } from '@/lib/standings'
import { displayName, displayHandicap } from '@/lib/nameUtils'
import { SEASON_END, daysUntil } from '@/lib/scoring'
import type { StandingEntry } from '@/types'
import { leagueCache } from '@/lib/cache'
import { Suspense } from 'react'
import { connection } from 'next/server'
import PageSkeleton from '@/components/PageSkeleton'

const fmt = (n: number) => n.toFixed(1)
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function Movement({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-[10px] font-bold text-green-700 uppercase">New</span>
  if (value === 0) return null
  const up = value > 0
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span
      className={`inline-flex items-center text-[11px] font-bold tabular-nums ${up ? 'text-green-700' : 'text-flag-500'}`}
      title={`${up ? 'Up' : 'Down'} ${Math.abs(value)} this week`}
    >
      <Icon size={12} strokeWidth={2.75} aria-hidden="true" />
      {Math.abs(value)}
    </span>
  )
}

const PODIUM: { Icon: LucideIcon; label: string; prize: number }[] = [
  { Icon: Trophy, label: 'Champion',  prize: 250 },
  { Icon: Medal,  label: 'Runner-up', prize: 150 },
  { Icon: Award,  label: 'Third',     prize: 75 },
]

function Podium({ top, final }: { top: StandingEntry[]; final: boolean }) {
  // Visual order 2-1-3 on wider screens so the leader sits in the middle.
  const order = [1, 0, 2].filter((i) => top[i])
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
      {order.map((i) => {
        const p = top[i]
        const { Icon, label, prize } = PODIUM[i]
        const first = i === 0
        return (
          <Link
            key={p.id}
            href={`/analytics?tab=player&id=${p.id}`}
            className={`group relative flex flex-col items-center text-center rounded-2xl border px-2 sm:px-4 transition-transform hover:-translate-y-0.5 ${
              first
                ? 'prize-champion text-white border-brass-600 shadow-lg py-6 sm:py-8'
                : 'bg-white border-brass-200 shadow-sm py-4 sm:py-6'
            }`}
          >
            <Icon size={first ? 28 : 22} strokeWidth={2} aria-hidden="true" className={first ? 'text-white' : 'text-brass-600'} />
            <span className={`mt-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest ${first ? 'text-white/80' : 'text-brass-600'}`}>
              {final ? label : `#${p.rank ?? i + 1}`}
            </span>
            <span className={`mt-1 font-display font-bold leading-tight text-sm sm:text-lg line-clamp-2 ${first ? 'text-white' : 'text-gray-900'}`}>
              {displayName(p.name)}
            </span>
            <span className={`font-display font-extrabold tabular-nums leading-none mt-2 ${first ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-4xl text-gray-900'}`}>
              {fmt(p.seasonScore)}
            </span>
            <span className={`mt-1 text-[11px] font-medium ${first ? 'text-white/85' : 'text-gray-500'}`}>
              {final ? `$${prize}` : i === 0 ? 'Leader' : `−${fmt(p.gapToLeader ?? 0)} back`}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function Row({ p, live }: { p: StandingEntry; live: boolean }) {
  const multiplier = participationMultiplier(p.totalRounds)
  const rank = p.rank ?? 0
  const medal = rank <= 3
  return (
    <details className="group border-t border-gray-100 first:border-t-0 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex items-center gap-3 px-3 sm:px-5 py-3 cursor-pointer list-none hover:bg-gray-50 transition-colors">
        <div className="flex flex-col items-center w-9 shrink-0">
          <span
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold tabular-nums ${
              medal ? 'bg-brass-50 text-brass-700 border border-brass-200' : 'bg-gray-50 text-gray-500 border border-gray-100'
            }`}
          >
            {rank}
          </span>
          {live && <span className="h-4 flex items-center"><Movement value={p.movement} /></span>}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 truncate">{displayName(p.name)}</div>
          <div className="text-xs text-gray-500 flex flex-wrap gap-x-2">
            <span>Hdcp {displayHandicap(p.currentHandicap, p.totalRounds > 0)}</span>
            <span>· {p.totalRounds} {p.totalRounds === 1 ? 'round' : 'rounds'}</span>
            {p.lastPlayed && <span className="hidden sm:inline">· last {shortDate(p.lastPlayed)}</span>}
          </div>
          {p.totalRounds > 0 && p.totalRounds < 5 && (
            <div className="mt-1 h-1 w-28 rounded-full bg-gray-100 overflow-hidden" title={`${Math.round(multiplier * 100)}% participation`}>
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${multiplier * 100}%` }} />
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="font-display text-xl sm:text-2xl font-bold text-green-800 tabular-nums leading-none">{fmt(p.seasonScore)}</div>
          <div className="text-[11px] text-gray-400 tabular-nums mt-0.5">
            {rank === 1 ? 'leader' : `−${fmt(p.gapToLeader ?? 0)}`}
          </div>
        </div>
        <ChevronDown size={16} className="text-gray-300 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>

      <div className="px-3 sm:px-5 pb-4 pl-[3.75rem] sm:pl-[4.25rem] grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Best rounds</div>
          {p.topScores.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {p.topScores.map((s, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-green-50 text-green-800 text-xs font-semibold tabular-nums">{fmt(s)}</span>
              ))}
              {Array.from({ length: Math.max(0, 5 - p.topScores.length) }).map((_, i) => (
                <span key={`e${i}`} className="px-2 py-0.5 rounded-md border border-dashed border-gray-200 text-gray-300 text-xs">—</span>
              ))}
            </div>
          ) : <span className="text-gray-400">No rounds yet</span>}
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          <dt className="text-gray-500">Top-5 total</dt>
          <dd className="text-gray-800 tabular-nums text-right">{fmt(p.totalPoints)} × {Math.round(multiplier * 100)}%</dd>
          {p.improvementBonus > 0 && (<>
            <dt className="text-gray-500">Improvement</dt>
            <dd className="text-blue-700 font-semibold tabular-nums text-right">+{fmt(p.improvementBonus)} <span className="font-normal text-gray-400">({p.handicapImprovement} strokes)</span></dd>
          </>)}
          {p.seasonBonuses.map((b) => (
            <div key={b.id} className="contents">
              <dt className="text-gray-500 truncate">{b.reason}</dt>
              <dd className="text-amber-700 font-semibold tabular-nums text-right">{b.points > 0 ? '+' : ''}{b.points}</dd>
            </div>
          ))}
          <dt className="text-gray-900 font-semibold border-t border-gray-100 pt-1 mt-1">Season</dt>
          <dd className="text-gray-900 font-bold tabular-nums text-right border-t border-gray-100 pt-1 mt-1">{fmt(p.seasonScore)}</dd>
        </dl>

        {live && p.nextName && (
          <div className="sm:col-span-2 flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
            <Target size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {fmt(p.gapToNext ?? 0)} behind {displayName(p.nextName)}.{' '}
              {p.pointsToPass == null
                ? 'Out of reach in a single round.'
                : p.pointsToPass === 0
                  ? 'Any round you post passes them.'
                  : p.toPassAboveBest
                    ? <>It would take a <strong>{fmt(p.pointsToPass)}-pt</strong> round — more than anyone has posted this season.</>
                    : <>A round worth <strong>{fmt(p.pointsToPass)}+ pts</strong> passes them.</>}
            </span>
          </div>
        )}
      </div>
    </details>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Live />
    </Suspense>
  )
}

// Rendered per request — never baked into build-time HTML, which Heroku restores on
// every dyno restart — from an in-memory cache that any league write expires.
async function Live() {
  await connection()
  return <Standings />
}

async function Standings() {
  'use cache'
  leagueCache() // refreshed on any league write + hourly

  const standings = await getStandings()
  const daysLeft = daysUntil(SEASON_END)
  const live = daysLeft >= 0
  const ranked = standings.filter((p) => p.totalRounds > 0)
  const unranked = standings.filter((p) => p.totalRounds === 0)
  const anyMovement = live && ranked.some((p) => p.movement !== 0)

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">
            {live ? (daysLeft <= 7 ? `Final ${daysLeft === 0 ? 'day' : `${daysLeft} days`}` : `${daysLeft} days left`) : 'Season complete'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{live ? 'Standings' : 'Final Standings'}</h1>
        </div>
        {anyMovement && <p className="text-xs text-gray-500 flex items-center gap-1.5"><ArrowUp size={12} className="text-green-700" />Arrows show movement over the last 7 days</p>}
      </header>

      {ranked.length === 0 ? (
        <div className="card text-center text-gray-500 py-16">No scores submitted yet.</div>
      ) : (
        <>
          <Podium top={ranked.slice(0, 3)} final={!live} />

          <div className="card p-0 overflow-hidden">
            {ranked.map((p) => <Row key={p.id} p={p} live={live} />)}
          </div>
        </>
      )}

      {unranked.length > 0 && (
        <p className="text-xs text-gray-500">
          <span className="font-semibold">Yet to play:</span> {unranked.map((p) => displayName(p.name)).join(', ')}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="card p-4">
          <div className="font-semibold text-gray-900 mb-1">Participation</div>
          <p className="text-gray-600 text-xs leading-relaxed">Your top 5 rounds count. Fewer than 5 scales them: 1 = 20% · 2 = 40% · 3 = 60% · 4 = 80%.</p>
        </div>
        <div className="card p-4">
          <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5"><Sparkles size={14} className="text-blue-600" /> Improvement</div>
          <p className="text-gray-600 text-xs leading-relaxed">Every stroke your handicap drops from your first round adds +3 points.</p>
        </div>
        <div className="card p-4">
          <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5"><Trophy size={14} className="text-brass-600" /> Tournament bonuses</div>
          <p className="text-gray-600 text-xs leading-relaxed">Commissioner-awarded points from events, itemized in each player&apos;s breakdown.</p>
        </div>
      </div>
    </div>
  )
}
