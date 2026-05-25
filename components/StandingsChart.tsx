'use client'

import { useEffect, useState } from 'react'
import type { StandingEntry } from '@/types'

export default function StandingsChart() {
  const [players, setPlayers] = useState<StandingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/standings')
      .then((r) => r.json())
      .then((d: StandingEntry[]) => { setPlayers(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const active = players.filter((p) => p.totalRounds > 0)

  if (active.length === 0) return (
    <div className="text-center py-6 text-gray-400 text-sm">
      No scores yet — standings will appear here once rounds are submitted.
    </div>
  )

  const maxScore = active[0]?.seasonScore ?? 1

  return (
    <div className="space-y-1">
      {active.map((p, i) => {
        const pct    = Math.round((p.seasonScore / maxScore) * 100)
        const isGold = i === 0
        const isSilv = i === 1
        const isBron = i === 2

        const barColor = isGold ? '#f59e0b' : isSilv ? '#9ca3af' : isBron ? '#cd7f32' : '#16a34a'
        const rankBg   = isGold ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                       : isSilv ? 'bg-gray-100 text-gray-600 border-gray-200'
                       : isBron ? 'bg-orange-50 text-orange-700 border-orange-200'
                       :          'bg-gray-50 text-gray-500 border-gray-100'

        return (
          <div key={p.id} className="flex items-center gap-3 py-1.5 group">
            {/* Rank */}
            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${rankBg}`}>
              {i + 1}
            </div>

            {/* Name + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-semibold text-gray-800 truncate">
                  {p.name.split(' ')[0]}
                  {isGold && <span className="ml-1.5 text-xs">🥇</span>}
                  {isSilv && <span className="ml-1.5 text-xs">🥈</span>}
                  {isBron && <span className="ml-1.5 text-xs">🥉</span>}
                </span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-gray-400">{p.totalRounds}R</span>
                  <span className="text-sm font-bold text-gray-800 w-12 text-right">{p.seasonScore.toFixed(1)}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
