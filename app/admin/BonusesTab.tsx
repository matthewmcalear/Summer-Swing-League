'use client'

import { useEffect, useState } from 'react'
import type { Member } from '@/types'

interface BonusRecord {
  id: string
  member_id: string
  member_name: string
  points: number
  reason: string
  awarded_date: string
}

export default function BonusesTab({ members }: { members: Member[] }) {
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
