'use client'

import { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

// ── Gradient fill: replaces backgroundColor with a top→transparent gradient
//    for any line dataset with fill: true ──────────────────────────────────────
const gradientPlugin = {
  id: 'gradientFill',
  beforeDatasetsDraw(chart: ChartJS) {
    const { ctx, chartArea } = chart
    if (!chartArea) return
    chart.data.datasets.forEach((dataset, i) => {
      if (!(dataset as any).fill) return
      const meta = chart.getDatasetMeta(i)
      if (meta.type !== 'line' || typeof dataset.borderColor !== 'string') return
      const color = dataset.borderColor
      const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
      grad.addColorStop(0,   color + '40')
      grad.addColorStop(0.6, color + '0c')
      grad.addColorStop(1,   color + '00')
      ;(dataset as any).backgroundColor = grad
    })
  },
}

// ── Crosshair: vertical dashed line at the hovered x position ─────────────────
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart: ChartJS) {
    const tooltip = chart.tooltip
    if (!tooltip || tooltip.getActiveElements().length === 0) return
    const { ctx, chartArea: { top, bottom } } = chart
    const x = tooltip.getActiveElements()[0].element.x
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.restore()
  },
}

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
  gradientPlugin as any,
  crosshairPlugin as any,
)

// ── Global element defaults (apply to every chart on the page) ─────────────────
ChartJS.defaults.elements.point.radius        = 0
ChartJS.defaults.elements.point.hoverRadius   = 5
ChartJS.defaults.elements.point.hoverBorderWidth = 2
ChartJS.defaults.elements.line.borderWidth    = 2
ChartJS.defaults.elements.line.tension        = 0.4
;(ChartJS.defaults.elements.bar as any).borderRadius = 6
;(ChartJS.defaults.elements.bar as any).borderWidth  = 0
ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif'
ChartJS.defaults.font.size   = 11

// ── Shared style building blocks ───────────────────────────────────────────────
const scaleBase = {
  grid:   { color: 'rgba(0,0,0,0.05)', tickLength: 0 },
  border: { display: false },
  ticks:  { color: '#9ca3af', padding: 8 },
}

const tooltipCfg = {
  backgroundColor: 'rgba(17,24,39,0.92)',
  titleColor:      '#f9fafb',
  bodyColor:       '#d1d5db',
  borderColor:     'rgba(255,255,255,0.08)',
  borderWidth:     1,
  padding:         10,
  cornerRadius:    8,
  usePointStyle:   true,
  boxWidth:        8,
  boxHeight:       8,
}

const legendCfg = {
  position: 'bottom' as const,
  labels:   { color: '#6b7280', padding: 16, usePointStyle: true, pointStyleWidth: 16 },
}

const noLegend = { display: false }

// ── Chart option presets ───────────────────────────────────────────────────────
const lineOpts = {
  responsive:       true,
  aspectRatio:      2.2,
  interaction:      { mode: 'index' as const, intersect: false },
  plugins:          { legend: legendCfg, tooltip: tooltipCfg },
  scales:           { x: scaleBase, y: { ...scaleBase, beginAtZero: false } },
}

const lineOptsRev = {
  responsive:       true,
  aspectRatio:      2.2,
  interaction:      { mode: 'index' as const, intersect: false },
  plugins:          { legend: legendCfg, tooltip: tooltipCfg },
  scales:           { x: scaleBase, y: { ...scaleBase, reverse: true } },
}

const barOpts = {
  responsive:       true,
  aspectRatio:      1.8,
  interaction:      { mode: 'index' as const, intersect: false },
  plugins:          { legend: legendCfg, tooltip: tooltipCfg },
  scales:           { x: scaleBase, y: { ...scaleBase, beginAtZero: true } },
}

const barOptsNoLegend = {
  ...barOpts,
  plugins: { legend: noLegend, tooltip: tooltipCfg },
}

// For charts where data is far from 0 — auto-scales to the data range
const barOptsAutoScale = {
  ...barOpts,
  plugins: { legend: noLegend, tooltip: tooltipCfg },
  scales:  { x: scaleBase, y: { ...scaleBase, beginAtZero: false } },
}

const lineOptsNoLegend = {
  ...lineOpts,
  plugins: { legend: noLegend, tooltip: tooltipCfg },
}

const donutOpts = {
  responsive:  true,
  aspectRatio: 1.4,
  cutout:      '72%',
  plugins:     { legend: legendCfg, tooltip: tooltipCfg },
}

// ── Colour palette ─────────────────────────────────────────────────────────────
const COLORS = [
  '#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6366f1',
]

// Returns a y-axis min that sits below the lowest value so no bar is invisible
function barFloor(values: number[]) {
  if (!values.length) return 0
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max(5, (max - min) * 0.5)
  return Math.max(0, Math.floor(min - pad))
}

type Tab = 'overview' | 'player' | 'compare' | 'bags'

export interface RoundScore {
  date: string; totalPoints: number; gross: number; handicap: number
  holes: number; course: string; difficulty: string
  groupBonus: number; basePoints: number; commBonus: number
}

export interface PlayerTimeline {
  id: string; name: string; currentHandicap: number; startingHandicap: number | null
  avgPoints: number; stdDev: number; seasonScore: number; topScores: number[]
  courseStats: { name: string; count: number; avgPoints: number }[]
  pointsBreakdown: { base: number; groupBonus: number; commBonus: number }
  scores: RoundScore[]
}

export interface BagEntry {
  memberId: string
  memberName: string
  clubs: { club_name: string; yards: number }[]
}

export interface Analytics {
  playerTimelines: PlayerTimeline[]
  activityByDate:  Record<string, number>
  topCourses:      { name: string; count: number }[]
  holes9: number; holes18: number; diffCount: Record<string, number>
  totalRounds: number; avgPoints: number; maxPoints: number
  bags: BagEntry[]
}

function consistencyLabel(stdDev: number) {
  if (stdDev === 0) return { label: '—',           cls: 'text-gray-400'   }
  if (stdDev < 2)   return { label: 'Elite',        cls: 'text-purple-700' }
  if (stdDev < 3.5) return { label: 'Consistent',   cls: 'text-green-700'  }
  if (stdDev < 5.5) return { label: 'Average',      cls: 'text-yellow-600' }
  return                   { label: 'Variable',     cls: 'text-red-600'    }
}

function playerColor(timelines: PlayerTimeline[], id: string) {
  return COLORS[timelines.findIndex((p) => p.id === id) % COLORS.length]
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({ data, selected, setSelected }: {
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
          <Line data={cumulativeData} options={lineOpts} />
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

// ── Player Profile Tab ─────────────────────────────────────────────────────────
function PlayerTab({ data, initialPlayerId }: { data: Analytics; initialPlayerId?: string }) {
  const withScores = data.playerTimelines.filter((p) => p.scores.length > 0)
  const defaultId  = (initialPlayerId && withScores.find((p) => p.id === initialPlayerId))
    ? initialPlayerId
    : withScores[0]?.id ?? ''
  const [selectedId, setSelectedId] = useState(defaultId)

  const player = data.playerTimelines.find((p) => p.id === selectedId)
  if (!player || player.scores.length === 0) return (
    <div className="card text-center py-16 text-gray-500">No rounds yet.</div>
  )

  const color    = playerColor(data.playerTimelines, player.id)
  const sorted   = [...player.scores].sort((a, b) => a.date.localeCompare(b.date))
  const bestPts  = Math.max(...player.scores.map((s) => s.totalPoints))
  const worstPts = Math.min(...player.scores.map((s) => s.totalPoints))
  const hdcpChange  = player.startingHandicap != null ? player.startingHandicap - player.currentHandicap : null
  const consistency = consistencyLabel(player.stdDev)

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
          {withScores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

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

      {hdcpChange !== null && (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4">📊 Points Per Round</h2>
          <Bar data={pointsBarData} options={pointsBarOpts} />
        </div>

        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-1">📉 Net Score Trend</h2>
          <p className="text-xs text-gray-400 mb-3">Normalized to 18H equivalent · 9H rounds doubled · lower is better</p>
          <Line data={netTrendData} options={lineOptsNoLegend} />
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
    </div>
  )
}

// ── Compare Tab ────────────────────────────────────────────────────────────────
function CompareTab({ data }: { data: Analytics }) {
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

// ── Standard club order for display ──────────────────────────────────────────
const CLUB_ORDER = [
  'Driver','3 Wood','5 Wood','7 Wood','Hybrid','2 Hybrid','3 Hybrid','4 Hybrid',
  '2 Iron','3 Iron','4 Iron','5 Iron','6 Iron','7 Iron','8 Iron','9 Iron',
  'Pitching Wedge','Gap Wedge','Sand Wedge','Lob Wedge','60° Wedge','58° Wedge','56° Wedge','52° Wedge',
  'Putter',
]
function clubSortIdx(name: string) {
  const i = CLUB_ORDER.findIndex((c) => c.toLowerCase() === name.toLowerCase())
  return i === -1 ? 999 : i
}

// ── Bags Tab ───────────────────────────────────────────────────────────────────
function BagsTab({ data }: { data: Analytics }) {
  const { bags } = data

  if (bags.length === 0) return (
    <div className="card text-center py-20 space-y-3">
      <div className="text-4xl">🎒</div>
      <p className="font-semibold text-gray-700">No bags set up yet</p>
      <p className="text-sm text-gray-400">Members can add their club distances at <a href="/my-bag" className="text-green-700 underline">My Bag</a>.</p>
    </div>
  )

  // All unique clubs sorted in standard order, then by avg distance for unknowns
  const clubMeta: Record<string, number[]> = {}
  bags.forEach((b) => b.clubs.forEach((c) => {
    if (!clubMeta[c.club_name]) clubMeta[c.club_name] = []
    clubMeta[c.club_name].push(c.yards)
  }))
  const allClubs = Object.entries(clubMeta)
    .map(([name, vals]) => ({
      name,
      avg:   Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      count: vals.length,
      max:   Math.max(...vals),
    }))
    .sort((a, b) => {
      const ia = clubSortIdx(a.name), ib = clubSortIdx(b.name)
      if (ia !== ib) return ia - ib
      return b.avg - a.avg
    })

  // Common clubs (≥2 members)
  const commonClubs = allClubs.filter((c) => c.count >= 2)

  // Bragging-rights highlights for key clubs
  const KEY_CLUBS = ['Driver','7 Iron','Pitching Wedge','Sand Wedge']
  const highlights = KEY_CLUBS.flatMap((club) => {
    const entries = bags
      .flatMap((b) => b.clubs.filter((c) => c.club_name === club).map((c) => ({ name: b.memberName, yards: c.yards })))
      .sort((a, b) => b.yards - a.yards)
    return entries.length ? [{ club, entries }] : []
  })

  // Chart: common clubs, one bar per member
  const chartData = commonClubs.length >= 2 ? {
    labels: commonClubs.map((c) => c.name),
    datasets: bags.map((b, i) => ({
      label:           b.memberName.split(' ')[0],
      data:            commonClubs.map((c) => b.clubs.find((cl) => cl.club_name === c.name)?.yards ?? null),
      backgroundColor: COLORS[i % COLORS.length] + 'cc',
      borderColor:     COLORS[i % COLORS.length],
      borderWidth:     1,
    })),
  } : null

  const chartOpts = {
    responsive:  true,
    aspectRatio: 1.6,
    indexAxis:   'y' as const,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: legendCfg, tooltip: { ...tooltipCfg, callbacks: { label: (ctx: any) => ctx.parsed.x != null ? `  ${ctx.dataset.label}: ${ctx.parsed.x} yd` : '' } } },
    scales: {
      x: { ...scaleBase, beginAtZero: false, ticks: { ...scaleBase.ticks, callback: (v: any) => `${v} yd` } },
      y: scaleBase,
    },
  }

  return (
    <div className="space-y-6">

      {/* Bragging rights highlights */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {highlights.map(({ club, entries }) => {
            const leader = entries[0]
            const memberIdx = bags.findIndex((b) => b.memberName === leader.name)
            const color = COLORS[memberIdx % COLORS.length]
            return (
              <div key={club} className="card text-center py-4" style={{ borderTopColor: color, borderTopWidth: 3 }}>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{club}</div>
                <div className="text-2xl font-extrabold tabular-nums" style={{ color }}>{leader.yards}</div>
                <div className="text-xs text-gray-500 mt-0.5">yards</div>
                <div className="text-sm font-semibold text-gray-700 mt-1">{leader.name.split(' ')[0]}</div>
                {entries.length > 1 && (
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {entries.slice(1, 3).map((e) => `${e.name.split(' ')[0]} ${e.yards}`).join(' · ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Grouped bar chart for common clubs */}
      {chartData ? (
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-1">📊 Club Distance Comparison</h2>
          <p className="text-xs text-gray-400 mb-4">Clubs where 2+ members have entered a yardage</p>
          <Bar data={chartData} options={chartOpts} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-6 text-center text-sm text-gray-400">
          Chart appears once 2+ members share a club in their bag.
        </div>
      )}

      {/* Full bag comparison table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">🎒 Full Bag Comparison</h2>
          <p className="text-xs text-gray-400 mt-0.5">All clubs · green = farthest in the group</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-green-50 text-xs font-semibold text-green-800 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-green-50">Club</th>
                {bags.map((b) => (
                  <th key={b.memberId} className="px-4 py-3 text-center whitespace-nowrap">
                    {b.memberName.split(' ')[0]}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-gray-400">Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allClubs.map(({ name, avg, max }) => (
                <tr key={name} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap">{name}</td>
                  {bags.map((b) => {
                    const club = b.clubs.find((c) => c.club_name === name)
                    const isMax = club && club.yards === max && allClubs.find(c => c.name === name)!.count > 1
                    return (
                      <td key={b.memberId} className={`px-4 py-2.5 text-center tabular-nums ${isMax ? 'font-bold text-green-700' : club ? 'text-gray-700' : 'text-gray-300'}`}>
                        {club ? `${club.yards}` : '—'}
                        {isMax && <span className="ml-0.5 text-[10px]">💪</span>}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2.5 text-center text-gray-400 tabular-nums text-xs">{avg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

// ── Main Client Shell ──────────────────────────────────────────────────────────
export default function AnalyticsClient({
  data,
  initialTab,
  initialPlayerId,
}: {
  data: Analytics
  initialTab?: string
  initialPlayerId?: string
}) {
  const validTabs: Tab[] = ['overview', 'player', 'compare', 'bags']
  const [tab, setTab]           = useState<Tab>(validTabs.includes(initialTab as Tab) ? (initialTab as Tab) : 'overview')
  const [selected, setSelected] = useState<string[]>(() => data.playerTimelines.map((p) => p.id))

  const withScores = data.playerTimelines.filter((p) => p.scores.length > 0)
  const tabs = [
    { key: 'overview' as Tab, label: 'League Overview' },
    { key: 'player'   as Tab, label: 'Player Profile'  },
    ...(withScores.length >= 2 ? [{ key: 'compare' as Tab, label: 'Compare' }] : []),
    { key: 'bags' as Tab, label: '🎒 Bags' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {data.totalRounds} rounds · avg {data.avgPoints} pts · best round {data.maxPoints} pts
        </p>
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex gap-0 whitespace-nowrap">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === key
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && <OverviewTab data={data} selected={selected} setSelected={setSelected} />}
      {tab === 'player'   && <PlayerTab   data={data} initialPlayerId={initialPlayerId} />}
      {tab === 'compare'  && <CompareTab  data={data} />}
      {tab === 'bags'     && <BagsTab     data={data} />}
    </div>
  )
}
