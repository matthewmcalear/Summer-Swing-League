import { prisma } from './prisma'
import { calculatePoints, validateRound, difficultyFromSlope } from './scoring'
import { scoreDifferential } from './handicap'

function toTitleCase(str: string): string {
  return str.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export type RecordRoundInput = {
  member_id:          string
  holes:              number
  gross_score:        number
  course_name:        string
  play_date:          string
  handicap_used?:     number   // defaults to the member's current handicap
  course_difficulty?: string   // defaults to slope-derived (or 'average')
  course_id?:         string | null
  group_member_ids?:  string[]
  notes?:             string | null
  additional_points?: number
}

export type RecordRoundResult =
  | { score: Awaited<ReturnType<typeof prisma.score.create>> }
  | { error: string; status: number }

/**
 * Record a completed round: validate, compute points + WHS differential, create
 * the Score, and roll the member's handicap forward. Shared by the manual
 * submit endpoint and the live-round finish endpoint so both behave identically.
 */
export async function recordRound(input: RecordRoundInput): Promise<RecordRoundResult> {
  const {
    member_id, course_name, play_date,
    course_id = null, group_member_ids = [], notes = null, additional_points = 0,
  } = input

  if (!member_id || !input.holes || !input.gross_score || !course_name || !play_date) {
    return { error: 'Missing required fields', status: 400 }
  }

  const holesNum = Number(input.holes) as 9 | 18
  const grossNum = Number(input.gross_score)

  // Fetch main player (also gives us a default handicap).
  const player = await prisma.member.findUnique({ where: { id: member_id } })
  if (!player) return { error: 'Player not found', status: 404 }

  const handicapNum = input.handicap_used !== undefined
    ? Number(input.handicap_used)
    : Number(player.current_handicap)

  const validationError = validateRound({
    holes: holesNum, gross: grossNum, handicap: handicapNum, playDate: String(play_date),
  })
  if (validationError) return { error: validationError, status: 400 }

  // Group members (other league members in the playing group).
  const otherIds = Array.isArray(group_member_ids)
    ? group_member_ids.filter((id) => id && id !== member_id)
    : []
  let groupNames = ''
  let otherCount = 0
  if (otherIds.length > 0) {
    const groupMembers = await prisma.member.findMany({
      where: { id: { in: otherIds } }, select: { full_name: true },
    })
    groupNames = groupMembers.map((m) => m.full_name).join(', ')
    otherCount = groupMembers.length
  }

  // Resolve handicap inputs + difficulty from the picked library course.
  let effRating: number | null = null
  let effSlope:  number | null = null
  let effPar:    number | null = null
  let differential: number | null = null
  let difficulty = input.course_difficulty ?? 'average'

  if (course_id) {
    const course = await prisma.course.findUnique({ where: { id: course_id } })
    if (course) {
      const factor = holesNum / course.holes
      effRating = Math.round(course.course_rating * factor * 10) / 10
      effSlope  = course.slope_rating
      effPar    = Math.round(course.par * factor)
      differential = scoreDifferential({
        gross: grossNum, courseRating: effRating, slopeRating: effSlope, holes: holesNum,
      })
      // Derive difficulty from slope unless the caller set one explicitly.
      if (input.course_difficulty === undefined) difficulty = difficultyFromSlope(course.slope_rating)
    }
  }

  const { basePoints, difficultyMultiplier, groupBonus, totalPoints } = calculatePoints({
    holes:                   holesNum,
    gross:                   grossNum,
    handicap:                handicapNum,
    difficulty,
    otherLeagueMembersCount: otherCount,
    additionalPoints:        Number(additional_points),
  })

  const score = await prisma.score.create({
    data: {
      member_id,
      player_name:           player.full_name,
      holes:                 holesNum,
      gross_score:           grossNum,
      handicap_used:         handicapNum,
      course_name:           toTitleCase(course_name),
      course_difficulty:     difficulty,
      difficulty_multiplier: difficultyMultiplier,
      course_id:             course_id || null,
      course_rating:         effRating,
      slope_rating:          effSlope,
      course_par:            effPar,
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

  // Roll the member's current handicap forward; lock starting_handicap on first round.
  await prisma.member.update({
    where: { id: member_id },
    data: {
      current_handicap: handicapNum,
      ...(player.starting_handicap == null ? { starting_handicap: handicapNum } : {}),
    },
  })
  await prisma.handicapHistory.create({
    data: { member_id, handicap: handicapNum, score_id: score.id, recorded_at: new Date(play_date + 'T12:00:00') },
  })

  return { score }
}
