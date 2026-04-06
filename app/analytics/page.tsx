'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
)

// ── Colour palette for players ────────────────────────────────────────────────
const COLORS = [
  '#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6366f1',
]

interface PlayerTimeline {
  id: string
  name: string
  currentHandicap: number
  startingHandicap: number | null
  scores: {
    date: string
    totalPoints: number
    gross: number
    handicap: number
    holes: number
    course: string
    difficulty: string
    groupBonus: number
  }[]
}

interface Analytics {
  playerTimelines: PlayerTimeline[]
  activityByDate:  Record<string, number>
  topCourses:      { name: string; count: number }[]
  holes9:          number
  holes18:         number
  diffCount:       Record<string, number>
  totalRounds:     number
  avgPoints:       number
  maxPoints:       number
}

const chartOpts = (title: string) => ({
  responsive: true,
  plugins: { legend: { position: 'bottom' as const }, title: { display: false } },
  scales: { y: { beginAtZero: false } },
})

export default function AnalyticsPage() {
  const [data, setData]       = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d: Analytics) => {
        setData(d)
        setSelected(d.playerTimelines.map((p) => p.id))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data || data.totalRounds === 0) return (
    <div className="card text-center py-20 text-gray-500">
      <div className="text-5xl mb-3">📊</div>
      <p className="font-medium">No rounds submitted yet — analytics will appear once the season begins.</p>
    </div>
  )

  const activePlayers = data.playerTimelines.filter((p) => selected.includes(p.id))

  // ── 1. Cumulative points over time ────────────────────────────────────────
  const allDates = Array.from(new Set(
    data.playerTimelines.flatMap((p) => p.scores.map((s) => s.date.slice(0, 10)))
  )).sort()

  const cumulativeData = {
    labels:   allDates,
    datasets: activePlayers.map((p, i) => {
      let running = 0
      const pointsByDate: Record<string, number> = {}
      p.scores.forEach((s) => { pointsByDate[s.date.slice(0, 10)] = s.totalPoints })

      return {
        label:           p.name,
        data:            allDates.map((d) => { running += pointsByDate[d] ?? 0; return running }),
        borderColor:     COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length] + '20',
        tension:         0.3,
        fill:            false,
        pointRadius:     4,
      }
    }),
  }

  // ── 2. Handicap progression ───────────────────────────────────────────────
  const hcapData = {
    labels:   allDates,
    datasets: activePlayers
      .filter((p) => p.scores.length > 0)
      .map((p, i) => {
        const hcapByDate: Record<string, number> = {}
        p.scores.forEach((s) => { hcapByDate[s.date.slice(0, 10)] = s.handicap })

        // Forward-fill handicap
        let last = p.startingHandicap ?? p.scores[0]?.handicap ?? 0
        return {
          label:           p.name,
          data:            allDates.map((d) => {
            if (hcapByDate[d] !== undefined) last = hcapByDate[d]
            return last
          }),
          borderColor:     COLORS[i % COLORS.length],
          backgroundColor: 'transparent',
          tension:         0.2,
          pointRadius:     3,
          borderDash:      [],
        }
      }),
  }

  // ── 3. Points per round (bar) ─────────────────────────────────────────────
  const roundBarData = {
    labels:   activePlayers.map((p) => p.name.split(' ')[0]),
    datasets: [
      {
        label:           'Best Round',
        data:            activePlayers.map((p) => p.scores.length ? Math.max(...p.scores.map((s) => s.totalPoints)) : 0),
        backgroundColor: '#16a34a',
        borderRadius:    6,
      },
      {
        label:           'Avg Round',
        data:            activePlayers.map((p) =>
          p.scores.length ? Math.round(p.scores.reduce((a, b) => a + b.totalPoints, 0) / p.scores.length * 10) / 10 : 0
        ),
        backgroundColor: '#86efac',
        borderRadius:    6,
      },
    ],
  }

  // ── 4. Rounds per player ──────────────────────────────────────────────────
  const roundsData = {
    labels:   data.playerTimelines.filter((p) => p.scores.length > 0).map((p) => p.name.split(' ')[0]),
    datasets: [{
      label:           'Rounds Played',
      data:            data.playerTimelines.filter((p) => p.scores.length > 0).map((p) => p.scores.length),
      backgroundColor: data.playerTimelines.filter((p) => p.scores.length > 0).map((_, i) => COLORS[i % COLORS.length]),
      borderRadius:    6,
    }],
  }

  // ── 5. Course breakdown ───────────────────────────────────────────────────
  const courseData = {
    labels:   data.topCourses.map((c) => c.name),
    datasets: [{
      data:            data.topCourses.map((c) => c.count),
      backgroundColor: COLORS,
      borderWidth:     2,
      borderColor:     '#fff',
    }],
  }

  // ── 6. Holes + difficulty donuts ─────────────────────────────────────────
  const holesData = {
    labels:   ['9 Holes', '18 Holes'],
    datasets: [{ data: [data.holes9, data.holes18], backgroundColor: ['#86efac', '#16a34a'], borderWidth: 2, borderColor: '#fff' }],
  }
  const diffData = {
    labels:   ['Easy', 'Average', 'Tough'],
    datasets: [{ data: [data.diffCount.easy ?? 0, data.diffCount.average ?? 0, data.diffCount.tough ?? 0],
      backgroundColor: ['#60a5fa', '#4ade80', '#f87171'], borderWidth: 2, borderColor: '#fff' }],
  }

  const donutOpts = { responsive: true, plugins: { legend: { position: 'bottom' as const } } }
  const barOpts   = { responsive: true, plugins: { legend: { position: 'bottom' as const } }, scales: { y: { beginAtZero: true } } }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1 text-sm">{data.totalRounds} rounds · avg {data.avgPoints} pts · best round {data.maxPoints} pts</p>
      </div>

      {/* Stat summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Rounds',  value: data.totalRounds },
          { label: 'Players',       value: data.playerTimelines.filter(p => p.scores.length > 0).length },
          { label: 'Avg Points',    value: data.avgPoints },
          { label: 'Best Round',    value: data.maxPoints },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <div className="text-2xl font-bold text-green-700">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Player filter */}
      {data.playerTimelines.filter(p => p.scores.length > 0).length > 1 && (
        <div className="card">
          <p className="text-sm font-semibold text-gray-700 mb-3">Filter players (charts 1 &amp; 2):</p>
          <div className="flex flex-wrap gap-2">
            {data.playerTimelines.filter(p => p.scores.length > 0).map((p, i) => {
              const on = selected.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(prev => on ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all"
                  style={{
                    borderColor:     COLORS[i % COLORS.length],
                    background:      on ? COLORS[i % COLORS.length] : 'white',
                    color:           on ? 'white' : COLORS[i % COLORS.length],
                  }}
                >
                  {p.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Cumulative points */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📈 Cumulative Points Over Season</h2>
          <Line data={cumulativeData} options={chartOpts('Cumulative Points')} />
        </div>

        {/* Handicap progression */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-1">🎯 Handicap Progression</h2>
          <p className="text-xs text-gray-400 mb-4">Lower = improved. Improvement bonus kicks in when this drops below your starting value.</p>
          <Line data={hcapData} options={{ ...chartOpts('Handicap'), scales: { y: { reverse: true } } }} />
        </div>

        {/* Best vs avg per player */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⛳ Best vs Avg Round by Player</h2>
          <Bar data={roundBarData} options={barOpts} />
        </div>

        {/* Rounds played per player */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🏌️ Rounds Played</h2>
          <Bar data={roundsData} options={barOpts} />
        </div>

        {/* Course breakdown */}
        {data.topCourses.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🗺️ Courses Played</h2>
            <Doughnut data={courseData} options={donutOpts} />
          </div>
        )}

        {/* Holes + difficulty */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Round Breakdown</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-center text-gray-500 mb-2">9 vs 18 Holes</p>
              <Doughnut data={holesData} options={donutOpts} />
            </div>
            <div>
              <p className="text-xs text-center text-gray-500 mb-2">Course Difficulty</p>
              <Doughnut data={diffData} options={donutOpts} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
