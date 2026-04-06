import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePoints } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

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
    } = body

    if (!member_id || !holes || !gross_score || handicap_used === undefined || !course_name || !play_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const holesNum    = Number(holes)    as 9 | 18
    const grossNum    = Number(gross_score)
    const handicapNum = Number(handicap_used)

    if (![9, 18].includes(holesNum)) {
      return NextResponse.json({ error: 'holes must be 9 or 18' }, { status: 400 })
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
        course_name:           course_name.trim(),
        course_difficulty,
        difficulty_multiplier: difficultyMultiplier,
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
      data: { member_id, handicap: handicapNum, score_id: score.id },
    })

    return NextResponse.json({ success: true, score }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 })
  }
}
