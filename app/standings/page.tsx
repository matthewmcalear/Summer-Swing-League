'use client'

import { useEffect, useState } from 'react'
import type { StandingEntry } from '@/types'

export default function Standings() {
  const [players, setPlayers] = useState<StandingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/standings')
      .then((r) => r.json())
      .then((d) => { setPlayers(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const medalFor = (i: number) =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`

  const rowBg = (i: number) =>
    i === 0 ? 'bg-yellow-50' : i === 1 ? 'bg-gray-50' : i === 2 ? 'bg-orange-50' : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">League Standings</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Season score = sum of best 5 rounds × participation multiplier + improvement bonus
        </p>
      </div>

      {/* Scoring explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card bg-green-50 border-green-200 text-sm text-green-800">
          <strong>Participation multiplier</strong><br />
          1 round = 20% · 2 = 40% · 3 = 60% · 4 = 80% · 5+ = 100%
          of your top-5 total.
        </div>
        <div className="card bg-blue-50 border-blue-200 text-sm text-blue-800">
          <strong>Improvement bonus ✨</strong><br />
          Every stroke your handicap drops from your first round earns
          +3 bonus points to your season score.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : players.length === 0 ? (
        <div className="card text-center text-gray-500 py-16">No scores submitted yet.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-green-50 text-xs font-semibold text-green-800 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left w-10">Rank</th>
                <th className="px-3 py-3 text-left">Player</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell">Hdcp</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell">Rnds</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Top Pts</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Improve ✨</th>
                <th className="px-3 py-3 text-left">Score</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Best Rounds</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className={`border-t border-gray-100 ${rowBg(i)}`}>
                  <td className="px-3 py-3 font-bold text-base">{medalFor(i)}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold">{p.name}</div>
                    {/* Mobile: show key stats under name */}
                    <div className="sm:hidden text-xs text-gray-400 mt-0.5 space-x-2">
                      <span>Hdcp {p.currentHandicap}</span>
                      <span>· {p.totalRounds} {p.totalRounds === 1 ? 'round' : 'rounds'}</span>
                      {p.handicapImprovement > 0 && (
                        <span className="text-blue-600 font-medium">· ✨ −{p.handicapImprovement}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell text-gray-600">{p.currentHandicap}</td>
                  <td className="px-3 py-3 hidden sm:table-cell text-gray-600">{p.totalRounds}</td>
                  <td className="px-3 py-3 hidden md:table-cell text-gray-600">{p.totalPoints.toFixed(1)}</td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    {p.handicapImprovement > 0 ? (
                      <span className="text-blue-700 font-semibold">
                        −{p.handicapImprovement} (+{p.improvementBonus.toFixed(1)} pts)
                      </span>
                    ) : p.startingHandicap == null ? (
                      <span className="text-gray-300 text-xs">no rounds yet</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-bold text-green-700 text-base">{p.seasonScore.toFixed(1)}</td>
                  <td className="px-3 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {p.topScores.map((s) => s.toFixed(1)).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
