import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePoints, validateRound } from '@/lib/scoring'
import { scoreDifferential } from '@/lib/handicap'

export const dynamic = 'force-dynamic'

function toTitleCase(str: string): string {
  return str.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export async function GET() {
  try {
    const scores = await prisma.score.findMany({
      orderBy: [{ play_date: 'desc' }, { created_at: 'desc' }],
    })
    return NextResponse.json(scores)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      member_id,
      holes,
      gross_score,
      handicap_used,
      course_name,
      course_difficulty = 'average',
      group_member_ids  = [],
      play_date,
      notes             = null,
      additional_points = 0,
      course_id         = null,
      course_rating     = null,
      slope_rating      = null,
      course_par        = null,
    } = body

    if (!member_id || !holes || !gross_score || handicap_used === undefined || !course_name || !play_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const holesNum    = Number(holes)    as 9 | 18
    const grossNum    = Number(gross_score)
    const handicapNum = Number(handicap_used)

    const validationError = validateRound({
      holes:    holesNum,
      gross:    grossNum,
      handicap: handicapNum,
      playDate: String(play_date),
    })
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Fetch main player
    const player = await prisma.member.findUnique({ where: { id: member_id } })
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    // Fetch group members
    const otherIds: string[] = Array.isArray(group_member_ids)
      ? group_member_ids.filter((id: string) => id !== member_id)
      : []

    let groupNames = ''
    let otherCount = 0

    if (otherIds.length > 0) {
      const groupMembers = await prisma.member.findMany({
        where: { id: { in: otherIds } },
        select: { full_name: true },
      })
      groupNames = groupMembers.map((m) => m.full_name).join(', ')
      otherCount = groupMembers.length
    }

    // Course handicap inputs — only used when a library course was picked.
    const courseRatingNum = course_rating == null ? null : Number(course_rating)
    const slopeRatingNum  = slope_rating  == null ? null : Number(slope_rating)
    const courseParNum    = course_par    == null ? null : Number(course_par)

    const differential =
      courseRatingNum != null && slopeRatingNum != null
        ? scoreDifferential({
            gross:        grossNum,
            courseRating: courseRatingNum,
            slopeRating:  slopeRatingNum,
            holes:        holesNum,
          })
        : null

    // Calculate points
    const { basePoints, difficultyMultiplier, groupBonus, totalPoints } = calculatePoints({
      holes:                   holesNum,
      gross:                   grossNum,
      handicap:                handicapNum,
      difficulty:              course_difficulty,
      otherLeagueMembersCount: otherCount,
      additionalPoints:        Number(additional_points),
    })

    // Save score
    const score = await prisma.score.create({
      data: {
        member_id,
        player_name:           player.full_name,
        holes:                 holesNum,
        gross_score:           grossNum,
        handicap_used:         handicapNum,
        course_name:           toTitleCase(course_name),
        course_difficulty,
        difficulty_multiplier: difficultyMultiplier,
        course_id:             course_id || null,
        course_rating:         courseRatingNum,
        slope_rating:          slopeRatingNum,
        course_par:            courseParNum,
        score_differential:    differential,
        group_member_ids:      otherIds,
        group_member_names:    groupNames,
        group_size:            otherCount + 1,
        base_points:           basePoints,
        group_bonus:           groupBonus,
        additional_points:     Number(additional_points),
        total_points:          totalPoints,
        play_date:             new Date(play_date + 'T12:00:00'),
        notes:                 notes || null,
      },
    })

    // Update member's current handicap.
    // If this is their first round, also lock in starting_handicap for improvement tracking.
    const memberFresh = await prisma.member.findUnique({ where: { id: member_id } })
    await prisma.member.update({
      where: { id: member_id },
      data: {
        current_handicap:  handicapNum,
        ...(memberFresh?.starting_handicap == null ? { starting_handicap: handicapNum } : {}),
      },
    })
    await prisma.handicapHistory.create({
      data: {
        member_id,
        handicap:    handicapNum,
        score_id:    score.id,
        recorded_at: new Date(play_date + 'T12:00:00'),  // use round date, not submission date
      },
    })

    return NextResponse.json({ success: true, score }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 })
  }
}
