import Link from 'next/link'
import Image from 'next/image'
import { Sprout, CalendarDays, Trophy, Medal, Award, ListChecks } from 'lucide-react'
import SeasonStats from '@/components/SeasonStats'
import StandingsChart from '@/components/StandingsChart'
import { getStandings } from '@/lib/standings'

export const dynamic = 'force-dynamic'

const HOW_IT_WORKS: [string, string][] = [
  ['Register', 'Join the league for free. No signup fees.'],
  ['Book a round', 'Play any course with at least one other league member.'],
  ['Submit your score', 'Enter your gross score and current handicap — it updates your profile.'],
  ['Earn points', 'Points come from your net score, course difficulty, and group size.'],
  ['Top 5 count', 'Your season score is your top 5 rounds (×participation multiplier) plus improvement and tournament bonuses.'],
  ['Win cash', 'The top three players split $475 after October 10.'],
]

export default async function Home() {
  const standings = await getStandings()

  return (
    <div className="space-y-8">

      {/* ── HERO with Carling Lake background ── */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ minHeight: '420px' }}>
        <Image
          src="/IMG_1002.jpeg"
          alt="Carling Lake Golf Course"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(10,40,15,0.82) 0%, rgba(15,60,25,0.65) 60%, rgba(0,0,0,0.3) 100%)'
        }} />

        <div className="relative z-10 p-8 sm:p-12 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12" style={{ minHeight: '420px' }}>
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="season-badge"><Sprout size={14} strokeWidth={2} aria-hidden="true" /> Season 2 · 2026</span>
              <span className="season-badge"><CalendarDays size={14} strokeWidth={2} aria-hidden="true" /> Apr 15 – Oct 10</span>
              <span className="season-badge"><Trophy size={14} strokeWidth={2} aria-hidden="true" /> $475 in prizes</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-3 drop-shadow-lg">
              Summer Swing<br />
              <span style={{ color: '#86efac' }}>League</span>{' '}
              <span className="text-white/70">2026</span>
            </h1>

            <p className="text-green-100 text-lg sm:text-xl max-w-xl leading-relaxed drop-shadow">
              Competitive group golf all summer long. Any course. Any skill level.
              Play more, earn more, win cash.
            </p>
          </div>

          {/* One primary action for a new visitor; standings for everyone else. */}
          <div className="space-y-3 w-full lg:w-64 shrink-0">
            <Link
              href="/register"
              className="block text-center px-5 py-3.5 bg-white text-green-900 rounded-xl font-bold hover:bg-green-50 transition-all shadow-lg hover:shadow-xl"
            >
              Join the league
            </Link>
            <Link
              href="/standings"
              className="block text-center px-5 py-3.5 rounded-xl font-bold text-sm transition-all shadow border border-white/25 hover:border-white/60"
              style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
            >
              See the standings
            </Link>
          </div>
        </div>
      </div>

      {/* ── PRIZE PODIUM ── */}
      <div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 items-stretch">
          {[
            { place: '1st', amount: 250, label: 'Champion',   Icon: Trophy },
            { place: '2nd', amount: 150, label: 'Runner-up',  Icon: Medal },
            { place: '3rd', amount: 75,  label: 'Third',      Icon: Award },
          ].map(({ place, amount, label, Icon }, i) => {
            const first = i === 0
            return (
              <div
                key={place}
                className={`relative flex flex-col items-center text-center rounded-2xl border px-2 py-4 sm:py-5 shadow-sm ${
                  first
                    ? 'prize-champion text-white border-brass-600 shadow-md sm:-translate-y-1'
                    : 'bg-brass-50 border-brass-200 text-brass-700'
                }`}
              >
                <Icon
                  size={first ? 26 : 22}
                  strokeWidth={2}
                  aria-hidden="true"
                  className={first ? 'text-white' : 'text-brass-600'}
                />
                <span className={`mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest ${first ? 'text-white/80' : 'text-brass-600/80'}`}>
                  {place}
                </span>
                <span className="font-display text-2xl sm:text-4xl font-extrabold leading-none mt-0.5 tabular-nums">
                  ${amount}
                </span>
                <span className={`mt-1 text-[11px] sm:text-xs font-medium ${first ? 'text-white/85' : 'text-brass-600'}`}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-center text-xs text-gray-400 font-medium">$475 prize pool · decided Oct 10</p>
      </div>

      {/* ── LIVE SEASON SIGNAL ── */}
      <SeasonStats standings={standings} />

      {/* ── HOW IT WORKS ── */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
          <ListChecks size={22} strokeWidth={2} aria-hidden="true" className="text-green-700" /> How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
          {HOW_IT_WORKS.map(([title, desc], i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors">
              <span className="step-num">{i + 1}</span>
              <span><strong>{title}</strong> — {desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link href="/rules" className="text-green-700 text-sm font-semibold hover:underline">
            Read the full rules →
          </Link>
        </div>
      </div>

      {/* ── LIVE STANDINGS (top five) ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy size={22} strokeWidth={2} aria-hidden="true" className="text-brass-600" /> Current standings
          </h2>
          <Link href="/standings" className="text-green-700 text-sm font-semibold hover:underline">
            Full standings →
          </Link>
        </div>
        <StandingsChart standings={standings} />
      </div>

      {/* ── TOM'S MUD MOMENT — the payoff at the bottom. Do not sanitize. ── */}
      <div className="card overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="relative sm:w-64 shrink-0 min-h-[360px] sm:min-h-[260px]">
            <Image
              src="/IMG_4202.jpeg"
              alt="Tom McAlear after his famous lake incident"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
            />
          </div>
          <div className="p-6 flex flex-col justify-center">
            <div className="text-2xl mb-2">💀</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">The Incident — 2025</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              On hole 9 — lucky it was the last one — Tom McAlear stepped onto what he was
              confident were leaves. They were not leaves. They were water.
              He kept his shoes, which is more than can be said for his dignity.
              He drove home in a <strong>garbage bag</strong>.
            </p>
            <p className="text-xs text-gray-400 italic">
              📸 Tom McAlear · Season 1 · 2025 — a moment that will not be forgotten
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
