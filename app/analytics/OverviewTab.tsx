'use client'

import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  scaleBase, tooltipCfg, noLegend, lineOpts, barOpts, donutOpts,
  COLORS, barFloor, playerColor,
} from './chartConfig'
import type { Analytics } from './types'

export default function OverviewTab({ data, selected, setSelected }: {
  data: Analytics; selected: string[]; setSelected: (ids: string[]) => void
}) {
  // sorted by season standing so bar charts mirror the leaderboard
  const active           = data.playerTimelines
    .filter((p) => selected.includes(p.id))
    .sort((a, b) => b.seasonScore - a.seasonScore)
  const activeWithScores = active.filter((p) => p.scores.length > 0)
  const withScores       = data.playerTimelines.filter((p) => p.scores.length > 0)
  const withScoresByStanding = [...withScores].sort((a, b) => b.seasonScore - a.seasonScore)

  const allDates = Array.from(new Set(
    data.playerTimelines.flatMap((p) => p.scores.map((s) => s.date.slice(0, 10)))
  )).sort()

  const cumulativeData = {
    labels: allDates,
    datasets: activeWithScores.map((p) => {
      let running = 0
      const byDate: Record<string, number> = {}
      p.scores.forEach((s) => { byDate[s.date.slice(0, 10)] = s.totalPoints })
      const c = playerColor(data.playerTimelines, p.id)
      return {
        label: p.name.split(' ')[0],
        data:  allDates.map((d) => { running += byDate[d] ?? 0; return running }),
        borderColor: c, fill: true,
      }
    }),
  }

  const hcapChangePlayers = activeWithScores
    .map((p) => {
      const start = p.startingHandicap ?? p.scores[0]?.handicap ?? p.currentHandicap
      return {
        name:    p.name.split(' ')[0],
        delta:   Number((start - p.currentHandicap).toFixed(1)),
        start,
        current: p.currentHandicap,
      }
    })
    .filter((p) => p.delta !== 0)
    .sort((a, b) => b.delta - a.delta)

  const hcapChangeData = {
    labels: hcapChangePlayers.map((p) => p.name),
    datasets: [{
      label: 'Strokes Improved',
      data:  hcapChangePlayers.map((p) => p.delta),
      backgroundColor: hcapChangePlayers.map((p) =>
        p.delta > 0 ? '#16a34a' : p.delta < 0 ? '#dc2626' : '#d1d5db'
      ),
    }],
  }

  const hcapChangeOpts = {
    responsive:          true,
    maintainAspectRatio: false,
    indexAxis:           'y' as const,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend:  noLegend,
      tooltip: {
        ...tooltipCfg,
        callbacks: {
          label: (ctx: any) => {
            const p    = hcapChangePlayers[ctx.dataIndex]
            const sign = p.delta > 0 ? '↓ improved' : p.delta < 0 ? '↑ worsened' : 'no change'
            return `  ${p.start} → ${p.current}   (${p.delta > 0 ? '+' : ''}${p.delta} strokes ${sign})`
          },
        },
      },
    },
    scales: {
      x: { ...scaleBase, beginAtZero: true },
      y: scaleBase,
    },
  }

  const roundBarBests  = activeWithScores.map((p) => Math.max(...p.scores.map((s) => s.totalPoints)))
  const roundBarAvgs   = activeWithScores.map((p) => p.avgPoints)
  const roundBarFloor  = barFloor([...roundBarBests, ...roundBarAvgs])
  const roundBarData = {
    labels: activeWithScores.map((p) => p.name.split(' ')[0]),
    datasets: [
      { label: 'Best Round', data: roundBarBests, backgroundColor: '#15803d' },
      { label: 'Avg Round',  data: roundBarAvgs,  backgroundColor: '#86efac' },
    ],
  }

  const roundsData = {
    labels: withScoresByStanding.map((p) => p.name.split(' ')[0]),
    datasets: [{
      label: 'Rounds Played',
      data:  withScoresByStanding.map((p) => p.scores.length),
      backgroundColor: withScoresByStanding.map((p) => playerColor(data.playerTimelines, p.id)),
    }],
  }

  const courseData = {
    labels: data.topCourses.map((c) => c.name),
    datasets: [{ data: data.topCourses.map((c) => c.count), backgroundColor: COLORS, borderWidth: 0 }],
  }

  const holesData = {
    labels: ['9 Holes', '18 Holes'],
    datasets: [{ data: [data.holes9, data.holes18], backgroundColor: ['#86efac', '#15803d'], borderWidth: 0 }],
  }

  const diffData = {
    labels: ['Easy', 'Average', 'Tough'],
    datasets: [{ data: [data.diffCount.easy ?? 0, data.diffCount.average ?? 0, data.diffCount.tough ?? 0],
      backgroundColor: ['#60a5fa', '#4ade80', '#f87171'], borderWidth: 0 }],
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Rounds',   value: data.totalRounds },
          { label: 'Active Players', value: withScores.length },
          { label: 'Avg Points',     value: data.avgPoints },
          { label: 'Best Round',     value: data.maxPoints },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <div className="text-2xl font-bold text-green-700">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {withScores.length > 1 && (
        <div className="card">
          <p className="text-sm font-semibold text-gray-700 mb-3">Filter players:</p>
          <div className="flex flex-wrap gap-2">
            {withScores.map((p) => {
              const on = selected.includes(p.id)
              const c  = playerColor(data.playerTimelines, p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(on ? selected.filter((x) => x !== p.id) : [...selected, p.id])}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all"
                  style={{ borderColor: c, background: on ? c : 'white', color: on ? 'white' : c }}
                >
                  {p.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="text-base font-bold text-gray-900 mb-4">📈 Cumulative Points Over Season</h2>
          <div className="h-64 sm:h-80">
            <Line data={cumulativeData} options={{ ...lineOpts, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="text-base font-bold text-gray-900 mb-1">🎯 Handicap Improvement</h2>
          <p className="text-xs text-gray-400 mb-4">Strokes dropped since season start · green = improved · earns +3 pts per stroke</p>
          {hcapChangePlayers.length > 0
            ? (
              <div style={{ height: `${Math.max(80, hcapChangePlayers.length * 52)}px` }}>
                <Bar data={hcapChangeData} options={hcapChangeOpts} />
              </div>
            )
            : <p className="text-sm text-gray-400 py-4">No handicap changes yet this season.</p>
          }
        </div>

        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4">⛳ Best vs Avg Round</h2>
          <Bar data={roundBarData} options={{ ...barOpts, scales: { x: scaleBase, y: { ...scaleBase, min: roundBarFloor } } }} />
        </div>

        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4">🏌️ Rounds Played</h2>
          <Bar data={roundsData} options={{ ...barOpts, plugins: { legend: noLegend, tooltip: tooltipCfg } }} />
        </div>

        {data.topCourses.length > 0 && (
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-4">🗺️ Courses Played</h2>
            <Doughnut data={courseData} options={donutOpts} />
          </div>
        )}

        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4">📊 Round Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-center text-gray-500 mb-2">9 vs 18 Holes</p>
              <Doughnut data={holesData} options={donutOpts} />
            </div>
            <div>
              <p className="text-xs text-center text-gray-500 mb-2">Difficulty</p>
              <Doughnut data={diffData} options={donutOpts} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
