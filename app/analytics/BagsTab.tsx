'use client'

import { Bar } from 'react-chartjs-2'
import { scaleBase, tooltipCfg, legendCfg, COLORS } from './chartConfig'
import type { Analytics } from './types'

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

export default function BagsTab({ data }: { data: Analytics }) {
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
