import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { calculatePoints } from '@/lib/scoring'

function isAdmin() {
  return cookies().get('ssl_admin')?.value === process.env.ADMIN_PASSWORD
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const existing = await prisma.score.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Score not found' }, { status: 404 })

    const holes             = Number(body.holes             ?? existing.holes)             as 9 | 18
    const gross_score       = Number(body.gross_score       ?? existing.gross_score)
    const handicap_used     = Number(body.handicap_used     ?? existing.handicap_used)
    const course_difficulty = body.course_difficulty        ?? existing.course_difficulty
    const additional_points = Number(body.additional_points ?? existing.additional_points)

    // Recalculate points with updated values
    const { basePoints, difficultyMultiplier, groupBonus, totalPoints } = calculatePoints({
      holes,
      gross:                   gross_score,
      handicap:                handicap_used,
      difficulty:              course_difficulty,
      otherLeagueMembersCount: Math.max((existing.group_size ?? 1) - 1, 0),
      additionalPoints:        additional_points,
    })

    const updated = await prisma.score.update({
      where: { id: params.id },
      data: {
        holes,
        gross_score,
        handicap_used,
        course_name:           body.course_name        ?? existing.course_name,
        course_difficulty,
        difficulty_multiplier: difficultyMultiplier,
        play_date:             body.play_date
          ? new Date(body.play_date + 'T12:00:00')
          : existing.play_date,
        additional_points,
        base_points:           basePoints,
        group_bonus:           groupBonus,
        total_points:          totalPoints,
        notes:                 body.notes ?? existing.notes,
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.score.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete score' }, { status: 500 })
  }
}
