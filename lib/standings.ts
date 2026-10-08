import { prisma } from '@/lib/prisma'
import { computeSeasonScore } from '@/lib/scoring'
import type { StandingEntry } from '@/types'

// ── Raw inputs (shape of the DB rows the standings need) ────────────────────

export interface StandingsMember {
  id: string
  full_name: string
  current_handicap: number
  starting_handicap: number | null
}
export interface StandingsScore {
  member_id: string | null
  total_points: number
  play_date: Date
}
export interface StandingsBonus {
  id: string
  member_id: string
  points: number
  reason: string
  awarded_date: Date
}
export interface StandingsHandicap {
  member_id: string
  handicap: number
  recorded_at: Date
}

export interface StandingsInput {
  members: StandingsMember[]
  scores: StandingsScore[]
  bonuses: StandingsBonus[]
  handicaps: StandingsHandicap[]
}

const MOVEMENT_WINDOW_DAYS = 7

function groupBy<T>(rows: T[], key: (r: T) => string | null): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r)
    if (!k) continue
    const list = out.get(k)
    if (list) list.push(r)
    else out.set(k, [r])
  }
  return out
}

function sortStandings(standings: StandingEntry[]) {
  standings.sort((a, b) => {
    if (b.seasonScore !== a.seasonScore) return b.seasonScore - a.seasonScore
    if (b.totalRounds !== a.totalRounds) return b.totalRounds - a.totalRounds
    return (b.topScores[0] ?? 0) - (a.topScores[0] ?? 0)
  })
}

/**
 * Standings as they stood at `asOf` (inclusive). With no `asOf`, uses everything
 * and members' current handicaps. With `asOf`, the handicap is the last recorded
 * history entry on or before that moment (falling back to the starting handicap).
 */
function snapshot(input: StandingsInput, asOf?: Date): StandingEntry[] {
  const cutoff = asOf?.getTime() ?? Infinity
  const scoresBy   = groupBy(input.scores.filter((s) => s.play_date.getTime() <= cutoff), (s) => s.member_id)
  const bonusesBy  = groupBy(
    [...input.bonuses].filter((b) => b.awarded_date.getTime() <= cutoff)
      .sort((a, b) => a.awarded_date.getTime() - b.awarded_date.getTime()),
    (b) => b.member_id,
  )
  const historyBy  = asOf ? groupBy(input.handicaps.filter((h) => h.recorded_at.getTime() <= cutoff), (h) => h.member_id) : null

  const standings = input.members.map((m): StandingEntry => {
    const rows     = scoresBy.get(m.id) ?? []
    const points   = rows.map((s) => Number(s.total_points ?? 0))
    const bonuses  = bonusesBy.get(m.id) ?? []
    const bonusSum = bonuses.reduce((sum, b) => sum + b.points, 0)

    let handicap = Number(m.current_handicap)
    if (historyBy) {
      const hist = historyBy.get(m.id)
      const last = hist?.reduce((a, b) => (b.recorded_at > a.recorded_at ? b : a))
      handicap = last ? last.handicap : (m.starting_handicap ?? handicap)
    }
    // Improvement only counts once a round exists in the window.
    const starting = rows.length > 0 ? m.starting_handicap : null

    const result = computeSeasonScore(points, starting, handicap, bonusSum)
    const lastPlayed = rows.reduce<Date | null>((d, s) => (!d || s.play_date > d ? s.play_date : d), null)

    return {
      id:               m.id,
      name:             m.full_name,
      currentHandicap:  handicap,
      startingHandicap: m.starting_handicap ?? null,
      ...result,
      totalRounds:      points.length,
      lastPlayed:       lastPlayed ? lastPlayed.toISOString().slice(0, 10) : null,
      seasonBonuses: bonuses.map((b) => ({
        id: b.id, points: b.points, reason: b.reason,
        awarded_date: b.awarded_date.toISOString().slice(0, 10),
      })),
    }
  })
  sortStandings(standings)
  return standings
}

/**
 * Smallest new-round point total (to 0.1) that lifts `scores` past `target`
 * season score. Returns null if even a `cap`-point round wouldn't do it.
 */
export function pointsNeededToPass(
  scores: number[],
  startingHandicap: number | null,
  currentHandicap: number,
  bonusPoints: number,
  target: number,
  cap = 200,
): number | null {
  const scoreWith = (x: number) =>
    computeSeasonScore([...scores, x], startingHandicap ?? currentHandicap, currentHandicap, bonusPoints).seasonScore
  if (scoreWith(cap) <= target) return null
  let lo = 0, hi = cap * 10 // search in tenths
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (scoreWith(mid / 10) > target) hi = mid
    else lo = mid + 1
  }
  return lo / 10
}

/**
 * Pure standings computation: ranks (ties share a rank), week-over-week
 * movement, gaps, and the single-round points needed to pass the player above.
 */
export function buildStandings(input: StandingsInput, now = new Date()): StandingEntry[] {
  const current = snapshot(input)
  const before  = snapshot(input, new Date(now.getTime() - MOVEMENT_WINDOW_DAYS * 86_400_000))
  const rankOf  = (list: StandingEntry[]) => {
    const ranks = new Map<string, number>()
    list.forEach((p, i) => {
      const prev = list[i - 1]
      ranks.set(p.id, prev && prev.seasonScore === p.seasonScore ? ranks.get(prev.id)! : i + 1)
    })
    return ranks
  }
  const nowRanks  = rankOf(current)
  const thenRanks = rankOf(before)
  const thenActive = new Set(before.filter((p) => p.totalRounds > 0).map((p) => p.id))

  const pointsBy = groupBy(input.scores, (s) => s.member_id)
  const memberBy = new Map(input.members.map((m) => [m.id, m]))
  const leader   = current[0]?.seasonScore ?? 0
  const bestRound = input.scores.reduce((max, s) => Math.max(max, Number(s.total_points ?? 0)), 0)

  return current.map((p, i) => {
    const rank = nowRanks.get(p.id)!
    const above = current.slice(0, i).reverse().find((q) => q.seasonScore > p.seasonScore)
    let toPass: number | null = null
    if (above) {
      const m = memberBy.get(p.id)!
      toPass = pointsNeededToPass(
        (pointsBy.get(p.id) ?? []).map((s) => Number(s.total_points ?? 0)),
        p.totalRounds > 0 ? m.starting_handicap : null,
        p.currentHandicap,
        p.seasonBonusPoints,
        above.seasonScore,
      )
    }
    return {
      ...p,
      rank,
      movement:    p.totalRounds > 0 && thenActive.has(p.id) ? thenRanks.get(p.id)! - rank : null,
      gapToLeader: Math.round((leader - p.seasonScore) * 100) / 100,
      gapToNext:   above ? Math.round((above.seasonScore - p.seasonScore) * 100) / 100 : null,
      nextName:    above?.name ?? null,
      pointsToPass: toPass,
      toPassAboveBest: toPass != null && toPass > bestRound,
    }
  })
}

/**
 * Compute the full sorted season standings.
 * Shared by the home page, standings page, finale page and email digest.
 */
export async function getStandings(): Promise<StandingEntry[]> {
  const [members, scores, bonuses, handicaps] = await Promise.all([
    prisma.member.findMany({
      where: { is_active: true },
      select: { id: true, full_name: true, current_handicap: true, starting_handicap: true },
    }),
    prisma.score.findMany({ select: { member_id: true, total_points: true, play_date: true } }),
    prisma.seasonBonus.findMany({ select: { id: true, member_id: true, points: true, reason: true, awarded_date: true } }),
    prisma.handicapHistory.findMany({ select: { member_id: true, handicap: true, recorded_at: true } }),
  ])
  return buildStandings({
    members: members.map((m) => ({ ...m, current_handicap: Number(m.current_handicap) })),
    scores: scores.map((s) => ({ ...s, total_points: Number(s.total_points ?? 0) })),
    bonuses,
    handicaps,
  })
}

/** Participation multiplier for a given round count (matches computeSeasonScore). */
export function participationMultiplier(rounds: number): number {
  if (rounds >= 5) return 1.0
  return ({ 0: 0, 1: 0.2, 2: 0.4, 3: 0.6, 4: 0.8 } as Record<number, number>)[rounds] ?? 0
}
