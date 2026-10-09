import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Trophy, Medal, Award, Dumbbell, Star, Target, TrendingDown, Compass, Users,
  Flag, MapPin, CalendarDays, Handshake, type LucideIcon,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getStandings } from '@/lib/standings'
import { buildSeasonRecap, shortDate } from '@/lib/seasonRecap'
import { displayName } from '@/lib/nameUtils'
import { SEASON_END, daysUntil } from '@/lib/scoring'
import CountUp from '@/components/CountUp'
import { leagueCache } from '@/lib/cache'
import { Suspense } from 'react'
import { connection } from 'next/server'
import PageSkeleton from '@/components/PageSkeleton'

export const metadata: Metadata = {
  title: 'Season 2 Recap · Summer Swing League 2026',
  description: 'Champions, awards and every player’s season in numbers.',
}

const AWARD_ICON: Record<string, LucideIcon> = {
  ironman: Dumbbell, round: Star, lowgross: Target, improved: TrendingDown, explorer: Compass, social: Users,
}
const PRIZES = [
  { Icon: Trophy, label: 'Champion', prize: 250 },
  { Icon: Medal, label: 'Runner-up', prize: 150 },
  { Icon: Award, label: 'Third', prize: 75 },
]


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
  return <SeasonRecapPage />
}

async function SeasonRecapPage() {
  'use cache'
  leagueCache() // refreshed on any league write + hourly

  const [standings, scores] = await Promise.all([
    getStandings(),
    prisma.score.findMany({
      select: {
        member_id: true, player_name: true, holes: true, gross_score: true, course_name: true,
        total_points: true, play_date: true, group_member_ids: true,
      },
    }),
  ])

  const recap = buildSeasonRecap(
    scores.map((s) => ({ ...s, total_points: Number(s.total_points ?? 0), play_date: s.play_date.toISOString().slice(0, 10) })),
    standings.map((p) => ({ id: p.id, name: displayName(p.name), handicapImprovement: p.handicapImprovement })),
  )
  const final = daysUntil(SEASON_END) < 0
  const podium = standings.filter((p) => p.totalRounds > 0).slice(0, 3)
  const rankOf = new Map(standings.map((p) => [p.id, p.rank]))

  return (
    <div className="space-y-10">
      {/* ── Hero ── */}
      <section className="hero text-white px-6 py-10 sm:px-12 sm:py-14">
        <div className="relative z-10 max-w-3xl">
          <p className="season-badge mb-4"><CalendarDays size={14} aria-hidden="true" /> Apr 15 – Oct 10, 2026</p>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-[1.05]">
            Season 2{final ? ', ' : ' '}<span className="text-brass-300">{final ? 'in the books.' : 'so far.'}</span>
          </h1>
          <p className="mt-3 text-green-100 text-lg max-w-xl">
            {final
              ? 'Every round, every stroke, every questionable drop — here’s how the summer played out.'
              : `The recap fills in live until the season closes on Oct 10. ${daysUntil(SEASON_END)} days to change the story.`}
          </p>
        </div>
        <dl className="relative z-10 mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
          {[
            ['Rounds', recap.totals.rounds],
            ['Holes', recap.totals.holes],
            ['Courses', recap.totals.courses],
            ['Strokes', recap.totals.strokes],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/10 border border-white/15 backdrop-blur px-4 py-3">
              <dd className="font-display text-3xl font-bold tabular-nums leading-none"><CountUp value={value as number} /></dd>
              <dt className="text-xs text-green-200 mt-1 font-medium">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Podium ── */}
      {podium.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{final ? 'The podium' : 'If it ended today'}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {podium.map((p, i) => {
              const { Icon, label, prize } = PRIZES[i]
              return (
                <div key={p.id} className={`rounded-2xl border p-5 flex items-center gap-4 ${i === 0 ? 'prize-champion text-white border-brass-600 shadow-lg' : 'bg-surface border-brass-200 shadow-sm'}`}>
                  <span className={`flex items-center justify-center w-12 h-12 rounded-full shrink-0 ${i === 0 ? 'bg-white/20' : 'bg-brass-50'}`}>
                    <Icon size={24} className={i === 0 ? 'text-white' : 'text-brass-600'} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${i === 0 ? 'text-white/80' : 'text-brass-600'}`}>{label} · ${prize}</p>
                    <p className={`font-display text-xl font-bold truncate ${i === 0 ? 'text-white' : 'text-gray-900'}`}>{displayName(p.name)}</p>
                    <p className={`text-sm tabular-nums ${i === 0 ? 'text-white/85' : 'text-gray-500'}`}>{p.seasonScore.toFixed(1)} pts · {p.totalRounds} rounds</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Awards ── */}
      {recap.awards.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Season awards</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recap.awards.map((a) => {
              const Icon = AWARD_ICON[a.key] ?? Star
              return (
                <div key={a.key} className="card p-5">
                  <div className="flex items-center gap-2 text-green-700">
                    <Icon size={18} aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-widest">{a.title}</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-gray-900 mt-2">{a.winner}</p>
                  <p className="text-sm font-semibold text-green-800 tabular-nums">{a.value}</p>
                  {a.detail && <p className="text-xs text-gray-500 mt-0.5">{a.detail}</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Everyone's season ── */}
      {recap.players.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Everyone&apos;s season</h2>
          <p className="text-sm text-gray-500 mb-4">Your summer, in numbers.</p>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recap.players.map((p) => (
              <Link
                key={p.id}
                href={`/analytics?tab=player&id=${p.id}`}
                className="card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-xl font-bold text-gray-900 truncate">{p.name}</p>
                  {rankOf.get(p.id) && <span className="text-xs font-bold text-brass-600 shrink-0">#{rankOf.get(p.id)}</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  {[['Rounds', p.rounds], ['Holes', p.holes], ['Courses', p.courses]].map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-green-50 py-2">
                      <div className="font-display text-xl font-bold text-green-800 tabular-nums leading-none">{v}</div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{l}</div>
                    </div>
                  ))}
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                  {p.bestRound && (
                    <li className="flex gap-2"><Star size={15} className="text-brass-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Best round <strong className="tabular-nums">{p.bestRound.points.toFixed(1)} pts</strong> <span className="text-gray-500">· {p.bestRound.course}, {shortDate(p.bestRound.date)}</span></span>
                    </li>
                  )}
                  {p.favoriteCourse && (
                    <li className="flex gap-2"><MapPin size={15} className="text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Home away from home: <strong>{p.favoriteCourse}</strong></span>
                    </li>
                  )}
                  {p.topPartner && (
                    <li className="flex gap-2"><Handshake size={15} className="text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Most rounds with <strong>{p.topPartner.name}</strong> <span className="text-gray-500">({p.topPartner.rounds})</span></span>
                    </li>
                  )}
                  {p.busiestMonth && (
                    <li className="flex gap-2"><Flag size={15} className="text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Busiest month: <strong>{p.busiestMonth}</strong></span>
                    </li>
                  )}
                </ul>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="text-center">
        <Link href="/standings" className="btn-primary">{final ? 'Final standings' : 'Live standings'}</Link>
      </div>
    </div>
  )
}
