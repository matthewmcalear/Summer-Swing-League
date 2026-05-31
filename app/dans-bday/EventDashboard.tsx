'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

interface HoleScore   { hole: number; strokes: number }
interface MulliganRx  { id: string; sender_name: string; hole: number | null; fired_at: string }

interface TeamState {
  id: string; name: string; group_id: string
  beers: number; hotdogs: number; hotdog_discount: number
  mulligan_bank: number; mulligans_sent: number
  mulligans_received: MulliganRx[]
  hole_scores: HoleScore[]; holes_played: number
  gross_total: number; net_total: number
}

interface GroupState {
  id: string; name: string; code: string
  location_lat: number | null; location_lon: number | null; location_at: string | null
  teams: TeamState[]
}

interface FeedItem { id: string; type: string; message: string; timestamp: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function rankAll(groups: GroupState[]) {
  return groups
    .flatMap((g) => g.teams)
    .sort((a, b) => {
      if (a.holes_played === 0 && b.holes_played === 0) return 0
      if (a.holes_played === 0) return 1
      if (b.holes_played === 0) return -1
      if (a.net_total !== b.net_total) return a.net_total - b.net_total
      return b.holes_played - a.holes_played
    })
}

// ── Components ─────────────────────────────────────────────────────────────────

function ScoreRow({ team, rank }: { team: TeamState; rank: number }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${rank === 1 ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-gray-100'}`}>
      <span className="w-7 shrink-0 text-center font-bold text-gray-500 text-sm">
        {rank <= 3 ? medals[rank - 1] : rank}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm truncate">{team.name}</p>
        <p className="text-[11px] text-gray-400">
          {team.holes_played > 0 ? `${team.holes_played}/18 holes` : 'Not started'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {team.beers > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 rounded-lg px-1.5 py-0.5 font-semibold">
            🍺×{team.beers}
          </span>
        )}
        {team.hotdogs > 0 && (
          <span className="text-xs bg-orange-100 text-orange-700 rounded-lg px-1.5 py-0.5 font-semibold">
            🌭×{team.hotdogs}
          </span>
        )}
        {team.mulligan_bank > 0 && (
          <span className="text-xs bg-red-100 text-red-700 rounded-lg px-1.5 py-0.5 font-semibold">
            💀×{team.mulligan_bank}
          </span>
        )}
      </div>

      <div className="text-right shrink-0 w-16">
        {team.holes_played > 0 ? (
          <>
            <p className="text-xl font-extrabold text-green-700 tabular-nums leading-none">{team.net_total}</p>
            {team.hotdog_discount > 0 && (
              <p className="text-[10px] text-orange-500 font-semibold">-{team.hotdog_discount}🌭</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-300 font-semibold">—</p>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EventDashboard() {
  const [groups,   setGroups]   = useState<GroupState[]>([])
  const [feed,     setFeed]     = useState<FeedItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [lastPoll, setLastPoll] = useState<Date | null>(null)

  const fetchState = async () => {
    try {
      const res  = await fetch('/api/bday/state', { cache: 'no-store' })
      const data = await res.json()
      setGroups(data.groups ?? [])
      setFeed(data.feed ?? [])
      setLastPoll(new Date())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchState()
    const id = setInterval(fetchState, 10_000)
    return () => clearInterval(id)
  }, [])

  const ranked = rankAll(groups)

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white px-6 py-8 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-amber-100 text-xs font-bold uppercase tracking-widest mb-1">July 3rd · Carling Lake</p>
            <h1 className="text-3xl font-extrabold leading-tight">🎂 Dan's Birthday<br />Golf Tournament</h1>
            <p className="text-amber-100 text-sm mt-2">Two-man scramble · Hot Dog Rule · Reverse Mulligans</p>
          </div>
          <div className="text-5xl">🏌️</div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {['GROUP1','GROUP2','GROUP3','GROUP4'].map((code) => (
            <Link
              key={code}
              href={`/dans-bday/${code}`}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-colors"
            >
              {code} →
            </Link>
          ))}
        </div>
      </div>

      {/* ── Leaderboard ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">🏆 Leaderboard</h2>
          {lastPoll && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
              Live · {relativeTime(lastPoll.toISOString())}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        ) : ranked.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No teams found — seed the database first.</p>
        ) : (
          <div className="space-y-2">
            {ranked.map((team, i) => <ScoreRow key={team.id} team={team} rank={i + 1} />)}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
          Score = gross strokes − hot dog discount (every 3 dogs = −1 stroke)
        </div>
      </div>

      {/* ── Group cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map((g) => (
          <div key={g.id} className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">{g.name}</h3>
              <Link
                href={`/dans-bday/${g.code}`}
                className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors"
              >
                Open →
              </Link>
            </div>
            <div className="space-y-2">
              {g.teams.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 font-medium text-gray-700 truncate">{t.name}</span>
                  <span className="text-gray-400 tabular-nums">
                    {t.holes_played > 0 ? `${t.net_total} (${t.holes_played}/18)` : '—'}
                  </span>
                </div>
              ))}
            </div>
            {g.location_at && (
              <p className="mt-2 text-[10px] text-gray-400">
                📍 Location updated {relativeTime(g.location_at)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Activity feed ── */}
      {feed.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📡 Live Activity</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {feed.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-sm">
                <span className="text-[11px] text-gray-400 shrink-0 tabular-nums mt-0.5 w-14 text-right">
                  {relativeTime(item.timestamp)}
                </span>
                <span className="text-gray-700">{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rules quick ref ── */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 space-y-1.5">
        <p className="font-bold text-amber-900 mb-2">Quick Rules</p>
        <p>🌭 Every 3 hot dogs = <strong>−1 stroke</strong> off your team score. No cap.</p>
        <p>🍺 Every beer shotgunned = <strong>+1 Reverse Mulligan</strong> for your team.</p>
        <p>💀 Fire a mulligan at any team — <strong>their last shot is erased</strong>, they replay.</p>
      </div>

    </div>
  )
}
