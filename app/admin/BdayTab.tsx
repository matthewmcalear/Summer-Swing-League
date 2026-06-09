'use client'

import { useEffect, useState } from 'react'

interface BdayHoleScore { hole: number; strokes: number }
interface BdayMulliganRx { id: string; sender_name: string; hole: number | null; fired_at: string }
interface BdayActivityItem { id: string; type: string; hole: number | null; player: string | null; logged_at: string }
interface BdayTeamAdmin {
  id: string; name: string; player1: string; player2: string
  holes_played: number; total: number
  hole_scores: BdayHoleScore[]
  activities: BdayActivityItem[]
  mulligans_received: BdayMulliganRx[]
}
interface BdayGroupAdmin { id: string; name: string; code: string; teams: BdayTeamAdmin[] }

export default function BdayTab() {
  const [busy,        setBusy]        = useState(false)
  const [done,        setDone]        = useState(false)
  const [groups,      setGroups]      = useState<BdayGroupAdmin[]>([])
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [allMulligans, setAllMulligans] = useState<{ id: string; sender: string; target: string; hole: number | null; fired_at: string }[]>([])
  const [allActivities, setAllActivities] = useState<{ id: string; team: string; group: string; type: string; hole: number | null; player: string | null; logged_at: string }[]>([])

  const loadData = async () => {
    try {
      const res = await fetch('/api/bday/admin-data', { cache: 'no-store' })
      const data = await res.json()
      setGroups(data.groups ?? [])

      const mulligans: typeof allMulligans = []
      const activities: typeof allActivities = []
      for (const g of (data.groups ?? [])) {
        for (const t of g.teams) {
          for (const m of (t.mulligans_received ?? [])) {
            mulligans.push({ id: m.id, sender: m.sender_name, target: t.name, hole: m.hole, fired_at: m.fired_at })
          }
          for (const a of (t.activities ?? [])) {
            activities.push({ id: a.id, team: t.name, group: g.name, type: a.type, hole: a.hole, player: a.player, logged_at: a.logged_at })
          }
        }
      }
      setAllMulligans(mulligans.sort((a, b) => new Date(b.fired_at).getTime() - new Date(a.fired_at).getTime()))
      setAllActivities(activities.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()))
    } catch { /* ignore */ }
  }

  useEffect(() => { loadData() }, [])

  const reset = async () => {
    if (!confirm('Reset ALL birthday event data? This clears every score, beer, hot dog, mulligan, chat message, and GPS location. Groups and team names are kept. This cannot be undone.')) return
    setBusy(true)
    setDone(false)
    try {
      await fetch('/api/bday/reset', { method: 'DELETE' })
      setDone(true)
      await loadData()
    } finally { setBusy(false) }
  }

  const deleteMulligan = async (id: string) => {
    if (!confirm('Delete this mulligan?')) return
    await fetch('/api/bday/mulligan', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mulliganId: id }) })
    await loadData()
  }

  const deleteActivity = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    await fetch('/api/bday/activity', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityId: id }) })
    await loadData()
  }

  const clearScore = async (teamId: string, hole: number) => {
    if (!confirm(`Clear score for hole ${hole}?`)) return
    await fetch('/api/bday/score', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId, hole }) })
    await loadData()
  }

  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <p className="font-semibold text-gray-800">🎂 Dan's Birthday Tournament</p>
        <p className="text-sm text-gray-500">Manage teams, view the live leaderboard, or open a group dashboard.</p>
        <div className="flex gap-3 flex-wrap pt-1">
          <a href="/dans-bday" className="btn-secondary text-sm">🏆 Leaderboard</a>
          <a href="/dans-bday/admin" className="btn-secondary text-sm">⚙️ Manage Teams</a>
          <button onClick={loadData} className="btn-secondary text-sm">↻ Refresh</button>
        </div>
      </div>

      {/* Mulligans */}
      <div className="card space-y-3">
        <p className="font-semibold text-gray-800">💀 Mulligans ({allMulligans.length})</p>
        {allMulligans.length === 0 ? (
          <p className="text-sm text-gray-400">None fired yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 -mx-1">
            {allMulligans.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 px-1 gap-3">
                <div className="text-sm flex-1 min-w-0">
                  <span className="font-semibold text-gray-900">{m.sender}</span>
                  <span className="text-gray-400"> → </span>
                  <span className="font-semibold text-red-700">{m.target}</span>
                  {m.hole && <span className="text-gray-400 text-xs"> hole {m.hole}</span>}
                  <span className="text-gray-400 text-xs ml-2">{fmtTime(m.fired_at)}</span>
                </div>
                <button
                  onClick={() => deleteMulligan(m.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activities */}
      <div className="card space-y-3">
        <p className="font-semibold text-gray-800">🍺🌭 Activities ({allActivities.length})</p>
        {allActivities.length === 0 ? (
          <p className="text-sm text-gray-400">No beers or hot dogs logged yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 -mx-1 max-h-60 overflow-y-auto">
            {allActivities.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 px-1 gap-3">
                <div className="text-sm flex-1 min-w-0">
                  <span>{a.type === 'beer' ? '🍺' : '🌭'}</span>
                  <span className="font-semibold text-gray-900 ml-1">{a.player || a.team}</span>
                  <span className="text-gray-400 text-xs"> ({a.group})</span>
                  {a.hole && <span className="text-gray-400 text-xs"> hole {a.hole}</span>}
                  <span className="text-gray-400 text-xs ml-2">{fmtTime(a.logged_at)}</span>
                </div>
                <button
                  onClick={() => deleteActivity(a.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hole scores by team */}
      <div className="card space-y-3">
        <p className="font-semibold text-gray-800">⛳️ Hole Scores</p>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) =>
              g.teams.filter((t) => t.hole_scores.length > 0).map((t) => (
                <div key={t.id}>
                  <button
                    onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                    className="text-sm font-semibold text-gray-800 hover:text-green-700 flex items-center gap-2"
                  >
                    {expanded === t.id ? '▾' : '▸'} {t.name} <span className="text-gray-400 font-normal">({g.name}) — {t.holes_played} holes, {t.total} strokes</span>
                  </button>
                  {expanded === t.id && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-4">
                      {t.hole_scores.map((h) => (
                        <div key={h.hole} className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                          <span className="text-xs text-gray-500">H{h.hole}:</span>
                          <span className="text-sm font-bold text-gray-900">{h.strokes}</span>
                          <button
                            onClick={() => clearScore(t.id, h.hole)}
                            className="text-red-400 hover:text-red-600 text-xs ml-0.5"
                            title="Clear"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 space-y-3">
        <p className="font-bold text-red-800">⚠️ Reset Event Data</p>
        <p className="text-sm text-red-700">
          Wipes all scores, beers, hot dogs, mulligans, chat messages, and GPS locations —
          but keeps groups and team names intact. Use this after testing so you start July 3rd with a clean slate.
        </p>
        {done && <p className="text-sm font-semibold text-green-700">✓ All event data cleared. Ready for the real day!</p>}
        <button
          onClick={reset}
          disabled={busy}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {busy ? 'Resetting…' : '🗑️ Reset All Event Data'}
        </button>
      </div>
    </div>
  )
}
