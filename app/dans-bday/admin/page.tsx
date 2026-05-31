'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface TeamState  { id: string; name: string; group_id: string; holes_played: number }
interface GroupState { id: string; name: string; code: string; teams: TeamState[] }

export default function BdayAdminPage() {
  const [groups,  setGroups]  = useState<GroupState[]>([])
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(false)

  // per-team edit state
  const [editingName,  setEditingName]  = useState<Record<string, string>>({})
  const [editingGroup, setEditingGroup] = useState<Record<string, string>>({})

  // add-team state per group
  const [newTeamName, setNewTeamName] = useState<Record<string, string>>({})

  const fetchState = useCallback(async () => {
    try {
      const res  = await fetch('/api/bday/state', { cache: 'no-store' })
      const data = await res.json()
      setGroups(data.groups ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchState() }, [fetchState])

  const allTeams = groups.flatMap((g) => g.teams)

  const api = async (method: string, body: object) => {
    setBusy(true)
    try {
      const res = await fetch('/api/bday/team', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Error'); return false }
      return true
    } finally { setBusy(false) }
  }

  const saveName = async (team: TeamState) => {
    const name = editingName[team.id]
    if (!name?.trim() || name.trim() === team.name) { clearEdit(team.id); return }
    if (await api('PATCH', { teamId: team.id, name })) {
      clearEdit(team.id)
      fetchState()
    }
  }

  const saveGroup = async (team: TeamState) => {
    const groupId = editingGroup[team.id]
    if (!groupId || groupId === team.group_id) { clearGroupEdit(team.id); return }
    if (await api('PATCH', { teamId: team.id, groupId })) {
      clearGroupEdit(team.id)
      fetchState()
    }
  }

  const deleteTeam = async (team: TeamState) => {
    if (!confirm(`Delete "${team.name}"? This removes ALL their scores, beers, and hot dogs.`)) return
    if (await api('DELETE', { teamId: team.id })) fetchState()
  }

  const addTeam = async (groupId: string) => {
    const name = newTeamName[groupId]?.trim()
    if (!name) return
    if (await api('POST', { groupId, name })) {
      setNewTeamName((p) => ({ ...p, [groupId]: '' }))
      fetchState()
    }
  }

  const clearEdit      = (id: string) => setEditingName((p)  => { const n = { ...p }; delete n[id]; return n })
  const clearGroupEdit = (id: string) => setEditingGroup((p) => { const n = { ...p }; delete n[id]; return n })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dans-bday" className="text-xs text-gray-400 hover:text-gray-600 font-semibold">← Leaderboard</Link>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">⚙️ Manage Teams</h1>
          <p className="text-sm text-gray-500">Edit names, move teams between groups, add or remove players.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{group.name}</h2>
                  <p className="text-xs text-gray-400 font-mono">{group.code}</p>
                </div>
                <Link
                  href={`/dans-bday/${group.code}`}
                  className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100"
                >
                  Open dashboard →
                </Link>
              </div>

              <div className="space-y-3">
                {group.teams.map((team) => (
                  <div key={team.id} className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">

                    {/* Team name edit */}
                    {editingName[team.id] !== undefined ? (
                      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                        <input
                          value={editingName[team.id]}
                          onChange={(e) => setEditingName((p) => ({ ...p, [team.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveName(team); if (e.key === 'Escape') clearEdit(team.id) }}
                          autoFocus
                          className="form-input flex-1 py-1.5 text-sm"
                        />
                        <button onClick={() => saveName(team)} disabled={busy}
                          className="px-2.5 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">
                          Save
                        </button>
                        <button onClick={() => clearEdit(team.id)}
                          className="px-2.5 py-1.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingName((p) => ({ ...p, [team.id]: team.name }))}
                        className="flex-1 min-w-[140px] text-left font-semibold text-gray-800 hover:text-green-700 transition-colors"
                      >
                        {team.name}
                        <span className="ml-1.5 text-gray-400 text-xs font-normal">✏</span>
                      </button>
                    )}

                    {/* Group reassign */}
                    {editingGroup[team.id] !== undefined ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editingGroup[team.id]}
                          onChange={(e) => setEditingGroup((p) => ({ ...p, [team.id]: e.target.value }))}
                          className="form-input py-1.5 text-sm"
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        <button onClick={() => saveGroup(team)} disabled={busy}
                          className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          Move
                        </button>
                        <button onClick={() => clearGroupEdit(team.id)}
                          className="px-2.5 py-1.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingGroup((p) => ({ ...p, [team.id]: team.group_id }))}
                        className="text-xs text-blue-500 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Move group
                      </button>
                    )}

                    {/* Score indicator */}
                    {team.holes_played > 0 && (
                      <span className="text-xs text-gray-400 font-medium">
                        {team.holes_played}/18 holes played
                      </span>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => deleteTeam(team)}
                      disabled={busy}
                      className="ml-auto text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {/* Add team to group */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={newTeamName[group.id] ?? ''}
                  onChange={(e) => setNewTeamName((p) => ({ ...p, [group.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTeam(group.id) }}
                  placeholder="New team name…"
                  className="form-input flex-1 py-1.5 text-sm"
                />
                <button
                  onClick={() => addTeam(group.id)}
                  disabled={busy || !newTeamName[group.id]?.trim()}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Danger zone ── */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 space-y-3">
        <p className="font-bold text-red-800">⚠️ Danger Zone</p>
        <p className="text-sm text-red-700">
          Use <strong>Reset All Event Data</strong> to wipe all scores, beers, hot dogs, mulligans,
          and GPS locations — but keep groups and team names intact.
          Do this after testing so you start July 3rd with a clean slate.
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            if (!confirm('Reset ALL event data? This clears every score, beer, hot dog, mulligan, and GPS location. Groups and team names are kept. This cannot be undone.')) return
            setBusy(true)
            try {
              await fetch('/api/bday/reset', { method: 'DELETE' })
              await fetchState()
              alert('✓ All event data cleared. Ready for the real day!')
            } finally { setBusy(false) }
          }}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          🗑️ Reset All Event Data
        </button>
      </div>

      <div className="text-center">
        <Link href="/dans-bday" className="text-sm text-amber-600 font-semibold hover:underline">
          ← Back to leaderboard
        </Link>
      </div>
    </div>
  )
}
