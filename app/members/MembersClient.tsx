'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Member, HandicapHistory } from '@/types'

function ViewToggle({ compact, setCompact }: { compact: boolean; setCompact: (v: boolean) => void }) {
  return (
    <div className="flex rounded-lg border border-gray-200 text-xs font-semibold overflow-hidden shrink-0">
      <button
        onClick={() => setCompact(false)}
        className={`px-3 py-1.5 transition-colors ${!compact ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >Normal</button>
      <button
        onClick={() => setCompact(true)}
        className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${compact ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
      >Compact</button>
    </div>
  )
}

export default function MembersClient({ members }: { members: Member[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [history, setHistory]   = useState<Record<string, HandicapHistory[]>>({})
  const [compact, setCompact]   = useState(false)

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 mt-1 text-sm">{members.length} registered players</p>
        </div>
        <ViewToggle compact={compact} setCompact={setCompact} />
      </div>

      {compact ? (
        /* ── Compact list ── */
        <div className="card p-0 overflow-hidden divide-y divide-gray-100">
          {members.map((m) => (
            <div key={m.id}>
              <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <Link
                  href={`/analytics?tab=player&id=${m.id}`}
                  className="font-semibold text-gray-900 hover:text-green-700 hover:underline text-sm flex-1 min-w-0 truncate"
                >
                  {m.full_name}
                </Link>
                <span className="text-xs text-gray-400 shrink-0">Hdcp</span>
                <span className="font-bold text-green-700 text-sm w-8 text-right shrink-0">{m.current_handicap}</span>
                <button
                  onClick={() => toggleHistory(m.id)}
                  className="text-xs text-green-700 hover:text-green-900 font-medium shrink-0 w-4 text-center"
                >
                  {expanded === m.id ? '▲' : '▼'}
                </button>
              </div>

              <div className={`grid transition-all duration-300 ease-in-out ${expanded === m.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/60">
                    {!history[m.id] ? (
                      <div className="text-xs text-gray-400">Loading…</div>
                    ) : history[m.id].length === 0 ? (
                      <div className="text-xs text-gray-400">No history yet.</div>
                    ) : (
                      <ul className="space-y-0.5">
                        {[...history[m.id]].reverse().map((h) => (
                          <li key={h.id} className="flex justify-between text-xs text-gray-600">
                            <span>{new Date(h.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
      ) : (
        /* ── Normal card grid ── */
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
                            <span>{new Date(h.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
      )}
    </div>
  )
}
