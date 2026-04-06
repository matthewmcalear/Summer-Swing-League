'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Member } from '@/types'

const DIFFICULTY_OPTIONS = [
  { value: 'easy',    label: 'Easy (×0.95)'    },
  { value: 'average', label: 'Average (×1.00)'  },
  { value: 'tough',   label: 'Tough (×1.05)'   },
]

export default function SubmitScore() {
  const router = useRouter()

  const [members, setMembers]             = useState<Member[]>([])
  const [groupIds, setGroupIds]           = useState<string[]>([])
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')
  const [previewPoints, setPreviewPoints] = useState<number | null>(null)

  const [form, setForm] = useState({
    member_id:        '',
    holes:            '18',
    gross_score:      '',
    handicap_used:    '',
    course_name:      '',
    course_difficulty: 'average',
    play_date:        new Date().toISOString().split('T')[0],
    additional_points: '0',
    notes:            '',
  })

  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((d: Member[]) => setMembers(d.filter((m) => m.is_active)))
      .catch(() => {})
  }, [])

  // Auto-fill handicap when player changes
  useEffect(() => {
    if (!form.member_id) return
    const member = members.find((m) => m.id === form.member_id)
    if (member) setForm((f) => ({ ...f, handicap_used: String(member.current_handicap) }))
  }, [form.member_id, members])

  // Live point preview
  useEffect(() => {
    const holes    = Number(form.holes) as 9 | 18
    const gross    = Number(form.gross_score)
    const handicap = Number(form.handicap_used)
    const extra    = Number(form.additional_points) || 0

    if (!gross || !handicap) { setPreviewPoints(null); return }

    const diffMap: Record<string, number> = { easy: 0.95, average: 1.0, tough: 1.05 }
    const mult   = diffMap[form.course_difficulty] ?? 1.0
    const others = groupIds.length

    let base: number
    if (holes === 9) {
      base = 75 - (gross - handicap / 2)
    } else {
      base = (150 - (gross - handicap)) / 2
    }

    const total = base * mult + others + extra
    setPreviewPoints(Math.round(total * 100) / 100)
  }, [form, groupIds])

  const toggleGroup = (id: string) => {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/scores', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          holes:             Number(form.holes),
          gross_score:       Number(form.gross_score),
          handicap_used:     Number(form.handicap_used),
          additional_points: Number(form.additional_points) || 0,
          group_member_ids:  groupIds,
        }),
      })

      if (res.ok) {
        router.push('/success')
      } else {
        const body = await res.json()
        setError(body.error || 'Failed to submit. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const availableGroupMembers = members.filter((m) => m.id !== form.member_id)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Submit a Round</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Enter your round details below. Your handicap will be updated automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Player */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Player *</label>
          <select
            required
            className="form-input"
            value={form.member_id}
            onChange={(e) => setForm({ ...form, member_id: e.target.value })}
          >
            <option value="">Select your name…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Handicap — auto-filled, editable */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Handicap (18-hole) *
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="54"
            required
            placeholder="e.g. 14.2"
            className="form-input"
            value={form.handicap_used}
            onChange={(e) => setForm({ ...form, handicap_used: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">
            Pre-filled from your profile. Update if your handicap has changed — it will be saved.
          </p>
        </div>

        {/* Holes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Holes Played *</label>
          <div className="flex gap-3">
            {['9', '18'].map((h) => (
              <label
                key={h}
                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${
                  form.holes === h
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                }`}
              >
                <input
                  type="radio"
                  name="holes"
                  value={h}
                  className="sr-only"
                  checked={form.holes === h}
                  onChange={() => setForm({ ...form, holes: h })}
                />
                {h} holes
              </label>
            ))}
          </div>
        </div>

        {/* Gross score */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gross Score *</label>
          <input
            type="number"
            required
            min="1"
            placeholder={form.holes === '9' ? 'e.g. 42' : 'e.g. 88'}
            className="form-input"
            value={form.gross_score}
            onChange={(e) => setForm({ ...form, gross_score: e.target.value })}
          />
        </div>

        {/* Course name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Pebble Beach Golf Links"
            className="form-input"
            value={form.course_name}
            onChange={(e) => setForm({ ...form, course_name: e.target.value })}
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Difficulty *</label>
          <div className="flex gap-3">
            {DIFFICULTY_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-lg border cursor-pointer text-xs font-medium transition-colors text-center ${
                  form.course_difficulty === value
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={value}
                  className="sr-only"
                  checked={form.course_difficulty === value}
                  onChange={() => setForm({ ...form, course_difficulty: value })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Played *</label>
          <input
            type="date"
            required
            min="2026-04-15"
            max="2026-10-10"
            className="form-input"
            value={form.play_date}
            onChange={(e) => setForm({ ...form, play_date: e.target.value })}
          />
        </div>

        {/* Group members */}
        {availableGroupMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other League Members in Group
              <span className="ml-1 text-gray-400 font-normal">(+1 point each)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableGroupMembers.map((m) => {
                const checked = groupIds.includes(m.id)
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                      checked
                        ? 'bg-green-50 border-green-500 text-green-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-green-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroup(m.id)}
                      className="accent-green-600"
                    />
                    {m.full_name}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Commissioner Bonus */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commissioner Bonus <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            placeholder="0"
            className="form-input"
            value={form.additional_points}
            onChange={(e) => setForm({ ...form, additional_points: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">
            Extra points awarded by the commissioner — e.g. for winning a special tournament. Leave at 0 if none.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            rows={2}
            placeholder="Any additional notes…"
            className="form-input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {/* Point preview */}
        {previewPoints !== null && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-sm text-green-700">Estimated points for this round</p>
            <p className="text-3xl font-bold text-green-800">{previewPoints.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Group bonus: +{groupIds.length} · Difficulty: ×
              {({ easy: '0.95', average: '1.00', tough: '1.05' })[form.course_difficulty]}
              {Number(form.additional_points) > 0 && ` · Commissioner bonus: +${form.additional_points}`}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
          {submitting ? 'Submitting…' : 'Submit Round'}
        </button>
      </form>
    </div>
  )
}
