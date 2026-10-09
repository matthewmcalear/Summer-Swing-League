import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordRound } from '@/lib/recordRound'
import { invalidateLeague } from '@/lib/cache'

// POST /api/live/[id]/finish → total the holes, create the Score, close the round
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const round = await prisma.liveRound.findUnique({
      where:   { id },
      include: { hole_scores: true },
    })
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    if (round.completed_at) return NextResponse.json({ error: 'Round already finished' }, { status: 400 })

    if (round.hole_scores.length < round.holes) {
      return NextResponse.json(
        { error: `Enter all ${round.holes} holes before finishing (${round.hole_scores.length} so far)` },
        { status: 400 },
      )
    }

    const gross = round.hole_scores.reduce((sum, h) => sum + h.strokes, 0)
    const playDate = round.play_date.toISOString().slice(0, 10)

    const result = await recordRound({
      member_id:        round.member_id,
      holes:            round.holes,
      gross_score:      gross,
      course_name:      round.course_name,
      course_id:        round.course_id,
      group_member_ids: round.group_member_ids,
      play_date:        playDate,
      notes:            'Logged live, hole-by-hole',
    })
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    if ('possibleDuplicate' in result) {
      return NextResponse.json({ error: 'Possible duplicate round detected', existing: result.existing }, { status: 409 })
    }

    await prisma.liveRound.update({
      where: { id: round.id },
      data:  { completed_at: new Date(), score_id: result.score.id },
    })

    invalidateLeague()
    return NextResponse.json({ success: true, score: result.score, gross }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to finish round' }, { status: 500 })
  }
}
