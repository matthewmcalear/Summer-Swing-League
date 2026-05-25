'use client'

import { useState } from 'react'
import type { Score, SeasonBonus } from '@/types'

const DIFF_LABEL: Record<string, string> = { easy: 'Easy', average: 'Average', tough: 'Tough' }
const DIFF_COLOR: Record<string, string> = {
  easy:    'bg-blue-50 text-blue-700 border-blue-200',
  average: 'bg-gray-50 text-gray-600 border-gray-200',
  tough:   'bg-red-50 text-red-700 border-red-200',
}

function ScoreCard({ s }: { s: Score }) {
  const [open, setOpen] = useState(false)

  const commBonus    = Number(s.additional_points ?? 0)
  const base         = Number(s.base_points ?? 0)
  const adjusted     = Math.round(base * s.difficulty_multiplier * 100) / 100
  const total        = Number(s.total_points ?? 0)
  const date         = new Date(s.play_date.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-14 h-14 rounded-xl bg-green-700 flex flex-col items-center justify-center shadow-sm">
            <span className="text-white text-lg font-extrabold leading-none">{total.toFixed(1)}</span>
            <span className="text-green-300 text-[10px] font-medium">pts</span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 truncate">{s.player_name}</div>
            <div className="text-sm text-gray-500 truncate">{s.course_name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{date}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            {s.holes}H
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${DIFF_COLOR[s.course_difficulty] ?? ''}`}>
            {DIFF_LABEL[s.course_difficulty]}
          </span>
          {commBonus > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
              ⭐ +{commBonus}
            </span>
          )}
          {s.group_size > 1 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              👥 {s.group_size}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Gross Score',  value: s.gross_score },
                { label: 'Handicap',     value: s.handicap_used },
                { label: 'Holes',        value: `${s.holes} holes` },
                { label: 'Difficulty',   value: `${DIFF_LABEL[s.course_difficulty]} ×${s.difficulty_multiplier.toFixed(2)}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                  <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                  <div className="font-bold text-gray-800">{value}</div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Scoring Breakdown</p>
              <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50 text-sm">
                <div className="flex justify-between px-4 py-2">
                  <span className="text-gray-600">Base points</span>
                  <span className="font-medium text-gray-800">{base.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-gray-600">Difficulty multiplier</span>
                  <span className="font-medium text-gray-800">×{s.difficulty_multiplier.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-gray-600">Adjusted points</span>
                  <span className="font-medium text-gray-800">{adjusted.toFixed(2)}</span>
                </div>
                {Number(s.group_bonus) > 0 && (
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-gray-600">Group bonus</span>
                    <span className="font-medium text-purple-700">+{s.group_bonus}</span>
                  </div>
                )}
                {commBonus > 0 && (
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-gray-600">⭐ Commissioner bonus</span>
                    <span className="font-semibold text-yellow-600">+{commBonus}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5 bg-green-50 rounded-b-lg">
                  <span className="font-bold text-gray-800">Total Points</span>
                  <span className="font-extrabold text-green-700 text-base">{total.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {s.group_member_names && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Group Members</p>
                <p className="text-sm text-gray-700">{s.group_member_names}</p>
              </div>
            )}

            {s.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700 italic">{s.notes}</p>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Submitted {new Date(s.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BonusCard({ b }: { b: SeasonBonus & { member_name: string } }) {
  const date = new Date(b.awarded_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  return (
    <div className="card p-0 overflow-hidden border-amber-200">
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-amber-50/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-14 h-14 rounded-xl bg-amber-500 flex flex-col items-center justify-center shadow-sm">
            <span className="text-white text-lg font-extrabold leading-none">+{b.points}</span>
            <span className="text-amber-200 text-[10px] font-medium">pts</span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 truncate">{b.member_name}</div>
            <div className="text-sm text-amber-700 font-medium truncate">🏆 {b.reason}</div>
            <div className="text-xs text-gray-400 mt-0.5">{date}</div>
          </div>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
          Season Bonus
        </span>
      </div>
    </div>
  )
}

interface Props {
  scores: Score[]
  bonuses: (SeasonBonus & { member_name: string })[]
}

export default function ScoresClient({ scores, bonuses }: Props) {
  const [search, setSearch]           = useState('')
  const [sortBy, setSortBy]           = useState<'date' | 'points' | 'player'>('date')
  const [playerFilter, setPlayerFilter] = useState<string>('all')

  const players = Array.from(new Set([
    ...scores.map((s) => s.player_name),
    ...bonuses.map((b) => b.member_name),
  ])).sort()

  const filteredScores = scores.filter((s) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      s.player_name.toLowerCase().includes(q) ||
      s.course_name.toLowerCase().includes(q) ||
      (s.notes ?? '').toLowerCase().includes(q)
    const matchPlayer = playerFilter === 'all' || s.player_name === playerFilter
    return matchSearch && matchPlayer
  })

  const filteredBonuses = bonuses.filter((b) => {
    const q = search.toLowerCase()
    const matchSearch = !q || b.member_name.toLowerCase().includes(q) || b.reason.toLowerCase().includes(q)
    const matchPlayer = playerFilter === 'all' || b.member_name === playerFilter
    return matchSearch && matchPlayer
  })

  type ScoreItem = { kind: 'score'; data: Score; sortDate: number; sortPoints: number; sortPlayer: string }
  type BonusItem = { kind: 'bonus'; data: SeasonBonus & { member_name: string }; sortDate: number; sortPoints: number; sortPlayer: string }
  type Item = ScoreItem | BonusItem

  const items: Item[] = [
    ...filteredScores.map((s): ScoreItem => ({
      kind: 'score', data: s,
      sortDate:   new Date(s.play_date).getTime(),
      sortPoints: Number(s.total_points),
      sortPlayer: s.player_name,
    })),
    ...filteredBonuses.map((b): BonusItem => ({
      kind: 'bonus', data: b,
      sortDate:   new Date(b.awarded_date).getTime(),
      sortPoints: b.points,
      sortPlayer: b.member_name,
    })),
  ].sort((a, b) => {
    if (sortBy === 'date')   return b.sortDate - a.sortDate
    if (sortBy === 'points') return b.sortPoints - a.sortPoints
    if (sortBy === 'player') return a.sortPlayer.localeCompare(b.sortPlayer)
    return 0
  })

  const totalRounds = scores.length
  const avgPts      = totalRounds ? Math.round(scores.reduce((s, r) => s + Number(r.total_points), 0) / totalRounds * 10) / 10 : 0
  const bestRound   = totalRounds ? Math.max(...scores.map((r) => Number(r.total_points))) : 0
  const withBonus   = scores.filter((r) => Number(r.additional_points) > 0).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Round Details</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {scores.length} rounds submitted this season — tap any round to see the full scoring breakdown.
        </p>
      </div>

      {scores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Rounds',          value: scores.length },
            { label: 'Avg Points',      value: avgPts || '—' },
            { label: 'Best Round',      value: bestRound > 0 ? bestRound.toFixed(1) : '—' },
            { label: '⭐ Bonus Rounds', value: withBonus },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center py-3">
              <div className="text-2xl font-bold text-green-700">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search player, course, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input flex-1"
        />
        <select
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value)}
          className="form-input sm:w-48"
        >
          <option value="all">All Players</option>
          {players.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'points' | 'player')}
          className="form-input sm:w-44"
        >
          <option value="date">Sort: Newest First</option>
          <option value="points">Sort: Most Points</option>
          <option value="player">Sort: Player A–Z</option>
        </select>
      </div>

      {(search || playerFilter !== 'all') && (
        <p className="text-sm text-gray-500">
          Showing {items.length} of {scores.length + bonuses.length} entries
          {playerFilter !== 'all' && ` for ${playerFilter}`}
        </p>
      )}

      {items.length === 0 ? (
        <div className="card text-center text-gray-500 py-16">
          {scores.length === 0 ? 'No rounds submitted yet.' : 'No rounds match your search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            item.kind === 'score'
              ? <ScoreCard key={item.data.id} s={item.data} />
              : <BonusCard key={item.data.id} b={item.data} />
          )}
        </div>
      )}
    </div>
  )
}
