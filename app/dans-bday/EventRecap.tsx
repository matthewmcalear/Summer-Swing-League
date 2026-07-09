'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ── Types (mirror /api/bday/state) ─────────────────────────────────────────────

interface HoleScore   { hole: number; strokes: number }
interface MulliganRx  { id: string; sender_name: string; hole: number | null; fired_at: string }

interface TeamState {
  id: string; name: string; group_id: string
  beers: number; hotdogs: number; hotdog_discount: number
  mulligan_bank: number; mulligans_sent: number
  mulligans_received: MulliganRx[]
  hole_scores: HoleScore[]; holes_played: number
  total: number
}

interface GroupState {
  id: string; name: string; code: string
  teams: TeamState[]
}

interface FeedItem    { id: string; type: string; message: string; timestamp: string }
interface ChatMessage { id: string; sender_name: string; text: string; sent_at: string }

// ── Course par ─────────────────────────────────────────────────────────────────
// Carling Lake Golf Club — White tees
const HOLE_PARS = [4, 4, 4, 4, 5, 3, 4, 4, 4, 4, 4, 4, 4, 3, 5, 4, 3, 5]
const TOTAL_PAR = HOLE_PARS.reduce((s, p) => s + p, 0) // 72

// ── Derived stats ──────────────────────────────────────────────────────────────

interface RankedTeam extends TeamState {
  gross: number
  net: number
  strokesByHole: Record<number, number>
  parsMade: number
  birdieHoles: number[]
}

function deriveTeams(groups: GroupState[]): RankedTeam[] {
  return groups
    .flatMap((g) => g.teams)
    .map((t) => {
      const strokesByHole: Record<number, number> = {}
      for (const h of t.hole_scores) strokesByHole[h.hole] = h.strokes
      const gross = t.hole_scores.reduce((s, h) => s + h.strokes, 0)
      const parsMade = t.hole_scores.filter((h) => h.strokes === HOLE_PARS[h.hole - 1]).length
      const birdieHoles = t.hole_scores.filter((h) => h.strokes < HOLE_PARS[h.hole - 1]).map((h) => h.hole)
      return { ...t, gross, net: gross - t.hotdog_discount, strokesByHole, parsMade, birdieHoles }
    })
    .sort((a, b) => {
      if (a.holes_played === 0 && b.holes_played === 0) return 0
      if (a.holes_played === 0) return 1
      if (b.holes_played === 0) return -1
      return a.net - b.net
    })
}

function fmtVsPar(diff: number): string {
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

// Cell colouring for the hole-by-hole scorecard
function cellClass(strokes: number, par: number): string {
  const d = strokes - par
  if (d < 0)   return 'bg-red-100 text-red-700 font-extrabold'      // birdie
  if (d === 0) return 'bg-green-100 text-green-800 font-bold'       // par
  if (d === 1) return 'text-gray-600'                               // bogey
  if (d === 2) return 'bg-gray-100 text-gray-500'                   // double
  return 'bg-gray-800 text-white font-bold'                         // yikes
}

// ── Small building blocks ──────────────────────────────────────────────────────

function AwardCard({ icon, title, winner, detail }: { icon: string; title: string; winner: string; detail: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-2xl">{icon}</span>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</p>
      </div>
      <p className="font-extrabold text-gray-900 text-sm leading-tight">{winner}</p>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{detail}</p>
    </div>
  )
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur px-3 py-2 text-center">
      <p className="text-xl font-extrabold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80 mt-1">{label}</p>
    </div>
  )
}

function relativeDayTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function EventRecap() {
  const [groups,   setGroups]   = useState<GroupState[]>([])
  const [feed,     setFeed]     = useState<FeedItem[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showCard, setShowCard] = useState(false)
  const [showFeed, setShowFeed] = useState(false)
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    fetch('/api/bday/state', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.groups ?? [])
        setFeed(data.feed ?? [])
        setMessages(data.messages ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading final results…</p>
      </div>
    )
  }

  const ranked = deriveTeams(groups).filter((t) => t.holes_played > 0)
  if (ranked.length === 0) {
    return <p className="text-center text-gray-400 py-20">No results found.</p>
  }

  const champ = ranked[0]

  // ── Awards, computed from the day's data ──
  const maxDogs   = Math.max(...ranked.map((t) => t.hotdogs))
  const dogChamps = ranked.filter((t) => t.hotdogs === maxDogs)
  const beerChamp = [...ranked].sort((a, b) => b.beers - a.beers)[0]
  const parKing   = [...ranked].sort((a, b) => b.parsMade - a.parsMade)[0]

  const birdies = ranked.flatMap((t) => t.birdieHoles.map((hole) => ({ team: t.name, hole })))

  // Worst single hole vs par
  let blowup = { team: '', hole: 0, strokes: 0, over: -1 }
  for (const t of ranked) {
    for (const h of t.hole_scores) {
      const over = h.strokes - HOLE_PARS[h.hole - 1]
      if (over > blowup.over) blowup = { team: t.name, hole: h.hole, strokes: h.strokes, over }
    }
  }

  // Best back nine
  const backNine = ranked
    .map((t) => ({ name: t.name, b9: t.hole_scores.filter((h) => h.hole > 9).reduce((s, h) => s + h.strokes, 0) }))
    .sort((a, b) => a.b9 - b.b9)[0]

  // Hardest / easiest holes (field average vs par)
  const holeAvgs = HOLE_PARS.map((par, i) => {
    const hole = i + 1
    const scores = ranked.map((t) => t.strokesByHole[hole]).filter((s): s is number => s != null)
    const avg = scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1)
    return { hole, par, over: avg - par }
  })
  const hardest = [...holeAvgs].sort((a, b) => b.over - a.over)[0]
  const easiest = [...holeAvgs].sort((a, b) => a.over - b.over)[0]

  // Mulligan warfare
  const totalMulligans = ranked.reduce((s, t) => s + t.mulligans_received.length, 0)
  const mullSender     = [...ranked].sort((a, b) => b.mulligans_sent - a.mulligans_sent)[0]
  const mullTarget     = [...ranked].sort((a, b) => b.mulligans_received.length - a.mulligans_received.length)[0]

  // Field totals
  const fieldDogs  = ranked.reduce((s, t) => s + t.hotdogs, 0)
  const fieldBeers = ranked.reduce((s, t) => s + t.beers, 0)

  const medals = ['🥇', '🥈', '🥉']
  const sslPts = ['+5 pts', '+3 pts', '+1 pt']

  return (
    <div className="space-y-6">

      {/* ── Champion hero ── */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white px-6 py-8 shadow-xl">
        <p className="text-amber-100 text-xs font-bold uppercase tracking-widest mb-1">
          🎂 Dan&apos;s Birthday Golf Tournament · July 3rd · Carling Lake
        </p>
        <h1 className="text-3xl font-extrabold leading-tight drop-shadow-sm">🏆 Champions:<br />{champ.name}</h1>
        <p className="text-amber-50 text-sm mt-2">
          {champ.gross} gross − {champ.hotdog_discount} hot-dog strokes = <strong>{champ.net} net</strong> ({fmtVsPar(champ.net - TOTAL_PAR)})
          — {champ.parsMade} pars and not a single blow-up.
        </p>
        <div className="grid grid-cols-4 gap-2 mt-5">
          <StatPill value={`${fieldDogs}`} label="Hot dogs" />
          <StatPill value={`${fieldBeers}`} label="Shotguns" />
          <StatPill value={`${totalMulligans}`} label="Mulligans" />
          <StatPill value={`${birdies.length}`} label="Birdies" />
        </div>
      </div>

      {/* ── Final standings ── */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🏁 Final Standings</h2>
        <div className="space-y-2">
          {ranked.map((t, i) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${
                i === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'
              }`}
            >
              <span className="w-7 shrink-0 text-center font-bold text-sm">
                {i < 3 ? <span className="text-lg">{medals[i]}</span> : <span className="text-gray-400">#{i + 1}</span>}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{t.name}</p>
                <p className="text-[11px] text-gray-400">
                  {t.gross} gross · 🌭 {t.hotdogs} (−{t.hotdog_discount}){t.beers > 0 ? ` · 🍺 ${t.beers}` : ''}
                </p>
              </div>
              {i < 3 && (
                <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-green-100 text-green-800 border border-green-200">
                  {sslPts[i]}
                </span>
              )}
              <div className="text-right shrink-0 w-12">
                <p className="text-xl font-extrabold text-green-700 tabular-nums leading-none">{t.net}</p>
                <p className="text-xs font-bold text-gray-400 tabular-nums mt-0.5">{fmtVsPar(t.net - TOTAL_PAR)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
          Net = gross strokes − hot dog discount (every 3 dogs = −1 stroke) · Par {TOTAL_PAR}
        </div>
      </div>

      {/* ── Awards ── */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3 px-1">🏅 Awards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AwardCard
            icon="🌭" title="Hot Dog Award"
            winner={dogChamps.map((t) => t.name).join(' & ') + (dogChamps.length > 1 ? ' (tie!)' : '')}
            detail={`${maxDogs} dogs each. The field put away ${fieldDogs} hot dogs — a tournament record.`}
          />
          <AwardCard
            icon="🍺" title="Shotgun Award"
            winner={beerChamp.name}
            detail={`${beerChamp.beers} beers shotgunned. ${beerChamp.beers >= 20 ? 'Frankly concerning. ' : ''}They banked ${beerChamp.beers} mulligans and fired ${beerChamp.mulligans_sent}.`}
          />
          <AwardCard
            icon="💀" title="Mulligan Warfare"
            winner={`${mullSender.name} ↔ ${mullTarget.name}`}
            detail={`All ${totalMulligans} reverse mulligans of the day were traded between these two teams. ${mullSender.name} fired ${mullSender.mulligans_sent}; ${mullTarget.name} took ${mullTarget.mulligans_received.length}.`}
          />
          <AwardCard
            icon="🎯" title="Par Machine"
            winner={parKing.name}
            detail={`${parKing.parsMade} pars out of 18 holes — the steadiest card of the day.`}
          />
          <AwardCard
            icon="🐦" title="Birdie Club"
            winner={birdies.length > 0 ? birdies.map((b) => `${b.team} (No. ${b.hole})`).join(' · ') : 'Nobody'}
            detail={`Only ${birdies.length} birdie${birdies.length !== 1 ? 's' : ''} all day. Carling Lake won most of the battles.`}
          />
          <AwardCard
            icon="💣" title="Blow-Up Hole"
            winner={blowup.team}
            detail={`An ${blowup.strokes} on the par-${HOLE_PARS[blowup.hole - 1]} ${blowup.hole}th. +${blowup.over} on one hole. We don't talk about hole ${blowup.hole}.`}
          />
          <AwardCard
            icon="🔥" title="Best Back Nine"
            winner={backNine.name}
            detail={`${backNine.b9} coming home. Closed like champions.`}
          />
          <AwardCard
            icon="⛳" title="Toughest Hole"
            winner={`No. ${hardest.hole} (par ${hardest.par})`}
            detail={`Played ${hardest.over.toFixed(1)} over par on average. Easiest: No. ${easiest.hole}, at +${easiest.over.toFixed(1)}.`}
          />
        </div>
      </div>

      {/* ── Hole-by-hole scorecard ── */}
      <div className="card">
        <button
          onClick={() => setShowCard((v) => !v)}
          className="w-full flex items-center justify-between font-bold text-gray-900"
        >
          <span className="text-lg">📋 Hole-by-Hole Scorecard</span>
          <span className="text-gray-400 text-sm">{showCard ? 'Hide ▲' : 'Show ▼'}</span>
        </button>
        {showCard && (
          <div className="mt-4 overflow-x-auto -mx-5 px-5">
            <table className="text-xs tabular-nums border-collapse min-w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white text-left pr-2 py-1.5 font-bold text-gray-500">Hole</th>
                  {HOLE_PARS.map((_, i) => (
                    <th key={i} className="px-1.5 py-1.5 font-bold text-gray-500 text-center">{i + 1}</th>
                  ))}
                  <th className="px-2 py-1.5 font-bold text-gray-700 text-center">Gross</th>
                </tr>
                <tr className="border-b border-gray-200">
                  <th className="sticky left-0 bg-white text-left pr-2 py-1 font-semibold text-gray-400">Par</th>
                  {HOLE_PARS.map((p, i) => (
                    <th key={i} className="px-1.5 py-1 font-semibold text-gray-400 text-center">{p}</th>
                  ))}
                  <th className="px-2 py-1 font-semibold text-gray-500 text-center">{TOTAL_PAR}</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="sticky left-0 bg-white pr-2 py-1.5 font-bold text-gray-800 whitespace-nowrap">{t.name}</td>
                    {HOLE_PARS.map((par, i) => {
                      const s = t.strokesByHole[i + 1]
                      return (
                        <td key={i} className={`px-1.5 py-1.5 text-center rounded ${s != null ? cellClass(s, par) : 'text-gray-300'}`}>
                          {s ?? '—'}
                        </td>
                      )
                    })}
                    <td className="px-2 py-1.5 text-center font-extrabold text-green-700">{t.gross}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-gray-400 mt-3">
              <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200 align-middle mr-1" /> Birdie ·{' '}
              <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-200 align-middle mr-1" /> Par ·{' '}
              <span className="inline-block w-3 h-3 rounded bg-gray-800 align-middle mr-1" /> Triple+
            </p>
          </div>
        )}
      </div>

      {/* ── Archived activity feed ── */}
      <div className="card">
        <button
          onClick={() => setShowFeed((v) => !v)}
          className="w-full flex items-center justify-between font-bold text-gray-900"
        >
          <span className="text-lg">📜 Day-Of Activity Log <span className="text-xs font-normal text-gray-400">({feed.length} events)</span></span>
          <span className="text-gray-400 text-sm">{showFeed ? 'Hide ▲' : 'Show ▼'}</span>
        </button>
        {showFeed && (
          <div className="mt-3 space-y-0 max-h-80 overflow-y-auto divide-y divide-gray-50">
            {feed.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2 text-sm">
                <span className="text-[11px] text-gray-400 shrink-0 tabular-nums mt-0.5 w-16 text-right leading-5">
                  {relativeDayTime(item.timestamp)}
                </span>
                <span className="text-gray-700 flex-1 leading-5">{item.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Archived trash talk ── */}
      {messages.length > 0 && (
        <div className="card">
          <button
            onClick={() => setShowChat((v) => !v)}
            className="w-full flex items-center justify-between font-bold text-gray-900"
          >
            <span className="text-lg">💬 Trash Talk Archive</span>
            <span className="text-gray-400 text-sm">{showChat ? 'Hide ▲' : 'Show ▼'}</span>
          </button>
          {showChat && (
            <div className="mt-3 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="flex flex-col items-start">
                  <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-bl-sm">{m.text}</div>
                  <span className="text-[10px] text-gray-400 mt-0.5 px-1">{m.sender_name} · {relativeDayTime(m.sent_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 text-center">
        <p className="font-bold text-amber-900">🎂 Thanks for coming out — see you next year.</p>
        <p className="mt-1 text-amber-700">
          Two-man scramble · Hot Dog Rule · Reverse Mulligans ·{' '}
          <Link href="/standings" className="underline font-semibold">SSL points added to season standings →</Link>
        </p>
      </div>

    </div>
  )
}
