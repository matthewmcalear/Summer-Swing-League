import { prisma } from '@/lib/prisma'
import { computeSeasonScore } from '@/lib/scoring'
import type { StandingEntry } from '@/types'

/**
 * Compute the full sorted season standings.
 * Shared by the standings page and the email digest.
 */
export async function getStandings(): Promise<StandingEntry[]> {
  const [members, scores, bonuses] = await Promise.all([
    prisma.member.findMany({ where: { is_active: true } }),
    prisma.score.findMany({ select: { member_id: true, total_points: true } }),
    prisma.seasonBonus.findMany({ orderBy: { awarded_date: 'asc' } }),
  ])

  // Group scores and bonuses by member once, instead of filtering per member
  const pointsByMember = new Map<string, number[]>()
  for (const s of scores) {
    if (!s.member_id) continue
    const list = pointsByMember.get(s.member_id) ?? []
    list.push(Number(s.total_points ?? 0))
    pointsByMember.set(s.member_id, list)
  }
  const bonusesByMember = new Map<string, typeof bonuses>()
  for (const b of bonuses) {
    const list = bonusesByMember.get(b.member_id) ?? []
    list.push(b)
    bonusesByMember.set(b.member_id, list)
  }

  const standings: StandingEntry[] = members.map((member) => {
    const memberPoints  = pointsByMember.get(member.id) ?? []
    const memberBonuses = bonusesByMember.get(member.id) ?? []
    const bonusTotal    = memberBonuses.reduce((sum, b) => sum + b.points, 0)

    const { seasonScore, totalPoints, topScores, improvementBonus, handicapImprovement, seasonBonusPoints } =
      computeSeasonScore(
        memberPoints,
        member.starting_handicap,
        Number(member.current_handicap),
        bonusTotal,
      )

    return {
      id:                  member.id,
      name:                member.full_name,
      currentHandicap:     Number(member.current_handicap),
      startingHandicap:    member.starting_handicap ?? null,
      handicapImprovement,
      improvementBonus,
      totalRounds:         memberPoints.length,
      totalPoints,
      seasonScore,
      topScores,
      seasonBonusPoints,
      seasonBonuses: memberBonuses.map((b) => ({
        id:           b.id,
        points:       b.points,
        reason:       b.reason,
        awarded_date: b.awarded_date.toISOString().slice(0, 10),
      })),
    }
  })

  standings.sort((a, b) => {
    if (b.seasonScore !== a.seasonScore) return b.seasonScore - a.seasonScore
    if (b.totalRounds !== a.totalRounds) return b.totalRounds - a.totalRounds
    const aTop = a.topScores[0] ?? 0
    const bTop = b.topScores[0] ?? 0
    return bTop - aTop
  })

  return standings
}

/** Participation multiplier for a given round count (matches computeSeasonScore). */
export function participationMultiplier(rounds: number): number {
  if (rounds >= 5) return 1.0
  return ({ 0: 0, 1: 0.2, 2: 0.4, 3: 0.6, 4: 0.8 } as Record<number, number>)[rounds] ?? 0
}
