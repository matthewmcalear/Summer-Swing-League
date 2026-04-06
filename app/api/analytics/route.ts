import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [members, scores] = await Promise.all([
      prisma.member.findMany({ where: { is_active: true }, orderBy: { full_name: 'asc' } }),
      prisma.score.findMany({ orderBy: { play_date: 'asc' } }),
    ])

    // ── Per-player round history (chronological points) ──────────────────────
    const playerTimelines = members.map((m) => {
      const playerScores = scores
        .filter((s) => s.member_id === m.id)
        .map((s) => ({
          date:        s.play_date,
          totalPoints: Number(s.total_points ?? 0),
          gross:       s.gross_score,
          handicap:    Number(s.handicap_used),
          holes:       s.holes,
          course:      s.course_name,
          difficulty:  s.course_difficulty,
          groupBonus:  Number(s.group_bonus ?? 0),
        }))

      return {
        id:               m.id,
        name:             m.full_name,
        currentHandicap:  Number(m.current_handicap),
        startingHandicap: m.starting_handicap ? Number(m.starting_handicap) : null,
        scores:           playerScores,
      }
    })

    // ── Round activity by week ───────────────────────────────────────────────
    const activityByDate: Record<string, number> = {}
    scores.forEach((s) => {
      const week = s.play_date.toISOString().slice(0, 10)
      activityByDate[week] = (activityByDate[week] ?? 0) + 1
    })

    // ── Course breakdown ─────────────────────────────────────────────────────
    const courseCount: Record<string, number> = {}
    scores.forEach((s) => {
      courseCount[s.course_name] = (courseCount[s.course_name] ?? 0) + 1
    })
    const topCourses = Object.entries(courseCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // ── Holes breakdown ──────────────────────────────────────────────────────
    const holes9  = scores.filter((s) => s.holes === 9).length
    const holes18 = scores.filter((s) => s.holes === 18).length

    // ── Difficulty breakdown ─────────────────────────────────────────────────
    const diffCount = { easy: 0, average: 0, tough: 0 } as Record<string, number>
    scores.forEach((s) => { diffCount[s.course_difficulty] = (diffCount[s.course_difficulty] ?? 0) + 1 })

    // ── Points distribution (all rounds) ────────────────────────────────────
    const allPoints = scores.map((s) => Number(s.total_points ?? 0))
    const avgPoints  = allPoints.length ? allPoints.reduce((a, b) => a + b, 0) / allPoints.length : 0
    const maxPoints  = allPoints.length ? Math.max(...allPoints) : 0

    return NextResponse.json({
      playerTimelines,
      activityByDate,
      topCourses,
      holes9,
      holes18,
      diffCount,
      totalRounds: scores.length,
      avgPoints:   Math.round(avgPoints * 10) / 10,
      maxPoints:   Math.round(maxPoints * 10) / 10,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
