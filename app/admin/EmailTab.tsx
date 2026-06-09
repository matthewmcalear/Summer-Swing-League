'use client'

import { useState } from 'react'
import type { Member } from '@/types'

export default function EmailTab({ members }: { members: Member[] }) {
  const active = members.filter((m) => m.is_active)
  const [selected, setSelected] = useState<string[]>(active.map((m) => m.id))
  const [subject, setSubject]   = useState('')
  const [body, setBody]         = useState('')
  const [sending, setSending]   = useState(false)
  const [sendingDigest, setSendingDigest] = useState(false)
  const [result, setResult]     = useState<{ ok: boolean; msg: string } | null>(null)

  const sendDigest = async () => {
    if (!confirm(`Email the current standings to all ${active.length} active members?`)) return
    setSendingDigest(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/standings-digest', { method: 'POST' })
      const data = await res.json()
      setResult(res.ok
        ? { ok: true,  msg: `Standings digest sent to ${data.sent} member${data.sent !== 1 ? 's' : ''}.` }
        : { ok: false, msg: data.error || 'Failed to send digest.' })
    } catch {
      setResult({ ok: false, msg: 'Network error.' })
    } finally {
      setSendingDigest(false)
    }
  }

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
      {/* One-click standings digest */}
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">📊 Standings Digest</p>
          <p className="text-xs text-gray-400 mt-0.5">
            One click — emails the current leaderboard to every active member.
          </p>
        </div>
        <button
          onClick={sendDigest}
          disabled={sendingDigest || !active.length}
          className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
        >
          {sendingDigest ? 'Sending…' : 'Send standings digest'}
        </button>
      </div>

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
