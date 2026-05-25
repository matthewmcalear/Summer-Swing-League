'use client'

import { useEffect, useState } from 'react'

const LS_KEY = 'ssl_member_id'

interface Club { id: string; club_name: string; yards: number }
interface Member { id: string; full_name: string }

export default function MyBagClient({ members }: { members: Member[] }) {
  const [memberId, setMemberId]       = useState<string>('')
  const [clubs, setClubs]             = useState<Club[]>([])
  const [clubNames, setClubNames]     = useState<string[]>([])
  const [selectedClub, setSelectedClub] = useState<string>('')
  const [customName, setCustomName]   = useState<string>('')
  const [yards, setYards]             = useState<string>('')
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [useCustom, setUseCustom]     = useState(false)

  // Load persisted member from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved && members.find((m) => m.id === saved)) setMemberId(saved)
  }, [members])

  // Fetch club name list once
  useEffect(() => {
    fetch('/api/my-bag/club-names').then((r) => r.json()).then(setClubNames)
  }, [])

  // Fetch clubs when member changes
  useEffect(() => {
    if (!memberId) { setClubs([]); return }
    localStorage.setItem(LS_KEY, memberId)
    fetch(`/api/my-bag?memberId=${memberId}`)
      .then((r) => r.json())
      .then(({ clubs }) => setClubs(clubs ?? []))
  }, [memberId])

  const effectiveClubName = useCustom ? customName.trim() : selectedClub

  const saveClub = async () => {
    if (!memberId || !effectiveClubName || !yards) return
    setSaving(true)
    const res = await fetch('/api/my-bag', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ member_id: memberId, club_name: effectiveClubName, yards: Number(yards) }),
    })
    const club = await res.json()
    setClubs((prev) => {
      const filtered = prev.filter((c) => c.club_name !== club.club_name)
      return [...filtered, club].sort((a, b) => b.yards - a.yards)
    })
    setYards('')
    setCustomName('')
    setUseCustom(false)
    setSaving(false)
  }

  const deleteClub = async (id: string) => {
    setDeleting(id)
    await fetch(`/api/my-bag/${id}`, { method: 'DELETE' })
    setClubs((prev) => prev.filter((c) => c.id !== id))
    setDeleting(null)
  }

  const memberName = members.find((m) => m.id === memberId)?.full_name ?? ''

  return (
    <div className="space-y-6">

      {/* Member selector */}
      <div className="card">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Who are you?</label>
        <select
          className="form-input sm:max-w-xs"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
        >
          <option value="">Select your name…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        {memberId && (
          <p className="text-xs text-gray-400 mt-2">
            Your selection is saved in this browser — the rangefinder will use your bag automatically.
          </p>
        )}
      </div>

      {memberId && (
        <>
          {/* Add / update club */}
          <div className="card">
            <h2 className="text-base font-bold text-gray-900 mb-4">Add or update a club</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Club name */}
              <div className="flex-1">
                {!useCustom ? (
                  <select
                    className="form-input w-full"
                    value={selectedClub}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') { setUseCustom(true); setSelectedClub('') }
                      else setSelectedClub(e.target.value)
                    }}
                  >
                    <option value="">Select club…</option>
                    {clubNames.map((n) => <option key={n} value={n}>{n}</option>)}
                    <option value="__custom__">+ Add custom club…</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="form-input flex-1"
                      placeholder="Club name (e.g. 60° Wedge)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                    <button
                      onClick={() => { setUseCustom(false); setCustomName('') }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >Cancel</button>
                  </div>
                )}
              </div>

              {/* Yards */}
              <input
                type="number"
                className="form-input sm:w-32"
                placeholder="Yards"
                min={1}
                max={400}
                value={yards}
                onChange={(e) => setYards(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveClub()}
              />

              <button
                onClick={saveClub}
                disabled={saving || !effectiveClubName || !yards}
                className="btn-primary px-5 py-2 text-sm disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Saving a club that already exists will update its yardage.
            </p>
          </div>

          {/* Club list */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{memberName}'s Bag</h2>
              <span className="text-xs text-gray-400">{clubs.length} club{clubs.length !== 1 ? 's' : ''}</span>
            </div>

            {clubs.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                No clubs yet — add your first one above.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {clubs.map((c) => (
                  <li key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                    <span className="flex-1 font-medium text-gray-800 text-sm">{c.club_name}</span>
                    <span className="tabular-nums font-bold text-green-700 text-sm">{c.yards} yds</span>
                    <span className="text-xs text-gray-400">{Math.round(c.yards * 0.9144)} m</span>
                    <button
                      onClick={() => deleteClub(c.id)}
                      disabled={deleting === c.id}
                      className="ml-2 text-gray-300 hover:text-red-400 transition-colors text-lg leading-none disabled:opacity-40"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* How it works */}
      <div className="card space-y-4">
        <h2 className="text-base font-bold text-gray-900">How My Bag works with the Rangefinder</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { icon: '🎯', title: 'Club recommendation', body: 'Drop a pin on the map and the rangefinder automatically shows your best-fit club — the one in your bag closest to the target distance.' },
            { icon: '⛰️', title: 'Slope-adjusted', body: 'When elevation data loads, the recommendation uses the "play as" yardage (flat distance ± elevation ÷ 3), not just the raw distance.' },
            { icon: '◎', title: 'Dispersion circle', body: 'Toggle dispersion in the rangefinder to see a circle on the map showing where your ball statistically could end up. Drag the slider to explore tighter or wider windows.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">📐 How dispersion is calculated</p>
          <p className="text-xs leading-relaxed text-amber-700">
            Calibrated to Arccos tracking data. Ellipse is wider left/right than long/short.
            At 150 yards: scratch ≈ ±8 yd L/R / ±6 yd depth · hdcp 15 ≈ ±20 yd L/R / ±15 yd depth · hdcp 36 ≈ ±30 yd L/R / ±22 yd depth.
            Direction misses dominate over distance misses for most golfers.
          </p>
        </div>

        <p className="text-xs text-gray-400">
          Your name selection is saved in this browser — the rangefinder loads your clubs automatically. No login required.
        </p>
      </div>
    </div>
  )
}
