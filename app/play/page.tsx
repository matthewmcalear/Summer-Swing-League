'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Member } from '@/types'

type LibraryCourse = {
  id: string; name: string; tee_name: string
  course_rating: number; slope_rating: number; par: number; holes: number
}
type HoleScore = { hole: number; strokes: number; putts: number | null; par: number }
type LiveRound = {
  id: string; member_id: string; player_name: string
  course_id: string | null; course_name: string; holes: number
  current_hole: number; completed_at: string | null
  group_member_ids: string[]; hole_scores: HoleScore[]
}

const LS_KEY = 'ssl_live_round_id'

// Per-hole pars for courses we have full scorecards for (prefill; editable in-app).
const HOLE_PARS: Record<string, number[]> = {
  'Atlantide':        [5, 4, 5, 3, 4, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 4, 5],
  'Parcours de Cerf': [5, 3, 4, 4, 4, 3, 5, 4, 3, 4, 4, 3, 5, 3, 4, 4, 3, 5],
  'Mystic Pines':     [4, 3, 4, 5, 4, 4, 3, 4, 5],
}

export default function PlayLive() {
  const router = useRouter()

  const [view, setView]       = useState<'loading' | 'setup' | 'playing'>('loading')
  const [members, setMembers] = useState<Member[]>([])
  const [courses, setCourses] = useState<LibraryCourse[]>([])
  const [error, setError]     = useState('')

  // setup
  const [memberId, setMemberId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [holes, setHoles]       = useState(18)
  const [playDate, setPlayDate] = useState(new Date().toISOString().split('T')[0])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [starting, setStarting] = useState(false)

  // active round
  const [round, setRound]           = useState<LiveRound | null>(null)
  const [strokesMap, setStrokesMap] = useState<Record<number, number>>({})
  const [puttsMap, setPuttsMap]     = useState<Record<number, number>>({})
  const [parsMap, setParsMap]       = useState<Record<number, number>>({})
  const [currentHole, setCurrentHole] = useState(1)
  const [scorecardOpen, setScorecardOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/members').then((r) => r.json()).catch(() => []),
      fetch('/api/courses').then((r) => r.json()).catch(() => ({ courses: [] })),
    ]).then(([m, c]) => {
      setMembers(Array.isArray(m) ? m.filter((x: Member) => x.is_active) : [])
      setCourses(Array.isArray(c.courses) ? c.courses : [])
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
      if (savedId) {
        fetch(`/api/live/${savedId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((rd: LiveRound | null) => {
            if (rd && !rd.completed_at) enterRound(rd)
            else { localStorage.removeItem(LS_KEY); setView('setup') }
          })
          .catch(() => setView('setup'))
      } else setView('setup')
    })
  }, [])

  const enterRound = (rd: LiveRound) => {
    setRound(rd)
    const s: Record<number, number> = {}, p: Record<number, number> = {}, pa: Record<number, number> = {}
    rd.hole_scores.forEach((h) => {
      s[h.hole] = h.strokes
      if (h.putts != null) p[h.hole] = h.putts
      pa[h.hole] = h.par
    })
    setStrokesMap(s); setPuttsMap(p); setParsMap(pa)
    setCurrentHole(Math.min(Math.max(rd.current_hole, 1), rd.holes))
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, rd.id)
    setView('playing')
  }

  // Resume a player's in-progress round (cross-device) when picked at setup.
  useEffect(() => {
    if (!memberId || view !== 'setup') return
    fetch(`/api/live?member_id=${memberId}`).then((r) => r.json())
      .then((rd: LiveRound | null) => { if (rd && !rd.completed_at) enterRound(rd) })
      .catch(() => {})
  }, [memberId, view])

  const selectedCourse = courses.find((c) => c.id === courseId) || null
  const availableGroup = members.filter((m) => m.id !== memberId)
  const toggleGroup = (id: string) =>
    setGroupIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const start = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!memberId || !selectedCourse) { setError('Pick a player and course.'); return }
    setStarting(true)
    const res = await fetch('/api/live', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId, course_id: selectedCourse.id, course_name: selectedCourse.name,
        holes, play_date: playDate, group_member_ids: groupIds,
      }),
    })
    setStarting(false)
    if (res.ok) enterRound(await res.json())
    else setError((await res.json().catch(() => ({})))?.error || 'Failed to start round')
  }

  // ── Derived ──
  const parFor = (hole: number) =>
    parsMap[hole] ?? HOLE_PARS[round?.course_name ?? '']?.[hole - 1] ?? 4
  const enteredHoles = round ? Array.from({ length: round.holes }, (_, i) => i + 1).filter((h) => strokesMap[h] !== undefined) : []
  const totalStrokes = enteredHoles.reduce((s, h) => s + strokesMap[h], 0)
  const totalParPlayed = enteredHoles.reduce((s, h) => s + parFor(h), 0)
  const vsPar = totalStrokes - totalParPlayed
  const totalPutts = enteredHoles.reduce((s, h) => s + (puttsMap[h] ?? 0), 0)
  const vsParLabel = (n: number) => (n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`)

  const strokes = strokesMap[currentHole]
  const putts   = puttsMap[currentHole]
  const par     = parFor(currentHole)

  const bumpStrokes = (d: number) =>
    setStrokesMap((p) => {
      const cur = p[currentHole]
      const next = cur === undefined ? par : Math.max(1, Math.min(20, cur + d))
      return { ...p, [currentHole]: next }
    })
  const bumpPutts = (d: number) =>
    setPuttsMap((p) => {
      const cur = p[currentHole]
      const next = cur === undefined ? (d > 0 ? 1 : 0) : Math.max(0, Math.min(15, cur + d))
      return { ...p, [currentHole]: next }
    })
  const setPar = (n: number) => setParsMap((p) => ({ ...p, [currentHole]: n }))

  // Continuously persist the current hole once it has a score (resume safety).
  useEffect(() => {
    if (!round) return
    const s = strokesMap[currentHole]
    if (s === undefined) return
    const t = setTimeout(() => {
      fetch(`/api/live/${round.id}/hole`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hole: currentHole, strokes: s,
          putts: puttsMap[currentHole] ?? null, par: parFor(currentHole),
          current_hole: currentHole,
        }),
      }).then(() => setRound((r) => r ? { ...r, hole_scores: mergeHole(r.hole_scores, currentHole, s) } : r)).catch(() => {})
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokesMap, puttsMap, parsMap, currentHole, round?.id])

  const goTo = (h: number) => { if (round) setCurrentHole(Math.min(Math.max(h, 1), round.holes)) }

  const reviewAndSubmit = () => {
    if (!round) return
    if (enteredHoles.length < round.holes) {
      setError(`Enter all ${round.holes} holes before submitting (${enteredHoles.length} so far).`)
      return
    }
    // Hand off to the Submit Score form to review/confirm. The live round (and
    // its resume state) is kept until it's actually submitted there.
    router.push(`/submit-score?live=${round.id}`)
  }

  const abandon = async () => {
    if (!round || !confirm('Discard this in-progress round? Nothing will be saved.')) return
    await fetch(`/api/live/${round.id}`, { method: 'DELETE' }).catch(() => {})
    if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY)
    setRound(null); setStrokesMap({}); setPuttsMap({}); setParsMap({}); setCurrentHole(1); setView('setup')
  }

  // ── Render ──
  if (view === 'loading') {
    return <div className="flex justify-center py-24"><div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (view === 'setup') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Play Live</h1>
          <p className="text-gray-500 mt-1 text-sm">Track your round hole-by-hole. We&apos;ll total it and submit it for you at the end.</p>
        </div>
        <form onSubmit={start} className="card space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Player *</label>
            <select required className="form-input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select your name…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
            <select required className="form-input" value={courseId}
              onChange={(e) => { setCourseId(e.target.value); const c = courses.find((x) => x.id === e.target.value); if (c) setHoles(c.holes) }}>
              <option value="">Select a course…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}{c.tee_name ? ` — ${c.tee_name}` : ''} (S {c.slope_rating}, par {c.par})</option>)}
            </select>
            {courses.length === 0 && <p className="text-xs text-gray-400 mt-1">No rated courses yet — ask an admin to add some.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Holes *</label>
            <div className="flex gap-3">
              {[9, 18].map((h) => (
                <button type="button" key={h} onClick={() => setHoles(h)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${holes === h ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}>{h} holes</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" required min="2026-04-15" max="2026-10-10" className="form-input" value={playDate} onChange={(e) => setPlayDate(e.target.value)} />
          </div>
          {availableGroup.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group <span className="text-gray-400 font-normal">(+1 pt each)</span></label>
              <div className="grid grid-cols-2 gap-2">
                {availableGroup.map((m) => {
                  const on = groupIds.includes(m.id)
                  return (
                    <label key={m.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${on ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-gray-200 text-gray-700'}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleGroup(m.id)} className="accent-green-600" />{m.full_name}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={starting} className="btn-primary w-full py-3 text-base">{starting ? 'Starting…' : 'Start round ⛳'}</button>
        </form>
      </div>
    )
  }

  // ── Playing ──
  const isLast = round != null && currentHole >= round.holes
  const holeDiff = (h: number) => (strokesMap[h] === undefined ? null : strokesMap[h] - parFor(h))
  const diffColor = (d: number | null) =>
    d === null ? 'text-gray-300'
    : d <= -1 ? 'text-red-600 font-bold'
    : d === 0 ? 'text-gray-800'
    : d === 1 ? 'text-blue-600'
    : 'text-blue-900 font-semibold'

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{round?.course_name}</h1>
          <p className="text-xs text-gray-500">{round?.player_name} · {round?.holes} holes</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setScorecardOpen((o) => !o)} className="text-xs font-medium text-green-700 hover:underline">
            {scorecardOpen ? 'Hole view' : 'All holes'}
          </button>
          <button onClick={abandon} className="text-xs text-red-600 hover:underline">Discard</button>
        </div>
      </div>

      {/* Totals bar */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card py-3"><div className="text-2xl font-bold text-gray-900 tabular-nums">{totalStrokes || '–'}</div><div className="text-[11px] text-gray-400 mt-0.5">Total</div></div>
        <div className="card py-3"><div className={`text-2xl font-bold tabular-nums ${vsPar > 0 ? 'text-blue-700' : vsPar < 0 ? 'text-red-600' : 'text-gray-900'}`}>{enteredHoles.length ? vsParLabel(vsPar) : '–'}</div><div className="text-[11px] text-gray-400 mt-0.5">vs Par</div></div>
        <div className="card py-3"><div className="text-2xl font-bold text-gray-900 tabular-nums">{enteredHoles.length}<span className="text-gray-300 text-base">/{round?.holes}</span></div><div className="text-[11px] text-gray-400 mt-0.5">Thru</div></div>
      </div>

      {scorecardOpen ? (
        <Scorecard round={round!} strokesMap={strokesMap} puttsMap={puttsMap} parFor={parFor}
          totalStrokes={totalStrokes} totalPutts={totalPutts}
          onPick={(h) => { goTo(h); setScorecardOpen(false) }} />
      ) : (
        <>
          {/* Big hole number + par */}
          <div className="card py-6">
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Hole</div>
              <div className="text-7xl font-extrabold text-green-700 leading-none tabular-nums">{currentHole}</div>
              <div className="mt-3 inline-flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Par</span>
                {[3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setPar(n)}
                    className={`w-7 h-7 rounded-full text-sm font-semibold ${par === n ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-500'}`}>{n}</button>
                ))}
              </div>
            </div>

            {/* Strokes */}
            <div className="mt-6">
              <div className="text-center text-xs font-medium text-gray-400 mb-1">Score</div>
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => bumpStrokes(-1)} className="w-14 h-14 rounded-full bg-gray-100 text-3xl font-bold text-gray-700 active:bg-gray-200">−</button>
                <div className="w-20 text-center">
                  <div className="text-6xl font-bold text-gray-900 tabular-nums">{strokes ?? '–'}</div>
                </div>
                <button onClick={() => bumpStrokes(1)} className="w-14 h-14 rounded-full bg-green-600 text-3xl font-bold text-white active:bg-green-700">+</button>
              </div>
            </div>

            {/* Putts */}
            <div className="mt-5">
              <div className="text-center text-xs font-medium text-gray-400 mb-1">Putts</div>
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => bumpPutts(-1)} className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-600 active:bg-gray-200">−</button>
                <div className="w-14 text-center"><div className="text-3xl font-semibold text-gray-700 tabular-nums">{putts ?? '–'}</div></div>
                <button onClick={() => bumpPutts(1)} className="w-10 h-10 rounded-full bg-gray-200 text-xl font-bold text-gray-700 active:bg-gray-300">+</button>
              </div>
            </div>
          </div>

          {/* Overview strip */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {Array.from({ length: round?.holes ?? 0 }, (_, i) => i + 1).map((h) => (
              <button key={h} onClick={() => goTo(h)}
                className={`shrink-0 w-9 rounded-lg border py-1 text-center ${h === currentHole ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <div className="text-[10px] text-gray-400 leading-none">{h}</div>
                <div className={`text-sm leading-tight ${diffColor(holeDiff(h))}`}>{strokesMap[h] ?? '–'}</div>
              </button>
            ))}
          </div>

          {/* Nav */}
          <div className="flex gap-3">
            <button onClick={() => goTo(currentHole - 1)} disabled={currentHole <= 1} className="btn-secondary flex-1 py-3 disabled:opacity-40">← Prev</button>
            {isLast
              ? <button onClick={reviewAndSubmit} className="btn-primary flex-1 py-3">Review &amp; submit →</button>
              : <button onClick={() => goTo(currentHole + 1)} className="btn-primary flex-1 py-3">Next →</button>}
          </div>
          {!isLast && (
            <button onClick={reviewAndSubmit} className="w-full text-sm text-green-700 hover:underline">
              Review &amp; submit now
            </button>
          )}
        </>
      )}

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
    </div>
  )
}

function Scorecard({ round, strokesMap, puttsMap, parFor, totalStrokes, totalPutts, onPick }: {
  round: LiveRound
  strokesMap: Record<number, number>
  puttsMap: Record<number, number>
  parFor: (h: number) => number
  totalStrokes: number
  totalPutts: number
  onPick: (h: number) => void
}) {
  const holes = Array.from({ length: round.holes }, (_, i) => i + 1)
  const totalPar = holes.reduce((s, h) => s + parFor(h), 0)
  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm text-center">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs">
            <th className="py-2 font-medium">Hole</th><th className="font-medium">Par</th><th className="font-medium">Score</th><th className="font-medium">Putts</th>
          </tr>
        </thead>
        <tbody>
          {holes.map((h) => {
            const s = strokesMap[h]
            const d = s === undefined ? null : s - parFor(h)
            return (
              <tr key={h} onClick={() => onPick(h)} className="border-t border-gray-100 cursor-pointer active:bg-green-50">
                <td className="py-2 font-medium text-gray-700">{h}</td>
                <td className="text-gray-400">{parFor(h)}</td>
                <td className={d === null ? 'text-gray-300' : d <= -1 ? 'text-red-600 font-bold' : d === 0 ? 'text-gray-800' : d === 1 ? 'text-blue-600' : 'text-blue-900 font-semibold'}>{s ?? '–'}</td>
                <td className="text-gray-500">{puttsMap[h] ?? '–'}</td>
              </tr>
            )
          })}
          <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-gray-800">
            <td className="py-2">Tot</td><td className="text-gray-500">{totalPar}</td><td>{totalStrokes || '–'}</td><td className="text-gray-500">{totalPutts || '–'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function mergeHole(list: HoleScore[], hole: number, strokes: number): HoleScore[] {
  const found = list.find((h) => h.hole === hole)
  if (found) return list.map((h) => (h.hole === hole ? { ...h, strokes } : h))
  return [...list, { hole, strokes, putts: null, par: 4 }]
}
