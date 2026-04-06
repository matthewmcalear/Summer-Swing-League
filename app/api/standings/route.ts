import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeSeasonScore } from '@/lib/scoring'
import type { StandingEntry } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [members, scores] = await Promise.all([
      prisma.member.findMany({ where: { is_active: true } }),
      prisma.score.findMany({ select: { member_id: true, total_points: true } }),
    ])

    const standings: StandingEntry[] = members.map((member) => {
      const memberPoints = scores
        .filter((s) => s.member_id === member.id)
        .map((s)  => Number(s.total_points ?? 0))

      const { seasonScore, totalPoints, topScores, improvementBonus, handicapImprovement } =
        computeSeasonScore(
          memberPoints,
          member.starting_handicap,
          Number(member.current_handicap),
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
      }
    })

    standings.sort((a, b) => b.seasonScore - a.seasonScore)

    return NextResponse.json(standings, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
  }
}
