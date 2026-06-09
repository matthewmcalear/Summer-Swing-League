'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Member, Score } from '@/types'
import MemberRow from './MemberRow'
import ScoreRow from './ScoreRow'
import CourseRow from './CourseRow'
import BonusesTab from './BonusesTab'
import EmailTab from './EmailTab'
import BdayTab from './BdayTab'

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
        <div className="card overflow-x-auto p-0 max-h-[70vh] overflow-y-auto">
          <table className="w-full table-base table-sticky">
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
        <div className="card overflow-x-auto p-0 max-h-[70vh] overflow-y-auto">
          <table className="w-full table-base table-sticky">
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
