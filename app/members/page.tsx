'use client'

import { useEffect, useState } from 'react'
import type { Member, HandicapHistory } from '@/types'

export default function MembersPage() {
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [history, setHistory]   = useState<Record<string, HandicapHistory[]>>({})

  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((d: Member[]) => { setMembers(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleHistory = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (history[id]) return
    const res  = await fetch(`/api/handicap-history/${id}`)
    const data = await res.json()
    setHistory((prev) => ({ ...prev, [id]: data }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        <p className="text-gray-500 mt-1 text-sm">{members.length} registered players</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{m.full_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Handicap</div>
                  <div className="text-xl font-bold text-green-700">{m.current_handicap}</div>
                </div>
              </div>

              <button
                onClick={() => toggleHistory(m.id)}
                className="w-full text-xs text-green-700 hover:text-green-900 font-medium text-left"
              >
                {expanded === m.id ? '▲ Hide handicap history' : '▼ View handicap history'}
              </button>

              {expanded === m.id && (
                <div className="border-t pt-2">
                  {!history[m.id] ? (
                    <div className="text-xs text-gray-400">Loading…</div>
                  ) : history[m.id].length === 0 ? (
                    <div className="text-xs text-gray-400">No history yet.</div>
                  ) : (
                    <ul className="space-y-1">
                      {[...history[m.id]].reverse().map((h) => (
                        <li key={h.id} className="flex justify-between text-xs text-gray-600">
                          <span>
                            {new Date(h.recorded_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric',
                            })}
                          </span>
                          <span className="font-medium">{h.handicap}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
