'use client'

import { useEffect, useState } from 'react'

export type Course = {
  id: string
  name: string
  tee_name: string
  course_rating: number
  slope_rating: number
  par: number
  holes: number
  is_active: boolean
}

const BLANK = { name: '', tee_name: '', course_rating: '', slope_rating: '', par: '', holes: '18' }

// Course library: rating / slope / par per course + tee. Used to compute WHS
// score differentials and suggested handicaps.
export default function CourseLibraryTab() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState({ ...BLANK })
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    const d = await fetch('/api/courses').then((r) => r.json()).catch(() => ({ courses: [] }))
    setCourses(Array.isArray(d.courses) ? d.courses : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/courses', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:          form.name,
        tee_name:      form.tee_name,
        course_rating: Number(form.course_rating),
        slope_rating:  Number(form.slope_rating),
        par:           Number(form.par),
        holes:         Number(form.holes),
      }),
    })
    setSaving(false)
    if (res.ok) { setForm({ ...BLANK }); await load() }
    else setError((await res.json().catch(() => ({})))?.error || 'Failed to add course')
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this course from the library? Past scores keep their stored rating/slope.')) return
    await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    setCourses((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        The course library stores <strong>Course Rating</strong>, <strong>Slope</strong>, and{' '}
        <strong>Par</strong> per tee. Players pick a course when submitting a score and these values
        auto-fill, which lets the site compute a WHS-style suggested handicap they can verify against
        apps like The Grint.
      </p>

      {/* Add course */}
      <form onSubmit={add} className="card grid grid-cols-2 sm:grid-cols-7 gap-3 items-end">
        <label className="text-xs text-gray-500 col-span-2 sm:col-span-2">
          Course name
          <input className="form-input mt-1" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pebble Beach" />
        </label>
        <label className="text-xs text-gray-500">
          Tee
          <input className="form-input mt-1" value={form.tee_name}
            onChange={(e) => setForm({ ...form, tee_name: e.target.value })} placeholder="Blue" />
        </label>
        <label className="text-xs text-gray-500">
          Rating
          <input className="form-input mt-1" required type="number" step="0.1" value={form.course_rating}
            onChange={(e) => setForm({ ...form, course_rating: e.target.value })} placeholder="71.2" />
        </label>
        <label className="text-xs text-gray-500">
          Slope
          <input className="form-input mt-1" required type="number" value={form.slope_rating}
            onChange={(e) => setForm({ ...form, slope_rating: e.target.value })} placeholder="125" />
        </label>
        <label className="text-xs text-gray-500">
          Par
          <input className="form-input mt-1" required type="number" value={form.par}
            onChange={(e) => setForm({ ...form, par: e.target.value })} placeholder="72" />
        </label>
        <label className="text-xs text-gray-500">
          Holes
          <select className="form-input mt-1" value={form.holes}
            onChange={(e) => setForm({ ...form, holes: e.target.value })}>
            <option value="18">18</option>
            <option value="9">9</option>
          </select>
        </label>
        <button type="submit" disabled={saving} className="btn-primary col-span-2 sm:col-span-7">
          {saving ? 'Adding…' : '+ Add course'}
        </button>
        {error && <p className="text-sm text-red-600 col-span-2 sm:col-span-7">{error}</p>}
      </form>

      {/* Library table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full table-base">
          <thead>
            <tr>
              <th>Course</th><th>Tee</th><th>Rating</th><th>Slope</th><th>Par</th><th>Holes</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No courses yet — add one above.</td></tr>
            ) : courses.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.tee_name || '—'}</td>
                <td className="px-4 py-3">{c.course_rating}</td>
                <td className="px-4 py-3">{c.slope_rating}</td>
                <td className="px-4 py-3">{c.par}</td>
                <td className="px-4 py-3">{c.holes}</td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(c.id)} className="btn-danger text-xs px-3 py-1">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
