import Link from 'next/link'
import { Flag } from 'lucide-react'
import type { StandingEntry } from '@/types'

interface StandingsChartProps {
  standings: StandingEntry[]
}

// Top-five mini leaderboard for the home page. Full detail lives on /standings.
export default function StandingsChart({ standings }: StandingsChartProps) {
  const active = standings.filter((p) => p.totalRounds > 0).slice(0, 5)

  // Real empty state — an invitation to act, not a blank.
  if (active.length === 0) return (
    <div className="text-center py-8">
      <p className="text-gray-500 text-sm font-medium">No rounds submitted yet — be the first.</p>
      <Link
        href="/submit-score"
        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800 transition-colors"
      >
        <Flag size={15} strokeWidth={2} aria-hidden="true" /> Submit the first round
      </Link>
    </div>
  )

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          <th className="text-left font-semibold w-8 pb-2">#</th>
          <th className="text-left font-semibold pb-2">Player</th>
          <th className="text-right font-semibold pb-2">Rounds</th>
          <th className="text-right font-semibold pb-2 w-16">Points</th>
        </tr>
      </thead>
      <tbody>
        {active.map((p, i) => {
          const medal = i < 3 // top three get the brass ring
          return (
            <tr key={p.id} className="border-t border-gray-100">
              <td className="py-2.5">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    medal
                      ? 'bg-brass-50 text-brass-700 border border-brass-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-100'
                  }`}
                >
                  {i + 1}
                </span>
              </td>
              <td className="py-2.5 font-semibold text-gray-800 truncate">{p.name}</td>
              <td className="py-2.5 text-right text-gray-400 tabular-nums">{p.totalRounds}</td>
              <td className="py-2.5 text-right font-bold text-gray-900 tabular-nums">{p.seasonScore.toFixed(1)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
