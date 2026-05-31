'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

interface HoleScore  { hole: number; strokes: number }
interface MulliganRx { id: string; sender_name: string; hole: number | null; fired_at: string }

interface TeamState {
  id: string; name: string; group_id: string
  beers: number; hotdogs: number; hotdog_discount: number
  mulligan_bank: number; mulligans_sent: number
  mulligans_received: MulliganRx[]
  hole_scores: HoleScore[]; holes_played: number
  gross_total: number; net_total: number
}

interface GroupState {
  id: string; name: string; code: string
  location_lat: number | null; location_lon: number | null; location_at: string | null
  teams: TeamState[]
}

interface AllGroupState { groups: GroupState[] }

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ── Hole Score Grid ────────────────────────────────────────────────────────────

function HoleGrid({
  teamId, scores, onSave,
}: {
  teamId: string
  scores: HoleScore[]
  onSave: (hole: number, strokes: number | null) => void
}) {
  const [editing,  setEditing]  = useState<number | null>(null)
  const [val,      setVal]      = useState('')

  const scoreMap = Object.fromEntries(scores.map((s) => [s.hole, s.strokes]))

  const openHole = (hole: number) => {
    setEditing(hole)
    setVal(scoreMap[hole] != null ? String(scoreMap[hole]) : '')
  }

  const commit = (hole: number) => {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 1 && n <= 20) {
      onSave(hole, n)
    } else if (val === '' && scoreMap[hole]) {
      onSave(hole, null) // clear
    }
    setEditing(null)
  }

  return (
    <div>
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Hole Scores</p>
      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
          <button
            key={h}
            onClick={() => openHole(h)}
            className={`rounded-lg text-center py-1.5 text-xs font-bold transition-colors ${
              editing === h
                ? 'bg-green-600 text-white ring-2 ring-green-400'
                : scoreMap[h] != null
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="text-[9px] font-normal opacity-60">{h}</div>
            <div>{editing === h ? '…' : scoreMap[h] ?? '—'}</div>
          </button>
        ))}
      </div>
      {editing !== null && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-gray-600 font-semibold">Hole {editing}:</span>
          <input
            type="number"
            min={1}
            max={20}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(editing) }}
            autoFocus
            className="form-input w-20 py-1.5 text-sm text-center tabular-nums"
            placeholder="strokes"
          />
          <button onClick={() => commit(editing)}
            className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700">
            Save
          </button>
          <button onClick={() => setEditing(null)}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-200">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── Mulligan Fire Modal ────────────────────────────────────────────────────────

function MulliganModal({
  senderTeam, allTeams, onFire, onClose,
}: {
  senderTeam: TeamState
  allTeams: TeamState[]
  onFire: (targetId: string) => void
  onClose: () => void
}) {
  const targets = allTeams.filter((t) => t.id !== senderTeam.id)
  const [selected, setSelected] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-1">💀</div>
          <h3 className="text-lg font-extrabold text-gray-900">Fire a Reverse Mulligan</h3>
          <p className="text-sm text-gray-500 mt-1">
            {senderTeam.name} has <strong>{senderTeam.mulligan_bank}</strong> mulligan{senderTeam.mulligan_bank !== 1 ? 's' : ''} available
          </p>
        </div>

        <div className="space-y-2">
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${
                selected === t.id
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-gray-200 hover:border-red-300 text-gray-700'
              }`}
            >
              {t.name}
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ({t.holes_played > 0 ? `${t.net_total} strokes, ${t.holes_played}/18` : 'not started'})
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200">
            Cancel
          </button>
          <button
            disabled={!selected}
            onClick={() => { if (selected) onFire(selected) }}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🔫 FIRE
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({
  team, allTeams, currentHole, onAction,
}: {
  team: TeamState
  allTeams: TeamState[]
  currentHole: number
  onAction: () => void
}) {
  const [firing,    setFiring]    = useState(false)
  const [editName,  setEditName]  = useState(false)
  const [nameVal,   setNameVal]   = useState(team.name)
  const [busy,      setBusy]      = useState(false)

  const post = async (url: string, body: object) => {
    setBusy(true)
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      onAction()
    } finally { setBusy(false) }
  }

  const patchName = async () => {
    if (!nameVal.trim() || nameVal.trim() === team.name) { setEditName(false); return }
    setBusy(true)
    try {
      await fetch('/api/bday/team', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: team.id, name: nameVal.trim() }) })
      onAction()
    } finally { setBusy(false); setEditName(false) }
  }

  const savScore = (hole: number, strokes: number | null) => {
    if (strokes == null) {
      fetch('/api/bday/score', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: team.id, hole }) }).then(onAction)
    } else {
      fetch('/api/bday/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: team.id, hole, strokes }) }).then(onAction)
    }
  }

  const fireMulligan = async (targetId: string) => {
    setBusy(true)
    try {
      const res = await fetch('/api/bday/mulligan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderTeamId: team.id, targetTeamId: targetId, hole: currentHole }) })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Error') }
      else onAction()
    } finally { setBusy(false); setFiring(false) }
  }

  const dogsToNext = 3 - (team.hotdogs % 3)
  const nextDiscountAt = team.hotdogs + dogsToNext

  return (
    <>
      {firing && (
        <MulliganModal
          senderTeam={team}
          allTeams={allTeams}
          onFire={fireMulligan}
          onClose={() => setFiring(false)}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 px-4 py-3 flex items-center justify-between">
          {editName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') patchName() }}
                className="flex-1 bg-white/20 text-white placeholder:text-white/60 rounded-lg px-2 py-1 text-sm font-semibold border border-white/30 outline-none"
                autoFocus
              />
              <button onClick={patchName} className="text-white/80 hover:text-white text-sm font-bold">✓</button>
              <button onClick={() => { setEditName(false); setNameVal(team.name) }} className="text-white/60 hover:text-white text-sm">✕</button>
            </div>
          ) : (
            <button onClick={() => setEditName(true)} className="text-white font-bold text-base text-left hover:text-white/80 transition-colors">
              {team.name} <span className="text-white/40 text-xs font-normal ml-1">✏</span>
            </button>
          )}
          {team.holes_played > 0 && (
            <div className="text-right ml-3 shrink-0">
              <div className="text-2xl font-extrabold text-white tabular-nums leading-none">{team.net_total}</div>
              <div className="text-[10px] text-green-200">{team.holes_played}/18 holes</div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-amber-50 rounded-xl py-2 border border-amber-100">
              <div className="text-xl font-extrabold text-amber-700 tabular-nums">{team.beers}</div>
              <div className="text-[10px] text-amber-500 font-semibold uppercase tracking-wide">Beers</div>
            </div>
            <div className="bg-orange-50 rounded-xl py-2 border border-orange-100">
              <div className="text-xl font-extrabold text-orange-700 tabular-nums">{team.hotdogs}</div>
              <div className="text-[10px] text-orange-500 font-semibold uppercase tracking-wide">Hot Dogs</div>
              {team.hotdog_discount > 0 && (
                <div className="text-[10px] text-orange-600 font-bold">−{team.hotdog_discount} strokes</div>
              )}
            </div>
            <div className={`rounded-xl py-2 border ${team.mulligan_bank > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className={`text-xl font-extrabold tabular-nums ${team.mulligan_bank > 0 ? 'text-red-600' : 'text-gray-400'}`}>{team.mulligan_bank}</div>
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${team.mulligan_bank > 0 ? 'text-red-400' : 'text-gray-400'}`}>Mulligans</div>
            </div>
          </div>

          {/* Hot dog progress hint */}
          {team.hotdogs % 3 !== 0 && (
            <p className="text-[11px] text-orange-500 text-center font-medium">
              {dogsToNext} more dog{dogsToNext !== 1 ? 's' : ''} to unlock −1 stroke (at {nextDiscountAt} total)
            </p>
          )}

          {/* Mulligans received */}
          {team.mulligans_received.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-xs font-bold text-red-700 mb-1">💀 Incoming Mulligans</p>
              {team.mulligans_received.map((m) => (
                <p key={m.id} className="text-xs text-red-600">
                  {m.sender_name}{m.hole ? ` on hole ${m.hole}` : ''} — {relativeTime(m.fired_at)}
                </p>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => post('/api/bday/beer', { teamId: team.id, hole: currentHole })}
              disabled={busy}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors disabled:opacity-50 shadow-sm"
            >
              <span className="text-2xl">🍺</span>
              <span>Shotgun!</span>
              <span className="text-[10px] text-amber-200 font-normal">+1 mulligan</span>
            </button>

            <button
              onClick={() => post('/api/bday/hotdog', { teamId: team.id, hole: currentHole })}
              disabled={busy}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors disabled:opacity-50 shadow-sm"
            >
              <span className="text-2xl">🌭</span>
              <span>Ate a Dog!</span>
              <span className="text-[10px] text-orange-200 font-normal">
                {dogsToNext === 1 ? '🔥 one more for −1!' : `${dogsToNext} to −1 stroke`}
              </span>
            </button>
          </div>

          {team.mulligan_bank > 0 && (
            <button
              onClick={() => setFiring(true)}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span className="text-lg">💀</span>
              Fire Reverse Mulligan
              <span className="bg-red-800 rounded-lg px-1.5 py-0.5 text-[11px]">{team.mulligan_bank} left</span>
            </button>
          )}

          {/* Hole scores */}
          <HoleGrid teamId={team.id} scores={team.hole_scores} onSave={savScore} />
        </div>
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GroupDashboard({ groupCode }: { groupCode: string }) {
  const code = groupCode.toUpperCase()
  const [state,       setState]       = useState<AllGroupState | null>(null)
  const [currentHole, setCurrentHole] = useState(1)
  const [locBusy,     setLocBusy]     = useState(false)
  const [locMsg,      setLocMsg]      = useState('')

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/bday/state', { cache: 'no-store' })
      setState(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchState()
    const id = setInterval(fetchState, 10_000)
    return () => clearInterval(id)
  }, [fetchState])

  const group = state?.groups.find((g) => g.code === code)
  const allTeams = state?.groups.flatMap((g) => g.teams) ?? []

  const updateLocation = () => {
    if (!navigator.geolocation) { setLocMsg('GPS not supported'); return }
    setLocBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await fetch('/api/bday/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupCode: code, lat: pos.coords.latitude, lon: pos.coords.longitude }),
        })
        setLocMsg('Location updated!')
        setLocBusy(false)
        setTimeout(() => setLocMsg(''), 3000)
      },
      () => { setLocMsg('GPS error — allow location access'); setLocBusy(false) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  if (!state) return (
    <div className="text-center py-20">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  )

  if (!group) return (
    <div className="text-center py-16 space-y-3 card">
      <div className="text-4xl">🔍</div>
      <p className="font-bold text-gray-900">Group &ldquo;{code}&rdquo; not found</p>
      <p className="text-sm text-gray-500">Valid codes: GROUP1, GROUP2, GROUP3, GROUP4</p>
      <Link href="/dans-bday" className="inline-block mt-2 text-sm text-amber-600 font-semibold underline">← Back to leaderboard</Link>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dans-bday" className="text-xs text-gray-400 hover:text-gray-600 font-semibold">← Leaderboard</Link>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">{group.name}</h1>
          <p className="text-sm text-gray-500">Dan's Birthday Tournament · July 3rd</p>
        </div>
        <div className="text-4xl">🏌️</div>
      </div>

      {/* Current hole selector */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-600 shrink-0">Current hole:</span>
        <div className="flex gap-1 flex-wrap flex-1">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
            <button
              key={h}
              onClick={() => setCurrentHole(h)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                currentHole === h
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Team cards */}
      {group.teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          allTeams={allTeams}
          currentHole={currentHole}
          onAction={fetchState}
        />
      ))}

      {/* Location */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-700">📍 Share Group Location</p>
          {group.location_at && (
            <p className="text-xs text-gray-400">Last updated {relativeTime(group.location_at)}</p>
          )}
          {locMsg && <p className="text-xs text-green-600 font-semibold mt-0.5">{locMsg}</p>}
        </div>
        <button
          onClick={updateLocation}
          disabled={locBusy}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
        >
          {locBusy ? '…' : 'Update'}
        </button>
      </div>

      {/* Link to full leaderboard */}
      <Link
        href="/dans-bday"
        className="block text-center py-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 font-bold text-sm hover:bg-amber-100 transition-colors"
      >
        🏆 View Full Leaderboard
      </Link>

    </div>
  )
}
