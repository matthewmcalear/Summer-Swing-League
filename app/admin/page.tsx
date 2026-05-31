'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Member, Score } from '@/types'

// ── Inline edit row for a member ──────────────────────────────────────────────
function MemberRow({ member, onSave, onDelete }: {
  member: Member
  onSave: (id: string, data: Partial<Member>) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    full_name:          member.full_name,
    email:              member.email,
    current_handicap:   String(member.current_handicap),
    starting_handicap:  member.starting_handicap != null ? String(member.starting_handicap) : '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onSave(member.id, {
      full_name:         form.full_name,
      email:             form.email,
      current_handicap:  Number(form.current_handicap),
      starting_handicap: form.starting_handicap === '' ? null : Number(form.starting_handicap),
    })
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="bg-green-50">
        <td className="px-4 py-2">
          <input className="form-input py-1 text-xs" value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <input className="form-input py-1 text-xs" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <input className="form-input py-1 text-xs w-24" type="number" step="0.1" value={form.current_handicap}
            onChange={e => setForm(f => ({ ...f, current_handicap: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <input className="form-input py-1 text-xs w-24" type="number" step="0.1" placeholder="(none)"
            value={form.starting_handicap}
            onChange={e => setForm(f => ({ ...f, starting_handicap: e.target.value }))} />
          <div className="text-xs text-gray-400 mt-0.5">clear = no bonus</div>
        </td>
        <td className="px-4 py-2 flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="btn-secondary text-xs px-3 py-1">Cancel</button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td className="px-4 py-3 font-medium">{member.full_name}</td>
      <td className="px-4 py-3">{member.email}</td>
      <td className="px-4 py-3">{member.current_handicap}</td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {member.starting_handicap != null ? member.starting_handicap : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </td>
      <td className="px-4 py-3 flex gap-2">
        <button onClick={() => setEditing(true)} className="btn-secondary text-xs px-3 py-1">Edit</button>
        <button onClick={() => onDelete(member.id)} className="btn-danger text-xs px-2 py-1">Delete</button>
      </td>
    </tr>
  )
}

// ── Inline edit row for a score ───────────────────────────────────────────────
function ScoreRow({ score, onSave, onDelete }: {
  score: Score
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    player_name:       score.player_name,
    course_name:       score.course_name,
    holes:             String(score.holes),
    gross_score:       String(score.gross_score),
    handicap_used:     String(score.handicap_used),
    course_difficulty: score.course_difficulty,
    additional_points: String(score.additional_points ?? 0),
    play_date:         score.play_date?.slice(0, 10) ?? '',
    notes:             score.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onSave(score.id, {
      ...form,
      holes:             Number(form.holes),
      gross_score:       Number(form.gross_score),
      handicap_used:     Number(form.handicap_used),
      additional_points: Number(form.additional_points),
    })
    setSaving(false)
    setEditing(false)
  }

  const diffColor = { easy: 'text-blue-600', average: 'text-gray-600', tough: 'text-red-600' }

  if (editing) {
    return (
      <tr className="bg-green-50">
        <td className="px-4 py-2">
          <input type="date" className="form-input py-1 text-xs w-32" value={form.play_date}
            onChange={e => setForm(f => ({ ...f, play_date: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <input className="form-input py-1 text-xs w-32" value={form.player_name}
            onChange={e => setForm(f => ({ ...f, player_name: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <input className="form-input py-1 text-xs" value={form.course_name}
            onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <select className="form-input py-1 text-xs w-16" value={form.holes}
            onChange={e => setForm(f => ({ ...f, holes: e.target.value }))}>
            <option value="9">9</option>
            <option value="18">18</option>
          </select>
        </td>
        <td className="px-4 py-2">
          <input type="number" className="form-input py-1 text-xs w-20" value={form.gross_score}
            onChange={e => setForm(f => ({ ...f, gross_score: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <input type="number" step="0.1" className="form-input py-1 text-xs w-20" value={form.handicap_used}
            onChange={e => setForm(f => ({ ...f, handicap_used: e.target.value }))} />
        </td>
        <td className="px-4 py-2">
          <select className="form-input py-1 text-xs" value={form.course_difficulty}
            onChange={e => setForm(f => ({ ...f, course_difficulty: e.target.value as 'easy' | 'average' | 'tough' }))}>
            <option value="easy">Easy</option>
            <option value="average">Average</option>
            <option value="tough">Tough</option>
          </select>
        </td>
        <td className="px-4 py-2">
          <input type="number" step="0.5" className="form-input py-1 text-xs w-16" value={form.additional_points}
            onChange={e => setForm(f => ({ ...f, additional_points: e.target.value }))} />
        </td>
        <td className="px-4 py-2 text-gray-400 text-xs">recalc</td>
        <td className="px-4 py-2">
          <input className="form-input py-1 text-xs" value={form.notes}
            placeholder="notes"
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </td>
        <td className="px-4 py-2 flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="btn-secondary text-xs px-3 py-1">Cancel</button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td className="px-4 py-3 whitespace-nowrap text-xs">
        {new Date(score.play_date.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </td>
      <td className="px-4 py-3 font-medium">{score.player_name}</td>
      <td className="px-4 py-3">{score.course_name}</td>
      <td className="px-4 py-3">{score.holes}</td>
      <td className="px-4 py-3">{score.gross_score}</td>
      <td className="px-4 py-3">{score.handicap_used}</td>
      <td className={`px-4 py-3 capitalize text-xs font-medium ${diffColor[score.course_difficulty] ?? ''}`}>
        {score.course_difficulty}
      </td>
      <td className="px-4 py-3">{score.additional_points ?? 0}</td>
      <td className="px-4 py-3 font-bold text-green-700">{Number(score.total_points).toFixed(1)}</td>
      <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{score.notes || '—'}</td>
      <td className="px-4 py-3 flex gap-2">
        <button onClick={() => setEditing(true)} className="btn-secondary text-xs px-3 py-1">Edit</button>
        <button onClick={() => onDelete(score.id)} className="btn-danger text-xs px-2 py-1">Delete</button>
      </td>
    </tr>
  )
}

// ── Course rename row ─────────────────────────────────────────────────────────
function CourseRow({ name, count, onRename }: {
  name: string
  count: number
  onRename: (oldName: string, newName: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState(name)
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await onRename(name, newName.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="bg-green-50">
        <td className="px-4 py-2" colSpan={2}>
          <input
            autoFocus
            className="form-input py-1 text-sm w-full"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </td>
        <td className="px-4 py-2 text-xs text-gray-400">{count} round{count !== 1 ? 's' : ''}</td>
        <td className="px-4 py-2 flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1">
            {saving ? '…' : `Rename all ${count}`}
          </button>
          <button onClick={() => { setEditing(false); setNewName(name) }} className="btn-secondary text-xs px-3 py-1">
            Cancel
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td className="px-4 py-3 font-medium">{name}</td>
      <td className="px-4 py-3 text-gray-500 text-sm">{count} round{count !== 1 ? 's' : ''}</td>
      <td className="px-4 py-3">
        <button onClick={() => setEditing(true)} className="btn-secondary text-xs px-3 py-1">Rename</button>
      </td>
    </tr>
  )
}

// ── Bonuses tab ───────────────────────────────────────────────────────────────
interface BonusRecord {
  id: string
  member_id: string
  member_name: string
  points: number
  reason: string
  awarded_date: string
}

function BonusesTab({ members }: { members: Member[] }) {
  const active = members.filter((m) => m.is_active)
  const [bonuses, setBonuses]     = useState<BonusRecord[]>([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState({ member_id: '', points: '', reason: '', awarded_date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const fetchBonuses = async () => {
    const data = await fetch('/api/admin/season-bonuses').then((r) => r.json())
    setBonuses(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchBonuses() }, [])

  const award = async () => {
    if (!form.member_id || !form.points || !form.reason) { setError('All fields required.'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/admin/season-bonuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, points: Number(form.points) }),
    })
    if (res.ok) {
      setForm({ member_id: '', points: '', reason: '', awarded_date: new Date().toISOString().slice(0, 10) })
      await fetchBonuses()
    } else {
      const d = await res.json()
      setError(d.error || 'Failed.')
    }
    setSaving(false)
  }

  const remove = async (id: string, name: string, pts: number) => {
    if (!confirm(`Remove ${pts > 0 ? '+' : ''}${pts} pts from ${name}?`)) return
    await fetch('/api/admin/season-bonuses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await fetchBonuses()
  }

  return (
    <div className="space-y-6">
      {/* Award form */}
      <div className="card space-y-4">
        <p className="text-sm font-semibold text-gray-700">Award Season Bonus</p>
        <p className="text-xs text-gray-400">
          Points go directly to the player's season score and are shown transparently on standings.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Player *</label>
            <select className="form-input" value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })}>
              <option value="">Select player…</option>
              {active.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Points *</label>
            <input
              type="number"
              step="0.5"
              placeholder="e.g. 5"
              className="form-input"
              value={form.points}
              onChange={(e) => setForm({ ...form, points: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <input
              type="text"
              placeholder="e.g. Birthday Scramble – 1st place"
              className="form-input"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="form-input"
              value={form.awarded_date}
              onChange={(e) => setForm({ ...form, awarded_date: e.target.value })}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={award} disabled={saving} className="btn-primary px-6 py-2">
          {saving ? 'Awarding…' : 'Award Bonus'}
        </button>
      </div>

      {/* Existing bonuses */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Awarded Bonuses ({bonuses.length})</p>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bonuses.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400">No bonuses awarded yet.</p>
        ) : (
          <table className="w-full table-base">
            <thead>
              <tr><th>Player</th><th>Points</th><th>Reason</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {bonuses.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">{b.member_name}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{b.points > 0 ? '+' : ''}{b.points}</td>
                  <td className="px-4 py-3 text-gray-600">{b.reason}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(b.awarded_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(b.id, b.member_name, b.points)} className="btn-danger text-xs px-2 py-1">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Email tab ─────────────────────────────────────────────────────────────────
function EmailTab({ members }: { members: Member[] }) {
  const active = members.filter((m) => m.is_active)
  const [selected, setSelected] = useState<string[]>(active.map((m) => m.id))
  const [subject, setSubject]   = useState('')
  const [body, setBody]         = useState('')
  const [sending, setSending]   = useState(false)
  const [result, setResult]     = useState<{ ok: boolean; msg: string } | null>(null)

  const toggleAll = () =>
    setSelected(selected.length === active.length ? [] : active.map((m) => m.id))

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const send = async () => {
    if (!subject.trim() || !body.trim() || !selected.length) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/send-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subject, body, member_ids: selected }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, msg: `Sent to ${data.sent} member${data.sent !== 1 ? 's' : ''}.` })
        setSubject('')
        setBody('')
      } else {
        setResult({ ok: false, msg: data.error || 'Failed to send.' })
      }
    } catch {
      setResult({ ok: false, msg: 'Network error.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Recipient selector */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            Recipients <span className="text-gray-400 font-normal">({selected.length} of {active.length})</span>
          </p>
          <button onClick={toggleAll} className="text-xs text-green-700 hover:underline">
            {selected.length === active.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {active.map((m) => {
            const on = selected.includes(m.id)
            return (
              <label key={m.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                on ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-gray-200 text-gray-600 hover:border-green-400'
              }`}>
                <input type="checkbox" checked={on} onChange={() => toggle(m.id)} className="accent-green-600" />
                <span className="truncate">{m.full_name}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Compose */}
      <div className="card space-y-4">
        <p className="text-sm font-semibold text-gray-700">Compose</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
          <input
            className="form-input"
            placeholder="e.g. SSL 2026 — Week 3 Results"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
          <textarea
            rows={8}
            className="form-input"
            placeholder="Type your message here…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Plain text — line breaks are preserved.</p>
        </div>

        {result && (
          <div className={`rounded-lg p-3 text-sm ${result.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {result.msg}
          </div>
        )}

        <button
          onClick={send}
          disabled={sending || !selected.length || !subject.trim() || !body.trim()}
          className="btn-primary w-full py-3 text-base disabled:opacity-50"
        >
          {sending ? 'Sending…' : `Send to ${selected.length} member${selected.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}

// ── Dan's Bday tab ────────────────────────────────────────────────────────────

interface BdayHoleScore { hole: number; strokes: number }
interface BdayMulliganRx { id: string; sender_name: string; hole: number | null; fired_at: string }
interface BdayMulliganTx { id: string; target: { name: string }; hole: number | null; fired_at: string }
interface BdayActivityItem { id: string; type: string; hole: number | null; player: string | null; logged_at: string }
interface BdayTeamAdmin {
  id: string; name: string; player1: string; player2: string
  holes_played: number; total: number
  hole_scores: BdayHoleScore[]
  activities: BdayActivityItem[]
  mulligans_received: BdayMulliganRx[]
}
interface BdayGroupAdmin { id: string; name: string; code: string; teams: BdayTeamAdmin[] }

function BdayTab() {
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

// ── Main admin page ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed]   = useState(false)
  const [pw, setPw]           = useState('')
  const [pwErr, setPwErr]     = useState('')
  const [tab, setTab]         = useState<'members' | 'scores' | 'courses' | 'email' | 'bonuses' | 'bday'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [scores, setScores]   = useState<Score[]>([])
  const [courses, setCourses] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(false)

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErr('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) { setAuthed(true); fetchAll() }
    else setPwErr('Incorrect password')
  }

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    setAuthed(false)
  }

  const fetchAll = async () => {
    setLoading(true)
    const [m, s, c] = await Promise.all([
      fetch('/api/admin/members').then(r => r.json()),
      fetch('/api/scores').then(r => r.json()),
      fetch('/api/admin/courses').then(r => r.json()),
    ])
    setMembers(m)
    setScores(s)
    setCourses(Array.isArray(c) ? c : [])
    setLoading(false)
  }

  const renameCourse = async (oldName: string, newName: string) => {
    await fetch('/api/admin/courses', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ old_name: oldName, new_name: newName }),
    })
    await fetchAll()
  }

  const saveMember = async (id: string, data: Partial<Member>) => {
    const res = await fetch(`/api/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setMembers(prev => prev.map(m => m.id === id ? updated : m))
    }
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Delete this member? This cannot be undone.')) return
    await fetch(`/api/members/${id}`, { method: 'DELETE' })
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const saveScore = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`/api/scores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setScores(prev => prev.map(s => s.id === id ? updated : s))
    }
  }

  const deleteScore = async (id: string) => {
    if (!confirm('Delete this score?')) return
    await fetch(`/api/scores/${id}`, { method: 'DELETE' })
    setScores(prev => prev.filter(s => s.id !== id))
    // Refresh members so handicap changes from the delete are reflected
    const m = await fetch('/api/admin/members').then(r => r.json())
    setMembers(m)
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="card space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <form onSubmit={login} className="space-y-4">
            <input type="password" required placeholder="Admin password" className="form-input"
              value={pw} onChange={e => setPw(e.target.value)} />
            {pwErr && <p className="text-sm text-red-600">{pwErr}</p>}
            <button type="submit" className="btn-primary w-full">Login</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex gap-3">
          <button onClick={fetchAll} className="btn-secondary text-sm">↻ Refresh</button>
          <button onClick={logout}   className="btn-danger text-sm">Logout</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Members',      value: members.length },
          { label: 'Rounds',       value: scores.length },
          { label: '18-Hole',      value: scores.filter(s => s.holes === 18).length },
          { label: '9-Hole',       value: scores.filter(s => s.holes === 9).length },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <div className="text-2xl font-bold text-green-700">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'members', label: `Members (${members.length})` },
          { key: 'scores',  label: `Scores (${scores.length})`  },
          { key: 'courses', label: `Courses (${courses.length})` },
          { key: 'bonuses', label: 'Bonuses' },
          { key: 'email',   label: 'Email League' },
          { key: 'bday',    label: '🎂 Dan\'s Bday' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-green-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'members' ? (
        <div className="card overflow-x-auto p-0">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Current HC</th><th>Starting HC</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <MemberRow key={m.id} member={m} onSave={saveMember} onDelete={deleteMember} />
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'scores' ? (
        <div className="card overflow-x-auto p-0">
          <table className="w-full table-base">
            <thead>
              <tr>
                <th>Date</th><th>Player</th><th>Course</th><th>Holes</th>
                <th>Gross</th><th>Handicap</th><th>Difficulty</th>
                <th>⭐ Commissioner Bonus</th><th>Total Pts</th><th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scores.map(s => (
                <ScoreRow key={s.id} score={s} onSave={saveScore} onDelete={deleteScore} />
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'courses' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Rename a course to fix spelling variants — updates every score that uses that name at once.
          </p>
          <div className="card overflow-x-auto p-0">
            <table className="w-full table-base">
              <thead>
                <tr>
                  <th>Course Name</th><th>Rounds</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No rounds submitted yet.</td></tr>
                ) : courses.map((c) => (
                  <CourseRow key={c.name} name={c.name} count={c.count} onRename={renameCourse} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'bonuses' ? (
        <BonusesTab members={members} />
      ) : tab === 'bday' ? (
        <BdayTab />
      ) : (
        <EmailTab members={members} />
      )}

      <div className="flex gap-3 flex-wrap">
        <Link href="/register"     className="btn-secondary text-sm">+ Add Member</Link>
        <Link href="/submit-score" className="btn-secondary text-sm">+ Submit Score</Link>
      </div>
    </div>
  )
}
