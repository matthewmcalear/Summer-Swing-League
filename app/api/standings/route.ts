import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeSeasonScore } from '@/lib/scoring'
import type { StandingEntry } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [members, scores, bonuses] = await Promise.all([
      prisma.member.findMany({ where: { is_active: true } }),
      prisma.score.findMany({ select: { member_id: true, total_points: true } }),
      prisma.seasonBonus.findMany({ orderBy: { awarded_date: 'asc' } }),
    ])

    const standings: StandingEntry[] = members.map((member) => {
      const memberPoints = scores
        .filter((s) => s.member_id === member.id)
        .map((s)  => Number(s.total_points ?? 0))

      const memberBonuses = bonuses.filter((b) => b.member_id === member.id)
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

    standings.sort((a, b) => b.seasonScore - a.seasonScore)

    return NextResponse.json(standings, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
  }
}
