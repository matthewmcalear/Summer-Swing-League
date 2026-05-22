'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useState } from 'react'

const StandingsChart = dynamic(() => import('@/components/StandingsChart'), { ssr: false })

function TournamentBanner() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 overflow-hidden shadow-sm">
      {/* Summary row — always visible */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="text-3xl shrink-0">🏆</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">Special Event</span>
            <span className="text-xs text-amber-700 font-medium">July 1st Weekend · Carling Lake</span>
          </div>
          <p className="font-bold text-gray-900">Dan's Annual Birthday Golf Tournament</p>
          <p className="text-sm text-gray-600 mt-0.5">Two-man scramble · Hot Dog Rule · Shotgun Mulligans · SSL season points on the line</p>
        </div>
        {/* Points pills */}
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          <span className="px-2 py-1 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-bold">🥇 +5 pts</span>
          <span className="px-2 py-1 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold">🥈 +3 pts</span>
          <span className="px-2 py-1 rounded-lg bg-orange-100 border border-orange-300 text-orange-800 text-xs font-bold">🥉 +1 pt</span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
        >
          {open ? 'Hide details' : 'View details'}
        </button>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-amber-200 px-5 py-5 space-y-5 bg-white/60">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Format */}
            <div className="rounded-xl bg-white border border-amber-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2">Format — Two-Man Scramble</p>
              <p className="text-sm text-gray-700 leading-relaxed">Both players tee off, both hit the approach, both putt. On every shot, you play from whichever ball is in the better spot.</p>
            </div>

            {/* Hot Dog Rule */}
            <div className="rounded-xl bg-white border border-amber-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2">🌭 The Hot Dog Rule</p>
              <p className="text-sm text-gray-700 leading-relaxed">Every 3 hot dogs you eat during the round knocks a stroke off your team's score. No cap. A well-timed dog at the turn has won this thing before.</p>
            </div>

            {/* Shotgun Rule */}
            <div className="rounded-xl bg-white border border-amber-100 p-4 sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2">🍺 The Shotgun Rule — Reverse Mulligans</p>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">Every beer you shotgun earns one Reverse Mulligan. A shotgun is: puncture the side of the can, chug it all, nothing left behind. Spill and it doesn't count.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                {[
                  ['On yourself', 'Replay your shot.'],
                  ['On your partner', 'Replay theirs.'],
                  ['On an opponent in your group', 'Their shot is erased — hit again.'],
                  ['On an opponent in another foursome', 'Yes, you can reach across the course to take down the leaders.'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-2">
                    <span className="text-amber-500 font-bold shrink-0">→</span>
                    <span><strong>{title}</strong> — {desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 italic mt-3">Example: Dan aces a par 3. Doug calls "Reverse Mulligan," shotguns a beer on the spot, and Dan's ace never happened. He re-tees with nothing. No glory, no hype, no love.</p>
            </div>
          </div>

          {/* Defending champs */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-gray-700">
            <p><strong>Defending Champions: Tom & Doug</strong> — Took the title last year by laying on their stomachs to read greens, reversing any missed putts, and putting away dogs between holes. They're the team to chase.</p>
            <p className="mt-1 text-gray-500"><strong>Honorable Mention: Jackson & Karo</strong> — Ate more hot dogs than anyone in tournament history and still didn't win. They're the reason we now treat hot-dogs-per-stroke as a real number.</p>
          </div>

          {/* SSL Points */}
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">SSL Season Points</p>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <span className="text-yellow-700">🥇 1st place — +5 pts</span>
              <span className="text-gray-600">🥈 2nd place — +3 pts</span>
              <span className="text-orange-700">🥉 3rd place — +1 pt</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Points added directly to your SSL season score after the tournament.</p>
          </div>

          {/* CTA */}
          <a
            href="https://docs.google.com/spreadsheets/d/1XSkvBXlmCx8LdRaOPoWmqw_FXTNYXT0c/edit?gid=1357249633#gid=1357249633"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors"
          >
            📋 Sign up — Golf &amp; Staying Over
          </a>
        </div>
      )}
    </div>
  )
}

export default function Home() {

  return (
    <div className="space-y-8">

      {/* ── HERO with Carling Lake background ── */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ minHeight: '420px' }}>
        {/* Background photo */}
        <Image
          src="/IMG_1002.jpeg"
          alt="Carling Lake Golf Course"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
        />
        {/* Dark green overlay for readability */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(10,40,15,0.82) 0%, rgba(15,60,25,0.65) 60%, rgba(0,0,0,0.3) 100%)'
        }} />

        {/* Content */}
        <div className="relative z-10 p-8 sm:p-12 text-white max-w-3xl">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="season-badge">🌿 Season 2 · 2026</span>
            <span className="season-badge">📅 Apr 15 – Oct 10</span>
            <span className="season-badge">💰 $475 in prizes</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-3 drop-shadow-lg">
            Summer Swing<br />
            <span style={{ color: '#86efac' }}>League</span>{' '}
            <span className="text-white/70">2026</span>
          </h1>

          <p className="text-green-100 text-lg sm:text-xl mb-8 max-w-xl leading-relaxed drop-shadow">
            Competitive group golf all summer long. Any course. Any skill level.
            Play more, earn more, win cash.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/submit-score"
              className="px-6 py-3 bg-white text-green-900 rounded-xl font-bold text-sm hover:bg-green-50 transition-all shadow-lg hover:shadow-xl"
            >
              ⛳ Submit a Round
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all shadow border border-white/30 hover:border-white/60"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              Join the League →
            </Link>
            <Link
              href="/standings"
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all shadow border border-white/20 hover:border-white/50"
              style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
            >
              📊 Standings
            </Link>
          </div>

        </div>

        {/* Photo credit — pinned to bottom-right of the hero container */}
        <p className="absolute bottom-3 right-4 z-10 text-white/40 text-xs italic">
          Carling Lake Golf Club · 2025
        </p>
      </div>

      {/* ── TOURNAMENT BANNER ── */}
      <TournamentBanner />

      {/* ── PRIZE CARDS ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="prize-gold card-hover border-2 text-center py-3 px-2">
          <div className="text-2xl">🥇</div>
          <div className="text-xs text-yellow-700 font-semibold mt-1">1st Place</div>
          <div className="text-xl font-extrabold text-yellow-800">$250</div>
        </div>
        <div className="prize-silver card-hover border-2 text-center py-3 px-2">
          <div className="text-2xl">🥈</div>
          <div className="text-xs text-gray-600 font-semibold mt-1">2nd Place</div>
          <div className="text-xl font-extrabold text-gray-700">$150</div>
        </div>
        <div className="prize-bronze card-hover border-2 text-center py-3 px-2">
          <div className="text-2xl">🥉</div>
          <div className="text-xs font-semibold mt-1" style={{ color: '#92400e' }}>3rd Place</div>
          <div className="text-xl font-extrabold" style={{ color: '#92400e' }}>$75</div>
        </div>
      </div>

      {/* ── STANDINGS VISUAL ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">📊</span> Current Standings
          </h2>
          <Link href="/standings" className="text-green-700 text-sm font-semibold hover:underline">
            Full standings →
          </Link>
        </div>
        <StandingsChart />
      </div>

      {/* ── TOM'S MUD MOMENT ── */}
      <div className="card overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Photo */}
          <div className="relative sm:w-64 shrink-0" style={{ minHeight: '260px' }}>
            <Image
              src="/IMG_4202.jpeg"
              alt="Tom McAlear after his famous lake incident"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
            />
          </div>
          {/* Text */}
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

      {/* ── HOW IT WORKS ── */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
          <span className="text-2xl">📋</span> How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
          {[
            ['Register', 'Join the league for free. No signup fees.'],
            ['Book a round', 'Play any course with at least one other league member.'],
            ['Submit your score', 'Enter your gross score and current handicap — it auto-updates your profile.'],
            ['Earn points', 'Points based on net score, course difficulty, and group size.'],
            ['Top 5 count', 'Your best 5 rounds determine your season score.'],
            ['Win cash', 'Top 3 players split $475 after October 10.'],
          ].map(([title, desc], i) => (
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

      {/* ── QUICK LINKS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/submit-score', icon: '⛳', label: 'Submit Score' },
          { href: '/standings',    icon: '📊', label: 'Standings'    },
          { href: '/scores',       icon: '📋', label: 'All Scores'   },
          { href: '/members',      icon: '👥', label: 'Members'      },
        ].map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className="card-hover flex flex-col items-center gap-2 py-5 text-center hover:border-green-300 transition-colors"
          >
            <span className="text-3xl">{icon}</span>
            <span className="text-sm font-semibold text-gray-700">{label}</span>
          </Link>
        ))}
      </div>

    </div>
  )
}
