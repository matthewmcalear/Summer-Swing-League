'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Dan's Birthday Golf Tournament — July 3, 2026 at Carling Lake.
// Counts down before the event; shows the champions once it's over.
const EVENT = new Date('2026-07-03T08:00:00-04:00')

export default function BdayCountdown() {
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

  // ── Post-event: results banner ──
  if (days < -1) {
    return (
      <Link
        href="/dans-bday"
        className="block rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-4 shadow-lg hover:from-amber-600 hover:to-orange-700 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-amber-100 text-[11px] font-bold uppercase tracking-widest">Results are in · July 3 · Carling Lake</p>
            <p className="font-extrabold text-lg leading-tight">🏆 Dan &amp; Jackson win Dan&apos;s Birthday Golf — 70 net</p>
          </div>
          <span className="shrink-0 bg-white/20 rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap">Full results →</span>
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
      href="/dans-bday"
      className="block rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-4 shadow-lg hover:from-amber-600 hover:to-orange-700 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-amber-100 text-[11px] font-bold uppercase tracking-widest">July 3 · Carling Lake</p>
          <p className="font-extrabold text-lg leading-tight">🎂 Dan&apos;s Birthday Golf — {label}</p>
        </div>
        <span className="shrink-0 bg-white/20 rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap">Live scores →</span>
      </div>
    </Link>
  )
}
