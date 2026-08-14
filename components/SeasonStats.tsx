import { CalendarDays, Flag, Users, type LucideIcon } from 'lucide-react'
import CountUp from './CountUp'
import type { StandingEntry } from '@/types'
import { SEASON_END, daysUntil } from '@/lib/scoring'

interface SeasonStatsProps {
  standings: StandingEntry[]
}

/**
 * Live season signal — three real numbers pulled from actual data.
 * Any stat whose value can't be determined is omitted, never faked.
 */
export default function SeasonStats({ standings }: SeasonStatsProps) {
  const daysLeft = daysUntil(SEASON_END)
  const rounds = standings.reduce((sum, p) => sum + p.totalRounds, 0)
  const members = standings.length

  const tiles: { icon: LucideIcon; value: number; label: string; full: string }[] = []
  if (daysLeft >= 0) tiles.push({ icon: CalendarDays, value: daysLeft, label: 'Days left', full: 'Days left in the season' })
  tiles.push({ icon: Flag, value: rounds, label: 'Rounds', full: 'Rounds submitted' })
  tiles.push({ icon: Users, value: members, label: 'Members', full: 'Members registered' })

  if (tiles.length === 0) return null

  return (
    <div className={`grid gap-2 sm:gap-3 ${tiles.length === 3 ? 'grid-cols-3' : tiles.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {tiles.map(({ icon: Icon, value, label, full }) => (
        <div key={label} className="card flex flex-col items-center text-center gap-2 px-2 py-4 sm:py-5">
          <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50 text-green-700">
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="font-display text-3xl sm:text-4xl font-bold text-green-800 leading-none tabular-nums">
            <CountUp value={value} />
          </div>
          <div className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight">
            <span className="sm:hidden">{label}</span>
            <span className="hidden sm:inline">{full}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
