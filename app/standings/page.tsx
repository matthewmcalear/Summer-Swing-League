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
          Season score = sum of best 5 rounds × participation multiplier
        </p>
      </div>

      {/* Multiplier note */}
      <div className="card bg-green-50 border-green-200 text-sm text-green-800">
        <strong>Participation multiplier:</strong> 1 round = 20% · 2 = 40% · 3 = 60% · 4 = 80% · 5+ = 100%
        of your top-5 total. Play more to unlock your full potential!
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : players.length === 0 ? (
        <div className="card text-center text-gray-500 py-16">No scores submitted yet.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-left">Handicap</th>
                <th className="px-4 py-3 text-left">Rounds</th>
                <th className="px-4 py-3 text-left">Top Points</th>
                <th className="px-4 py-3 text-left">Season Score</th>
                <th className="px-4 py-3 text-left">Best Rounds</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className={`border-t border-gray-100 ${rowBg(i)}`}>
                  <td className="px-4 py-3 font-bold text-base">{medalFor(i)}</td>
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3">{p.currentHandicap}</td>
                  <td className="px-4 py-3">{p.totalRounds}</td>
                  <td className="px-4 py-3">{p.totalPoints.toFixed(1)}</td>
                  <td className="px-4 py-3 font-bold text-green-700 text-base">
                    {p.seasonScore.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
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
