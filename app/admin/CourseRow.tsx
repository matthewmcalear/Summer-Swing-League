'use client'

import { useState } from 'react'

// ── Course rename row ─────────────────────────────────────────────────────────
export default function CourseRow({ name, count, onRename }: {
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
