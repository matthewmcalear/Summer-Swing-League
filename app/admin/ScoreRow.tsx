'use client'

import { useState } from 'react'
import type { Score } from '@/types'

// ── Inline edit row for a score ───────────────────────────────────────────────
export default function ScoreRow({ score, onSave, onDelete }: {
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
