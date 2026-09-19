import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { isAdmin } from './auth'
import { difficultyFromSlope } from './scoring'
import { OPEN_COURSE, OPEN_DATE, OPEN_EVENT_ID, OPEN_FIELD_VERSION, OPEN_TEE_TIMES } from './open-types'
import type { OpenEvent, OpenSeasonMember, OpenState } from './open-types'
import { distributeGroups, fieldMembers, isOpenCourse, normalizeName, parCard } from './open-seed'

/** Rows exactly as Prisma returns them for the single Open event. */
export type StoredOpenEvent = NonNullable<Awaited<ReturnType<typeof loadStoredEvent>>>

export function loadStoredEvent() {
  return prisma.sslOpenEvent.findUnique({
    where: { id: OPEN_EVENT_ID },
    include: {
      groups: {
        orderBy: { sort_order: 'asc' },
        include: { players: { orderBy: { sort_order: 'asc' } } },
      },
    },
  })
}

/** Convert the stored event to the shape the board and projections use. */
export function serializeEvent(event: StoredOpenEvent): OpenEvent {
  return {
    id: event.id,
    courseId: event.course_id,
    courseName: event.course_name,
    teeName: event.tee_name,
    playDate: event.play_date.toISOString().slice(0, 10),
    courseRating: event.course_rating,
    slopeRating: event.slope_rating,
    coursePar: event.course_par,
    holePars: event.hole_pars,
    difficulty: event.difficulty,
    finalizedAt: event.finalized_at ? event.finalized_at.toISOString() : null,
    updatedAt: event.updated_at.toISOString(),
    groups: event.groups.map((group) => ({
      id: group.id,
      name: group.name,
      teeTime: group.tee_time,
      players: group.players.map((player) => ({
        id: player.id,
        memberId: player.member_id,
        name: player.player_name,
        handicap: player.handicap,
        mode: player.mode as OpenEvent['groups'][number]['players'][number]['mode'],
        doubleDown: player.double_down,
        scores: player.scores,
        version: player.version,
        scoreId: player.score_id,
        bonusId: player.bonus_id,
      })),
    })),
  }
}

/** Every active member's official season inputs, so the board can project the whole league table. */
export async function loadSeasonMembers(): Promise<OpenSeasonMember[]> {
  const [members, scores, bonuses] = await Promise.all([
    prisma.member.findMany({ where: { is_active: true }, orderBy: { full_name: 'asc' } }),
    prisma.score.findMany({ select: { id: true, member_id: true, total_points: true } }),
    prisma.seasonBonus.findMany({ select: { id: true, member_id: true, points: true } }),
  ])
  const scoresByMember = new Map<string, { id: string; points: number }[]>()
  for (const score of scores) {
    if (!score.member_id) continue
    const list = scoresByMember.get(score.member_id) ?? []
    list.push({ id: score.id, points: Number(score.total_points ?? 0) })
    scoresByMember.set(score.member_id, list)
  }
  const bonusesByMember = new Map<string, { id: string; points: number }[]>()
  for (const bonus of bonuses) {
    const list = bonusesByMember.get(bonus.member_id) ?? []
    list.push({ id: bonus.id, points: bonus.points })
    bonusesByMember.set(bonus.member_id, list)
  }
  return members.map((member) => ({
    id: member.id,
    name: member.full_name,
    startingHandicap: member.starting_handicap ?? null,
    currentHandicap: Number(member.current_handicap),
    scores: scoresByMember.get(member.id) ?? [],
    bonuses: bonusesByMember.get(member.id) ?? [],
  }))
}

/** The Open venue from the course library, added from the known card if nobody has entered it yet. */
async function ensureOpenCourse() {
  const courses = await prisma.course.findMany({ where: { is_active: true, holes: 18 }, orderBy: { created_at: 'asc' } })
  const candidates = courses.filter((course) => isOpenCourse(course.name))
  const preferred = candidates.find((course) => /blanc|white/.test(normalizeName(course.tee_name))) ?? candidates[0]
  if (preferred) {
    const holePars = parCard(preferred.par, preferred.hole_pars)
    if (preferred.hole_pars.length !== 18) {
      return prisma.course.update({ where: { id: preferred.id }, data: { hole_pars: holePars } })
    }
    return { ...preferred, hole_pars: holePars }
  }
  return prisma.course.create({
    data: {
      name: OPEN_COURSE.name,
      tee_name: OPEN_COURSE.teeName,
      course_rating: OPEN_COURSE.courseRating,
      slope_rating: OPEN_COURSE.slopeRating,
      par: OPEN_COURSE.par,
      holes: 18,
      hole_pars: OPEN_COURSE.holePars,
    },
  })
}

/**
 * Check if the stored event matches the current field definition.
 * Returns true if the player set and group assignments match OPEN_FIELD_PLAYERS exactly.
 */
function eventMatchesFieldDefinition(event: StoredOpenEvent, expectedMembers: { id: string; full_name: string }[]): boolean {
  const storedPlayers = event.groups
    .flatMap((g) => g.players)
    .sort((a, b) => a.sort_order - b.sort_order)
  
  if (storedPlayers.length !== expectedMembers.length) return false
  
  const expectedMemberIds = new Set(expectedMembers.map((m) => m.id))
  const storedMemberIds = new Set(storedPlayers.map((p) => p.member_id))
  
  if (storedMemberIds.size !== expectedMemberIds.size) return false
  for (const id of storedMemberIds) {
    if (!expectedMemberIds.has(id)) return false
  }
  
  return true
}

/**
 * The Open exists as soon as anyone opens the board: the announced field
 * (every name that is a registered, active member), one group per tee time,
 * handicaps frozen at today's values. Players fix their own group on the day.
 * Returns a notice instead of an event when nothing sensible can be created.
 * 
 * Automatically reseeds if the stored event does not match OPEN_FIELD_PLAYERS
 * (unless results are finalized). Version-gated by OPEN_FIELD_VERSION.
 */
export async function ensureOpenEvent(): Promise<{ event: StoredOpenEvent | null; notice: string | null }> {
  const existing = await loadStoredEvent()
  
  if (existing) {
    const members = fieldMembers(await prisma.member.findMany({ where: { is_active: true } }))
    
    if (!eventMatchesFieldDefinition(existing, members)) {
      if (existing.finalized_at) {
        console.warn(`[Open reseed] Event finalized; cannot auto-reseed to match field version ${OPEN_FIELD_VERSION}`)
        return { event: existing, notice: null }
      }
      
      console.log(`[Open reseed] Stored event does not match field definition (version ${OPEN_FIELD_VERSION}). Auto-reseeding...`)
      
      try {
        await prisma.sslOpenEvent.delete({ where: { id: OPEN_EVENT_ID } })
        console.log('[Open reseed] Old event deleted; will recreate with correct field')
      } catch (error) {
        console.error('[Open reseed] Failed to delete old event:', error)
        return { event: existing, notice: null }
      }
    } else {
      return { event: existing, notice: null }
    }
  }

  const members = fieldMembers(await prisma.member.findMany({ where: { is_active: true } }))
  if (members.length === 0) {
    return { event: null, notice: 'None of the announced Open field is registered as an active league member yet. Register the players, then reload.' }
  }
  const course = await ensureOpenCourse()
  const groupIndexes = distributeGroups(members.length, OPEN_TEE_TIMES.length)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sslOpenEvent.create({
        data: {
          id: OPEN_EVENT_ID,
          course_id: course.id,
          course_name: course.name,
          tee_name: course.tee_name,
          play_date: new Date(`${OPEN_DATE}T00:00:00Z`),
          course_rating: course.course_rating,
          slope_rating: course.slope_rating,
          course_par: course.par,
          hole_pars: course.hole_pars,
          difficulty: difficultyFromSlope(course.slope_rating),
        },
      })
      for (let groupIndex = 0; groupIndex < OPEN_TEE_TIMES.length; groupIndex += 1) {
        const group = await tx.sslOpenGroup.create({
          data: {
            event_id: OPEN_EVENT_ID,
            name: `Group ${groupIndex + 1}`,
            tee_time: OPEN_TEE_TIMES[groupIndex],
            sort_order: groupIndex,
            scoring_code: randomBytes(32).toString('base64url'),
          },
        })
        const groupMembers = members.filter((_, index) => groupIndexes[index] === groupIndex)
        if (groupMembers.length === 0) continue
        await tx.sslOpenPlayer.createMany({
          data: groupMembers.map((member, playerIndex) => ({
            event_id: OPEN_EVENT_ID,
            group_id: group.id,
            member_id: member.id,
            player_name: member.full_name,
            handicap: Number(member.current_handicap),
            sort_order: playerIndex,
            scores: Array<number>(18).fill(0),
          })),
        })
      }
    })
  } catch (error) {
    // Two phones opened the board at the same moment; the other one created it.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error
  }
  return { event: await loadStoredEvent(), notice: null }
}

/** Everything the live page needs in one payload. Scoring is open to everyone; the admin cookie unlocks posting results. */
export async function loadOpenState(): Promise<OpenState> {
  const admin = isAdmin()
  const [{ event, notice }, season] = await Promise.all([ensureOpenEvent(), loadSeasonMembers()])
  return {
    event: event ? serializeEvent(event) : null,
    season,
    isAdmin: admin,
    notice,
    fetchedAt: new Date().toISOString(),
  }
}
