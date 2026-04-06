'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Register() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', current_handicap: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/members', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          full_name:        form.full_name.trim(),
          email:            form.email.trim(),
          current_handicap: Number(form.current_handicap),
        }),
      })

      if (res.ok) {
        router.push('/success?type=register')
      } else {
        const body = await res.json()
        setError(body.error || 'Registration failed. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Join the League</h1>
        <p className="text-gray-500 mt-1 text-sm">Register to play in Summer Swing League 2026.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input
            type="text"
            required
            placeholder="Jane Smith"
            className="form-input"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
          <input
            type="email"
            required
            placeholder="jane@example.com"
            className="form-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Handicap (18-hole) *
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="54"
            required
            placeholder="e.g. 18.0  (enter 0 if unsure)"
            className="form-input"
            value={form.current_handicap}
            onChange={(e) => setForm({ ...form, current_handicap: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">
            Use your GHIN/WHS handicap index. You can update it each time you submit a round.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
          {submitting ? 'Registering…' : 'Register'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Free to join · Play any course · April 15 – October 10
      </p>
    </div>
  )
}
