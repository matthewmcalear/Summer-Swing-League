'use client'

import { useState } from 'react'
import type { Member } from '@/types'

// ── Inline edit row for a member ──────────────────────────────────────────────
export default function MemberRow({ member, onSave, onDelete }: {
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
