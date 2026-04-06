'use client'

import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js'
import type { StandingEntry } from '@/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const PODIUM_COLORS = ['#f59e0b', '#9ca3af', '#cd7f32']  // gold, silver, bronze
const PODIUM_HEIGHTS = ['h-28', 'h-20', 'h-14']          // visual podium heights
const PODIUM_LABELS  = ['1st', '2nd', '3rd']

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
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const active = players.filter((p) => p.totalRounds > 0)

  if (active.length === 0) return (
    <div className="text-center py-8 text-gray-400 text-sm">
      No scores yet — standings will appear here once rounds are submitted.
    </div>
  )

  const top3    = active.slice(0, 3)
  // Reorder for podium display: 2nd | 1st | 3rd
  const podium  = [top3[1], top3[0], top3[2]].filter(Boolean)
  const podiumOrder = top3.length === 1 ? [top3[0]] : top3.length === 2 ? [top3[1], top3[0]] : podium
  const podiumColorIdx = top3.length === 1 ? [0] : top3.length === 2 ? [1, 0] : [1, 0, 2]

  // Bar chart data for all players
  const barData = {
    labels:   active.map((p) => p.name.split(' ')[0]),
    datasets: [
      {
        label:           'Season Score',
        data:            active.map((p) => p.seasonScore),
        backgroundColor: active.map((_, i) =>
          i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : '#16a34a'
        ),
        borderRadius:    6,
        borderSkipped:   false as const,
      },
    ],
  }

  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const p = active[ctx.dataIndex]
            return [
              ` Score: ${ctx.parsed.x.toFixed(1)}`,
              ` Rounds: ${p.totalRounds}`,
              ` Handicap: ${p.currentHandicap}`,
              ...(p.improvementBonus > 0 ? [` Improvement bonus: +${p.improvementBonus.toFixed(1)}`] : []),
            ]
          },
        },
      },
    },
    scales: {
      x: { beginAtZero: true, grid: { color: '#f0fdf4' } },
      y: { grid: { display: false } },
    },
  }

  return (
    <div className="space-y-6">

      {/* ── PODIUM ── */}
      {top3.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Top of the Leaderboard
          </h3>
          <div className="flex items-end justify-center gap-3">
            {podiumOrder.map((p, idx) => {
              const rank      = active.indexOf(p)
              const colorIdx  = podiumColorIdx[idx]
              const heights   = ['h-20', 'h-28', 'h-14']  // 2nd | 1st | 3rd visual heights
              const barH      = top3.length === 1 ? 'h-28' : top3.length === 2 ? heights[idx] : heights[idx]

              return (
                <div key={p.id} className="flex flex-col items-center gap-1" style={{ minWidth: '90px' }}>
                  {/* Score bubble */}
                  <div
                    className="text-white text-sm font-bold px-3 py-1 rounded-full shadow"
                    style={{ background: PODIUM_COLORS[colorIdx] }}
                  >
                    {p.seasonScore.toFixed(1)}
                  </div>

                  {/* Name */}
                  <div className="text-xs font-semibold text-gray-700 text-center leading-tight">
                    {p.name.split(' ')[0]}
                  </div>

                  {/* Podium block */}
                  <div
                    className={`w-20 ${barH} rounded-t-lg flex items-start justify-center pt-2 shadow-md`}
                    style={{ background: PODIUM_COLORS[colorIdx] + (colorIdx === 0 ? '' : '99') }}
                  >
                    <span className="text-white font-black text-xl drop-shadow">
                      {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'}
                    </span>
                  </div>

                  {/* Place label */}
                  <div className="text-xs text-gray-500 font-medium">{PODIUM_LABELS[rank]}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── HORIZONTAL BAR CHART (all players) ── */}
      {active.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
            Full Standings
          </h3>
          <Bar
            data={barData}
            options={barOptions}
            height={Math.max(active.length * 36, 120)}
          />
        </div>
      )}

    </div>
  )
}
