'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

interface HoleScore  { hole: number; strokes: number }
interface MulliganRx { id: string; sender_name: string; hole: number | null; fired_at: string }

interface TeamState {
  id: string; name: string; player1: string; player2: string; group_id: string
  beers: number; hotdogs: number; hotdog_discount: number
  mulligan_bank: number; mulligans_sent: number
  mulligans_received: MulliganRx[]
  hole_scores: HoleScore[]; holes_played: number
  total: number
}

interface GroupState {
  id: string; name: string; code: string
  location_lat: number | null; location_lon: number | null; location_at: string | null
  teams: TeamState[]
}

interface ChatMessage { id: string; sender_name: string; text: string; sent_at: string }

interface AllGroupState { groups: GroupState[]; messages: ChatMessage[] }

// ── Course par ─────────────────────────────────────────────────────────────────
// Carling Lake Golf Club — White tees (73.3 / 104%)
const HOLE_PARS = [4, 4, 4, 4, 5, 3, 4, 4, 4, 4, 4, 4, 4, 3, 5, 4, 3, 5]
const TOTAL_PAR = HOLE_PARS.reduce((s, p) => s + p, 0) // 72

function playedPar(holeScores: HoleScore[]): number {
  return holeScores.reduce((s, h) => s + (HOLE_PARS[h.hole - 1] ?? 4), 0)
}

function fmtVsPar(total: number, holeScores: HoleScore[]): string {
  if (holeScores.length === 0) return ''
  const diff = total - playedPar(holeScores)
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ── Hole Score Grid ────────────────────────────────────────────────────────────

const COMMON_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Bottom sheet for entering a hole score — shared by the hole grid and the
// sticky quick-action bar.
function ScoreSheet({ hole, current, onSave, onClear, onClose }: {
  hole: number
  current: number | undefined
  onSave: (hole: number, strokes: number) => void
  onClear: (hole: number) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-t-2xl p-5 space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-gray-900 text-lg">Hole {hole}</p>
          <div className="flex items-center gap-2">
            {current != null && (
              <button onClick={() => onClear(hole)} className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50">Clear</button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {COMMON_SCORES.map((n) => (
            <button
              key={n}
              onClick={() => onSave(hole, n)}
              className={`py-3 rounded-xl font-extrabold transition-colors ${
                current === n
                  ? 'bg-green-600 text-white'
                  : n === 1
                    ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300'
                    : 'bg-gray-100 hover:bg-green-100 text-gray-800'
              }`}
            >
              {n === 1 ? <span className="text-sm leading-tight block">1<br/>⛳️</span> : <span className="text-lg">{n}</span>}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-medium">Score above 10? Type it:</p>
          <div className="flex gap-2">
            <input
              type="number" min={1} max={99}
              placeholder="e.g. 11, 12…"
              className="form-input flex-1 text-center text-lg font-bold py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const n = parseInt((e.target as HTMLInputElement).value, 10)
                  if (!isNaN(n) && n >= 1) onSave(hole, n)
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = (e.currentTarget.previousSibling as HTMLInputElement)
                const n = parseInt(input.value, 10)
                if (!isNaN(n) && n >= 1) onSave(hole, n)
              }}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HoleGrid({
  scores, onSave,
}: {
  scores: HoleScore[]
  onSave: (hole: number, strokes: number | null) => void
}) {
  const [editing, setEditing] = useState<number | null>(null)

  const scoreMap = Object.fromEntries(scores.map((s) => [s.hole, s.strokes]))

  const save = (hole: number, strokes: number) => {
    onSave(hole, strokes)
    setEditing(null)
  }

  const clear = (hole: number) => {
    onSave(hole, null)
    setEditing(null)
  }

  return (
    <>
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Hole Scores</p>
        <div className="grid grid-cols-9 gap-1">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
            <button
              key={h}
              onClick={() => setEditing(h)}
              className={`rounded-lg text-center py-1.5 text-xs font-bold transition-colors ${
                editing === h
                  ? 'bg-green-600 text-white ring-2 ring-green-400'
                  : scoreMap[h] != null
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="text-[9px] font-normal opacity-60">{h}</div>
              <div>{scoreMap[h] ?? '—'}</div>
              <div className="text-[8px] font-normal opacity-40">p{HOLE_PARS[h - 1]}</div>
            </button>
          ))}
        </div>
      </div>

      {editing !== null && (
        <ScoreSheet
          hole={editing}
          current={scoreMap[editing]}
          onSave={(h, n) => save(h, n)}
          onClear={(h) => clear(h)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
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
                ({t.holes_played > 0 ? `${t.total} strokes, ${t.holes_played}/18` : 'not started'})
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
  team, allTeams, currentHole, groupCode, onAction, onHoleScored,
}: {
  team: TeamState
  allTeams: TeamState[]
  currentHole: number
  groupCode: string
  onAction: () => void
  onHoleScored: (hole: number) => void
}) {
  const [firing,   setFiring]   = useState(false)
  const [editName, setEditName] = useState(false)
  const [nameVal,  setNameVal]  = useState(team.name)
  const [busy,     setBusy]     = useState(false)

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

  const silentlyUpdateLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => fetch('/api/bday/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupCode, lat: pos.coords.latitude, lon: pos.coords.longitude }),
      }),
      () => { /* silent — GPS optional */ },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
  }

  const savScore = (hole: number, strokes: number | null) => {
    if (strokes == null) {
      fetch('/api/bday/score', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: team.id, hole }) }).then(onAction)
    } else {
      fetch('/api/bday/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: team.id, hole, strokes }) }).then(onAction)
      silentlyUpdateLocation()
      onHoleScored(hole)
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
              <div className="text-2xl font-extrabold text-white tabular-nums leading-none">{team.total}</div>
              <div className="text-[10px] text-green-200 tabular-nums">
                {fmtVsPar(team.total, team.hole_scores)} · {team.holes_played}/18
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Mulligan bank stat */}
          <div className={`rounded-xl py-2 border text-center ${team.mulligan_bank > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
            <div className={`text-xl font-extrabold tabular-nums ${team.mulligan_bank > 0 ? 'text-red-600' : 'text-gray-400'}`}>{team.mulligan_bank}</div>
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${team.mulligan_bank > 0 ? 'text-red-400' : 'text-gray-400'}`}>Mulligans available</div>
          </div>

          {/* Hot dog discount reminder */}
          {team.hotdog_discount > 0 && (
            <p className="text-[11px] text-orange-600 text-center font-semibold bg-orange-50 rounded-lg py-1.5 px-2 border border-orange-100">
              🌭 You've earned −{team.hotdog_discount} stroke{team.hotdog_discount !== 1 ? 's' : ''} — subtract when entering your scores
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
            {/* Beer counter */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-amber-200">
                <span className="text-xs font-bold text-amber-700">🍺 Beers</span>
                <span className="text-lg font-extrabold text-amber-700 tabular-nums">{team.beers}</span>
              </div>
              <div className="flex">
                <button
                  disabled={busy || team.beers === 0}
                  className="flex-1 py-2.5 text-amber-600 font-bold text-xl hover:bg-amber-100 transition-colors disabled:opacity-30"
                  onClick={() => {
                    setBusy(true)
                    fetch('/api/bday/beer', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: team.id }) })
                      .then(onAction).finally(() => setBusy(false))
                  }}
                >
                  −
                </button>
                <div className="w-px bg-amber-200" />
                <button
                  disabled={busy}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xl transition-colors disabled:opacity-50"
                  onClick={() => post('/api/bday/beer', { teamId: team.id, hole: currentHole })}
                >
                  +
                </button>
              </div>
              <p className="text-[10px] text-amber-500 text-center pb-1.5">+1 mulligan per beer</p>
            </div>

            {/* Hot dog counter */}
            <div className="rounded-xl bg-orange-50 border border-orange-200 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-orange-200">
                <span className="text-xs font-bold text-orange-700">🌭 Hot Dogs</span>
                <span className="text-lg font-extrabold text-orange-700 tabular-nums">{team.hotdogs}</span>
              </div>
              <div className="flex">
                <button
                  disabled={busy || team.hotdogs === 0}
                  className="flex-1 py-2.5 text-orange-600 font-bold text-xl hover:bg-orange-100 transition-colors disabled:opacity-30"
                  onClick={() => {
                    setBusy(true)
                    fetch('/api/bday/hotdog', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: team.id }) })
                      .then(onAction).finally(() => setBusy(false))
                  }}
                >
                  −
                </button>
                <div className="w-px bg-orange-200" />
                <button
                  disabled={busy}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl transition-colors disabled:opacity-50"
                  onClick={() => post('/api/bday/hotdog', { teamId: team.id, hole: currentHole })}
                >
                  +
                </button>
              </div>
              <p className="text-[10px] text-orange-500 text-center pb-1.5">
                {dogsToNext === 1 ? '🔥 one more for −1 stroke!' : `${dogsToNext} more for next −1 stroke`}
              </p>
            </div>
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
          <HoleGrid scores={team.hole_scores} onSave={savScore} />
        </div>
      </div>
    </>
  )
}

// ── Chat ──────────────────────────────────────────────────────────────────────

function ChatPanel({ messages, senderName }: { messages: ChatMessage[]; senderName: string }) {
  const [text,    setText]    = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)

  const initialised = useRef(false)
  useEffect(() => {
    if (!initialised.current) { initialised.current = true; return }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await fetch('/api/bday/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderName, text: trimmed }),
      })
      setText('')
    } finally { setSending(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
        <h2 className="text-white font-bold text-sm">💬 Trash Talk</h2>
        <p className="text-blue-200 text-[11px]">Chatting as {senderName}</p>
      </div>

      <div className="h-52 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center pt-8">No messages yet. Say something!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.sender_name === senderName ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.sender_name === senderName
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
              }`}>
                {m.text}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                {m.sender_name} · {relativeTime(m.sent_at)}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 flex gap-2 border-t border-gray-100">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Say something…"
          maxLength={200}
          className="form-input flex-1 py-2 text-sm"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GroupDashboard({ groupCode }: { groupCode: string }) {
  const code = groupCode.toUpperCase()
  const [state,       setState]       = useState<AllGroupState | null>(null)
  const [currentHole, setCurrentHole] = useState(1)
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [quickHole,   setQuickHole]   = useState<number | null>(null)
  const [quickBusy,   setQuickBusy]   = useState(false)
  const [autoLoc,     setAutoLoc]     = useState(false)
  const [locMsg,      setLocMsg]      = useState('')
  const watchIdRef                    = useRef<number | null>(null)

  // Track seen mulligan IDs so we can show notifications for new ones
  const seenMulliganIds = useRef<Set<string>>(new Set())
  const [newMulligans,  setNewMulligans] = useState<{ sender_name: string; hole: number | null; team_name: string }[]>([])

  // notifyReady is true after the first successful load — prevents false alerts on mount
  const notifyReady = useRef(false)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/bday/state', { cache: 'no-store' })
      const data: AllGroupState = await res.json()
      setState(data)

      const myGroup = data.groups.find((g) => g.code === code)
      if (myGroup) {
        const fresh: typeof newMulligans = []
        for (const team of myGroup.teams) {
          for (const m of team.mulligans_received) {
            if (!seenMulliganIds.current.has(m.id)) {
              seenMulliganIds.current.add(m.id)
              if (notifyReady.current) {
                fresh.push({ sender_name: m.sender_name, hole: m.hole, team_name: team.name })
              }
            }
          }
        }
        if (fresh.length > 0) setNewMulligans((p) => [...p, ...fresh])
      }
      notifyReady.current = true
    } catch { /* ignore */ }
  }, [code])

  useEffect(() => {
    fetchState()
    const id = setInterval(fetchState, 10_000)
    return () => clearInterval(id)
  }, [fetchState])

  // Auto-location via watchPosition
  useEffect(() => {
    if (!autoLoc) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }
    if (!navigator.geolocation) { setLocMsg('GPS not available'); setAutoLoc(false); return }

    const postLoc = async (lat: number, lon: number) => {
      await fetch('/api/bday/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupCode: code, lat, lon }),
      })
      setLocMsg(`📍 Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => postLoc(pos.coords.latitude, pos.coords.longitude),
      () => { setLocMsg('GPS error — check location permissions'); setAutoLoc(false) },
      { enableHighAccuracy: true, maximumAge: 30_000 },
    )
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [autoLoc, code])

  const group    = state?.groups.find((g) => g.code === code)
  const allTeams = state?.groups.flatMap((g) => g.teams) ?? []
  const messages = state?.messages ?? []

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

  // Active team for the sticky quick-action bar (defaults to the first team).
  const activeTeam = group.teams.find((t) => t.id === activeTeamId) ?? group.teams[0]

  const quickPost = async (url: string) => {
    if (!activeTeam) return
    setQuickBusy(true)
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: activeTeam.id, hole: currentHole }) })
      fetchState()
    } finally { setQuickBusy(false) }
  }

  const quickSaveScore = (hole: number, strokes: number | null) => {
    if (!activeTeam) return
    if (strokes == null) {
      fetch('/api/bday/score', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: activeTeam.id, hole }) }).then(fetchState)
    } else {
      fetch('/api/bday/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: activeTeam.id, hole, strokes }) }).then(fetchState)
      if (hole < 18) setCurrentHole(hole + 1)
    }
    setQuickHole(null)
  }

  return (
    <div className="space-y-5">

      {/* ── Mulligan incoming notification ── */}
      {newMulligans.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm bg-red-600 text-white rounded-2xl shadow-2xl p-5 space-y-3 animate-bounce-once">
            <div className="flex items-center gap-3">
              <span className="text-4xl">💀</span>
              <div>
                <p className="font-extrabold text-lg leading-tight">REVERSE MULLIGAN!</p>
                <p className="text-red-200 text-sm">Someone just nuked you</p>
              </div>
            </div>
            {newMulligans.map((m, i) => (
              <p key={i} className="text-sm font-semibold bg-red-700/50 rounded-xl px-3 py-2">
                💀 <strong>{m.sender_name}</strong> fired at <strong>{m.team_name}</strong>
                {m.hole ? ` on hole ${m.hole}` : ''}
              </p>
            ))}
            <button
              onClick={() => setNewMulligans([])}
              className="w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-colors"
            >
              Got it — REVENGE TIME 🔫
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-green-700 to-green-600 text-white px-5 py-4 shadow-lg">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Link
            href="/dans-bday"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-colors"
          >
            ← Leaderboard
          </Link>
          <span className="text-3xl">🏌️</span>
        </div>
        <h1 className="text-2xl font-extrabold leading-tight">{group.name}</h1>
        <p className="text-green-200 text-xs mt-1">Dan's Birthday Tournament · July 3rd</p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <div className="inline-block bg-white/20 rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide">
            Your group: {group.code}
          </div>
          <select
            value={group.code}
            onChange={(e) => { if (e.target.value !== group.code) window.location.href = `/dans-bday/${e.target.value}` }}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg px-2 py-1 border border-white/30 outline-none cursor-pointer"
          >
            {state.groups.map((g) => (
              <option key={g.code} value={g.code} className="text-gray-900 bg-white">
                {g.name}
              </option>
            ))}
          </select>
        </div>
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
          groupCode={code}
          onAction={fetchState}
          onHoleScored={(hole) => setCurrentHole((prev) => hole >= prev && hole < 18 ? hole + 1 : prev)}
        />
      ))}

      {/* Auto-location */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700">
              📍 Live Location Sharing
              {autoLoc && <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {autoLoc ? 'Tracking — updates automatically as you move' : 'Let other groups see where you are on the course'}
            </p>
            {locMsg && <p className="text-xs text-green-600 font-semibold mt-1">{locMsg}</p>}
            {group.location_at && !autoLoc && (
              <p className="text-xs text-gray-400 mt-0.5">Last shared {relativeTime(group.location_at)}</p>
            )}
          </div>
          <button
            onClick={() => setAutoLoc((v) => !v)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors border ${
              autoLoc
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-700'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
            }`}
          >
            {autoLoc ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {/* Group Chat */}
      <ChatPanel messages={messages} senderName={group.name} />

      {/* Spacer so the sticky quick-bar doesn't overlap the last card */}
      <div className="h-36" />

      {/* Sticky quick-action bar — log without scrolling */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-3 pt-2 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg space-y-2"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Active team + back to leaderboard */}
        <div className="flex items-center gap-2">
          {group.teams.length > 1 && (
            <div className="flex gap-1 flex-1 min-w-0">
              {group.teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTeamId(t.id)}
                  className={`flex-1 min-w-0 truncate px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    activeTeam?.id === t.id ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          <Link
            href="/dans-bday"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold transition-colors"
          >
            🏆 Leaderboard
          </Link>
        </div>

        {/* Hole + quick actions for the active team */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex items-center justify-between bg-gray-100 rounded-xl">
            <button onClick={() => setCurrentHole((h) => Math.max(1, h - 1))} className="w-9 h-10 text-xl font-bold text-gray-500">−</button>
            <span className="text-sm font-extrabold text-gray-800 tabular-nums">H{currentHole}</span>
            <button onClick={() => setCurrentHole((h) => Math.min(18, h + 1))} className="w-9 h-10 text-xl font-bold text-gray-500">+</button>
          </div>
          <button onClick={() => quickPost('/api/bday/hotdog')} disabled={quickBusy} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-2 text-base disabled:opacity-50">+🌭</button>
          <button onClick={() => quickPost('/api/bday/beer')} disabled={quickBusy} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 text-base disabled:opacity-50">+🍺</button>
          <button onClick={() => setQuickHole(currentHole)} className="rounded-xl bg-green-700 hover:bg-green-800 text-white font-extrabold py-2 text-sm">📝 Score</button>
        </div>
        {group.teams.length > 1 && (
          <p className="text-[10px] text-gray-400 text-center -mt-0.5">Logging for <strong className="text-gray-600">{activeTeam?.name}</strong> · hole {currentHole}</p>
        )}
      </div>

      {/* Quick score sheet */}
      {quickHole !== null && activeTeam && (
        <ScoreSheet
          hole={quickHole}
          current={activeTeam.hole_scores.find((s) => s.hole === quickHole)?.strokes}
          onSave={(h, n) => quickSaveScore(h, n)}
          onClear={(h) => quickSaveScore(h, null)}
          onClose={() => setQuickHole(null)}
        />
      )}

    </div>
  )
}
