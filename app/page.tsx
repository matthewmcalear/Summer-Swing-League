'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import type { StandingEntry } from '@/types'

export default function Home() {
  const [standings, setStandings] = useState<StandingEntry[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/standings')
      .then((r) => r.json())
      .then((data) => { setStandings(data.slice(0, 5)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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

      {/* ── STANDINGS PREVIEW ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">📊</span> Current Standings
          </h2>
          <Link href="/standings" className="text-green-700 text-sm font-semibold hover:underline">
            Full standings →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : standings.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">🏌️</div>
            <p className="text-gray-500 font-medium">No scores yet — be the first to tee off!</p>
            <Link href="/submit-score" className="btn-primary mt-4 inline-flex">Submit First Round</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-base">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Handicap</th>
                  <th>Rounds</th>
                  <th>Season Score</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((p, i) => (
                  <tr
                    key={p.id}
                    style={
                      i === 0 ? { background: 'rgba(255,215,0,0.12)' }
                      : i === 1 ? { background: 'rgba(192,192,192,0.12)' }
                      : i === 2 ? { background: 'rgba(205,127,50,0.12)' }
                      : {}
                    }
                  >
                    <td className="font-bold text-base">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </td>
                    <td className="font-semibold">{p.name}</td>
                    <td className="text-gray-500">{p.currentHandicap}</td>
                    <td className="text-gray-500">{p.totalRounds}</td>
                    <td className="font-bold text-green-700 text-base">{p.seasonScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
