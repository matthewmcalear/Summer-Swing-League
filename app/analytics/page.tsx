import { prisma } from '@/lib/prisma'
import { computeSeasonScore } from '@/lib/scoring'
import AnalyticsClient, { type Analytics } from './AnalyticsClient'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const [members, scores] = await Promise.all([
    prisma.member.findMany({ where: { is_active: true }, orderBy: { full_name: 'asc' } }),
    prisma.score.findMany({ orderBy: { play_date: 'asc' } }),
  ])

  if (scores.length === 0) {
    return (
      <div className="card text-center py-20 text-gray-500">
        <div className="text-5xl mb-3">📊</div>
        <p className="font-medium">No rounds yet — analytics appear once the season begins.</p>
      </div>
    )
  }

  const playerTimelines = members.map((m) => {
    const playerScores = scores
      .filter((s) => s.member_id === m.id)
      .map((s) => ({
        date:        s.play_date.toISOString().slice(0, 10),
        totalPoints: Number(s.total_points ?? 0),
        gross:       s.gross_score,
        handicap:    Number(s.handicap_used),
        holes:       s.holes,
        course:      s.course_name,
        difficulty:  s.course_difficulty,
        groupBonus:  Number(s.group_bonus ?? 0),
        basePoints:  Number(s.base_points ?? 0),
        commBonus:   Number(s.additional_points ?? 0),
      }))

    const pts = playerScores.map((s) => s.totalPoints)
    const avg = pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : 0
    const stdDev = pts.length > 1
      ? Math.sqrt(pts.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / pts.length)
      : 0

    const courseMap: Record<string, { count: number; total: number }> = {}
    playerScores.forEach((s) => {
      if (!courseMap[s.course]) courseMap[s.course] = { count: 0, total: 0 }
      courseMap[s.course].count++
      courseMap[s.course].total += s.totalPoints
    })
    const courseStats = Object.entries(courseMap)
      .map(([name, v]) => ({ name, count: v.count, avgPoints: Math.round(v.total / v.count * 10) / 10 }))
      .sort((a, b) => b.avgPoints - a.avgPoints)

    const pointsBreakdown = {
      base:       Math.round(playerScores.reduce((s, r) => s + r.basePoints,  0) * 10) / 10,
      groupBonus: Math.round(playerScores.reduce((s, r) => s + r.groupBonus,  0) * 10) / 10,
      commBonus:  Math.round(playerScores.reduce((s, r) => s + r.commBonus,   0) * 10) / 10,
    }

    const { seasonScore, topScores } = computeSeasonScore(
      pts,
      m.starting_handicap ? Number(m.starting_handicap) : null,
      Number(m.current_handicap),
    )

    return {
      id:               m.id,
      name:             m.full_name,
      currentHandicap:  Number(m.current_handicap),
      startingHandicap: m.starting_handicap ? Number(m.starting_handicap) : null,
      avgPoints:        Math.round(avg * 10) / 10,
      stdDev:           Math.round(stdDev * 10) / 10,
      seasonScore,
      topScores,
      courseStats,
      pointsBreakdown,
      scores:           playerScores,
    }
  })

  const activityByDate: Record<string, number> = {}
  scores.forEach((s) => {
    const day = s.play_date.toISOString().slice(0, 10)
    activityByDate[day] = (activityByDate[day] ?? 0) + 1
  })

  const courseCount: Record<string, number> = {}
  scores.forEach((s) => { courseCount[s.course_name] = (courseCount[s.course_name] ?? 0) + 1 })
  const topCourses = Object.entries(courseCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const holes9  = scores.filter((s) => s.holes === 9).length
  const holes18 = scores.filter((s) => s.holes === 18).length

  const diffCount = { easy: 0, average: 0, tough: 0 } as Record<string, number>
  scores.forEach((s) => { diffCount[s.course_difficulty] = (diffCount[s.course_difficulty] ?? 0) + 1 })

  const allPoints = scores.map((s) => Number(s.total_points ?? 0))
  const avgPoints = allPoints.length ? allPoints.reduce((a, b) => a + b, 0) / allPoints.length : 0
  const maxPoints = allPoints.length ? Math.max(...allPoints) : 0

  const data: Analytics = {
    playerTimelines,
    activityByDate,
    topCourses,
    holes9,
    holes18,
    diffCount,
    totalRounds: scores.length,
    avgPoints:   Math.round(avgPoints * 10) / 10,
    maxPoints:   Math.round(maxPoints * 10) / 10,
  }

  return <AnalyticsClient data={data} />
}
