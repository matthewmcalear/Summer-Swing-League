'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Member, HandicapHistory } from '@/types'

export default function MembersClient({ members }: { members: Member[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [history, setHistory]   = useState<Record<string, HandicapHistory[]>>({})

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => (
          <div key={m.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <Link
                  href={`/analytics?tab=player&id=${m.id}`}
                  className="font-semibold text-gray-900 hover:text-green-700 hover:underline transition-colors"
                >
                  {m.full_name}
                </Link>
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

            <div className={`grid transition-all duration-300 ease-in-out ${expanded === m.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
