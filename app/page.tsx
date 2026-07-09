'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import BdayCountdown from '@/components/BdayCountdown'

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
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">Results Are In</span>
            <span className="text-xs text-amber-700 font-medium">July 3rd · Carling Lake</span>
          </div>
          <p className="font-bold text-gray-900">Dan's Annual Birthday Golf Tournament — Dan & Jackson take the title</p>
          <p className="text-sm text-gray-600 mt-0.5">70 net (77 gross − 7 hot-dog strokes) · 117 hot dogs eaten · 57 beers shotgunned · 8 mulligans fired</p>
        </div>
        {/* Podium pills */}
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          <span className="px-2 py-1 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-bold">🥇 Dan & Jackson · 70</span>
          <span className="px-2 py-1 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold">🥈 Doug & Tom · 80</span>
          <span className="px-2 py-1 rounded-lg bg-orange-100 border border-orange-300 text-orange-800 text-xs font-bold">🥉 Nick N & Peter · 81</span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
        >
          {open ? 'Hide recap' : 'View recap'}
        </button>
      </div>

      {/* Expanded recap — CSS grid-height transition for smooth open/close */}
      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden">
        <div className="border-t border-amber-200 px-5 py-5 space-y-5 bg-white/60">

          {/* New champions */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-gray-700">
            <p><strong>2026 Champions: Dan & Jackson</strong> — The birthday boy delivered. 14 pars, a 38 on the back nine, 21 hot dogs, 13 shotguns, and a five-mulligan barrage at Nick & Peter on the very first hole. Dethroned the defending champs by 10 clear shots.</p>
            <p className="mt-1 text-gray-500"><strong>Defending champs Doug & Tom</strong> went down swinging — 27 beers shotgunned (a tournament record that should probably worry us) and still shot the second-best round of the day.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hot Dog Award */}
            <div className="rounded-xl bg-white border border-amber-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2">🌭 Hot Dog Award — Tie</p>
              <p className="text-sm text-gray-700 leading-relaxed"><strong>Dan & Jackson</strong> and <strong>Nick N & Peter</strong>, 21 dogs apiece. The field combined for 117 — the Hot Dog Rule swung the podium: Nick & Peter's −7 discount lifted them past Matt & Uncle Lou into 3rd.</p>
            </div>

            {/* Mulligan war */}
            <div className="rounded-xl bg-white border border-amber-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2">💀 The Hole-1 Mulligan War</p>
              <p className="text-sm text-gray-700 leading-relaxed">All 8 reverse mulligans of the day were traded between Dan & Jackson and Nick N & Peter — on the first tee. Doug & Tom banked 27 mulligans and, terrifyingly, never fired a single one.</p>
            </div>
          </div>

          {/* SSL Points awarded */}
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">SSL Season Points Awarded</p>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <span className="text-yellow-700">🥇 Dan & Jackson — +5 pts each</span>
              <span className="text-gray-600">🥈 Doug & Tom — +3 pts each</span>
              <span className="text-orange-700">🥉 Nick N & Peter — +1 pt each</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Added directly to SSL season scores — check the standings.</p>
          </div>

          {/* CTA */}
          <div className="flex gap-2">
            <Link
              href="/dans-bday"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors"
            >
              🏅 Full Results & Awards
            </Link>
            <Link
              href="/standings"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm transition-colors"
            >
              📊 Season Standings
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default function Home() {

  return (
    <div className="space-y-8">

      {/* ── Dan's Birthday countdown ── */}
      <BdayCountdown />

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

          <div className="space-y-3">
            <div className="flex gap-3">
              <Link
                href="/submit-score"
                className="flex-1 text-center px-4 py-3 bg-white text-green-900 rounded-xl font-bold text-sm hover:bg-green-50 transition-all shadow-lg hover:shadow-xl"
              >
                ⛳ Submit a Round
              </Link>
              <Link
                href="/rangefinder"
                className="flex-1 text-center flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all shadow border border-white/20 hover:border-white/50"
                style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="7"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
                Rangefinder
              </Link>
            </div>
            <div className="flex gap-3">
              <Link
                href="/register"
                className="flex-1 text-center px-4 py-3 rounded-xl font-bold text-sm transition-all shadow border border-white/30 hover:border-white/60"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              >
                Join the League →
              </Link>
              <Link
                href="/standings"
                className="flex-1 text-center px-4 py-3 rounded-xl font-bold text-sm transition-all shadow border border-white/20 hover:border-white/50"
                style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
              >
                📊 Standings
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* ── TOURNAMENT BANNER ── */}
      <TournamentBanner />

      {/* ── PRIZE STRIP ── */}
      <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3">
        <span className="text-sm font-bold text-yellow-700">🥇 1st — $250</span>
        <span className="text-gray-200 select-none">|</span>
        <span className="text-sm font-bold text-gray-500">🥈 2nd — $150</span>
        <span className="text-gray-200 select-none">|</span>
        <span className="text-sm font-bold" style={{ color: '#92400e' }}>🥉 3rd — $75</span>
        <span className="ml-auto text-xs text-gray-400 font-medium">$475 prize pool · Oct 10</span>
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
          <div className="relative sm:w-64 shrink-0 min-h-[360px] sm:min-h-[260px]">
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
          { href: '/rangefinder',  icon: '📡', label: 'Rangefinder'  },
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
