'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import EventBanner from '@/components/EventBanner'

const StandingsChart = dynamic(() => import('@/components/StandingsChart'), { ssr: false })

export default function Home() {

  return (
    <div className="space-y-8">

      {/* ── Next league event: Mt. Orford ── */}
      <EventBanner />

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

        {/* Content — text left, action buttons right on desktop */}
        <div className="relative z-10 p-8 sm:p-12 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12" style={{ minHeight: '420px' }}>
          <div className="max-w-2xl">
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

          <p className="text-green-100 text-lg sm:text-xl max-w-xl leading-relaxed drop-shadow">
            Competitive group golf all summer long. Any course. Any skill level.
            Play more, earn more, win cash.
          </p>
          </div>

          <div className="space-y-3 w-full lg:w-96 shrink-0">
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
