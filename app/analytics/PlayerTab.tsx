'use client'

import { useState } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  scaleBase, donutOpts, lineOptsNoLegend, barOptsAutoScale,
  barFloor, consistencyLabel, playerColor,
} from './chartConfig'
import type { Analytics } from './types'

export default function PlayerTab({ data, initialPlayerId }: { data: Analytics; initialPlayerId?: string }) {
  const withScores = data.playerTimelines.filter((p) => p.scores.length > 0)
  // Honor initialPlayerId even if that player has 0 rounds, otherwise default to first with scores
  const defaultId  = (initialPlayerId && data.playerTimelines.find((p) => p.id === initialPlayerId))
    ? initialPlayerId
    : withScores[0]?.id ?? data.playerTimelines[0]?.id ?? ''
  const [selectedId, setSelectedId] = useState(defaultId)

  const player = data.playerTimelines.find((p) => p.id === selectedId)
  if (!player) return (
    <div className="card text-center py-16 text-gray-500">Player not found.</div>
  )
  
  // Handle players with 0 rounds gracefully
  const hasRounds = player.scores.length > 0

  const color    = playerColor(data.playerTimelines, player.id)
  const sorted   = hasRounds ? [...player.scores].sort((a, b) => a.date.localeCompare(b.date)) : []
  const bestPts  = hasRounds ? Math.max(...player.scores.map((s) => s.totalPoints)) : 0
  const worstPts = hasRounds ? Math.min(...player.scores.map((s) => s.totalPoints)) : 0
  const hdcpChange  = player.startingHandicap != null ? player.startingHandicap - player.currentHandicap : null
  const consistency = hasRounds ? consistencyLabel(player.stdDev) : { label: '—', cls: 'text-gray-400' }

  const dateLabel = (d: string) =>
    new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const ptValues     = sorted.map((s) => s.totalPoints)
  const pointsBarData = {
    labels: sorted.map((s) => dateLabel(s.date)),
    datasets: [{ label: 'Points', data: ptValues, backgroundColor: color }],
  }
  const pointsBarOpts = { ...barOptsAutoScale, scales: { x: scaleBase, y: { ...scaleBase, min: barFloor(ptValues) } } }

  const netScores = sorted.map((s) => {
    const net = s.holes === 9 ? s.gross - s.handicap / 2 : s.gross - s.handicap
    return Math.round((s.holes === 9 ? net * 2 : net) * 10) / 10
  })
  const netTrendData = {
    labels: sorted.map((s) => `${dateLabel(s.date)} (${s.holes}H)`),
    datasets: [{ label: 'Net Score (18H equiv)', data: netScores, borderColor: color, fill: true }],
  }

  const totalComp = player.pointsBreakdown.base + player.pointsBreakdown.groupBonus + player.pointsBreakdown.commBonus
  const compositionData = totalComp > 0 ? {
    labels: ['Base Points', 'Group Bonus', 'Commissioner Bonus'],
    datasets: [{
      data: [player.pointsBreakdown.base, player.pointsBreakdown.groupBonus, player.pointsBreakdown.commBonus],
      backgroundColor: ['#15803d', '#7c3aed', '#d97706'], borderWidth: 0,
    }],
  } : null

  return (
    <div className="space-y-6">
      <div className="card">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Player</label>
        <select className="form-input max-w-xs" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {data.playerTimelines.map((p) => <option key={p.id} value={p.id}>{p.name}{p.scores.length === 0 ? ' (no rounds)' : ''}</option>)}
        </select>
      </div>
      
      {!hasRounds && (
        <div className="card text-center py-12 text-gray-500">
          <div className="text-5xl mb-3">📊</div>
          <p className="font-medium">{player.name} hasn&apos;t played any rounds yet.</p>
          {player.seasonScore > 0 && (
            <p className="text-sm mt-2">Season Score: <span className="font-bold text-green-700">{player.seasonScore.toFixed(1)}</span> (bonus points only)</p>
          )}
        </div>
      )}

      <div className="card py-4 flex flex-wrap items-center gap-4" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
        <div className="text-center min-w-[80px]">
          <div className="text-3xl font-extrabold" style={{ color }}>{player.seasonScore.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Season Score</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700">{player.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Top rounds: {player.topScores.map((s) => s.toFixed(1)).join(' · ') || '—'}
          </p>
        </div>
      </div>

      {hasRounds && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Rounds',      value: player.scores.length,  cls: 'text-green-700' },
            { label: 'Avg Points',  value: player.avgPoints,       cls: 'text-green-700' },
            { label: 'Best Round',  value: bestPts.toFixed(1),     cls: 'text-green-700' },
            { label: 'Worst Round', value: worstPts.toFixed(1),    cls: 'text-red-500'   },
            { label: 'Consistency', value: consistency.label,      cls: consistency.cls  },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card text-center py-4">
              <div className={`text-xl font-bold ${cls}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {hasRounds && hdcpChange !== null && (
        <div className={`card flex items-center gap-3 py-3 ${hdcpChange > 0 ? 'bg-green-50 border-green-200' : hdcpChange < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
          <span className="text-2xl">{hdcpChange > 0 ? '📉' : hdcpChange < 0 ? '📈' : '➡️'}</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Handicap: {player.startingHandicap} → {player.currentHandicap}
              {hdcpChange !== 0 && (
                <span className={`ml-2 ${hdcpChange > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  ({hdcpChange > 0 ? '↓' : '↑'}{Math.abs(hdcpChange).toFixed(1)} strokes {hdcpChange > 0 ? 'improved' : 'increased'})
                </span>
              )}
            </p>
            {hdcpChange > 0 && (
              <p className="text-xs text-green-600">+{(hdcpChange * 3).toFixed(1)} improvement bonus points earned</p>
            )}
          </div>
        </div>
      )}

      {hasRounds && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4">📊 Points Per Round</h2>
          <div className="h-60 sm:h-72">
            <Bar data={pointsBarData} options={{ ...pointsBarOpts, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-1">📉 Net Score Trend</h2>
          <p className="text-xs text-gray-400 mb-3">Normalized to 18H equivalent · 9H rounds doubled · lower is better</p>
          <div className="h-60 sm:h-72">
            <Line data={netTrendData} options={{ ...lineOptsNoLegend, maintainAspectRatio: false }} />
          </div>
        </div>

        {compositionData && (
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-4">🥧 Points Composition</h2>
            <Doughnut data={compositionData} options={donutOpts} />
          </div>
        )}

        {player.courseStats.length > 0 && (
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-4">🗺️ Performance by Course</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-green-800 uppercase tracking-wider text-left border-b border-gray-100">
                    <th className="pb-2">Course</th>
                    <th className="pb-2 text-right">Rounds</th>
                    <th className="pb-2 text-right">Avg Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {player.courseStats.map((c, i) => (
                    <tr key={c.name} className="hover:bg-gray-50">
                      <td className="py-2">
                        <div className="flex items-center gap-1.5">
                          {i === 0 && <span className="text-yellow-500 text-xs shrink-0">★</span>}
                          {i === player.courseStats.length - 1 && player.courseStats.length > 1 && (
                            <span className="text-gray-300 text-xs shrink-0">★</span>
                          )}
                          {i !== 0 && !(i === player.courseStats.length - 1 && player.courseStats.length > 1) && (
                            <span className="w-3 shrink-0" />
                          )}
                          <span className="truncate">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right text-gray-500">{c.count}</td>
                      <td className="py-2 text-right font-semibold text-green-700">{c.avgPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2">★ = best · ★ = worst average</p>
            </div>
          </div>
        )}
      </div>

      {hasRounds && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">📋 All Rounds</h2>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-green-50 text-xs font-semibold text-green-800 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Course</th>
                <th className="px-4 py-3 text-center">Holes</th>
                <th className="px-4 py-3 text-center">Gross</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">Net</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">Diff</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...sorted].reverse().map((s, i) => {
                const net    = s.holes === 9 ? (s.gross - s.handicap / 2).toFixed(1) : (s.gross - s.handicap).toFixed(0)
                const isBest = s.totalPoints === bestPts
                return (
                  <tr key={i} className={`hover:bg-gray-50 transition-colors ${isBest ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {dateLabel(s.date)}{isBest && <span className="ml-1 text-yellow-500 text-xs">★</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[140px]"><span className="truncate block">{s.course}</span></td>
                    <td className="px-4 py-3 text-center text-gray-500">{s.holes}H</td>
                    <td className="px-4 py-3 text-center text-gray-700">{s.gross}</td>
                    <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{net}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.difficulty === 'tough' ? 'bg-red-50 text-red-600' :
                        s.difficulty === 'easy'  ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>{s.difficulty}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{s.totalPoints.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  )
}
