'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Mt. Orford League Event — Sunday, August 2, 2026. First tee 11:25 AM.
const EVENT = new Date('2026-08-02T11:25:00-04:00')

export default function EventBanner() {
  const [days, setDays] = useState<number | null>(null)

  useEffect(() => {
    const compute = () => {
      const now = new Date()
      const ms = EVENT.getTime() - now.getTime()
      setDays(Math.ceil(ms / 86_400_000))
    }
    compute()
    const id = setInterval(compute, 60_000)
    return () => clearInterval(id)
  }, [])

  // Hidden until measured.
  if (days === null) return null

  // ── Post-event ──
  if (days < -1) {
    return (
      <Link
        href="/standings"
        className="block rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-700 text-white px-5 py-4 shadow-lg hover:from-sky-700 hover:to-indigo-800 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sky-200 text-[11px] font-bold uppercase tracking-widest">League Event · Aug 2 · Mt. Orford</p>
            <p className="font-extrabold text-lg leading-tight">⛰️ Mt. Orford is in the books — attendance &amp; winner points awarded</p>
          </div>
          <span className="shrink-0 bg-white/20 rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap">Standings →</span>
        </div>
      </Link>
    )
  }

  const label =
    days > 1  ? `${days} days to go`
    : days === 1 ? 'Tomorrow!'
    : days === 0 ? 'Today — tee it up! ⛳'
    : 'Live now ⛳'

  return (
    <Link
      href="/events/mt-orford"
      className="block rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-700 text-white px-5 py-4 shadow-lg hover:from-sky-700 hover:to-indigo-800 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sky-200 text-[11px] font-bold uppercase tracking-widest">Next League Event · Sun Aug 2 · Tee times 11:16, 11:25 &amp; 11:34 AM</p>
          <p className="font-extrabold text-lg leading-tight">⛰️ Golf at Mt. Orford — {label}</p>
          <p className="text-sky-100 text-xs mt-0.5 font-medium">+3 pts for playing · +2 season pts for best SSL score of the day</p>
        </div>
        <span className="shrink-0 bg-white/20 rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap">Details →</span>
      </div>
    </Link>
  )
}
