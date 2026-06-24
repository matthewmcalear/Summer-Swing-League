'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Member } from '@/types'

type LibraryCourse = {
  id: string
  name: string
  tee_name: string
  course_rating: number
  slope_rating: number
  par: number
  holes: number
}

type HoleScore = { hole: number; strokes: number }
type LiveRound = {
  id: string
  member_id: string
  player_name: string
  course_id: string | null
  course_name: string
  holes: number
  current_hole: number
  completed_at: string | null
  group_member_ids: string[]
  hole_scores: HoleScore[]
}

const LS_KEY = 'ssl_live_round_id'
const DEFAULT_STROKES = 4

export default function PlayLive() {
  const router = useRouter()

  const [view, setView]       = useState<'loading' | 'setup' | 'playing'>('loading')
  const [members, setMembers] = useState<Member[]>([])
  const [courses, setCourses] = useState<LibraryCourse[]>([])
  const [error, setError]     = useState('')

  // setup form
  const [memberId, setMemberId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [holes, setHoles]       = useState(18)
  const [playDate, setPlayDate] = useState(new Date().toISOString().split('T')[0])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [starting, setStarting] = useState(false)

  // active round
  const [round, setRound]           = useState<LiveRound | null>(null)
  const [strokesMap, setStrokesMap] = useState<Record<number, number>>({})
  const [currentHole, setCurrentHole] = useState(1)
  const [finishing, setFinishing]   = useState(false)

  // Load members + courses; resume an in-progress round if one is saved on this device.
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
      } else {
        setView('setup')
      }
    })
  }, [])

  const enterRound = (rd: LiveRound) => {
    setRound(rd)
    const map: Record<number, number> = {}
    rd.hole_scores.forEach((h) => { map[h.hole] = h.strokes })
    setStrokesMap(map)
    setCurrentHole(Math.min(Math.max(rd.current_hole, 1), rd.holes))
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, rd.id)
    setView('playing')
  }

  // When a player is chosen at setup, resume their in-progress round if any (cross-device).
  useEffect(() => {
    if (!memberId || view !== 'setup') return
    fetch(`/api/live?member_id=${memberId}`)
      .then((r) => r.json())
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
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id:        memberId,
        course_id:        selectedCourse.id,
        course_name:      selectedCourse.name,
        holes,
        play_date:        playDate,
        group_member_ids: groupIds,
      }),
    })
    setStarting(false)
    if (res.ok) enterRound(await res.json())
    else setError((await res.json().catch(() => ({})))?.error || 'Failed to start round')
  }

  const strokes = strokesMap[currentHole] ?? DEFAULT_STROKES
  const enteredCount = round ? round.hole_scores.length : 0
  const liveCount = Object.keys(strokesMap).length
  const runningTotal = Object.values(strokesMap).reduce((s, v) => s + v, 0)

  const setStrokes = (n: number) => {
    const clamped = Math.max(1, Math.min(20, n))
    setStrokesMap((p) => ({ ...p, [currentHole]: clamped }))
  }

  const saveHole = async (hole: number, value: number, nextHole: number) => {
    if (!round) return
    await fetch(`/api/live/${round.id}/hole`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ hole, strokes: value, current_hole: nextHole }),
    }).catch(() => {})
  }

  const go = async (dir: -1 | 1) => {
    if (!round) return
    const next = Math.min(Math.max(currentHole + dir, 1), round.holes)
    // Persist the current hole (ensures default-4 holes get recorded too) before moving.
    await saveHole(currentHole, strokesMap[currentHole] ?? DEFAULT_STROKES, next)
    if (strokesMap[currentHole] === undefined) setStrokesMap((p) => ({ ...p, [currentHole]: DEFAULT_STROKES }))
    setCurrentHole(next)
    // refresh entered count
    setRound((r) => r ? { ...r, hole_scores: mergeHole(r.hole_scores, currentHole, strokesMap[currentHole] ?? DEFAULT_STROKES) } : r)
  }

  const finish = async () => {
    if (!round) return
    setError('')
    // Save the final hole first.
    await saveHole(currentHole, strokesMap[currentHole] ?? DEFAULT_STROKES, currentHole)
    setFinishing(true)
    const res = await fetch(`/api/live/${round.id}/finish`, { method: 'POST' })
    setFinishing(false)
    if (res.ok) {
      if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY)
      router.push('/success')
    } else {
      setError((await res.json().catch(() => ({})))?.error || 'Could not finish round')
    }
  }

  const abandon = async () => {
    if (!round) return
    if (!confirm('Discard this in-progress round? Nothing will be saved.')) return
    await fetch(`/api/live/${round.id}`, { method: 'DELETE' }).catch(() => {})
    if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY)
    setRound(null); setStrokesMap({}); setCurrentHole(1); setView('setup')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (view === 'loading') {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (view === 'setup') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Play Live</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Track your round hole-by-hole. We&apos;ll total it up and submit it for you at the end.
          </p>
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
            <select
              required
              className="form-input"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value)
                const c = courses.find((x) => x.id === e.target.value)
                if (c) setHoles(c.holes)
              }}
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.tee_name ? ` — ${c.tee_name}` : ''} (S {c.slope_rating}, par {c.par})
                </option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No rated courses yet — ask an admin to add some.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Holes *</label>
            <div className="flex gap-3">
              {[9, 18].map((h) => (
                <button
                  type="button"
                  key={h}
                  onClick={() => setHoles(h)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    holes === h ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >{h} holes</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" required min="2026-04-15" max="2026-10-10" className="form-input"
              value={playDate} onChange={(e) => setPlayDate(e.target.value)} />
          </div>

          {availableGroup.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group <span className="text-gray-400 font-normal">(+1 pt each)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableGroup.map((m) => {
                  const on = groupIds.includes(m.id)
                  return (
                    <label key={m.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                      on ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-gray-200 text-gray-700'
                    }`}>
                      <input type="checkbox" checked={on} onChange={() => toggleGroup(m.id)} className="accent-green-600" />
                      {m.full_name}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={starting} className="btn-primary w-full py-3 text-base">
            {starting ? 'Starting…' : 'Start round ⛳'}
          </button>
        </form>
      </div>
    )
  }

  // view === 'playing'
  const isLast = round != null && currentHole >= round.holes
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{round?.course_name}</h1>
          <p className="text-sm text-gray-500">{round?.player_name} · {round?.holes} holes</p>
        </div>
        <button onClick={abandon} className="text-xs text-red-600 hover:underline">Discard</button>
      </div>

      <div className="card text-center space-y-6 py-8">
        <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Hole {currentHole} <span className="text-gray-300">of {round?.holes}</span>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setStrokes(strokes - 1)}
            className="w-16 h-16 rounded-full bg-gray-100 text-3xl font-bold text-gray-700 active:bg-gray-200"
            aria-label="One fewer stroke"
          >−</button>
          <div className="w-24">
            <div className="text-6xl font-bold text-green-700 tabular-nums">{strokes}</div>
            <div className="text-xs text-gray-400 mt-1">strokes</div>
          </div>
          <button
            onClick={() => setStrokes(strokes + 1)}
            className="w-16 h-16 rounded-full bg-green-600 text-3xl font-bold text-white active:bg-green-700"
            aria-label="One more stroke"
          >+</button>
        </div>

        <div className="text-sm text-gray-500">
          Running total <span className="font-bold text-gray-800">{runningTotal}</span>
          <span className="text-gray-400"> · {liveCount}/{round?.holes} holes entered</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => go(-1)}
          disabled={currentHole <= 1}
          className="btn-secondary flex-1 py-3 disabled:opacity-40"
        >← Prev</button>
        {isLast ? (
          <button onClick={finish} disabled={finishing} className="btn-primary flex-1 py-3">
            {finishing ? 'Finishing…' : 'Finish ✓'}
          </button>
        ) : (
          <button onClick={() => go(1)} className="btn-primary flex-1 py-3">Next →</button>
        )}
      </div>

      {/* Always allow finishing early (API checks all holes are entered). */}
      {!isLast && (
        <button onClick={finish} disabled={finishing} className="w-full text-sm text-green-700 hover:underline">
          {finishing ? 'Finishing…' : 'Finish round now'}
        </button>
      )}

      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
    </div>
  )
}

// Merge a hole value into a hole_scores array (for keeping entered-count fresh).
function mergeHole(list: HoleScore[], hole: number, strokes: number): HoleScore[] {
  const found = list.find((h) => h.hole === hole)
  if (found) return list.map((h) => (h.hole === hole ? { ...h, strokes } : h))
  return [...list, { hole, strokes }]
}
