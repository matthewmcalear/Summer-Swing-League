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
    full_name:        member.full_name,
    email:            member.email,
    current_handicap: String(member.current_handicap),
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onSave(member.id, {
      full_name:        form.full_name,
      email:            form.email,
      current_handicap: Number(form.current_handicap),
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
        <td className="px-4 py-2 text-xs text-gray-400">—</td>
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

// ── Main admin page ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed]   = useState(false)
  const [pw, setPw]           = useState('')
  const [pwErr, setPwErr]     = useState('')
  const [tab, setTab]         = useState<'members' | 'scores'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [scores, setScores]   = useState<Score[]>([])
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
    const [m, s] = await Promise.all([
      fetch('/api/members').then(r => r.json()),
      fetch('/api/scores').then(r => r.json()),
    ])
    setMembers(m)
    setScores(s)
    setLoading(false)
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
      <div className="flex gap-2">
        {(['members', 'scores'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-green-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}>
            {t === 'members' ? `Members (${members.length})` : `Scores (${scores.length})`}
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
                <th>Name</th><th>Email</th><th>Handicap</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <MemberRow key={m.id} member={m} onSave={saveMember} onDelete={deleteMember} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
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
      )}

      <div className="flex gap-3 flex-wrap">
        <Link href="/register"     className="btn-secondary text-sm">+ Add Member</Link>
        <Link href="/submit-score" className="btn-secondary text-sm">+ Submit Score</Link>
      </div>
    </div>
  )
}
