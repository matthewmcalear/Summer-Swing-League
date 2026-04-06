'use client'

import { useEffect, useState } from 'react'
import type { Score } from '@/types'

export default function ScoresPage() {
  const [scores, setScores]     = useState<Score[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    fetch('/api/scores')
      .then((r) => r.json())
      .then((d) => { setScores(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = scores.filter(
    (s) =>
      s.player_name.toLowerCase().includes(search.toLowerCase()) ||
      s.course_name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Scores</h1>
          <p className="text-gray-500 mt-1 text-sm">{scores.length} rounds submitted</p>
        </div>
        <input
          type="search"
          placeholder="Search by player or course…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input max-w-xs"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-gray-500 py-16">No scores found.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Player</th>
                <th>Course</th>
                <th>Holes</th>
                <th>Gross</th>
                <th>Handicap</th>
                <th>Difficulty</th>
                <th>Group Bonus</th>
                <th>⭐ Bonus</th>
                <th>Points</th>
                <th>Group</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">
                    {new Date(s.play_date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </td>
                  <td className="font-medium">{s.player_name}</td>
                  <td>{s.course_name}</td>
                  <td>{s.holes}</td>
                  <td>{s.gross_score}</td>
                  <td>{s.handicap_used}</td>
                  <td className="capitalize">{s.course_difficulty}</td>
                  <td>+{s.group_bonus}</td>
                  <td className={Number(s.additional_points) > 0 ? 'font-semibold text-yellow-600' : 'text-gray-400'}>
                    {Number(s.additional_points) > 0 ? `+${s.additional_points}` : '—'}
                  </td>
                  <td className="font-semibold text-green-700">{Number(s.total_points).toFixed(1)}</td>
                  <td className="text-xs text-gray-500 max-w-xs truncate">
                    {s.group_member_names || '—'}
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
