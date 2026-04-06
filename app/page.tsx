'use client'

import Link from 'next/link'
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
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl shadow-lg p-8 text-white">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Summer Swing League 2026</h1>
        <p className="text-green-200 text-lg mb-6">
          April 15 – October 10 · Group play · Any course · Cash prizes
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/submit-score" className="px-5 py-2.5 bg-white text-green-800 rounded-lg font-semibold text-sm hover:bg-green-50 transition-colors">
            Submit a Round
          </Link>
          <Link href="/register" className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-500 transition-colors">
            Join the League
          </Link>
          <Link href="/standings" className="px-5 py-2.5 bg-green-800 text-white rounded-lg font-semibold text-sm hover:bg-green-700 border border-green-600 transition-colors">
            View Standings
          </Link>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-700">🏆</div>
          <div className="mt-2 font-semibold">1st Place</div>
          <div className="text-green-600 text-xl font-bold">$250</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-400">🥈</div>
          <div className="mt-2 font-semibold">2nd Place</div>
          <div className="text-gray-600 text-xl font-bold">$150</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold" style={{ color: '#cd7f32' }}>🥉</div>
          <div className="mt-2 font-semibold">3rd Place</div>
          <div className="text-xl font-bold" style={{ color: '#cd7f32' }}>$75</div>
        </div>
      </div>

      {/* Top 5 leaderboard preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Current Standings</h2>
          <Link href="/standings" className="text-green-700 text-sm font-medium hover:underline">
            Full standings →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : standings.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No scores yet — be the first to submit a round!</p>
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
                      i === 0 ? { background: '#ffd70030' }
                      : i === 1 ? { background: '#c0c0c030' }
                      : i === 2 ? { background: '#cd7f3230' }
                      : {}
                    }
                  >
                    <td className="font-semibold">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </td>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.currentHandicap}</td>
                    <td>{p.totalRounds}</td>
                    <td className="font-semibold text-green-700">{p.seasonScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-green-600 font-bold shrink-0">1.</span>
              <span><strong>Register</strong> to join the league (free).</span>
            </div>
            <div className="flex gap-3">
              <span className="text-green-600 font-bold shrink-0">2.</span>
              <span><strong>Play any course</strong> with at least one other registered member.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-green-600 font-bold shrink-0">3.</span>
              <span><strong>Submit your score</strong> with your current handicap — it updates automatically.</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-green-600 font-bold shrink-0">4.</span>
              <span><strong>Earn points</strong> based on net score, course difficulty, and group size.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-green-600 font-bold shrink-0">5.</span>
              <span><strong>Top 5 rounds</strong> count toward your season score.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-green-600 font-bold shrink-0">6.</span>
              <span><strong>Cash prizes</strong> paid out after October 10.</span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/rules" className="text-green-700 text-sm font-medium hover:underline">
            Read full rules →
          </Link>
        </div>
      </div>
    </div>
  )
}
