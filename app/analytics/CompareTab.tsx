'use client'

import { useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import { lineOpts, barOpts, consistencyLabel, playerColor } from './chartConfig'
import type { Analytics } from './types'

export default function CompareTab({ data }: { data: Analytics }) {
  const withScores = data.playerTimelines.filter((p) => p.scores.length > 0)
  const [id1, setId1] = useState(withScores[0]?.id ?? '')
  const [id2, setId2] = useState(withScores[1]?.id ?? '')

  const p1 = data.playerTimelines.find((p) => p.id === id1)
  const p2 = data.playerTimelines.find((p) => p.id === id2)

  if (!p1 || !p2 || withScores.length < 2) return (
    <div className="card text-center py-16 text-gray-500">Need at least 2 players with rounds to compare.</div>
  )

  const c1 = playerColor(data.playerTimelines, p1.id)
  const c2 = playerColor(data.playerTimelines, p2.id)
  const samePlayer = id1 === id2

  const allDates = Array.from(new Set(
    [p1, p2].flatMap((p) => p.scores.map((s) => s.date.slice(0, 10)))
  )).sort()

  const cumulativeData = {
    labels: allDates,
    datasets: [p1, p2].map((p, i) => {
      const sorted    = [...p.scores].sort((a, b) => a.date.localeCompare(b.date))
      const firstDate = sorted[0]?.date.slice(0, 10)
      const c         = i === 0 ? c1 : c2
      return {
        label: p.name.split(' ')[0],
        data: allDates.map((d) => {
          if (!firstDate || d < firstDate) return null
          const upTo = sorted.filter((s) => s.date.slice(0, 10) <= d)
          if (upTo.length === 0) return null
          const pts  = upTo.map((s) => s.totalPoints)
          const top5 = [...pts].sort((a, b) => b - a).slice(0, 5)
          const total = top5.reduce((s, v) => s + v, 0)
          const multipliers: Record<number, number> = { 1: 0.2, 2: 0.4, 3: 0.6, 4: 0.8 }
          const multiplier = top5.length < 5 ? (multipliers[top5.length] ?? 0) : 1.0
          const latestHcap = upTo[upTo.length - 1].handicap
          const improvement = p.startingHandicap != null ? Math.max(0, p.startingHandicap - latestHcap) : 0
          return Math.round((total * multiplier + improvement * 3) * 10) / 10
        }),
        borderColor: c, fill: true, spanGaps: false,
      }
    }),
  }

  // Shared rounds: same date + same course
  const sharedRounds = p1.scores
    .flatMap((s1) => {
      const d1 = s1.date.slice(0, 10)
      return p2.scores
        .filter((s2) => s2.date.slice(0, 10) === d1 && s2.course === s1.course)
        .map((s2) => ({ date: d1, course: s1.course, s1, s2 }))
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const h2hWins1 = sharedRounds.filter((r) => r.s1.totalPoints > r.s2.totalPoints).length
  const h2hWins2 = sharedRounds.filter((r) => r.s2.totalPoints > r.s1.totalPoints).length
  const h2hTies  = sharedRounds.filter((r) => r.s1.totalPoints === r.s2.totalPoints).length

  const h2hBarData = {
    labels: sharedRounds.map((r) =>
      new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      { label: p1.name.split(' ')[0], data: sharedRounds.map((r) => r.s1.totalPoints), backgroundColor: c1 + 'cc' },
      { label: p2.name.split(' ')[0], data: sharedRounds.map((r) => r.s2.totalPoints), backgroundColor: c2 + 'cc' },
    ],
  }

  const best1 = p1.scores.length ? Math.max(...p1.scores.map((s) => s.totalPoints)) : 0
  const best2 = p2.scores.length ? Math.max(...p2.scores.map((s) => s.totalPoints)) : 0
  const hd1 = p1.startingHandicap != null ? p1.startingHandicap - p1.currentHandicap : null
  const hd2 = p2.startingHandicap != null ? p2.startingHandicap - p2.currentHandicap : null
  const con1 = consistencyLabel(p1.stdDev)
  const con2 = consistencyLabel(p2.stdDev)

  const hdcpDisplay = (v: number | null) =>
    v == null ? '—' : v > 0 ? `↓${v.toFixed(1)}` : v < 0 ? `↑${Math.abs(v).toFixed(1)}` : '—'

  const rows: { label: string; v1: string | number; v2: string | number; higher: boolean; n1?: number; n2?: number }[] = [
    { label: 'Season Score',           v1: p1.seasonScore,     v2: p2.seasonScore,     higher: true  },
    { label: 'Rounds Played',          v1: p1.scores.length,   v2: p2.scores.length,   higher: true  },
    { label: 'Avg Points',             v1: p1.avgPoints,       v2: p2.avgPoints,        higher: true  },
    { label: 'Best Round',             v1: best1.toFixed(1),   v2: best2.toFixed(1),   higher: true,  n1: best1, n2: best2 },
    { label: 'Std Dev (lower better)', v1: p1.stdDev,          v2: p2.stdDev,           higher: false },
    { label: 'Current Handicap',       v1: p1.currentHandicap, v2: p2.currentHandicap, higher: false },
    { label: 'Hdcp Improvement',       v1: hdcpDisplay(hd1),   v2: hdcpDisplay(hd2),   higher: true,  n1: hd1 ?? -999, n2: hd2 ?? -999 },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="card" style={{ borderTopColor: c1, borderTopWidth: 3 }}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Player 1</label>
          <select className="form-input" value={id1} onChange={(e) => setId1(e.target.value)}>
            {withScores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="card" style={{ borderTopColor: c2, borderTopWidth: 3 }}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Player 2</label>
          <select className="form-input" value={id2} onChange={(e) => setId2(e.target.value)}>
            {withScores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {samePlayer && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
          Select two different players to compare.
        </div>
      )}

      {!samePlayer && (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-center font-bold" style={{ color: c1 }}>{p1.name.split(' ')[0]}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-32">Stat</th>
                  <th className="px-4 py-3 text-center font-bold" style={{ color: c2 }}>{p2.name.split(' ')[0]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(({ label, v1, v2, higher, n1, n2 }) => {
                  const num1   = n1 ?? Number(v1)
                  const num2   = n2 ?? Number(v2)
                  const p1Wins = higher ? num1 > num2 : num1 < num2
                  const p2Wins = higher ? num2 > num1 : num2 < num1
                  return (
                    <tr key={label}>
                      <td className={`px-4 py-3 text-center font-semibold ${p1Wins ? 'text-green-700' : 'text-gray-500'}`}>
                        {p1Wins && <span className="mr-1 text-green-500">✓</span>}{v1}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">{label}</td>
                      <td className={`px-4 py-3 text-center font-semibold ${p2Wins ? 'text-green-700' : 'text-gray-500'}`}>
                        {p2Wins && <span className="mr-1 text-green-500">✓</span>}{v2}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td className={`px-4 py-3 text-center font-semibold ${con1.cls}`}>{con1.label}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">Consistency</td>
                  <td className={`px-4 py-3 text-center font-semibold ${con2.cls}`}>{con2.label}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-1">📈 Season Score Progression</h2>
            <p className="text-xs text-gray-400 mb-4">Top 5 rounds × participation multiplier + improvement bonus — matches the standings</p>
            <Line data={cumulativeData} options={lineOpts} />
          </div>

          {/* ── Head-to-head shared rounds ── */}
          {sharedRounds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-400">
              No rounds found where {p1.name.split(' ')[0]} and {p2.name.split(' ')[0]} played the same course on the same day.
            </div>
          ) : (
            <>
              {/* H2H record banner */}
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">⚔️ Head-to-Head — {sharedRounds.length} shared round{sharedRounds.length !== 1 ? 's' : ''}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Rounds played on the same course on the same day</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  {[
                    { label: p1.name.split(' ')[0], value: h2hWins1, color: c1, suffix: h2hWins1 === 1 ? 'win' : 'wins' },
                    { label: 'Ties',                value: h2hTies,  color: '#9ca3af', suffix: h2hTies === 1 ? 'tie' : 'ties' },
                    { label: p2.name.split(' ')[0], value: h2hWins2, color: c2, suffix: h2hWins2 === 1 ? 'win' : 'wins' },
                  ].map(({ label, value, color, suffix }) => (
                    <div key={label} className="flex flex-col items-center py-5 gap-0.5">
                      <span className="text-4xl font-extrabold tabular-nums" style={{ color }}>{value}</span>
                      <span className="text-xs font-semibold text-gray-500">{suffix}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Points per shared round — grouped bar */}
              <div className="card">
                <h2 className="text-base font-bold text-gray-900 mb-1">📊 Points in Shared Rounds</h2>
                <p className="text-xs text-gray-400 mb-4">Side-by-side points each time they played together</p>
                <Bar data={h2hBarData} options={{ ...barOpts, aspectRatio: Math.min(3, Math.max(2, sharedRounds.length * 0.5)) }} />
              </div>

              {/* Round-by-round table */}
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">📋 Shared Round Results</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                      <th className="px-4 py-2 text-left">Date · Course</th>
                      <th className="px-4 py-2 text-center font-semibold" style={{ color: c1 }}>{p1.name.split(' ')[0]}</th>
                      <th className="px-4 py-2 text-center font-semibold" style={{ color: c2 }}>{p2.name.split(' ')[0]}</th>
                      <th className="px-4 py-2 text-center">Winner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sharedRounds.map((r, i) => {
                      const p1Won = r.s1.totalPoints > r.s2.totalPoints
                      const p2Won = r.s2.totalPoints > r.s1.totalPoints
                      const tie   = !p1Won && !p2Won
                      const dateStr = new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{dateStr}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[180px]">{r.course}</div>
                          </td>
                          <td className={`px-4 py-3 text-center font-bold tabular-nums ${p1Won ? '' : 'text-gray-400'}`} style={p1Won ? { color: c1 } : {}}>
                            {p1Won && '✓ '}{r.s1.totalPoints.toFixed(1)}
                          </td>
                          <td className={`px-4 py-3 text-center font-bold tabular-nums ${p2Won ? '' : 'text-gray-400'}`} style={p2Won ? { color: c2 } : {}}>
                            {p2Won && '✓ '}{r.s2.totalPoints.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                            {tie ? 'Tie' : p1Won ? p1.name.split(' ')[0] : p2.name.split(' ')[0]}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            {[{ p: p1, c: c1 }, { p: p2, c: c2 }].map(({ p, c }) => (
              <div key={p.id} className="card" style={{ borderTopColor: c, borderTopWidth: 3 }}>
                <p className="text-xs font-semibold text-gray-500 mb-2">{p.name.split(' ')[0]}'s Best Course</p>
                {p.courseStats.length > 0 ? (
                  <>
                    <p className="font-semibold text-gray-800 text-sm truncate">{p.courseStats[0].name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.courseStats[0].avgPoints} avg pts · {p.courseStats[0].count} round{p.courseStats[0].count !== 1 ? 's' : ''}
                    </p>
                  </>
                ) : <p className="text-sm text-gray-400">No data</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
