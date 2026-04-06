'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Member, Score } from '@/types'

export default function AdminPage() {
  const [authed, setAuthed]   = useState(false)
  const [pw, setPw]           = useState('')
  const [pwErr, setPwErr]     = useState('')
  const [tab, setTab]         = useState<'members' | 'scores'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [scores, setScores]   = useState<Score[]>([])
  const [loading, setLoading] = useState(false)

  // Attempt login
  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErr('')
    const res = await fetch('/api/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      setAuthed(true)
      fetchAll()
    } else {
      setPwErr('Incorrect password')
    }
  }

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    setAuthed(false)
  }

  const fetchAll = async () => {
    setLoading(true)
    const [m, s] = await Promise.all([
      fetch('/api/members').then((r) => r.json()),
      fetch('/api/scores').then((r) => r.json()),
    ])
    setMembers(m)
    setScores(s)
    setLoading(false)
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Delete this member? This cannot be undone.')) return
    await fetch(`/api/members/${id}`, { method: 'DELETE' })
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const deleteScore = async (id: string) => {
    if (!confirm('Delete this score?')) return
    await fetch(`/api/scores/${id}`, { method: 'DELETE' })
    setScores((prev) => prev.filter((s) => s.id !== id))
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="card space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <form onSubmit={login} className="space-y-4">
            <input
              type="password"
              required
              placeholder="Admin password"
              className="form-input"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
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

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-700">{members.length}</div>
          <div className="text-xs text-gray-500 mt-1">Members</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-700">{scores.length}</div>
          <div className="text-xs text-gray-500 mt-1">Rounds Played</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-700">
            {scores.filter((s) => s.holes === 18).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">18-Hole Rounds</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-700">
            {scores.filter((s) => s.holes === 9).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">9-Hole Rounds</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('members')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'members' ? 'bg-green-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Members ({members.length})
        </button>
        <button
          onClick={() => setTab('scores')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'scores' ? 'bg-green-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Scores ({scores.length})
        </button>
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
                <th>Name</th>
                <th>Email</th>
                <th>Handicap</th>
                <th>Joined</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.full_name}</td>
                  <td>{m.email}</td>
                  <td>{m.current_handicap}</td>
                  <td className="text-xs text-gray-400">
                    {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td>
                    <button onClick={() => deleteMember(m.id)} className="btn-danger text-xs px-2 py-1">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                <th>Points</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap text-xs">
                    {new Date(s.play_date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </td>
                  <td className="font-medium">{s.player_name}</td>
                  <td>{s.course_name}</td>
                  <td>{s.holes}</td>
                  <td>{s.gross_score}</td>
                  <td>{s.handicap_used}</td>
                  <td className="font-semibold text-green-700">{Number(s.total_points).toFixed(1)}</td>
                  <td>
                    <button onClick={() => deleteScore(s.id)} className="btn-danger text-xs px-2 py-1">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Link href="/register" className="btn-secondary text-sm">+ Add Member</Link>
        <Link href="/submit-score" className="btn-secondary text-sm">+ Submit Score</Link>
      </div>
    </div>
  )
}
