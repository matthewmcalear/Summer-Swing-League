'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { OPEN_FIELD_PLAYERS } from '@/lib/open-types'
import type { Member } from '@/types'

type Course = {
  id: string
  name: string
  tee_name: string
  course_rating: number
  slope_rating: number
  par: number
  holes: number
  hole_pars?: number[] | null
}

type SetupGroup = { name: string; teeTime: string; memberIds: string[] }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const confirmedNames = new Set(OPEN_FIELD_PLAYERS.map(normalize))
const blankPars = () => Array<string>(18).fill('')
const storedPars = (course?: Course) => {
  const pars = course?.hole_pars
  return Array.isArray(pars) && pars.length === 18 && pars.every((par) => Number.isInteger(par) && par >= 3 && par <= 6)
    && pars.reduce((sum, par) => sum + par, 0) === course?.par
    ? pars.map(String) : blankPars()
}

export default function OpenSetup({ onCreated }: { onCreated: () => void }) {
  const [members, setMembers] = useState<Member[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState('')
  const [holePars, setHolePars] = useState<string[]>(blankPars)
  const [difficulty, setDifficulty] = useState<'easy' | 'average' | 'tough'>('average')
  const [groups, setGroups] = useState<SetupGroup[]>([
    { name: 'Group 1', teeTime: '13:00', memberIds: [] },
    { name: 'Group 2', teeTime: '13:10', memberIds: [] },
    { name: 'Group 3', teeTime: '13:20', memberIds: [] },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [memberResponse, courseResponse] = await Promise.all([
          fetch('/api/members', { signal: controller.signal }),
          fetch('/api/courses', { signal: controller.signal }),
        ])
        if (!memberResponse.ok || !courseResponse.ok) throw new Error('Could not load the course library and players. Please try again.')
        const [memberData, courseData] = await Promise.all([memberResponse.json(), courseResponse.json()])
        if (!Array.isArray(memberData) || !Array.isArray(courseData.courses)) throw new Error('Could not load the course library and players. Please try again.')
        const activeMembers = (memberData as Member[]).filter((member) => member.is_active)
        activeMembers.sort((a, b) => Number(confirmedNames.has(normalize(b.full_name))) - Number(confirmedNames.has(normalize(a.full_name))) || a.full_name.localeCompare(b.full_name))
        const fullCourses = (courseData.courses as Course[]).filter((course) => course.holes === 18)
        const preferred = fullCourses.find((course) => /(?:ste|sainte)[\s.-]*rose/.test(normalize(course.name)))
        setMembers(activeMembers)
        setCourses(fullCourses)
        setCourseId(preferred?.id ?? '')
        setHolePars(storedPars(preferred))
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not load setup. Please try again.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [loadAttempt])

  const course = courses.find((item) => item.id === courseId)
  const parTotal = holePars.reduce((sum, value) => sum + Number(value), 0)
  const parCount = holePars.filter((value) => value !== '').length
  const playerCount = groups.reduce((sum, group) => sum + group.memberIds.length, 0)
  const selectedIds = new Set(groups.flatMap((group) => group.memberIds))
  const availableMembers = members.filter((member) => !selectedIds.has(member.id))
  const confirmedMembers = availableMembers.filter((member) => confirmedNames.has(normalize(member.full_name)))
  const otherMembers = availableMembers.filter((member) => !confirmedNames.has(normalize(member.full_name)))

  const updateGroup = (index: number, update: Partial<SetupGroup>) => {
    setGroups((current) => current.map((group, groupIndex) => groupIndex === index ? { ...group, ...update } : group))
  }

  const createEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setError('')
    if (!course) { setError('Choose an 18-hole course and tee.'); return }
    const pars = holePars.map(Number)
    if (holePars.some((value) => !value) || pars.some((par) => !Number.isInteger(par) || par < 3 || par > 6)) {
      setError('Enter a par from 3 to 6 for all 18 holes using the course scorecard.'); return
    }
    if (parTotal !== course.par) { setError(`The hole pars total ${parTotal}. They must match the course par of ${course.par}.`); return }
    if (groups.some((group) => !group.name.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(group.teeTime))) {
      setError('Give each group a name and a valid tee time.'); return
    }
    if (groups.some((group) => group.memberIds.length < 1 || group.memberIds.length > 4)) {
      setError('Add between 1 and 4 players to each of the three groups.'); return
    }
    if (selectedIds.size !== playerCount || Array.from(selectedIds).some((id) => !members.some((member) => member.id === id))) {
      setError('Each player must be an active member and appear in only one group.'); return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/ssl-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, holePars: pars, difficulty, groups: groups.map((group) => ({ ...group, name: group.name.trim() })) }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Could not create the Open. Please try again.')
      }
      onCreated()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not create the Open. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card text-sm text-gray-600" role="status">Loading Open setup…</div>

  if (!courses.length || !members.length) {
    return (
      <section className="card space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Set up Saturday’s Open</h2>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : (
          <p className="text-sm text-gray-600">
            {!courses.length ? 'Add an 18-hole course and its tee ratings in admin before setting up the Open.' : 'Add active league members before setting up the groups.'}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => setLoadAttempt((value) => value + 1)}>Reload setup</button>
          <Link href="/admin" className="btn-primary">Open admin</Link>
        </div>
      </section>
    )
  }

  return (
    <form onSubmit={createEvent} className="card space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-green-700 mb-2">Admin setup</p>
        <h2 className="text-2xl font-bold text-gray-900">Set up Saturday’s Open</h2>
        <p className="mt-2 text-sm text-gray-600">September 19, 2026 · Golf Ste-Rose · Three groups, one live leaderboard.</p>
      </div>

      <fieldset disabled={saving} className="space-y-6 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700">
            Course & tees
            <select required className="form-input" value={courseId} onChange={(event) => {
              setCourseId(event.target.value)
              setHolePars(storedPars(courses.find((item) => item.id === event.target.value)))
            }}>
              <option value="">Choose course & tees</option>
              {courses.map((item) => <option key={item.id} value={item.id}>{item.name}{item.tee_name ? ` — ${item.tee_name}` : ''}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            SSL course difficulty
            <select className="form-input" value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}>
              <option value="easy">Easy</option>
              <option value="average">Average</option>
              <option value="tough">Tough</option>
            </select>
            <span className="block mt-1 text-xs font-normal text-gray-500">Applies to everyone’s SSL round points. Players choose their Open mode on the first tee.</span>
          </label>
        </div>

        {course && (
          <section className="space-y-3" aria-labelledby="open-pars-heading">
            <div>
              <h3 id="open-pars-heading" className="font-bold text-gray-900">Hole pars</h3>
              <p className="mt-1 text-sm text-gray-600">Use the scorecard for {course.tee_name || 'the selected'} tees. Par {course.par} · Rating {course.course_rating} · Slope {course.slope_rating}.</p>
              <p className="mt-1 text-xs text-gray-500">These pars let the board compare players who have completed different numbers of holes.</p>
            </div>
            {[0, 9].map((start) => (
              <div key={start} className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">{start === 0 ? 'Front nine' : 'Back nine'}</p>
                <div className="grid grid-cols-3 min-[400px]:grid-cols-9 gap-2">
                  {holePars.slice(start, start + 9).map((value, index) => (
                    <label key={start + index} className="block text-center text-xs text-gray-600">
                      <span>Hole {start + index + 1}</span>
                      <input required type="number" inputMode="numeric" min="3" max="6" step="1" value={value} placeholder="—"
                        className="form-input text-center px-1 tabular-nums" aria-label={`Par for hole ${start + index + 1}`}
                        onChange={(event) => setHolePars((current) => current.map((par, holeIndex) => holeIndex === start + index ? event.target.value : par))} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <p aria-live="polite" className={`text-sm font-semibold ${parCount === 18 && parTotal !== course.par ? 'text-red-700' : 'text-gray-600'}`}>
              {parCount}/18 pars entered · Total {parTotal} / {course.par}
            </p>
          </section>
        )}

        <section className="space-y-3" aria-labelledby="open-groups-heading">
          <div>
            <h3 id="open-groups-heading" className="font-bold text-gray-900">Build the three groups</h3>
            <p className="mt-1 text-sm text-gray-600">Assign 1–4 players per group. Confirmed Open players appear first in each list.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {groups.map((group, index) => (
              <div key={index} className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Group {index + 1}</h3>
                  <span className="text-xs font-semibold text-gray-500">{group.memberIds.length}/4 players</span>
                </div>
                <label className="block text-xs font-semibold text-gray-600">Group name
                  <input required maxLength={60} className="form-input" value={group.name} onChange={(event) => updateGroup(index, { name: event.target.value })} />
                </label>
                <label className="block text-xs font-semibold text-gray-600">Tee time
                  <input required type="time" className="form-input min-w-0" value={group.teeTime} onChange={(event) => updateGroup(index, { teeTime: event.target.value })} />
                </label>
                <ul className="space-y-2">
                  {group.memberIds.map((id) => {
                    const member = members.find((item) => item.id === id)
                    return (
                      <li key={id} className="flex items-center justify-between gap-2 rounded-lg bg-white border border-gray-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 break-words">{member?.full_name}</p>
                          <p className="text-xs text-gray-500">Handicap {member?.current_handicap}</p>
                        </div>
                        <button type="button" className="shrink-0 min-h-11 px-2 text-xs font-semibold text-gray-600 hover:text-red-700"
                          aria-label={`Remove ${member?.full_name} from ${group.name}`}
                          onClick={() => updateGroup(index, { memberIds: group.memberIds.filter((memberId) => memberId !== id) })}>Remove</button>
                      </li>
                    )
                  })}
                </ul>
                <label className="block text-xs font-semibold text-gray-600">Add player
                  <select className="form-input" value="" disabled={group.memberIds.length >= 4 || !availableMembers.length}
                    onChange={(event) => { if (event.target.value) updateGroup(index, { memberIds: [...group.memberIds, event.target.value] }) }}>
                    <option value="">{group.memberIds.length >= 4 ? 'Group is full' : availableMembers.length ? 'Choose a player' : 'All players assigned'}</option>
                    {confirmedMembers.length > 0 && <optgroup label="Confirmed Open field">{confirmedMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name} · HCP {member.current_handicap}</option>)}</optgroup>}
                    {otherMembers.length > 0 && <optgroup label="Other active members">{otherMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name} · HCP {member.current_handicap}</option>)}</optgroup>}
                  </select>
                </label>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600" aria-live="polite">{playerCount} players assigned across three groups.</p>
        </section>
      </fieldset>

      <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-gray-700">
        The Open will use each player’s current handicap when you create the event. Each group gets a scoring link, and players lock in their mode and optional Double Down before entering scores.
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">{saving ? 'Creating Open…' : 'Create Open & group scoring links'}</button>
    </form>
  )
}
