'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Flag, Users, type LucideIcon } from 'lucide-react'
import CountUp from './CountUp'
import type { StandingEntry } from '@/types'
import { SEASON_END } from '@/lib/scoring'

// Whole days from now until the end of the season (end-of-day on SEASON_END).
function daysUntil(dateStr: string): number {
  const end = new Date(`${dateStr}T23:59:59`)
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000)
}

/**
 * Live season signal — three real numbers pulled from actual data.
 * Any stat whose value can't be determined is omitted, never faked.
 */
export default function SeasonStats() {
  const [data, setData] = useState<StandingEntry[] | null>(null)

  useEffect(() => {
    fetch('/api/standings')
      .then((r) => r.json())
      .then((d: StandingEntry[]) => setData(Array.isArray(d) ? d : null))
      .catch(() => setData(null))
  }, [])

  const daysLeft = daysUntil(SEASON_END)
  const rounds = data ? data.reduce((sum, p) => sum + p.totalRounds, 0) : null
  const members = data ? data.length : null

  const tiles: { icon: LucideIcon; value: number; label: string }[] = []
  if (daysLeft >= 0) tiles.push({ icon: CalendarDays, value: daysLeft, label: 'Days left in the season' })
  if (rounds !== null) tiles.push({ icon: Flag, value: rounds, label: 'Rounds submitted' })
  if (members !== null) tiles.push({ icon: Users, value: members, label: 'Members registered' })

  if (tiles.length === 0) return null

  return (
    <div className={`grid gap-3 ${tiles.length === 3 ? 'grid-cols-3' : tiles.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {tiles.map(({ icon: Icon, value, label }) => (
        <div key={label} className="card flex items-center gap-3 py-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 text-green-700 shrink-0">
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="font-display text-2xl sm:text-3xl font-bold text-green-800 leading-none tabular-nums">
              <CountUp value={value} />
            </div>
            <div className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1 leading-tight">{label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
